import fs from 'node:fs';
import path from 'node:path';

interface PlanAttributes {
  copay: number;
  age_range: string;
  description: string;
}

interface PlanMappingEntry {
  state: string;
  payer: string;
  program: string;
  variant: string | null;
  attributes: PlanAttributes;
}

interface PlanMapping {
  [rawLabel: string]: PlanMappingEntry;
}

interface ProcedureRule {
  frequency: string | null;
  age_range: string | null;
  limitations?: string | null;
  additional_requirements?: string | null;
  coverage?: string | null;
  source: string;
}

interface ProgramRules {
  state: string;
  payer: string;
  program: string;
  meta: Record<string, unknown>;
  coverage: any;
  special_notes: Record<string, unknown>;
  procedures: Record<string, ProcedureRule>;
}

export interface PatientProfile {
  planLabel: string;
  age: number;
  flags?: Record<string, boolean>;
}

export interface VerificationSnapshot {
  plan: PlanMappingEntry;
  coverage: any;
  specialNotes: ProgramRules['special_notes'];
  filteredProcedures: Record<string, ProcedureRule>;
}

const rootDir = path.resolve(__dirname, '..', '..');
const referenceRoot = path.join(rootDir, 'dentaquest-html-scraping', 'reference');
const planMappingPath = path.join(referenceRoot, 'plan_mappings.json');
const txMedicaidChildRulesPath = path.join(referenceRoot, 'tx_medicaid_child_rules.json');
const txChipChildRulesPath = path.join(referenceRoot, 'tx_chip_child_rules.json');

function loadPlanMappings(): PlanMapping {
  const raw = fs.readFileSync(planMappingPath, 'utf-8');
  return JSON.parse(raw) as PlanMapping;
}

function loadProgramRules(p: string): ProgramRules {
  const raw = fs.readFileSync(p, 'utf-8');
  return JSON.parse(raw) as ProgramRules;
}

const planMappings = loadPlanMappings();
const txMedicaidChildRules = loadProgramRules(txMedicaidChildRulesPath);
const txChipChildRules = loadProgramRules(txChipChildRulesPath);

function matchPatientProgram(plan: PlanMappingEntry, age: number): ProgramRules | null {
  if (plan.state === 'TX') {
    if (plan.program === 'Medicaid_Child_U21' && age <= 20) {
      return txMedicaidChildRules;
    }
    if (plan.program === 'CHIP_Child_Under19' && age <= 18) {
      return txChipChildRules;
    }
  }
  return null;
}

function filterProceduresForAge(rules: ProgramRules, age: number): Record<string, ProcedureRule> {
  const result: Record<string, ProcedureRule> = {};
  for (const [code, rule] of Object.entries(rules.procedures)) {
    if (!rule.age_range) {
      result[code] = rule;
      continue;
    }

    const tokens = rule.age_range.replace(/\s/g, '').split('-');
    if (tokens.length !== 2) {
      result[code] = rule;
      continue;
    }

    const min = parseInt(tokens[0], 10);
    const max = parseInt(tokens[1], 10);

    if (!Number.isNaN(min) && !Number.isNaN(max) && age >= min && age <= max) {
      result[code] = rule;
    }
  }
  return result;
}

function cloneCoverageWithVariant(programRules: ProgramRules, plan: PlanMappingEntry): any {
  const coverage = JSON.parse(JSON.stringify(programRules.coverage));
  const copayLevels = coverage?.member_cost_share?.copay_levels;
  if (copayLevels && plan.variant) {
    coverage.member_cost_share.resolved = copayLevels[plan.variant] ?? null;
  }
  return coverage;
}

export function buildVerificationSnapshot(profile: PatientProfile): VerificationSnapshot {
  const plan = planMappings[profile.planLabel];
  if (!plan) {
    throw new Error(`Plan non reconnu: ${profile.planLabel}`);
  }

  const programRules = matchPatientProgram(plan, profile.age);
  if (!programRules) {
    throw new Error(`Aucune règle disponible pour ${plan.program} (âge ${profile.age}).`);
  }

  const coverage = cloneCoverageWithVariant(programRules, plan);
  const filteredProcedures = filterProceduresForAge(programRules, profile.age);

  return {
    plan,
    coverage,
    specialNotes: programRules.special_notes,
    filteredProcedures
  };
}
