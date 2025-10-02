export declare function ensureArray<T>(value: T | T[] | null | undefined): T[];
export declare function coalesce<T>(...values: Array<T | null | undefined>): T | undefined;
export declare function parseNumber(value: unknown): number | undefined;
export declare function formatCurrency(value: unknown): string;
export declare function toISODate(value: unknown): string;
export declare function normalizeLabel(value: string): string;
export declare function uniqueStrings(values: Array<string | undefined | null>): string[];
//# sourceMappingURL=utils.d.ts.map