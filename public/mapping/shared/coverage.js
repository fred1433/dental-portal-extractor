import { ensureArray, parseNumber } from './utils.js';
const PREVENTIVE_CODES = new Set(['PV', 'DI']);
const BASIC_CODES = new Set(['RS', 'PD', 'EN', 'OS', 'GS']);
const MAJOR_CODES = new Set(['CS', 'PF', 'PR', 'OR']);
function pickCoverageForCodes(treatments, codes) {
    let best = null;
    for (const entry of treatments) {
        const code = (entry.treatmentCode || '').toUpperCase();
        if (!codes.has(code))
            continue;
        for (const summary of ensureArray(entry.summaryValues)) {
            const networkCode = (summary.networkCode || summary.networkcode || '').toUpperCase();
            if (networkCode && networkCode !== '##PPO')
                continue;
            const value = parseNumber(summary.maximumCoverage) ??
                parseNumber(summary.maximumcoverage) ??
                parseNumber(summary.minimumCoverage) ??
                parseNumber(summary.minimumcoverage) ??
                parseNumber(summary.benefitCoverageLevel);
            if (value === undefined)
                continue;
            if (best === null || value > best) {
                best = Math.round(value);
            }
        }
    }
    return best;
}
export function mapCoverageByCategory(treatments) {
    return {
        preventive: pickCoverageForCodes(treatments, PREVENTIVE_CODES),
        basic: pickCoverageForCodes(treatments, BASIC_CODES),
        major: pickCoverageForCodes(treatments, MAJOR_CODES)
    };
}
//# sourceMappingURL=coverage.js.map