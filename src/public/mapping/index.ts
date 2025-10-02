import type { ExtractionResult, FormFieldMap } from './shared/types.js';
import { normalizeEligibility } from './core/normalizer.js';
import { toFormFieldMap } from './core/toForm.js';
import { applyFormFieldMapToDOM } from './dom/binder.js';
import { applyProcedureHistory } from './dom/procedureTables.js';

export function mapToVerificationForm(data: ExtractionResult): FormFieldMap {
  const normalized = normalizeEligibility(data);
  return toFormFieldMap(normalized, data);
}

export function fillVerificationFormFromExtraction(data: ExtractionResult) {
  const normalized = normalizeEligibility(data);
  const map = toFormFieldMap(normalized, data);

  // Apply basic field mappings
  applyFormFieldMapToDOM(map);

  // Apply procedure history to tables and special notes
  applyProcedureHistory(normalized, data);
}

export * from './shared/types.js';
