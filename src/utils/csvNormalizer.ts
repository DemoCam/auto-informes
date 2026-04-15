/**
 * CSV Normalizer
 * Applies all 8 normalization rules before any dashboard uses the data.
 */
import Papa from 'papaparse';
import type { ParsedCsv, ValidationIssue } from '../types';

/**
 * Parse a single CSV string into a normalized ParsedCsv.
 */
export function parseCsvString(
  raw: string,
  fileName: string
): { data: ParsedCsv; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];

  if (!raw || raw.trim().length === 0) {
    issues.push({
      severity: 'warning',
      message: `Archivo vacío: ${fileName}`,
      file: fileName,
    });
    return {
      data: { fileName, headers: [], rows: [], isEmpty: true },
      issues,
    };
  }

  const result = Papa.parse<Record<string, string>>(raw, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  });

  if (result.errors.length > 0) {
    result.errors.forEach((e) => {
      issues.push({
        severity: 'warning',
        message: `CSV parse warning in ${fileName}: ${e.message} (row ${e.row})`,
        file: fileName,
      });
    });
  }

  // Rule 1: headers are already trimmed by transformHeader
  let headers = result.meta.fields || [];

  // Rule 2: remove "Unnamed: X" columns
  const unnamedCols = headers.filter((h) => /^Unnamed/i.test(h));
  if (unnamedCols.length > 0) {
    issues.push({
      severity: 'info',
      message: `Columnas sin nombre eliminadas en ${fileName}: ${unnamedCols.join(', ')}`,
      file: fileName,
    });
    headers = headers.filter((h) => !/^Unnamed/i.test(h));
  }

  // Process rows
  const rows = result.data.map((row) => {
    const cleaned: Record<string, unknown> = {};
    for (const h of headers) {
      cleaned[h] = normalizeValue(row[h]);
    }
    return cleaned;
  });

  // Rule 6: filter out completely empty rows
  const nonEmptyRows = rows.filter((row) =>
    Object.values(row).some((v) => v !== null && v !== undefined && v !== '')
  );

  return {
    data: {
      fileName,
      headers,
      rows: nonEmptyRows,
      isEmpty: nonEmptyRows.length === 0,
    },
    issues,
  };
}

/**
 * Normalize a single cell value.
 * Rules 3, 4, 5: numbers with commas, percentage strings, null categories
 */
function normalizeValue(val: unknown): unknown {
  if (val === null || val === undefined) return null;

  const s = String(val).trim();
  if (s === '' || s.toLowerCase() === 'null' || s.toLowerCase() === 'nan') {
    return null;
  }

  // Rule 4: percentage string — e.g. "71%", "7,778%"
  // Netskope stores some percentages as centesimal values with comma thousands separator:
  //   "7,500%" → 7500 → ÷100 → 75.00
  //   "6,667%" → 6667 → ÷100 → 66.67
  if (s.endsWith('%')) {
    const numStr = s.slice(0, -1).trim();
    const parsed = parseNumericString(numStr);
    if (parsed !== null) {
      // If the value is >= 1000, it's in centesimal format — divide by 100
      // This handles Netskope's "7,500%" = 75.00% pattern
      if (parsed >= 1000) {
        return parsed / 100;
      }
      return parsed;
    }
    return s; // fallback: return as-is
  }

  // Rule 3: numeric string with commas — e.g. "4,583" or "26,187.42"
  const numericAttempt = parseNumericString(s);
  if (numericAttempt !== null) return numericAttempt;

  return s;
}

/**
 * Parse a numeric string that may use commas as thousands separators
 * or as decimal separator (European style).
 *
 * Strategy:
 * - If contains both ',' and '.': commas are thousands separators
 * - If contains only ',': check if it looks like decimal (e.g. "7,778")
 *   vs thousands (e.g. "4,583")
 *   Heuristic: if exactly 3 digits after last comma → thousands separator
 * - Otherwise: standard parseFloat
 */
