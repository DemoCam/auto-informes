/**
 * Dashboard G: IA — CCL Overview  
 * Mixed modes. FIXED: donut legend overlap.
 */
import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { DashboardCard } from '../shared/DashboardCard';
import { DataTable } from '../shared/DataTable';
import { FallbackMessage } from '../shared/FallbackMessage';
import { ExportButton } from '../shared/ExportButton';
import { CCL_COLORS } from '../../utils/colorPalette';
import { getSnapshotCsv, getWidgetCsvData } from '../../utils/dataResolver';
import { getNumericValue, findColumn } from '../../utils/csvNormalizer';
import type { ResolvedDashboardData } from '../../types';

interface Props { resolved: ResolvedDashboardData; }

function buildDonutOption(
  items: { name: string; value: number }[],
  valueLabel: string
) {
  if (items.length === 0) return null;
  const total = items.reduce((s, d) => s + d.value, 0);
  const displayItems = items.map((d) => ({
    name: d.name.charAt(0).toUpperCase() + d.name.slice(1),
    value: d.value,
  }));
  const displayColors = displayItems.map((d) => CCL_COLORS[d.name.toLowerCase()] || '#9E9E9E');
  return {
    tooltip: { trigger: 'item' as const, formatter: `{b}: {c} ${valueLabel} ({d}%)` },
    legend: {
      type: 'scroll' as const, orient: 'vertical' as const,
      right: 0, top: 20, bottom: 20, width: 100,
      textStyle: { fontSize: 10 },
      formatter: (name: string) => {
        const item = displayItems.find((d) => d.name === name);
        const pct = item ? ((item.value / total) * 100).toFixed(1) : '0';
        return `${name} ${pct}%`;
      },
    },
    color: displayColors,
    series: [{ type: 'pie', radius: ['35%', '65%'], center: ['30%', '50%'],
      data: displayItems, label: { show: false },
      itemStyle: { borderColor: '#fff', borderWidth: 2 } }],
  };
}

export const IaCclOverview: React.FC<Props> = ({ resolved }) => {
  const donut1 = useMemo(() => {
    const csv = getSnapshotCsv(resolved, 'count_of_ai_apps_by_ccl.csv');
    if (!csv) return null;
    const colCat = findColumn(csv, 'CCL');
    const colVal = findColumn(csv, '# Applications');
    if (!colCat || !colVal) return null;
    const items = csv.rows
      .map((r) => ({ name: String(r[colCat] ?? '').trim().toLowerCase(), value: getNumericValue(r[colVal]) }))
      .filter((d) => d.name);
    return buildDonutOption(items, 'apps');
  }, [resolved]);

  const donut2 = useMemo(() => {
    const csvs = getWidgetCsvData(resolved, 'ai_usage_in_total_bytes_by_ccl.csv', 'aggregated');
    if (csvs.length === 0) return null;
    const accumulated: Record<string, number> = {};
    for (const csv of csvs) {
      const colCat = findColumn(csv, 'CCL');
      const colVal = findColumn(csv, 'Sum - Total Bytes (GB)');
      if (!colCat || !colVal) continue;
      for (const row of csv.rows) {
        const key = String(row[colCat] ?? '').trim().toLowerCase();
        if (!key) continue;
        accumulated[key] = (accumulated[key] || 0) + getNumericValue(row[colVal]);
      }
    }
    const items = Object.entries(accumulated).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    return buildDonutOption(items, 'GB');
  }, [resolved]);

  const tableData = useMemo(() => {
    const csv = getSnapshotCsv(resolved, 'ai_apps_used_by_ccl_score.csv');
    if (!csv) return null;
    const colApp = findColumn(csv, 'Application');
    const colCci = findColumn(csv, 'CCI');
    if (!colApp) return null;
    return csv.rows.map((r) => ({
      Application: String(r[colApp] ?? ''),
      CCI: colCci ? getNumericValue(r[colCci]) : '',
    }));
  }, [resolved]);

  return (
    <div id="dashboard-ia-ccl-overview">
      <div className="export-container">
        <ExportButton targetId="dashboard-ia-ccl-overview" filename="ia_ccl_overview" />
      </div>
      <div className="grid-3">
        <DashboardCard title="Count of AI Apps by CCL">
          {donut1 ? <ReactECharts option={donut1} style={{ height: 320 }} notMerge={true} />
            : <FallbackMessage title="Datos no disponibles" />}
        </DashboardCard>
        <DashboardCard title="AI Usage in Total Bytes by CCL">
          {donut2 ? <ReactECharts option={donut2} style={{ height: 320 }} notMerge={true} />
            : <FallbackMessage title="Datos no disponibles" />}
        </DashboardCard>
        <DashboardCard title="AI Apps Used by CCL Score">
          {tableData ? (
            <DataTable headers={[
              { key: 'Application', label: 'Application' },
              { key: 'CCI', label: 'CCI', align: 'right' },
            ]} rows={tableData} maxHeight={300} />
          ) : <FallbackMessage title="Datos no disponibles" />}
        </DashboardCard>
      </div>
    </div>
  );
};
