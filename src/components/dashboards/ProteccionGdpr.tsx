/**
 * Dashboard C: Protección — GDPR Level + Top 20
 * Both widgets are SNAPSHOT. FIXED: pie legend spacing.
 */
import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { DashboardCard } from '../shared/DashboardCard';
import { DataTable } from '../shared/DataTable';
import { FallbackMessage } from '../shared/FallbackMessage';
import { ExportButton } from '../shared/ExportButton';
import { GDPR_COLORS } from '../../utils/colorPalette';
import { getSnapshotCsv } from '../../utils/dataResolver';
import { getNumericValue, findColumn } from '../../utils/csvNormalizer';
import type { ResolvedDashboardData } from '../../types';

interface Props { resolved: ResolvedDashboardData; }

export const ProteccionGdpr: React.FC<Props> = ({ resolved }) => {
  const pieOption = useMemo(() => {
    const csv = getSnapshotCsv(resolved, '#_of_risky_applications_by_gdpr_level.csv');
    if (!csv) return null;
    const colLevel = findColumn(csv, 'GDPR Level');
    const colApps = findColumn(csv, '# Applications');
    if (!colLevel || !colApps) return null;
    const items = csv.rows
      .map((r) => ({ name: String(r[colLevel] ?? '').trim(), value: getNumericValue(r[colApps]) }))
      .filter((d) => d.name).sort((a, b) => b.value - a.value);
    const total = items.reduce((s, d) => s + d.value, 0);
    const colors = items.map((d) => GDPR_COLORS[d.name.toLowerCase()] || '#9E9E9E');
    return {
      tooltip: { trigger: 'item' as const, formatter: '{b}: {c} ({d}%)' },
      legend: {
        type: 'scroll' as const, orient: 'vertical' as const,
        right: 0, top: 20, bottom: 20, width: 160,
        textStyle: { fontSize: 11 },
        formatter: (name: string) => {
          const item = items.find((d) => d.name === name);
          const pct = item ? ((item.value / total) * 100).toFixed(1) : '0';
          return `${name} ${pct}%`;
        },
      },
      color: colors,
      series: [{ type: 'pie', radius: ['0%', '65%'], center: ['30%', '50%'],
        data: items, label: { show: false },
        itemStyle: { borderColor: '#fff', borderWidth: 2 },
      }],
    };
  }, [resolved]);

  const tableData = useMemo(() => {
    const csv = getSnapshotCsv(resolved, 'top_20_risky_applications_with_low_gdpr_level.csv');
    if (!csv) return null;
    const colApp = findColumn(csv, 'Application');
    if (!colApp) return null;
    const colCat = findColumn(csv, 'Category');
    const colCcl = findColumn(csv, 'CCL');
    const colSessions = findColumn(csv, '# Sessions');
    const colUsers = findColumn(csv, '# Users');
    const colUpload = findColumn(csv, 'Sum - Bytes Uploaded');
    const colDownload = findColumn(csv, 'Sum - Bytes Downloaded');
    return csv.rows.map((r, idx) => ({
      idx: idx + 1,
      Application: String(r[colApp] ?? ''),
      Category: colCat ? String(r[colCat] ?? '') : '',
      CCL: colCcl ? String(r[colCcl] ?? '') : '',
      Sessions: colSessions ? getNumericValue(r[colSessions]) : 0,
      Users: colUsers ? getNumericValue(r[colUsers]) : 0,
      Uploaded: colUpload ? getNumericValue(r[colUpload]) : 0,
      Downloaded: colDownload ? getNumericValue(r[colDownload]) : 0,
    }));
  }, [resolved]);

  return (
    <div id="dashboard-proteccion-gdpr">
      <div className="export-container">
        <ExportButton targetId="dashboard-proteccion-gdpr" filename="proteccion_gdpr" />
      </div>
      <div className="grid-2">
        <DashboardCard title="# of Risky Applications by GDPR Level">
          {pieOption ? <ReactECharts option={pieOption} style={{ height: 370 }} notMerge={true} />
            : <FallbackMessage title="Datos no disponibles" />}
        </DashboardCard>
        <DashboardCard title="Top 20 Risky Applications with Low GDPR Level">
          {tableData ? (
            <DataTable
              headers={[
                { key: 'idx', label: '#', align: 'center' },
                { key: 'Application', label: 'Application' },
                { key: 'Category', label: 'Category' },
                { key: 'CCL', label: 'CCL' },
                { key: 'Sessions', label: '# Sessions', align: 'right' },
                { key: 'Users', label: '# Users', align: 'right' },
                { key: 'Uploaded', label: 'Bytes Up', align: 'right' },
                { key: 'Downloaded', label: 'Bytes Down', align: 'right' },
              ]}
              rows={tableData}
              maxHeight={400}
              inlineBars={[
                { column: 'Uploaded', color: '#64B5F6' },
                { column: 'Downloaded', color: '#90CAF9' },
              ]}
            />
          ) : <FallbackMessage title="Datos no disponibles" />}
        </DashboardCard>
      </div>
    </div>
  );
};
