const fs = require('fs');
const path = require('path');

// Load reference data
const planMappings = require('./reference/plan_mappings.json');
const txMedicaidChildRules = require('./reference/tx_medicaid_child_rules.json');
const txChipChildRules = require('./reference/tx_chip_child_rules.json');

/**
 * Calculate patient age from date of birth
 */
function parseDate(dateString) {
  if (!dateString || typeof dateString !== 'string') {
    return null;
  }

  const trimmed = dateString.trim();
  if (!trimmed) return null;

  // Try ISO format first (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const isoDate = new Date(trimmed);
    return Number.isNaN(isoDate.valueOf()) ? null : isoDate;
  }

  // Try MM/DD/YYYY or M/D/YYYY
  const mmddMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddMatch) {
    const [, mm, dd, yyyy] = mmddMatch;
    const month = Number(mm);
    const day = Number(dd);
    const year = Number(yyyy);
    if (!Number.isNaN(month) && !Number.isNaN(day) && !Number.isNaN(year)) {
      const candidate = new Date(year, month - 1, day);
      return Number.isNaN(candidate.valueOf()) ? null : candidate;
    }
  }

  // Fall back to Date parsing (covers e.g. "03/29/2016 00:00:00")
  const fallback = new Date(trimmed);
  return Number.isNaN(fallback.valueOf()) ? null : fallback;
}

function calculateAge(dateOfBirth) {
  const birthDate = parseDate(dateOfBirth);
  if (!birthDate) return null;

  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

function resolvePatientAge(extractionData) {
  const candidateDob = extractionData?.patient?.dateOfBirth
    || extractionData?.patient?.dob
    || extractionData?.patientComplete?.DOB
    || extractionData?.eligibilityHistory?.[0]?.['DOB']
    || extractionData?.eligibilityHistory?.[0]?.['Date of Birth'];

  return calculateAge(candidateDob);
}

/**
 * Get program rules based on plan mapping
 */
function getProgramRules(planMapping) {
  if (!planMapping) return null;

  const { program, payer } = planMapping;

  // Map program to rules file
  if (program === 'Medicaid_Child_U21') {
    return txMedicaidChildRules;
  } else if (program.startsWith('CHIP_Child_U19')) {
    return txChipChildRules;
  }

  return null;
}

/**
 * Filter procedures based on patient age
 */
function filterProceduresForAge(procedures, age) {
  if (!procedures || age === null) return {};

  const filtered = {};

  for (const [code, rule] of Object.entries(procedures)) {
    if (!rule.age_range) {
      // No age restriction
      filtered[code] = rule;
      continue;
    }

    // Parse age range (e.g., "0-20", "6+", "<21")
    const range = rule.age_range;

    if (range.includes('-')) {
      const [min, max] = range.split('-').map(Number);
      if (age >= min && age <= max) {
        filtered[code] = rule;
      }
    } else if (range.endsWith('+')) {
      const min = parseInt(range);
      if (age >= min) {
        filtered[code] = rule;
      }
    } else if (range.startsWith('<')) {
      const max = parseInt(range.substring(1));
      if (age < max) {
        filtered[code] = rule;
      }
    } else if (range.startsWith('>')) {
      const min = parseInt(range.substring(1));
      if (age > min) {
        filtered[code] = rule;
      }
    }
  }

  return filtered;
}

/**
 * Enrich DentaQuest extraction with plan details
 */
function enrichDentaQuestData(extractionData, onLog = console.log) {
  try {
    // Get patient plan from extraction (can be in multiple places)
    const planLabel = extractionData.patientComplete?.plan ||
                     extractionData.patient?.plan ||
                     extractionData.overview?.structured?.plan;
    if (!planLabel) {
      onLog('⚠️ No plan found in patient data, skipping enrichment');
      return extractionData;
    }

    // Calculate patient age
    const age = resolvePatientAge(extractionData);
    if (age === null) {
      onLog('⚠️ Could not calculate patient age, skipping enrichment');
      return extractionData;
    }

    onLog(`🎯 Enriching data for plan: ${planLabel}, patient age: ${age}`);

    // Find plan mapping
    const planMapping = planMappings[planLabel];
    if (!planMapping) {
      // Extract state from plan label if possible
      const stateMatch = planLabel.match(/^([A-Z]{2})\s/);
      const state = stateMatch ? stateMatch[1] : 'Unknown';

      onLog(`⚠️ No mapping found for plan: ${planLabel}`);
      onLog(`📍 State detected: ${state}`);
      onLog(`📋 Currently supported: ${Object.keys(planMappings).join(', ')}`);

      // Return data with minimal enrichment for unsupported states
      const enrichedData = {
        ...extractionData,
        intelligentExtraction: {
          ...(extractionData.intelligentExtraction || {}),
          enrichment: {
            timestamp: new Date().toISOString(),
            patientAge: age,
            planLabel: planLabel,
            state: state,
            supported: false,
            message: `Coverage details for ${state} not yet collected. This is a quick fix - please notify the dev team.`,
            availablePlans: Object.keys(planMappings),
            // Provide minimal default values so form can still display
            coverage: {
              annual_maximum: "Unknown",
              deductible: { amount: "Unknown", applies_to: [] },
              coverage_percentages: {
                preventive: "Unknown",
                basic: "Unknown",
                major: "Unknown"
              }
            },
            procedures: {},
            specialNotes: {}
          }
        }
      };

      // Also add warning to summary for visibility
      if (!enrichedData.summary) enrichedData.summary = {};
      enrichedData.summary.enrichmentWarning = `⚠️ ${state} coverage catalog pending - easy fix, contact dev team`;

      return enrichedData;
    }

    // Get program rules
    const programRules = getProgramRules(planMapping);
    if (!programRules) {
      onLog(`⚠️ No rules found for program: ${planMapping.program}`);
      return extractionData;
    }

    // Filter procedures based on age
    const filteredProcedures = filterProceduresForAge(programRules.procedures, age);

    // Build enriched data - use intelligentExtraction field which accepts additional properties
    const enrichedData = {
      ...extractionData,
      intelligentExtraction: {
        ...(extractionData.intelligentExtraction || {}),
        enrichment: {
          timestamp: new Date().toISOString(),
          patientAge: age,
          planMapping,
          coverage: programRules.coverage,
          specialNotes: programRules.special_notes,
          procedures: filteredProcedures,
          procedureCount: Object.keys(filteredProcedures).length
        }
      }
    };

    // Add coverage percentages to summary for easier access
    if (!enrichedData.summary) {
      enrichedData.summary = {};
    }

    enrichedData.summary.coveragePercentages = programRules.coverage?.coverage_percentages || {};
    enrichedData.summary.annualMaximum = programRules.coverage?.annual_maximum || 'Unlimited';
    enrichedData.summary.deductible = programRules.coverage?.deductible || { amount: 0, applies_to: [] };
    enrichedData.summary.waitingPeriods = programRules.coverage?.waiting_periods || [];
    enrichedData.summary.missingToothClause = programRules.coverage?.missing_tooth_clause || false;

    onLog(`✅ Enrichment complete: Added ${Object.keys(filteredProcedures).length} procedure rules`);

    return enrichedData;

  } catch (error) {
    onLog(`❌ Enrichment error: ${error.message}`);
    // Return original data if enrichment fails
    return extractionData;
  }
}

module.exports = {
  enrichDentaQuestData,
  calculateAge,
  filterProceduresForAge
};