function parseNumericString(s: string): number | null {
  // Pure digits
  if (/^\d+$/.test(s)) {
    return parseInt(s, 10);
  }

  // Has both comma and dot: commas are thousands
  if (s.includes(',') && s.includes('.')) {
    const cleaned = s.replace(/,/g, '');
    const n = parseFloat(cleaned);
    return isNaN(n) ? null : n;
  }

  // Only commas — decide if thousands or decimal
  if (s.includes(',') && !s.includes('.')) {
    const parts = s.split(',');
    const lastPart = parts[parts.length - 1];
    if (lastPart.length === 3 && parts.length >= 2) {
      // Thousands separator pattern: "4,583" = 4583, "1,234,567" = 1234567
      const cleaned = s.replace(/,/g, '');
      const n = parseFloat(cleaned);
      return isNaN(n) ? null : n;
    } else {
      // Decimal comma: "7,778" = 7.778
      const cleaned = s.replace(',', '.');
      const n = parseFloat(cleaned);
      return isNaN(n) ? null : n;
    }
  }

  // Only dots or plain float
  if (/^-?\d*\.?\d+$/.test(s)) {
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
  }

  return null;
}

/**
 * Get a numeric value from a parsed row/column.
 * Handles the case where data was already normalized to a number.
 */
export function getNumericValue(val: unknown): number {
  if (typeof val === 'number') return val;
  if (val === null || val === undefined) return 0;
  const s = String(val).trim();
  const parsed = parseNumericString(s.replace('%', ''));
  return parsed ?? 0;
}

/**
 * Extract a single KPI value from a CSV where the value is repeated or has duplicates.
 * Takes the first non-null value.
 */
export function extractSingleKpiValue(
  csv: ParsedCsv,
  columnName: string
): number | null {
  const col = findColumn(csv, columnName);
  if (!col) return null;

  for (const row of csv.rows) {
    const val = row[col];
    if (val !== null && val !== undefined && val !== '') {
      return getNumericValue(val);
    }
  }
  return null;
}

/**
 * Fuzzy column finder: matches trimmed, case-insensitive column names.
 * Returns the actual column name from headers.
 */
export function findColumn(csv: ParsedCsv, target: string): string | null {
  const t = target.trim().toLowerCase();
  return csv.headers.find((h) => h.trim().toLowerCase() === t) || null;
}

/**
 * Detect whether a CSV contains a percentage column or a count column.
 * Used for IA risk attribute files where the format changes between cuts.
 */
export function detectPercentageOrCount(csv: ParsedCsv): {
  type: 'percentage' | 'count' | 'unknown';
  column: string | null;
  value: number | null;
} {
  for (const h of csv.headers) {
    const lower = h.toLowerCase();
    if (lower.includes('%') || lower.includes('percent') || lower.includes('risky')) {
      // Check if values look like percentages (0-100 range typically)
      const val = extractFirstValue(csv, h);
      if (val !== null) {
        return { type: 'percentage', column: h, value: val };
      }
    }
  }

  for (const h of csv.headers) {
    const lower = h.toLowerCase();
    if (
      lower.includes('#') ||
      lower.includes('count') ||
      lower.includes('number') ||
      lower.includes('applications') ||
      lower.includes('apps')
    ) {
      const val = extractFirstValue(csv, h);
      if (val !== null) {
        return { type: 'count', column: h, value: val };
      }
    }
  }

  // Fallback: try first numeric column
  for (const h of csv.headers) {
    if (/^Unnamed/i.test(h)) continue;
    const val = extractFirstValue(csv, h);
    if (val !== null) {
      return { type: 'unknown', column: h, value: val };
    }
  }

  return { type: 'unknown', column: null, value: null };
}

function extractFirstValue(csv: ParsedCsv, column: string): number | null {
  for (const row of csv.rows) {
    const val = row[column];
    if (val !== null && val !== undefined && val !== '') {
      return getNumericValue(val);
    }
  }
  return null;
}
