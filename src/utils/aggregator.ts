/**
 * Aggregator
 * Handles monthly aggregation of data from multiple ZIP cuts.
 * Modes: average, cumulative, latest
 */
import type { ParsedCsv } from '../types';
import { getNumericValue } from './csvNormalizer';

export type AggregationMode = 'average' | 'cumulative' | 'latest';

/**
 * Aggregate a numeric KPI value across multiple cuts.
 */
export function aggregateKpiValues(
  values: (number | null)[],
  mode: AggregationMode
): number | null {
  const valid = values.filter((v): v is number => v !== null && !isNaN(v));
  if (valid.length === 0) return null;

  switch (mode) {
    case 'average':
      return valid.reduce((a, b) => a + b, 0) / valid.length;
    case 'cumulative':
      return valid.reduce((a, b) => a + b, 0);
    case 'latest':
      return valid[valid.length - 1];
    default:
      return valid[valid.length - 1];
  }
}

/**
 * Merge rows from multiple CSVs with the same structure.
 * For top-N charts: accumulate by key column.
 */
export function mergeTopNData(
  csvs: ParsedCsv[],
  keyColumn: string,
  valueColumn: string,
  mode: AggregationMode
): { key: string; value: number }[] {
  const accumulated: Record<string, number[]> = {};

  for (const csv of csvs) {
    for (const row of csv.rows) {
      const key = String(row[keyColumn] ?? '').trim();
      if (!key) continue;
      const val = getNumericValue(row[valueColumn]);
      if (!accumulated[key]) accumulated[key] = [];
      accumulated[key].push(val);
    }
  }

  return Object.entries(accumulated)
    .map(([key, values]) => ({
      key,
      value: aggregateKpiValues(values, mode) ?? 0,
    }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Merge time series data from multiple cuts.
 * Sums values for duplicate dates.
 */
export function mergeTimeSeries(
  csvs: ParsedCsv[],
  dateColumn: string,
  valueColumn: string
): { date: string; value: number }[] {
  const byDate: Record<string, number> = {};

  for (const csv of csvs) {
    for (const row of csv.rows) {
      const date = String(row[dateColumn] ?? '').trim();
      if (!date) continue;
      const val = getNumericValue(row[valueColumn]);
      if (!byDate[date]) byDate[date] = 0;
      byDate[date] += val;
    }
  }

  return Object.entries(byDate)
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
