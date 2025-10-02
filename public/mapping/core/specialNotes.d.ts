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
export declare function extractSpecialNotesAnswers(normalized: NormalizedEligibility, raw: ExtractionResult): SpecialNotesAnswers;
//# sourceMappingURL=specialNotes.d.ts.map