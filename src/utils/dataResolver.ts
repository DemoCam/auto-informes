/**
 * Data Resolver
 * 
 * Resolves data for each widget based on its aggregation mode:
 * - snapshot: uses ONLY the last cut's data
 * - aggregated: merges data from ALL cuts in the reportingMonth
 * 
 * This replaces the old aggregator.ts with correct per-widget logic.
 */
import type { ZipEntity, ParsedCsv, ResolvedDashboardData } from '../types';
import { getNumericValue, findColumn } from './csvNormalizer';
import type { WidgetAggregation } from './widgetConfig';

/**
 * Resolve which entities belong to a given family + reportingMonth.
 * Returns them sorted by cutDate ascending with lastCut identified.
 */
export function resolveEntitiesForMonth(
  allEntities: ZipEntity[],
  family: ZipEntity['sourceType'],
  reportingMonth: string
): ResolvedDashboardData {
  const familyCuts = allEntities
    .filter((e) => e.sourceType === family && e.reportingMonth === reportingMonth)
    .sort((a, b) => a.cutDate.localeCompare(b.cutDate));

  return {
    allCuts: familyCuts,
    lastCut: familyCuts.length > 0 ? familyCuts[familyCuts.length - 1] : null,
    reportingMonth,
    sortedCuts: familyCuts,
  };
}

/**
 * Resolve entities for a single cut date (single_cut view mode).
 */
export function resolveEntitiesForCut(
  allEntities: ZipEntity[],
  family: ZipEntity['sourceType'],
  cutDate: string
): ResolvedDashboardData {
  const cut = allEntities.find((e) => e.sourceType === family && e.cutDate === cutDate);
  const cuts = cut ? [cut] : [];
  return {
    allCuts: cuts,
    lastCut: cut || null,
    reportingMonth: cut?.reportingMonth || '',
    sortedCuts: cuts,
  };
}

/**
 * Get the correct CSV data for a widget based on its aggregation mode.
 * 
 * - snapshot: returns data from lastCut only
 * - aggregated: returns data from ALL cuts
 * 
 * For a single CSV file, returns either the last cut's version or all versions.
 */
export function getWidgetCsvData(
  resolved: ResolvedDashboardData,
  fileName: string,
  aggregation: WidgetAggregation
): ParsedCsv[] {
  if (aggregation === 'snapshot') {
    // Use only the last cut
    if (!resolved.lastCut) return [];
    const csv = resolved.lastCut.normalizedData[fileName];
    return csv ? [csv] : [];
  } else {
    // Use all cuts
    return resolved.sortedCuts
      .map((e) => e.normalizedData[fileName])
      .filter((csv): csv is ParsedCsv => csv !== undefined && !csv.isEmpty);
  }
}

/**
 * Get a single CSV (snapshot) — convenience for snapshot widgets.
 */
export function getSnapshotCsv(
  resolved: ResolvedDashboardData,
  fileName: string
): ParsedCsv | null {
  if (!resolved.lastCut) return null;
  const csv = resolved.lastCut.normalizedData[fileName];
  return csv && !csv.isEmpty ? csv : null;
}

/**
 * Merge top-N data from multiple CSVs (aggregated mode).
 * Groups by keyColumn, sums valueColumn, sorts descending.
 */
export function mergeTopN(
  csvs: ParsedCsv[],
  keyColumn: string,
  valueColumn: string,
  limit?: number
): { name: string; value: number }[] {
  const accumulated: Record<string, number> = {};

  for (const csv of csvs) {
    const colKey = findColumn(csv, keyColumn);
    const colVal = findColumn(csv, valueColumn);
    if (!colKey || !colVal) continue;

    for (const row of csv.rows) {
      const key = String(row[colKey] ?? '').trim();
      if (!key) continue;
      const val = getNumericValue(row[colVal]);
      accumulated[key] = (accumulated[key] || 0) + val;
    }
  }

  const sorted = Object.entries(accumulated)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => {
      if (b.value !== a.value) return b.value - a.value;
      return a.name.localeCompare(b.name); // alphabetic tiebreaker
    });

  return limit ? sorted.slice(0, limit) : sorted;
}

