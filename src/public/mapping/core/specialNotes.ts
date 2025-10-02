import type { NormalizedEligibility, ExtractionResult } from '../shared/types.js';

export interface SpecialNotesAnswers {
  waitingPeriod?: 'yes' | 'no';
  missingToothClause?: 'yes' | 'no';
  workInProgress?: 'yes' | 'no';
  panoFmxSameDay?: 'yes' | 'no';
  srpCategory?: 'basic' | 'major';
  endoCategory?: 'basic' | 'major';
  extractionCategory?: 'basic' | 'major';
  medicalFirst?: 'yes' | 'no';
  d9232Covered?: 'yes' | 'no';
  limitedShareFrequency?: 'yes' | 'no';
  perioShareFrequency?: 'yes' | 'no';
  compositeDowngrade?: 'yes' | 'no';
  d0140SameDay?: 'yes' | 'no';
  srpWaitingPeriod?: 'yes' | 'no';
  coreBuildupSameDay?: 'yes' | 'no';
  crownPayment?: 'prep' | 'seat';
  sealantAgeLimit?: string;
  srpPerioMaintenanceTime?: string;
}

const YES = 'yes';
const NO = 'no';

function getAdditionalBenefit(normalized: NormalizedEligibility, header: string): string | undefined {
  const benefits = normalized.additionalBenefits ?? {};
  const key = header.trim().toLowerCase();
  return benefits[key];
}

function extractAge(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const match = text.match(/(\d{1,3})/);
  return match ? match[1] : undefined;
}

