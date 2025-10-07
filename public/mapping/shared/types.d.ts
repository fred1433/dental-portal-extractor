export type Portal = 'DDINS' | 'DNOA' | 'Cigna' | 'MetLife' | 'DentaQuest' | 'Aetna' | 'UnitedHealthcare' | 'DOT';
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
    roster?: {
        firstName?: string;
        lastName?: string;
        dateOfBirth?: string;
        personId?: string;
        groupName?: string;
        groupNumber?: string;
        divisionName?: string;
        divisionNumber?: string;
        plan?: string;
        subscriberType?: string;
        memberAccountStatus?: string;
        memberId?: string;
        contractId?: string;
    } | null;
}
export interface NormalizedEligibility {
    member: {
        name?: string;
        dob?: string;
        memberId?: string;
        relationship?: string;
        insuranceNumber?: string;
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
    claimsCity?: string;
    claimsState?: string;
    claimsZipCode?: string;
    claimPayerId?: string;
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
        ageLimit?: number;
    }>;
    orthodontics?: {
        hasCoverage: boolean;
        coveragePct?: number;
        lifetimeMax?: number;
        ageLimit?: number;
    };
}
export type VerificationFieldKey = 'Practice Name' | 'Provider Name' | 'Appointment Date' | "Today's Date" | "Employee's Initials" | "Rep's Name" | 'Patient Name' | 'Patient DOB' | 'Subscriber/Policy Holder Name' | 'Subscriber/Policy Holder DOB' | 'Relationship to Patient' | 'Member ID' | 'Insurance Number' | 'SSN' | 'Insurance Name' | 'Group Name / #' | 'Group Name' | 'Group Number' | 'COB Type' | 'Phone Number' | 'Payor ID' | 'Coordination of Benefits' | 'Other Insurance on File?' | 'Claims Mailing Address' | 'City' | 'State' | 'Zip Code' | 'Effective Date' | 'Annual Maximum' | 'Maximum Used' | 'Remaining Maximum' | 'Family Deductible' | 'Individual Deductible' | 'Deductible Remaining' | 'Benefit Year' | 'Lifetime Deductible' | 'Coverage Start Date' | 'Coverage End Date' | 'Deductible Applies To' | 'Co-Pay' | 'Network Participation' | 'If OON, Paid As' | 'Assignment of Benefits Accepted?' | 'Fee Schedule Used' | 'Preventive / Diagnostic (% Covered)' | 'Basic Services (% Covered)' | 'Major Services (% Covered)' | 'Missing Tooth Clause' | 'Preventive Wait Period' | 'Basic Wait Period' | 'Major Wait Period' | 'Ortho Coverage' | 'Ortho Coverage %' | 'Ortho Age Limit' | 'Ortho Lifetime Maximum' | 'Exam History' | 'Prophy History' | 'Fluoride History' | 'Xray History' | 'Sealant History' | 'Filling History' | 'SRP History' | 'EXT History' | 'Crown History' | 'Bridge History' | 'Build Up History' | 'Post & Core History' | 'Denture History';
export type FormFieldMap = Partial<Record<VerificationFieldKey, string>> & Record<string, string>;
//# sourceMappingURL=types.d.ts.map