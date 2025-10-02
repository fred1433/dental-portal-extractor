/**
 * JSON Query Engine - Executes structured queries on dental insurance JSON
 * Adapted from SQL-based system to work with nested JSON structures
 */

class JsonQueryEngine {
  constructor(patientData) {
    this.data = patientData;
    this.patientAge = this.calculateAge(patientData.patient?.dateOfBirth);
  }

  calculateAge(dob) {
    if (!dob) return null;

    try {
      let dobDate;
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) {
        const [month, day, year] = dob.split('/');
        dobDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else if (/^\d{4}-\d{2}-\d{2}/.test(dob)) {
        dobDate = new Date(dob);
      } else {
        return null;
      }

      const today = new Date();
      let age = today.getFullYear() - dobDate.getFullYear();
      const monthDiff = today.getMonth() - dobDate.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) {
        age--;
      }

      return age >= 0 ? age : null;
    } catch {
      return null;
    }
  }

  /**
   * Execute an array of query specifications
   */
  executeQueries(querySpecs) {
    if (!Array.isArray(querySpecs)) {
      querySpecs = [querySpecs];
    }

    const results = [];

    for (const spec of querySpecs) {
      try {
        const result = this.executeQuery(spec);
        results.push({
          query: spec,
          success: true,
          data: result
        });
      } catch (error) {
        results.push({
          query: spec,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Execute a single query based on action type
   */
  executeQuery(spec) {
    const action = spec.action || spec.type;

    switch (action) {
      case 'find_procedure':
      case 'find_procedure_limitation':
        return this.findProcedureLimitation(spec);

      case 'get_annual_maximum':
      case 'get_maximum':
        return this.getAnnualMaximum(spec);

      case 'get_deductible':
        return this.getDeductible(spec);

      case 'check_history':
      case 'get_procedure_history':
        return this.getProcedureHistory(spec);

      case 'get_coverage_percentage':
        return this.getCoveragePercentage(spec);

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * Find procedure and extract limitation info (filtered by patient age)
   */
  findProcedureLimitation(spec) {
    const cdtCode = spec.cdt_code || spec.code || spec.procedureCode;
    const network = spec.network || '##PPO'; // Default to PPO
    const filterByAge = spec.filter_age !== false; // Default true

    if (!cdtCode) {
      throw new Error('Missing cdt_code in query spec');
    }

    const treatments = this.data.eligibility?.pkg?.treatment || [];

    for (const treatment of treatments) {
      for (const procClass of (treatment.procedureClass || [])) {
        for (const procedure of (procClass.procedure || [])) {
          if (procedure.code === cdtCode) {
            // Found the procedure!
            const result = {
              code: procedure.code,
              description: procedure.description
            };

            // Find network coverage
            const networkData = (procedure.network || []).find(n => n.code === network);
            if (networkData) {
              result.network = network;
              result.coverage = networkData.coverageDetail?.[0]?.benefitCoverageLevel;
              result.deductibleExempted = networkData.coverageDetail?.[0]?.deductibleExempted;
            }

            // Find applicable limitation (filter by age if needed)
            const limitations = procedure.limitation || [];
            let selectedLimitation = limitations[0]; // Default

            if (filterByAge && this.patientAge != null && limitations.length > 1) {
              const ageLimitation = limitations.find(lim => {
                const ageCode = lim.sexAgeToothCode?.[0];
                if (!ageCode) return false;

                const minAge = ageCode.minAge || 0;
                const maxAge = ageCode.maxAge || 999;

                // maxAge=0 means "no limit"
                if (minAge === 0 && maxAge === 0) return true;

                return this.patientAge >= minAge && this.patientAge < maxAge;
              });

              if (ageLimitation) {
                selectedLimitation = ageLimitation;
              }
            }

            if (selectedLimitation) {
              result.benefitQuantity = selectedLimitation.benefitQuantity;
              result.frequencyText = selectedLimitation.frequencyLimitationText;
              result.intervalNumber = selectedLimitation.intervalNumber;
              result.intervalUnit = selectedLimitation.intervalUnitCode;
              result.periodType = selectedLimitation.periodTypeCode;
            }

            return result;
          }
        }
      }
    }

    // Procedure not found
    return {
      code: cdtCode,
      found: false,
      message: `Procedure ${cdtCode} not found in coverage`
    };
  }

  /**
   * Get annual maximum information
   */
  getAnnualMaximum(spec) {
    const maximumsInfo = this.data.eligibility?.maxDed?.maximumsInfo || [];

    // Find calendar year maximum (most common)
    const calendarMax = maximumsInfo.find(max => {
      const classification = max.maximumDetails?.calendarOrContractClassification;
      return classification?.toUpperCase() === 'CALENDAR';
    }) || maximumsInfo[0];

    if (!calendarMax) {
      return { found: false, message: 'No annual maximum data found' };
    }

    const amountInfo = calendarMax.amountInfo || {};

    return {
      type: calendarMax.maximumDetails?.type || 'Annual Maximum',
      totalAmount: amountInfo.totalAmount,
      usedAmount: amountInfo.totalUsedAmount,
      remainingAmount: amountInfo.remainingAmount,
      yearType: calendarMax.maximumDetails?.calendarOrContractClassification || 'CALENDAR'
    };
  }

  /**
   * Get deductible information
   */
  getDeductible(spec) {
    const deductiblesInfo = this.data.eligibility?.maxDed?.deductiblesInfo || [];
    const deductibleType = spec.type || 'individual'; // 'individual' or 'family'

    const deductible = deductiblesInfo.find(ded => {
      const type = ded.deductibleDetails?.type || '';
      return type.toLowerCase().includes(deductibleType.toLowerCase());
    });

    if (!deductible) {
      return { found: false, message: `No ${deductibleType} deductible found` };
    }

    const amountInfo = deductible.amountInfo || {};

    return {
      type: deductible.deductibleDetails?.type || `${deductibleType} Deductible`,
      totalAmount: amountInfo.totalAmount,
      usedAmount: amountInfo.totalUsedAmount,
      remainingAmount: amountInfo.remainingAmount,
      appliesTo: (deductible.servicesAllowed || []).map(s => s.treatmentTypeDescription).filter(Boolean)
    };
  }

  /**
   * Get procedure history
   */
  getProcedureHistory(spec) {
    const cdtCode = spec.cdt_code || spec.code;

    if (!cdtCode) {
      throw new Error('Missing cdt_code in query spec');
    }

    const procedures = this.data.eligibility?.hist?.procedures || [];
    const procedure = procedures.find(p => p.code === cdtCode);

    if (!procedure) {
      return {
        code: cdtCode,
        found: false,
        message: `No history for ${cdtCode}`
      };
    }

    return {
      code: procedure.code,
      description: procedure.description,
      firstServiceDate: procedure.firstServiceDate,
      lastServiceDate: procedure.lastServiceDate,
      numberOfServices: procedure.numberOfServicesRendered,
      services: (procedure.services || []).map(s => ({
        date: s.serviceDate,
        claimId: s.claimId,
        status: s.statusCodeDescription
      }))
    };
  }

  /**
   * Get coverage percentage for a treatment category
   */
  getCoveragePercentage(spec) {
    const category = spec.category; // 'preventive', 'basic', 'major'
    const treatments = this.data.eligibility?.pkg?.treatment || [];

    // Map category to treatment codes
    const categoryMap = {
      'preventive': ['DI', 'PV'],
      'basic': ['RS', 'PD', 'EN', 'OS'],
      'major': ['CS', 'PF', 'PR']
    };

    const codes = categoryMap[category?.toLowerCase()] || [];
    const matchingTreatment = treatments.find(t => codes.includes(t.treatmentCode));

    if (!matchingTreatment) {
      return { found: false, message: `Category ${category} not found` };
    }

    const summaryValue = matchingTreatment.summaryValues?.[0];

    return {
      category,
      minimumCoverage: summaryValue?.minimumCoverage,
      maximumCoverage: summaryValue?.maximumCoverage,
      networkCode: summaryValue?.networkCode
    };
  }
}

module.exports = JsonQueryEngine;
