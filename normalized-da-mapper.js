// normalized-da-mapper.js
// Mapper to transform DNOA data into Normalized DA format
// MAJOR REFACTOR: Now groups by CATEGORY instead of individual codes

function padCDT(n) {
  const s = String(n);
  return 'D' + (s.length >= 4 ? s : s.padStart(4, '0'));
}

function fmtUSD(v) {
  if (v === null || v === undefined || isNaN(Number(v))) return '';
  return `${Number(v).toFixed(2)}`;
}

function fmtMDY(iso) {
  if (!iso) return '';

  // FIX: Parse date without timezone conversion
  // If the date is in YYYY-MM-DD format, parse it directly without timezone issues
  const match = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [_, yyyy, mm, dd] = match;
    return `${mm}/${dd}/${yyyy}`;
  }

  // Fallback for other date formats (with time)
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function benefitUnitByCoinsurance(pct) {
  if (pct >= 100) return 'Preventive';
  if (pct >= 80) return 'Basic';
  if (pct >= 70) return 'Basic';
  return 'Major';
}

function buildLimitationText(cat) {
  if (!cat?.limitations) return '';
  const bits = [];
  const lim = cat.limitations;

  // Age limitations
  if (typeof lim.ageMaximum === 'number' && lim.ageMaximum > 0 && lim.ageMaximum < 999) {
    bits.push(`Up to age ${lim.ageMaximum}`);
  }
  if (lim.child?.max) {
    bits.push(`Child up to age ${lim.child.max}`);
  }

  // Rules (visits, occurrences, etc.)
  const rules = Array.isArray(lim.rules) ? lim.rules : [];
  for (const r of rules) {
    const occ = r.occurrences ? `${r.occurrences}` : '1';
    let period = '';
    if (r.length && r.unit) {
      const unit = r.unit === 'benefitPeriod' ? 'benefit period' : r.unit;
      period = ` per ${r.length} ${unit}`;
    } else if (r.type === 'visit' && r.unit === 'benefitPeriod') {
      period = ' per benefit period';
    }
    const label = r.type ? r.type : 'limit';

    if (r.type === 'visit' || r.type === 'quadrant' || r.type === 'tooth') {
      bits.push(`${occ} ${label}(s)${period}`.trim());
    } else if (r.length && r.unit) {
      bits.push(`1${period}`.trim());
    }
  }

  return bits.join('. ');
}

