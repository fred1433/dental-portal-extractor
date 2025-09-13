/**
 * DOT Extractor - Main exports
 */

export { DotExtractor, extractDotData } from './extractors/dotExtractor';
export { parseBenefits, generateBenefitsSummary } from './util/benefitsParser';
export { getBearerFromStorage } from './util/getBearer';
export { buildBenefitsPayload, flattenClaimDetail } from './util/buildPayloads';

// Authentication exports
export { autoLogin, ensureValidSession, isSessionValid } from './auth/autoLogin';

// Re-export types if needed
export type { ParsedBenefits } from './util/benefitsParser';