/**
 * Merge time series from multiple CSVs (aggregated mode).
 * Groups by date, sums values for duplicate dates, sorts ascending.
 */
export function mergeTimeSeries(
  csvs: ParsedCsv[],
  dateColumn: string,
  valueColumn: string
): { date: string; value: number }[] {
  const byDate: Record<string, number> = {};

  for (const csv of csvs) {
    const colDate = findColumn(csv, dateColumn);
    const colVal = findColumn(csv, valueColumn);
    if (!colDate || !colVal) continue;

    for (const row of csv.rows) {
      const date = String(row[colDate] ?? '').trim();
      if (!date) continue;
      const val = getNumericValue(row[colVal]);
      if (!byDate[date]) byDate[date] = 0;
      byDate[date] += val;
    }
  }

  return Object.entries(byDate)
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Sum a KPI value across multiple CSVs (aggregated mode).
 * Extracts the first non-null value from each CSV and sums them.
 */
export function aggregateKpiSum(
  csvs: ParsedCsv[],
  columnName: string
): number | null {
  let total = 0;
  let found = false;

  for (const csv of csvs) {
    const col = findColumn(csv, columnName);
    if (!col) continue;

    for (const row of csv.rows) {
      const val = row[col];
      if (val !== null && val !== undefined && val !== '') {
        total += getNumericValue(val);
        found = true;
        break; // Take first non-null per CSV (KPI files have duplicated rows)
      }
    }
  }

  return found ? total : null;
}

/**
 * Get a snapshot KPI value from the last cut only.
 */
export function snapshotKpiValue(
  resolved: ResolvedDashboardData,
  fileName: string,
  columnName: string
): number | null {
  const csv = getSnapshotCsv(resolved, fileName);
  if (!csv) return null;

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
 * Merge Sankey data from multiple CSVs (aggregated mode).
 * Deduplicates and sums link values.
 */
export function mergeSankeyData(
  csvs: ParsedCsv[],
  columns: { user: string; policy: string; publisher: string; dest: string; bytes: string }
): { nodes: { name: string }[]; links: { source: string; target: string; value: number }[] } | null {
  const nodeSet = new Set<string>();
  const linkMap: Record<string, number> = {};

  for (const csv of csvs) {
    const colUser = findColumn(csv, columns.user);
    const colPolicy = findColumn(csv, columns.policy);
    const colPublisher = findColumn(csv, columns.publisher);
    const colDest = findColumn(csv, columns.dest);
    const colBytes = findColumn(csv, columns.bytes);
    if (!colUser || !colPolicy || !colPublisher || !colDest || !colBytes) continue;

    for (const row of csv.rows) {
      const user = String(row[colUser] ?? '').trim();
      const policy = String(row[colPolicy] ?? '').trim();
      const publisher = String(row[colPublisher] ?? '').trim();
      const dest = String(row[colDest] ?? '').trim();
      const bytes = getNumericValue(row[colBytes]);

      if (!user || !policy || !publisher || !dest || bytes <= 0) continue;

      nodeSet.add(user);
      nodeSet.add(policy);
      nodeSet.add(publisher);
      nodeSet.add(dest);

      const k1 = `${user}||${policy}`;
      const k2 = `${policy}||${publisher}`;
      const k3 = `${publisher}||${dest}`;
      linkMap[k1] = (linkMap[k1] || 0) + bytes;
      linkMap[k2] = (linkMap[k2] || 0) + bytes;
      linkMap[k3] = (linkMap[k3] || 0) + bytes;
    }
  }

  if (nodeSet.size === 0) return null;

  return {
    nodes: Array.from(nodeSet).map((name) => ({ name })),
    links: Object.entries(linkMap).map(([key, value]) => {
      const [source, target] = key.split('||');
      return { source, target, value };
    }),
  };
}