function toNormalizedDAFormat(allData, {
  clientId = '',
  eligibilityVerificationId = '',
  patientId = '',
} = {}) {
  const { patient, planSummary, planAccumulators, benefits, procedureHistory } = allData || {};
  const policy = planSummary || {};
  const accum = planAccumulators || {};
  const cats = benefits?.categories || [];
  const accumulators = benefits?.accumulators || [];

  // === Build history index by category (not by individual code)
  // Map category name -> last service date (as YYYY-MM-DD string)
  const categoryLastService = new Map();

  if (Array.isArray(procedureHistory)) {
    for (const hist of procedureHistory) {
      const code = Number(hist.code);
      const serviceDateStr = hist.serviceDate; // Keep as string to avoid timezone issues

      if (!isNaN(code) && serviceDateStr) {
        // Find which category this code belongs to
        for (const cat of cats) {
          let belongsToCategory = false;

          // Check if it's the category's main code
          if (Number(cat.code) === code) {
            belongsToCategory = true;
          }

          // Check if it's in the category's procedure codes
          const rules = Array.isArray(cat?.limitations?.rules) ? cat.limitations.rules : [];
          for (const rule of rules) {
            const procs = Array.isArray(rule.procedures) ? rule.procedures : [];
            for (const proc of procs) {
              const codes = Array.isArray(proc.codes) ? proc.codes : [];
              if (codes.some(c => Number(c) === code)) {
                belongsToCategory = true;
                break;
              }
            }
            if (belongsToCategory) break;
          }

          if (belongsToCategory) {
            const catName = cat.name;
            const existing = categoryLastService.get(catName);
            // Compare dates as strings (YYYY-MM-DD format naturally sorts correctly)
            if (!existing || serviceDateStr > existing) {
              categoryLastService.set(catName, serviceDateStr);
            }
          }
        }
      }
    }
  }

  // === PatientVerification Section
  const indDed = accum?.deductible?.benefitPeriod?.individual || {};
  const famDed = accum?.deductible?.benefitPeriod?.family || {};
  const indMax = accum?.maximum?.benefitPeriod?.individual || {};
  const famMax = accum?.maximum?.benefitPeriod?.family || {};

  // Orthodontic lifetime (if present)
  const orthoAcc = accumulators.find(a => a.code === 'OTLMAX');
  const orthoInd = orthoAcc?.amount?.individual?.inNetwork ?? null;
  const orthoIndRem = orthoAcc?.remaining?.individual?.inNetwork ?? null;

  const pv = [{
    SubscriberName: [policy.subscriberFirstName, policy.subscriberLastName].filter(Boolean).join(' ').trim(),
    SubscriberDateOfBirth: '', // not available
    SubscriberId: policy.subscriberId || '',
    PlanType: policy.planType || '',
    PlanName: policy.planName || '',
    PlanNumber: policy.groupNumber || '',
    SubscriberEffectiveDate: fmtMDY(policy.eligibilityBeginDate),
    SubscriberEndDate: fmtMDY(policy.eligibilityEndDate) || '',
    SubscriberEligibilityStatus: policy.memberStatus || '',

    ProgramType: policy.policyType || 'Dental',
    AlternativeBenefitProvision: policy.alternateBenefit
      ? 'The least expensive professionally acceptable alternative treatment will be considered.'
      : '',
    AssignmentOfBenefits: '',

    FamilyMemberName: [patient?.firstName, patient?.lastName].filter(Boolean).join(' ').trim(),
    FamilyMemberEffectiveDate: fmtMDY(policy.eligibilityBeginDate),
    FamilyMemberId: patient?.subscriberId || '',
    FamilyMemberEndDate: fmtMDY(policy.eligibilityEndDate) || '',
    FamilyMemberDateOfBirth: fmtMDY(patient?.dateOfBirth),
    EligibilityStatus: policy.memberStatus || '',

    OrthodonticPayment: '',
    DependentChildCoveredAgeLimit: '',
    DependentStudentAgeLimit: '',
    ClaimMailingAddress: '', // Not available in DNOA
    ClaimPayerID: '', // Not available in DNOA
    oonBenefits: (cats.some(c => c.coinsuranceOutNetwork !== null && c.coinsuranceOutNetwork !== undefined)) ? 'Yes' : 'No',

    FamilyAnnualDeductible: fmtUSD(famDed.amountInNetwork),
    FamilyAnnualDeductibleMet: fmtUSD((famDed.amountInNetwork ?? 0) - (famDed.remainingInNetwork ?? 0)),
    FamilyAnnualDeductibleRemaining: fmtUSD(famDed.remainingInNetwork),

    FamilyLifetimeMaximumBenefits: '',
    FamilyLifetimeBenefitsUsedtoDate: '',
    FamilyLifetimeRemainingBenefit: '',

    FamilyAnnualMaximumBenefits: fmtUSD(famMax.amountInNetwork),
    FamilyAnnualBenefitsUsedtoDate: fmtUSD((famMax.amountInNetwork ?? 0) - (famMax.remainingInNetwork ?? 0)),
    FamilyAnnualRemainingBenefit: fmtUSD(famMax.remainingInNetwork),

    IndividualAnnualDeductible: fmtUSD(indDed.amountInNetwork),
    IndividualAnnualDeductibleMet: fmtUSD((indDed.amountInNetwork ?? 0) - (indDed.remainingInNetwork ?? 0)),
    IndividualAnnualDeductibleRemaining: fmtUSD(indDed.remainingInNetwork),

    IndividualLifetimeMaximumBenefits: '',
    IndividualLifetimeBenefitsUsedtoDate: '',
    IndividualLifetimeRemainingBenefit: '',

    IndividualAnnualMaximumBenefits: fmtUSD(indMax.amountInNetwork),
    IndividualAnnualBenefitsUsedtoDate: fmtUSD((indMax.amountInNetwork ?? 0) - (indMax.remainingInNetwork ?? 0)),
    IndividualAnnualRemainingBenefit: fmtUSD(indMax.remainingInNetwork),

    CoordinationofBenefits: policy.coordinationOfBenefits ? 'Yes' : 'No',
    CoordinationofBenefitsType: policy.coordinationOfBenefits === 'non duplication' ? 'Non-duplication' : (policy.coordinationOfBenefits || ''),

    AdultOrthodonticCovered: (() => {
      const orthoCat = cats.find(c => String(c.name).toLowerCase().includes('orthodont'));
      if (!orthoCat) return '';
      const lim = orthoCat.limitations;
      if (lim?.subscriber === false && lim?.spouse === false && lim?.child) return 'No';
      if (lim?.subscriber === true || lim?.spouse === true) return 'Yes';
      return '';
    })(),
    FamilyMemberWaitingPeriod: 'None',
    OrthodonticLifetimeBenefit: fmtUSD(orthoInd),
    OrthodonticLifetimeRemainingBenefit: fmtUSD(orthoIndRem),

    SpecialistOfficeVisitCopay: '',
    IsReferralNeeded: '',
    PreCertRequired: '',
    TreatmentinProgressCoverage: '',
    PreauthorizationRequired: '',
    MedicallyNecessaryonly: '',
    AutomaticPayments: '',
    ContinuationClaimNeeded: '',
    OrthodonticAgeLimits: (() => {
      const orthoCat = cats.find(c => String(c.name).toLowerCase().includes('orthodont'));
      const max = orthoCat?.limitations?.child?.max;
      return max ? `Child only (up to age ${max})` : '';
    })(),

    InsuranceName: policy.corpEntity || '',
    FamilyLifetimeDeductible: '',
    FamilyLifetimeDeductibleMet: '',
    FamilyLifetimeRemainingDeductible: '',
    IndividualLifetimeDeductible: '',
    IndividualLifetimeDeductibleMet: '',
    IndividualLifetimeRemainingDeductible: '',
    OrthodonticLifetimeBenefitUsedtoDate: (orthoInd != null && orthoIndRem != null) ? fmtUSD(+orthoInd - +orthoIndRem) : '',

    ClaimsAddress: '',
    FillingDowngrade: '',

    GroupName: policy.groupName || '',
    GroupNumber: policy.groupNumber || '',

    // FIXED: Changed from MissingToothProvision to MissingToothClause
    MissingToothClause: policy.missingTooth
      ? 'Benefits are not available for services to replace teeth missing prior to the effective date of coverage.'
      : 'Missing tooth clause does not apply.',

    Payer: 'DNOA',
    InsuranceFeeScheduleUsed: policy.dentalSystem || '', // FIXED: Now mapped from dentalSystem
    InsuranceCalendarOrFiscalPolicyYear: '',
    BenefitPeriod: (() => {
      const b = policy.planPeriodBeginDate, e = policy.planPeriodEndDate;
      if (b && e && b.endsWith('-01-01') && e.endsWith('-12-31')) return 'Calendar Year';
      return '';
    })(),
    InNetworkOutNetwork: cats.length ? 'In-network benefits shown; out-of-network may differ.' : '',
    HowareBenefitsPaid: '',

    ClientId: clientId,
    EligibilityVerificationId: eligibilityVerificationId,
    RecordId: 0,
    PatientId: patientId
  }];

  // === EligibilityBenefits - NOW BY CATEGORY, NOT BY CODE!
  const eligibility = [];
  let eligRecordId = 1;

  for (const cat of cats) {
    // Skip if no coinsurance info (not a real benefit)
    if (cat.coinsuranceInNetwork === null || cat.coinsuranceInNetwork === undefined) continue;

    // Get the representative code for this category
    let representativeCode = '';
    if (cat.code) {
      representativeCode = padCDT(cat.code);
    } else {
      // If no main code, try to get first code from rules
      const rules = Array.isArray(cat?.limitations?.rules) ? cat.limitations.rules : [];
      for (const rule of rules) {
        const procs = Array.isArray(rule.procedures) ? rule.procedures : [];
        for (const proc of procs) {
          const codes = Array.isArray(proc.codes) ? proc.codes : [];
          if (codes.length > 0) {
            representativeCode = padCDT(codes[0]);
            break;
          }
        }
        if (representativeCode) break;
      }
    }

    // Determine if deductible applies
    const deductibleApplies = Array.isArray(cat?.accumulators?.id)
      ? cat.accumulators.id.includes(6) // '6' is deductible ID
      : false;

    // Get service history for this category
    const lastService = categoryLastService.get(cat.name);
    const serviceHistory = lastService ? fmtMDY(lastService) : 'No History';

    // Build limitation text
    const limitationText = buildLimitationText(cat);

    // Determine benefit unit based on coinsurance percentage
    const unit = benefitUnitByCoinsurance(cat.coinsuranceInNetwork);

    eligibility.push({
      ProcedureCode: representativeCode,
      ProcedureCodeDescription: cat.name || 'Coverage',
      CodeAllowance: 'N/A',
      unit,
      NetworkStatus: 'In Network',
      Benefits: `${Math.round(cat.coinsuranceInNetwork)}%`,
      limitation: limitationText,
      FeeSchedule: 'N/A',
      ServiceHistory: serviceHistory,
      Copay: '',
      Amount: '',
      DeductibleApplies: deductibleApplies ? 'Yes' : 'No',
      ClientId: clientId,
      EligibilityVerificationId: eligibilityVerificationId,
      RecordId: eligRecordId++,
      PatientId: patientId
    });
  }

  // === ServiceTreatmentHistory - ALSO BY CATEGORY
  const history = [];
  let histRecordId = 1;

  for (const cat of cats) {
    if (cat.coinsuranceInNetwork === null || cat.coinsuranceInNetwork === undefined) continue;

    // Get the representative code
    let representativeCode = '';
    if (cat.code) {
      representativeCode = padCDT(cat.code);
    } else {
      const rules = Array.isArray(cat?.limitations?.rules) ? cat.limitations.rules : [];
      for (const rule of rules) {
        const procs = Array.isArray(rule.procedures) ? rule.procedures : [];
        for (const proc of procs) {
          const codes = Array.isArray(proc.codes) ? proc.codes : [];
          if (codes.length > 0) {
            representativeCode = padCDT(codes[0]);
            break;
          }
        }
        if (representativeCode) break;
      }
    }

    const lastService = categoryLastService.get(cat.name);
    const serviceHistory = lastService ? fmtMDY(lastService) : 'No History';
    const limitationText = buildLimitationText(cat);

    history.push({
      ProcedureCode: representativeCode,
      LimitationText: limitationText, // FIX: Don't put percentage if no limitations
      History: serviceHistory,
      Tooth: '',
      Surface: '',
      LimitationAlsoAppliesTo: '',
      ProcedureCodeDescription: cat.name || 'Service',
      ClientId: clientId,
      EligibilityVerificationId: eligibilityVerificationId,
      RecordId: histRecordId++,
      PatientId: patientId
    });
  }

  // === NEW SECTION: EligibilityMaximum
  const eligibilityMaximum = [];
  let maxRecordId = 1;

  for (const acc of accumulators) {
    // Map accumulator type to readable format
    let typeDesc = '';
    let serviceCategory = '';

    // Determine the type and category based on the code
    if (acc.code === 'OTLMAX') {
      typeDesc = 'Lifetime Maximum';
      serviceCategory = 'Orthodontics';
    } else if (acc.type === 'maximum' && acc.unit === 'benefitPeriod') {
      typeDesc = 'Calendar Year Maximum';
      serviceCategory = 'General';
    } else if (acc.type === 'deductible' && acc.unit === 'benefitPeriod') {
      typeDesc = 'Calendar Year Deductible';
      serviceCategory = 'General';
    } else {
      typeDesc = `${acc.type} ${acc.unit}`.trim();
      serviceCategory = acc.code || 'General';
    }

    // Add individual amounts if present
    if (acc.amount?.individual?.inNetwork !== undefined) {
      eligibilityMaximum.push({
        Type: typeDesc,
        Amount: fmtUSD(acc.amount.individual.inNetwork),
        Remaining: fmtUSD(acc.remaining?.individual?.inNetwork),
        ServiceCategory: serviceCategory,
        Family_Individual: 'Individual',
        ClientId: clientId,
        EligibilityVerificationId: eligibilityVerificationId,
        RecordId: maxRecordId++,
        PatientId: patientId
      });
    }

    // Add family amounts if present
    if (acc.amount?.family?.inNetwork !== undefined) {
      eligibilityMaximum.push({
        Type: typeDesc,
        Amount: fmtUSD(acc.amount.family.inNetwork),
        Remaining: fmtUSD(acc.remaining?.family?.inNetwork),
        ServiceCategory: serviceCategory,
        Family_Individual: 'Family',
        ClientId: clientId,
        EligibilityVerificationId: eligibilityVerificationId,
        RecordId: maxRecordId++,
        PatientId: patientId
      });
    }
  }

  // === NEW SECTION: EligibilityAgeLimitation
  const eligibilityAgeLimitation = [];
  let ageRecordId = 1;

  for (const cat of cats) {
    const lim = cat.limitations;
    if (!lim) continue;

    // Check for child age limits
    if (lim.child?.max) {
      eligibilityAgeLimitation.push({
        FamilyMember: 'Child',
        AgeLimit: lim.child.max,
        ServiceCategory: cat.name,
        ClientId: clientId,
        EligibilityVerificationId: eligibilityVerificationId,
        RecordId: ageRecordId++,
        PatientId: patientId
      });
    }

    // Check for general age maximum
    if (lim.ageMaximum && lim.ageMaximum < 999) {
      eligibilityAgeLimitation.push({
        FamilyMember: 'All',
        AgeLimit: lim.ageMaximum,
        ServiceCategory: cat.name,
        ClientId: clientId,
        EligibilityVerificationId: eligibilityVerificationId,
        RecordId: ageRecordId++,
        PatientId: patientId
      });
    }
  }

  // Return the complete normalized format with all sections
  return {
    PatientVerification: pv,
    EligibilityBenefits: eligibility,
    ServiceTreatmentHistory: history,
    EligibilityMaximum: eligibilityMaximum,
    EligibilityAgeLimitation: eligibilityAgeLimitation
  };
}

module.exports = { toNormalizedDAFormat };