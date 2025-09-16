// normalized-da-mapper.js
// Mapper to transform DNOA data into Normalized DA format

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
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function benefitUnitByCoinsurance(pct) {
  if (pct >= 100) return 'Preventive';
  if (pct >= 70) return 'Basic';
  return 'Major';
}

function buildLimitationText(cat) {
  if (!cat?.limitations) return '';
  const bits = [];
  const lim = cat.limitations;

  // Age
  if (typeof lim.ageMaximum === 'number' && lim.ageMaximum > 0 && lim.ageMaximum < 999) {
    bits.push(`Up to age ${lim.ageMaximum}`);
  }

  // Rules
  const rules = Array.isArray(lim.rules) ? lim.rules : [];
  for (const r of rules) {
    const occ = r.occurrences ? `${r.occurrences}` : '1';
    // length/unit
    let period = '';
    if (r.length && r.unit) {
      // normalize units
      const unit = r.unit === 'benefitPeriod' ? 'benefit period' : r.unit;
      period = ` per ${r.length} ${unit}`;
    } else if (r.type === 'visit' && r.unit === 'benefitPeriod') {
      period = ' per benefit period';
    }
    const label = r.type ? r.type : 'limit';
    // Prefer humanized phrases
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

  // === Index: last service per code (from real history)
  const lastByCode = new Map();
  if (Array.isArray(procedureHistory)) {
    for (const h of procedureHistory) {
      const c = Number(h.code);
      const d = new Date(h.serviceDate);
      if (!isNaN(c) && !isNaN(d)) {
        const prev = lastByCode.get(c);
        if (!prev || d > prev) lastByCode.set(c, d);
      }
    }
  }

  // === Collect all covered codes + map code -> owning category & limitation text
  const codeIndex = new Map(); // code:number -> {cat, coins, deductibleApplies, limitationText, lastServiceDate}
  const addCodeFromCat = (cat, codeNum) => {
    if (!codeNum && codeNum !== 0) return;
    const c = Number(codeNum);
    if (isNaN(c)) return;

    const deductibleApplies = Array.isArray(cat?.accumulators?.id)
      ? cat.accumulators.id.includes(6) // '6' is deductible (SDADED) in your sample
      : false;

    const limitationText = buildLimitationText(cat);
    const lastDt = lastByCode.get(c);
    codeIndex.set(c, {
      cat,
      coinsIn: Number(cat.coinsuranceInNetwork ?? 0),
      coinsOut: Number(cat.coinsuranceOutNetwork ?? 0),
      deductibleApplies,
      limitationText,
      lastService: lastDt ? fmtMDY(lastDt.toISOString()) : 'No History',
    });
  };

  for (const cat of cats) {
    // 1) add the category's primary code
    if (cat.code) addCodeFromCat(cat, cat.code);

    // 2) add all explicit procedure codes listed under rules
    const rules = Array.isArray(cat?.limitations?.rules) ? cat.limitations.rules : [];
    for (const r of rules) {
      const procs = Array.isArray(r.procedures) ? r.procedures : [];
      for (const p of procs) {
        const codes = Array.isArray(p.codes) ? p.codes : [];
        for (const codeNum of codes) addCodeFromCat(cat, codeNum);
      }
    }
  }

  // Also include any code seen in history even if not listed in categories (defensive)
  for (const [c, d] of lastByCode.entries()) {
    if (!codeIndex.has(c)) {
      codeIndex.set(c, {
        cat: { name: 'Service', limitations: {} },
        coinsIn: 0, coinsOut: 0,
        deductibleApplies: false,
        limitationText: '',
        lastService: fmtMDY(d.toISOString()),
      });
    }
  }

  // === PatientVerification
  const indDed = accum?.deductible?.benefitPeriod?.individual || {};
  const famDed = accum?.deductible?.benefitPeriod?.family || {};
  const indMax = accum?.maximum?.benefitPeriod?.individual || {};
  // Orthodontic lifetime (if present)
  const orthoAcc = (benefits?.accumulators || []).find(a => a.code === 'OTLMAX');
  const orthoInd = orthoAcc?.amount?.individual?.inNetwork ?? null;
  const orthoIndRem = orthoAcc?.remaining?.individual?.inNetwork ?? null;

  const pv = [{
    SubscriberName: [policy.subscriberFirstName, policy.subscriberLastName].filter(Boolean).join(' ').trim(),
    SubscriberDateOfBirth: '', // not available in your payload
    SubscriberId: policy.subscriberId || '',
    PlanType: policy.planType || '',
    PlanName: policy.planName || '',
    PlanNumber: policy.groupNumber || '',
    SubscriberEffectiveDate: fmtMDY(policy.eligibilityBeginDate),
    SubscriberEndDate: fmtMDY(policy.eligibilityEndDate) || '',
    SubscriberEligibilityStatus: policy.memberStatus || '',

    ProgramType: policy.policyType || 'Dental',
    AlternativeBenefitProvision: policy.alternateBenefit ? 'Alternate benefit may apply.' : '',
    AssignmentOfBenefits: '',

    FamilyMemberName: [patient?.firstName, patient?.lastName].filter(Boolean).join(' ').trim(),
    FamilyMemberEffectiveDate: fmtMDY(policy.eligibilityBeginDate),
    FamilyMemberId: patient?.subscriberId || '',
    FamilyMemberEndDate: fmtMDY(policy.eligibilityEndDate) || '',
    FamilyMemberDateOfBirth: fmtMDY(patient?.dateOfBirth),
    EligibilityStatus: policy.memberStatus || '',

    OrthodonticPayment: '',
    DependentChildCoveredAgeLimit: '', // not provided by DNOA
    DependentStudentAgeLimit: '',
    ClaimMailingAddress: '',
    ClaimPayerID: '',
    oonBenefits: (cats.some(c => c.coinsuranceOutNetwork !== null && c.coinsuranceOutNetwork !== undefined)) ? 'Yes' : 'No',

    FamilyAnnualDeductible: fmtUSD(famDed.amountInNetwork),
    FamilyAnnualDeductibleMet: fmtUSD((famDed.amountInNetwork ?? 0) - (famDed.remainingInNetwork ?? 0)),
    FamilyAnnualDeductibleRemaining: fmtUSD(famDed.remainingInNetwork),

    FamilyLifetimeMaximumBenefits: '',
    FamilyLifetimeBenefitsUsedtoDate: '',
    FamilyLifetimeRemainingBenefit: '',

    FamilyAnnualMaximumBenefits: '', // family maximum not given
    FamilyAnnualBenefitsUsedtoDate: '',
    FamilyAnnualRemainingBenefit: '',

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
    CoordinationofBenefitsType: policy.coordinationOfBenefits || '',

    AdultOrthodonticCovered: (() => {
      const orthoCat = cats.find(c => String(c.name).toLowerCase().includes('orthodont'));
      if (!orthoCat) return '';
      const lim = orthoCat.limitations;
      // if subscriber/spouse false and child has a max age => Adults not covered
      if (lim?.subscriber === false && lim?.spouse === false && lim?.child) return 'No';
      return '';
    })(),
    FamilyMemberWaitingPeriod: 'None', // waitingPeriod null in your sample -> assume none
    OrthodonticLifetimeBenefit: fmtUSD(orthoInd),
    OrthodonticLifetimeRemainingBenefit: fmtUSD(orthoIndRem),

    SpecialistOfficeVisitCopay: '',
    IsReferralNeeded: '',
    PreCertRequired: '', // unknown; don't guess
    TreatmentinProgressCoverage: '',
    PreauthorizationRequired: '',
    MedicallyNecessaryonly: '',
    AutomaticPayments: '',
    ContinuationClaimNeeded: '',
    OrthodonticAgeLimits: (() => {
      const orthoCat = cats.find(c => String(c.name).toLowerCase().includes('orthodont'));
      const max = orthoCat?.limitations?.child?.max;
      return max ? `Child only (≤${max})` : '';
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
    MissingToothClause: policy.missingTooth ? 'A missing tooth clause applies.' : '',
    MissingToothProvision: policy.missingTooth ? 'Yes' : 'No',
    Payer: 'DNOA',
    InsuranceFeeScheduleUsed: '',
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

  // === EligibilityBenefits
  const eligibility = [];
  for (const [codeNum, meta] of codeIndex.entries()) {
    const dcode = padCDT(codeNum);
    const desc = meta.cat?.name || 'Coverage';
    const unit = benefitUnitByCoinsurance(meta.coinsIn);
    eligibility.push({
      ProcedureCode: dcode,
      ProcedureCodeDescription: desc,
      CodeAllowance: 'N/A',
      unit,
      NetworkStatus: 'In Network',
      Benefits: `${Math.round(meta.coinsIn)}%`,
      limitation: meta.limitationText || '',
      FeeSchedule: 'N/A',
      ServiceHistory: meta.lastService || 'No History',
      Copay: '',
      Amount: '',
      DeductibleApplies: meta.deductibleApplies ? 'Yes' : 'No',
      ClientId: clientId,
      EligibilityVerificationId: eligibilityVerificationId,
      RecordId: eligibility.length + 1,
      PatientId: patientId
    });
  }

  // === ServiceTreatmentHistory
  const history = [];
  // One aggregated line per code (like your sample)
  let recId = 1;
  for (const [codeNum, meta] of codeIndex.entries()) {
    history.push({
      ProcedureCode: padCDT(codeNum),
      LimitationText: meta.limitationText || (meta.coinsIn ? `${Math.round(meta.coinsIn)}% in-network` : ''),
      History: meta.lastService || 'No History',
      Tooth: '',
      Surface: '',
      LimitationAlsoAppliesTo: '',
      ProcedureCodeDescription: meta.cat?.name || 'Service',
      ClientId: clientId,
      EligibilityVerificationId: eligibilityVerificationId,
      RecordId: recId++,
      PatientId: patientId
    });
  }

  // Sort by code for deterministic output
  const codeSort = (a, b) => (a.ProcedureCode > b.ProcedureCode ? 1 : -1);
  eligibility.sort(codeSort);
  history.sort(codeSort);

  return {
    PatientVerification: pv,
    EligibilityBenefits: eligibility,
    ServiceTreatmentHistory: history
  };
}

module.exports = { toNormalizedDAFormat };