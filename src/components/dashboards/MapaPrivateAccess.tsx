/**
 * Dashboard B: Mapa — Private Access Overview  
 * Mixed modes. FIXED: Sankey labels, pie legends, layout proportions.
 */
import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { DashboardCard } from '../shared/DashboardCard';
import { KpiCard } from '../shared/KpiCard';
import { FallbackMessage } from '../shared/FallbackMessage';
import { ExportButton } from '../shared/ExportButton';
import { CHART_COLORS, KPI_COLORS } from '../../utils/colorPalette';
import {
  getWidgetCsvData, mergeTopN, mergeSankeyData,
  aggregateKpiSum, snapshotKpiValue,
} from '../../utils/dataResolver';
import type { ResolvedDashboardData } from '../../types';

interface Props {
  resolved: ResolvedDashboardData;
}

export const MapaPrivateAccess: React.FC<Props> = ({ resolved }) => {
  // ─── Sankey (AGGREGATED) ───
  const sankeyOption = useMemo(() => {
    const csvs = getWidgetCsvData(resolved, 'private_access_publisher_usage_by_bytes.csv', 'aggregated');
    if (csvs.length === 0) return null;
    const result = mergeSankeyData(csvs, {
      user: 'User', policy: 'Policy Name', publisher: 'Publisher CN',
      dest: 'Destination Host', bytes: 'Sum - Total Bytes (MB)',
    });
    if (!result) return null;
    return {
      tooltip: { trigger: 'item' as const },
      series: [{
        type: 'sankey', data: result.nodes, links: result.links,
        emphasis: { focus: 'adjacency' },
        lineStyle: { color: 'gradient', curveness: 0.5 },
        label: { fontSize: 8, overflow: 'truncate', width: 100 },
        nodeWidth: 16, nodeGap: 10, layoutIterations: 32,
        left: 10, right: 10, top: 10, bottom: 10,
      }],
    };
  }, [resolved]);

  // ─── Policies Pie (AGGREGATED) ───
  const policiesPieOption = useMemo(() => {
    const csvs = getWidgetCsvData(resolved, 'most_used_policies.csv', 'aggregated');
    if (csvs.length === 0) return null;
    const items = mergeTopN(csvs, 'Policy Name', 'Sum - App Hits');
    if (items.length === 0) return null;
    const total = items.reduce((s, d) => s + d.value, 0);
    return {
      tooltip: { trigger: 'item' as const, formatter: '{b}: {c} ({d}%)' },
      legend: {
        type: 'scroll' as const, orient: 'vertical' as const,
        right: 0, top: 10, bottom: 10, width: 140,
        textStyle: { fontSize: 9 },
        formatter: (name: string) => {
          const item = items.find((d) => d.name === name);
          const pct = item ? ((item.value / total) * 100).toFixed(1) : '0';
          const short = name.length > 18 ? name.substring(0, 18) + '…' : name;
          return `${short} ${pct}%`;
        },
      },
      series: [{ type: 'pie', radius: ['0%', '60%'], center: ['28%', '50%'],
        data: items, label: { show: false }, color: CHART_COLORS,
        itemStyle: { borderColor: '#fff', borderWidth: 2 },
      }],
    };
  }, [resolved]);

  // ─── Private Apps Pie (AGGREGATED) ───
  const privateAppsPieOption = useMemo(() => {
    const csvs = getWidgetCsvData(resolved, 'top_private_apps_by_total_bytes.csv', 'aggregated');
    if (csvs.length === 0) return null;
    const items = mergeTopN(csvs, 'Destination Host', 'Total Bytes (MB)');
    if (items.length === 0) return null;
    const total = items.reduce((s, d) => s + d.value, 0);
    return {
      tooltip: { trigger: 'item' as const, formatter: '{b}: {c} MB ({d}%)' },
      legend: {
        type: 'scroll' as const, orient: 'vertical' as const,
        right: 0, top: 10, bottom: 10, width: 140,
        textStyle: { fontSize: 9 },
        formatter: (name: string) => {
          const item = items.find((d) => d.name === name);
          const pct = item ? ((item.value / total) * 100).toFixed(1) : '0';
          const short = name.length > 16 ? name.substring(0, 16) + '…' : name;
          return `${short} ${pct}%`;
        },
      },
      series: [{ type: 'pie', radius: ['0%', '60%'], center: ['28%', '50%'],
        data: items, label: { show: false }, color: CHART_COLORS,
        itemStyle: { borderColor: '#fff', borderWidth: 2 },
      }],
    };
  }, [resolved]);

  // ─── KPIs ───
  const kpis = useMemo(() => {
    const uploadedCsvs = getWidgetCsvData(resolved, 'uploaded.csv', 'aggregated');
    const downloadedCsvs = getWidgetCsvData(resolved, 'downloaded.csv', 'aggregated');
    const sessionsCsvs = getWidgetCsvData(resolved, 'total_sessions.csv', 'aggregated');
    const uploaded = aggregateKpiSum(uploadedCsvs, 'Uploaded');
    const downloaded = aggregateKpiSum(downloadedCsvs, 'Downloaded');
    const sessions = aggregateKpiSum(sessionsCsvs, '# Network Sessions');
    const policies = snapshotKpiValue(resolved, 'total_policies_access.csv', 'Count of Policy Name');
    const publishers = snapshotKpiValue(resolved, 'active_publishers_count.csv', 'Count of Publisher CN');
    const apps = snapshotKpiValue(resolved, 'discovered_apps.csv', 'Total Apps');
    const users = snapshotKpiValue(resolved, 'users.csv', 'Count of User');
    const dataCenters = snapshotKpiValue(resolved, 'netskope_dc_count.csv', 'Count of Netskope Host POP');
    return { uploaded, downloaded, policies, publishers, apps, users, sessions, dataCenters };
  }, [resolved]);

  const fmt = (val: number | null, dec = 0): string => {
    if (val === null) return '—';
    if (dec > 0) return val.toFixed(dec);
    return val.toLocaleString('es-CO');
  };

  return (
    <div id="dashboard-mapa-private-access">
      <div className="export-container">
        <ExportButton targetId="dashboard-mapa-private-access" filename="private_access" />
      </div>
      <div className="private-access-layout">
        <div className="sankey-area">
          <DashboardCard title="Private Access Publisher Usage by Bytes"
            subtitle="Users → Access Policy → Publisher → Destination Host">
            {sankeyOption ? <ReactECharts option={sankeyOption} style={{ height: 380 }} notMerge={true} />
              : <FallbackMessage title="Datos de Sankey no disponibles" />}
          </DashboardCard>
        </div>
        <div className="policies-area">
          <DashboardCard title="Most Used Policies">
            {policiesPieOption ? <ReactECharts option={policiesPieOption} style={{ height: 340 }} notMerge={true} />
              : <FallbackMessage title="Datos no disponibles" />}
          </DashboardCard>
        </div>
        <div className="kpi-area">
          <div className="grid-2x4">
            <KpiCard value={fmt(kpis.uploaded, 2)} label="Uploaded (GB)" color={KPI_COLORS.uploaded} />
            <KpiCard value={fmt(kpis.downloaded, 2)} label="Downloaded (GB)" color={KPI_COLORS.downloaded} />
            <KpiCard value={fmt(kpis.policies)} label="Policies Accessed" color={KPI_COLORS.policiesAccessed} />
            <KpiCard value={fmt(kpis.publishers)} label="Active Publishers" color={KPI_COLORS.activePublishers} />
            <KpiCard value={fmt(kpis.apps)} label="Discovered Apps" color={KPI_COLORS.discoveredApps} />
            <KpiCard value={fmt(kpis.users)} label="Discovered Users" color={KPI_COLORS.discoveredUsers} />
            <KpiCard value={fmt(kpis.sessions)} label="Sessions" color={KPI_COLORS.sessions} />
            <KpiCard value={fmt(kpis.dataCenters)} label="Data Centers" color={KPI_COLORS.dataCenters} />
          </div>
        </div>
        <div className="private-apps-area">
          <DashboardCard title="Top Private Apps by Total Bytes">
            {privateAppsPieOption ? <ReactECharts option={privateAppsPieOption} style={{ height: 320 }} notMerge={true} />
              : <FallbackMessage title="Datos no disponibles" />}
          </DashboardCard>
        </div>
      </div>
    </div>
  );
};
