import type { ExtractionResult } from '../shared/types.js';
import { ensureArray, toISODate } from '../shared/utils.js';

export interface ProcedureHistoryData {
  code: string;
  description?: string;
  lastServiceDate?: string;
  firstServiceDate?: string;
  numberOfServices?: number;
  frequencyText?: string;
  limitationsText?: string;
}

function normalizeCode(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (value != null) return String(value).trim();
  return null;
}

function normalizeFrequency(procedure: any): string | undefined {
  const frequency = procedure?.frequencyText ?? procedure?.frequency ?? procedure?.frequencyDescription;
  if (typeof frequency === 'string' && frequency.trim()) return frequency.trim();
  const count = procedure?.numberOfServicesRendered ?? procedure?.numberofservicesrendered;
  if (typeof count === 'number' && Number.isFinite(count)) {
    return `${count} times`;
  }
  if (typeof count === 'string' && count.trim()) {
    return `${count.trim()} times`;
  }
  return undefined;
}

function normalizeLimitations(procedure: any): string | undefined {
  const limitation = procedure?.limitationText ?? procedure?.limitations ?? procedure?.limitation;
  if (typeof limitation === 'string' && limitation.trim()) return limitation.trim();
  return undefined;
}

export function extractProcedureHistory(raw: ExtractionResult): ProcedureHistoryData[] {
  const procedures = ensureArray(raw.eligibility?.hist?.procedures);
  const results: ProcedureHistoryData[] = [];

  for (const entry of procedures) {
    const code = normalizeCode(entry?.code ?? entry?.procedureCode);
    if (!code) continue;

    const lastDate = entry?.lastServiceDate ?? entry?.lastservicedate;
    const firstDate = entry?.firstServiceDate ?? entry?.firstservicedate;
    const description = entry?.description ?? entry?.procedureDescription;
    const count = entry?.numberOfServicesRendered ?? entry?.numberofservicesrendered;
    const historyDetails = ensureArray(entry?.historyDetails ?? entry?.historydetails);
    const limitation = normalizeLimitations(entry);

    // Some responses store limitation text inside historyDetails array
    if (!limitation) {
      const detailWithText = historyDetails.find((detail: any) => typeof detail?.limitationText === 'string');
      if (detailWithText?.limitationText) {
        const value = String(detailWithText.limitationText).trim();
        if (value) {
          entry.__normalizedLimitation = value; // store for later retrieval
        }
      }
    }

    results.push({
      code,
      description: description ? String(description).trim() : undefined,
      lastServiceDate: lastDate ? toISODate(lastDate) : undefined,
      firstServiceDate: firstDate ? toISODate(firstDate) : undefined,
      numberOfServices: typeof count === 'number' ? count : undefined,
      frequencyText: normalizeFrequency(entry),
      limitationsText: limitation ?? entry.__normalizedLimitation
    });
  }

  return results;
}

export function mapProcedureHistory(procedures: ProcedureHistoryData[]): Record<string, string> {
  const map: Record<string, string> = {};

  for (const proc of procedures) {
    if (!proc.code) continue;
    const base = proc.code;

    if (proc.lastServiceDate) {
      map[`${base}_last_date`] = proc.lastServiceDate.slice(0, 10);
    }

    if (proc.frequencyText) {
      map[`${base}_frequency`] = proc.frequencyText;
    }

    if (proc.limitationsText) {
      map[`${base}_limitations`] = proc.limitationsText;
    }

    if (proc.numberOfServices && proc.numberOfServices > 0) {
      const note = `History: ${proc.numberOfServices}`;
      map[`${base}_notes`] = proc.numberOfServices > 1 ? `${note} times` : `${note} time`;
    }
  }

  return map;
}
