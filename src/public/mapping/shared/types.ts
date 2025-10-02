export type Portal =
  | 'DDINS'
  | 'DNOA'
  | 'Cigna'
  | 'MetLife'
  | 'DentaQuest'
  | 'Aetna'
  | 'UnitedHealthcare'
  | 'DOT';

export interface PatientSummary {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  subscriberId?: string;
}

export interface ExtractionSummary {
  patientName?: string;
  memberId?: string;
  planName?: string;
  status?: string;
  annualMaximum?: {
    amount?: number;
    remaining?: number;
  };
  deductible?: {
    amount?: number;
    remaining?: number;
  };
}

export interface ExtractionResult {
  success?: boolean;
  portal?: Portal;
  summary?: ExtractionSummary & Record<string, any>;
  eligibility?: Record<string, any> | null;
  claims?: Array<Record<string, any>> | null;
  patient?: PatientSummary | null;
}

export interface NormalizedEligibility {
  member: {
    name?: string;
    dob?: string;
    memberId?: string;
    groupName?: string;
    groupNumber?: string;
    divisionNumber?: string;
    productName?: string;
    coverageStart?: string;
    coverageEnd?: string;
    missingTooth?: boolean | null;
    ssn?: string;
  };
  maximums: {
    annualTotal?: number;
    annualUsed?: number;
    annualRemaining?: number;
    yearType?: 'CALENDAR' | 'CONTRACT' | null;
  };
  deductibles: {
    individual: {
      amount?: number;
      remaining?: number;
      appliesTo?: string[];
    };
    family: {
      amount?: number;
      remaining?: number;
    };
  };
  coveragePct: {
    preventive?: number | null;
    basic?: number | null;
    major?: number | null;
  };
  waitingPeriods: Array<{
    treatmentCodes?: string[];
    months?: number;
    effective?: string;
    end?: string;
  }>;
  claimsMailingAddress?: string;
  historyByCode: Record<string, {
    firstDate?: string;
    lastDate?: string;
    count?: number;
    description?: string;
  }>;
  extraNotes: string[];
  additionalBenefits: Record<string, string>;
  provider?: {
    name?: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    practiceName?: string;
    phoneNumber?: string;
    npi?: string;
    taxId?: string;
    address?: string;
  };
  procedureLimitations?: Record<string, {
    frequency?: string;
    limitations?: string;
    additionalRequirements?: string;
    coverage?: string;
    source?: string;
  }>;
}

export type VerificationFieldKey =
  | 'Practice Name'
  | 'Provider Name'
  | 'Appointment Date'
  | 'Patient Name'
  | 'Patient DOB'
  | 'Subscriber/Policy Holder Name'
  | 'Subscriber/Policy Holder DOB'
  | 'Member ID'
  | 'SSN'
  | 'Insurance Name'
  | 'Group Name / #'
  | 'COB Type'
  | 'Phone Number'
  | 'Payor ID'
  | 'Coordination of Benefits'
  | 'Other Insurance on File?'
  | 'Claims Mailing Address'
  | 'Effective Date'
  | 'Annual Maximum'
  | 'Family Deductible'
  | 'Benefit Year'
  | 'Remaining Maximum'
  | 'Lifetime Deductible'
  | 'Coverage Start Date'
  | 'Coverage End Date'
  | 'Individual Deductible'
  | 'Deductible Applies To'
  | 'Co-Pay'
  | 'Network Participation'
  | 'If OON, Paid As'
  | 'Assignment of Benefits Accepted?'
  | 'Fee Schedule Used'
  | 'Preventive / Diagnostic (% Covered)'
  | 'Basic Services (% Covered)'
  | 'Major Services (% Covered)'
  | 'Missing Tooth Clause'
  | 'Preventive Wait Period'
  | 'Basic Wait Period'
  | 'Major Wait Period';

export type FormFieldMap = Partial<Record<VerificationFieldKey, string>>;