export function extractSpecialNotesAnswers(
  normalized: NormalizedEligibility,
  raw: ExtractionResult
): SpecialNotesAnswers {
  const answers: SpecialNotesAnswers = {};

  // Waiting period
  answers.waitingPeriod = (normalized.waitingPeriods && normalized.waitingPeriods.length > 0) ? YES : NO;
  const specialNotes = normalized.additionalBenefits ?? {};
  const note = (key: string) => specialNotes[key.toLowerCase()];

  // Missing tooth clause
  if (typeof normalized.member.missingTooth === 'boolean') {
    answers.missingToothClause = normalized.member.missingTooth ? YES : NO;
  }
  const missingToothNote = note('missing_tooth_clause');
  if (missingToothNote) {
    const lower = missingToothNote.toLowerCase();
    answers.missingToothClause = lower.includes('yes') ? YES : lower.includes('no') ? NO : answers.missingToothClause;
  }

  // Additional benefits cues
  const impactedTeethBenefit = getAdditionalBenefit(normalized, 'Removal of Impacted Teeth');
  if (impactedTeethBenefit) {
    const lower = impactedTeethBenefit.toLowerCase();
    if (lower.includes('claims should first be submitted to your dental plan')) {
      answers.medicalFirst = NO;
    }
  }

  const assignmentBenefit = getAdditionalBenefit(normalized, 'Assignment of Benefits');
  if (assignmentBenefit) {
    const lower = assignmentBenefit.toLowerCase();
    if (lower.includes('not accept')) {
      answers.workInProgress = NO;
    }
  }

  const sealantBenefit = note('sealant_age_limit')
    || getAdditionalBenefit(normalized, 'Child Contract Age Limit')
    || getAdditionalBenefit(normalized, 'Orthodontic Age Limit')
    || getAdditionalBenefit(normalized, 'Student Contract Age Limit');
  answers.sealantAgeLimit = extractAge(sealantBenefit);

  // Treatment categories
  const treatments = raw.eligibility?.pkg?.treatment;
  if (treatments) {
    const list = Array.isArray(treatments) ? treatments : [treatments];
    const findTreatment = (code: string) => list.find(t => (t.treatmentCode ?? t.treatmentcode) === code);

    const toCategory = (treatment: any): 'basic' | 'major' | undefined => {
      const values = treatment?.summaryValues ?? treatment?.summaryvalues;
      const arr = Array.isArray(values) ? values : values ? [values] : [];
      for (const item of arr) {
        const coverage = item?.maximumCoverage ?? item?.maximumcoverage;
        if (typeof coverage === 'number') {
          return coverage >= 80 ? 'basic' : 'major';
        }
      }
      return undefined;
    };

    const pd = findTreatment('PD');
    const en = findTreatment('EN');
    const os = findTreatment('OS');

    if (pd) answers.srpCategory = toCategory(pd) ?? 'major';
    if (en) answers.endoCategory = toCategory(en) ?? 'major';
    if (os) answers.extractionCategory = toCategory(os) ?? 'major';
  }

  // Procedure limitations analysis
  const limitations = normalized.procedureLimitations ?? {};
  const getLimit = (code: string): string | undefined => {
    const entry = limitations[code] as any;
    if (!entry) return undefined;
    return entry.limitations ?? entry.limitation ?? entry.limit ?? entry.limitationsText;
  };

  const compositeCodes = ['D2391', 'D2392', 'D2393', 'D2394'];
  for (const code of compositeCodes) {
    const text = getLimit(code);
    if (typeof text === 'string' && /downgrade|amalgam/i.test(text)) {
      answers.compositeDowngrade = YES;
      break;
    }
  }
  const compositeNote = note('composite_downgrade');
  if (compositeNote) {
    answers.compositeDowngrade = /no|not/i.test(compositeNote) ? NO : YES;
  }

  const srpLimit = getLimit('D4910') || getLimit('D1110');
  if (srpLimit) {
    if (/two of any prophylaxis/i.test(srpLimit)) {
      answers.perioShareFrequency = YES;
      answers.limitedShareFrequency = YES;
    }
    if (/30 day/i.test(srpLimit)) {
      answers.srpPerioMaintenanceTime = '30 days';
      answers.srpWaitingPeriod = YES;
    }
  }
  const srpIntervalNote = note('srp_to_perio_interval');
  if (srpIntervalNote) {
    answers.srpPerioMaintenanceTime = srpIntervalNote;
  }
  const srpWaitingNote = note('post_srp_waiting_period');
  if (srpWaitingNote) {
    answers.srpWaitingPeriod = srpWaitingNote.toLowerCase().includes('no') ? NO : YES;
  }
  const perioShareNote = note('perio_maintenance_with_prophy');
  if (perioShareNote) {
    const lower = perioShareNote.toLowerCase();
    answers.perioShareFrequency = lower.includes('cannot') ? NO : YES;
  }
  const limitedShareNote = note('limited_exam_frequency_share');
  if (limitedShareNote) {
    const lower = limitedShareNote.toLowerCase();
    answers.limitedShareFrequency = lower.includes('share') ? YES : NO;
  }

  const panoLimit = getLimit('D0330');
  if (panoLimit && /either one/i.test(panoLimit)) {
    answers.panoFmxSameDay = NO;
  }
  const panoNote = note('pano_fmx_same_day');
  if (panoNote) {
    const lower = panoNote.toLowerCase();
    answers.panoFmxSameDay = lower.includes('yes') ? YES : lower.includes('no') ? NO : answers.panoFmxSameDay;
  }

  const d0140Limit = getLimit('D0140');
  if (d0140Limit && /same day/i.test(d0140Limit)) {
    answers.d0140SameDay = YES;
  }
  const d0140Note = note('d0140_same_day');
  if (d0140Note) {
    const lower = d0140Note.toLowerCase();
    answers.d0140SameDay = lower.includes('yes') ? YES : lower.includes('no') ? NO : answers.d0140SameDay;
  }

  const d7210Limit = getLimit('D7210');
  if (d7210Limit && /medical/i.test(d7210Limit)) {
    answers.medicalFirst = YES;
  }
  const medicalNote = note('d7210_medical_billing');
  if (medicalNote) {
    answers.medicalFirst = /not|no/i.test(medicalNote) ? NO : YES;
  }

  const crownCodes = ['D2740', 'D2750', 'D2790', 'D2952'];
  for (const code of crownCodes) {
    const text = getLimit(code);
    if (!text) continue;
    const lower = text.toLowerCase();
    if (lower.includes('seat') || lower.includes('delivery')) {
      answers.crownPayment = 'seat';
      break;
    }
    if (lower.includes('prep') || lower.includes('preparation')) {
      answers.crownPayment = 'prep';
      break;
    }
  }
  const crownNote = note('crown_payment_timing');
  if (crownNote) {
    const lower = crownNote.toLowerCase();
    if (lower.includes('seat')) {
      answers.crownPayment = 'seat';
    } else if (lower.includes('prep')) {
      answers.crownPayment = 'prep';
    }
  }

  // Work in progress / D9232 fallbacks (search raw JSON comments)
  const benefitText = getAdditionalBenefit(normalized, 'Pregnancy Benefits') || '';
  if (!answers.workInProgress && /in progress/i.test(benefitText)) {
    answers.workInProgress = NO;
  }

  const d9232Info = raw.eligibility?.bens?.['D9232'];
  if (d9232Info) {
    answers.d9232Covered = YES;
  }

  const nitrousNote = note('d9230_nitrous');
  if (nitrousNote) {
    answers.d9232Covered = nitrousNote.toLowerCase().includes('covered') ? YES : NO;
  }

  const sedNote = note('d9232_coverage');
  if (sedNote) {
    answers.d9232Covered = sedNote.toLowerCase().includes('covered') ? YES : NO;
  }

  const coreNote = note('core_build_up_same_day');
  if (coreNote) {
    answers.coreBuildupSameDay = coreNote.toLowerCase().includes('not payable') ? NO : YES;
  }

  const srpCategoryNote = note('srp_category');
  if (srpCategoryNote) {
    const lower = srpCategoryNote.toLowerCase();
    answers.srpCategory = lower.includes('major') ? 'major' : 'basic';
  }
  const endoCategoryNote = note('endo_category');
  if (endoCategoryNote) {
    const lower = endoCategoryNote.toLowerCase();
    answers.endoCategory = lower.includes('major') ? 'major' : 'basic';
  }
  const extractionCategoryNote = note('extraction_category');
  if (extractionCategoryNote) {
    const lower = extractionCategoryNote.toLowerCase();
    answers.extractionCategory = lower.includes('major') ? 'major' : 'basic';
  }

  return answers;
}
