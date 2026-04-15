/**
 * Dashboard A: Mapa — Top Applications & Top Users
 * Both widgets are AGGREGATED.
 * FIXED: pie legend no longer overlaps the chart
 */
import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { DashboardCard } from '../shared/DashboardCard';
import { FallbackMessage } from '../shared/FallbackMessage';
import { ExportButton } from '../shared/ExportButton';
import { CHART_COLORS } from '../../utils/colorPalette';
import { getWidgetCsvData, mergeTopN } from '../../utils/dataResolver';
import type { ResolvedDashboardData } from '../../types';

interface Props {
  resolved: ResolvedDashboardData;
}

export const MapaTopApps: React.FC<Props> = ({ resolved }) => {
  const appsData = useMemo(() => {
    const csvs = getWidgetCsvData(resolved, 'top_10_applications_by_#_sessions.csv', 'aggregated');
    if (csvs.length === 0) return null;
    return mergeTopN(csvs, 'Application Destination', 'Sum - Total Network Sessions');
  }, [resolved]);

  const usersData = useMemo(() => {
    const csvs = getWidgetCsvData(resolved, 'top_10_users_by_#_sessions.csv', 'aggregated');
    if (csvs.length === 0) return null;
    return mergeTopN(csvs, 'User', '# Network Sessions', 10);
  }, [resolved]);

  const pieOption = useMemo(() => {
    if (!appsData || appsData.length === 0) return null;
    const total = appsData.reduce((s, d) => s + d.value, 0);
    return {
      tooltip: { trigger: 'item' as const, formatter: '{b}: {c} ({d}%)' },
      legend: {
        type: 'scroll' as const,
        orient: 'vertical' as const,
        right: 0,
        top: 20,
        bottom: 20,
        width: 180,
        textStyle: { fontSize: 10 },
        formatter: (name: string) => {
          const item = appsData.find((d) => d.name === name);
          const pct = item ? ((item.value / total) * 100).toFixed(1) : '0';
          const short = name.length > 18 ? name.substring(0, 18) + '…' : name;
          return `${short}  ${pct}%`;
        },
      },
      series: [{
        type: 'pie', radius: ['0%', '65%'],
        center: ['30%', '50%'],
        data: appsData, label: { show: false },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.2)' } },
        itemStyle: { borderColor: '#fff', borderWidth: 2 },
        color: CHART_COLORS,
      }],
    };
  }, [appsData]);

  const barOption = useMemo(() => {
    if (!usersData || usersData.length === 0) return null;
    return {
      tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } },
      grid: { left: 60, right: 20, bottom: 120, top: 30 },
      xAxis: {
        type: 'category' as const, data: usersData.map((d) => d.name),
        axisLabel: { rotate: 50, fontSize: 8, interval: 0,
          formatter: (v: string) => v.length > 22 ? v.substring(0, 22) + '…' : v },
        axisTick: { alignWithLabel: true },
      },
      yAxis: {
        type: 'value' as const, axisLabel: { fontSize: 10 },
        splitLine: { lineStyle: { color: '#f0f0f0' } },
        name: '# Sessions', nameTextStyle: { fontSize: 10, color: '#888' },
      },
      series: [{
        type: 'bar', data: usersData.map((d) => d.value),
        itemStyle: { color: '#00BCD4', borderRadius: [3, 3, 0, 0] },
        barMaxWidth: 36,
      }],
    };
  }, [usersData]);

  return (
    <div id="dashboard-mapa-top-apps">
      <div className="export-container">
        <ExportButton targetId="dashboard-mapa-top-apps" filename="mapa_top_apps" />
      </div>
      <div className="grid-2">
        <DashboardCard title="Top 10 Applications by # Sessions">
          {pieOption ? <ReactECharts option={pieOption} style={{ height: 380 }} notMerge={true} />
            : <FallbackMessage title="Datos no disponibles" message="top_10_applications_by_#_sessions.csv" />}
        </DashboardCard>
        <DashboardCard title="Top 10 Users by # Sessions">
          {barOption ? <ReactECharts option={barOption} style={{ height: 380 }} notMerge={true} />
            : <FallbackMessage title="Datos no disponibles" message="top_10_users_by_#_sessions.csv" />}
        </DashboardCard>
      </div>
    </div>
  );
};
