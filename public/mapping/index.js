import { normalizeEligibility } from './core/selectPortalAdapter.js';
import { toFormFieldMap } from './core/masterMapping.js';
import { applyFormFieldMapToDOM } from './dom/binder.js';
import { applyProcedureHistory } from './dom/procedureTables.js';
export function mapToVerificationForm(data) {
    const normalized = normalizeEligibility(data);
    return toFormFieldMap(normalized, data);
}
export function fillVerificationFormFromExtraction(data) {
    const normalized = normalizeEligibility(data);
    const map = toFormFieldMap(normalized, data);
    // Apply basic field mappings
    applyFormFieldMapToDOM(map);
    // Apply procedure history to tables and special notes
    applyProcedureHistory(normalized, data);
}
export * from './shared/types.js';
//# sourceMappingURL=index.js.map