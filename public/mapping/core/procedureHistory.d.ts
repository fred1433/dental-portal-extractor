import type { ExtractionResult } from '../shared/types.js';
export interface ProcedureHistoryData {
    code: string;
    description?: string;
    lastServiceDate?: string;
    firstServiceDate?: string;
    numberOfServices?: number;
    frequencyText?: string;
    limitationsText?: string;
}
export declare function extractProcedureHistory(raw: ExtractionResult): ProcedureHistoryData[];
export declare function mapProcedureHistory(procedures: ProcedureHistoryData[]): Record<string, string>;
//# sourceMappingURL=procedureHistory.d.ts.map