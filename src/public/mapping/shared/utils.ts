export function ensureArray<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
}

export function coalesce<T>(...values: Array<T | null | undefined>): T | undefined {
  for (const value of values) {
    if (value !== null && value !== undefined) return value;
  }
  return undefined;
}

export function parseNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  const num = Number(typeof value === 'string' ? value.replace(/[,$]/g, '') : value);
  return Number.isFinite(num) ? num : undefined;
}

export function formatCurrency(value: unknown): string {
  const num = parseNumber(value);
  if (num === undefined) return '';
  return `$${num.toFixed(2)}`;
}

export function toISODate(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return '';
  const trimmed = value.trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [month, day, year] = trimmed.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return '';
}

export function normalizeLabel(value: string): string {
  return value
    .toLowerCase()
    // Align labels like "Deductible Remaining:" with keys that omit the colon
    .replace(/\s*[:：]\s*$/u, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function uniqueStrings(values: Array<string | undefined | null>): string[] {
  return Array.from(
    new Set(
      values.filter((v): v is string => typeof v === 'string' && v.trim().length > 0).map(v => v.trim())
    )
  );
}
