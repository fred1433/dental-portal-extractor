type TreatmentEntry = {
    treatmentCode?: string;
    summaryValues?: Array<{
        maximumCoverage?: number | string;
        maximumcoverage?: number | string;
        minimumCoverage?: number | string;
        minimumcoverage?: number | string;
        benefitCoverageLevel?: number | string;
        networkCode?: string;
        networkcode?: string;
    }>;
};
export declare function mapCoverageByCategory(treatments: TreatmentEntry[]): {
    preventive: number | null;
    basic: number | null;
    major: number | null;
};
export {};
//# sourceMappingURL=coverage.d.ts.map