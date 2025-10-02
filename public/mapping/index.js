import { normalizeEligibility } from './core/normalizer.js';
import { toFormFieldMap } from './core/toForm.js';
import { applyFormFieldMapToDOM } from './dom/binder.js';
import { applyProcedureHistory } from './dom/procedureTables.js';
export function mapToVerificationForm(data) {
    const normalized = normalizeEligibility(data);
    return toFormFieldMap(normalized, data);
}
export function fillVerificationFormFromExtraction(data) {
    const normalized = normalizeEligibility(data);
    const map = toFormFieldMap(normalized, data);
    applyFormFieldMapToDOM(map);
    applyProcedureHistory(normalized, data);
}
export * from './shared/types.js';
//# sourceMappingURL=index.js.map