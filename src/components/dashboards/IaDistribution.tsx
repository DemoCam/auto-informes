/**
 * Dashboard F: IA — Risky AI Apps Distribution  
 * ALL 3 widgets are AGGREGATED. FIXED: chart layouts.
 */
import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { DashboardCard } from '../shared/DashboardCard';
import { FallbackMessage } from '../shared/FallbackMessage';
import { ExportButton } from '../shared/ExportButton';
import { CHART_COLORS } from '../../utils/colorPalette';
import { getWidgetCsvData, mergeTimeSeries, mergeTopN } from '../../utils/dataResolver';
import type { ResolvedDashboardData } from '../../types';

interface Props { resolved: ResolvedDashboardData; }

export const IaDistribution: React.FC<Props> = ({ resolved }) => {
  const lineOption = useMemo(() => {
    const csvs = getWidgetCsvData(resolved, 'number_of_users_accessing_risky_ai_apps.csv', 'aggregated');
    if (csvs.length === 0) return null;
    const series = mergeTimeSeries(csvs, 'Event Date', '# Users');
    if (series.length === 0) return null;
    return {
      tooltip: { trigger: 'axis' as const },
      grid: { left: 50, right: 15, bottom: 70, top: 20 },
      xAxis: { type: 'category' as const, data: series.map((d) => d.date),
        axisLabel: { rotate: 45, fontSize: 8, interval: 0 } },
      yAxis: { type: 'value' as const, axisLabel: { fontSize: 10 },
        splitLine: { lineStyle: { color: '#f0f0f0' } } },
      series: [{
        type: 'line', data: series.map((d) => d.value), smooth: true,
        lineStyle: { color: '#00BCD4', width: 2 },
        itemStyle: { color: '#00BCD4' },
        areaStyle: { color: 'rgba(0, 188, 212, 0.08)' },
      }],
    };
  }, [resolved]);

  const barOption = useMemo(() => {
    const csvs = getWidgetCsvData(resolved, 'top_10_organization_unit_using_risky_ai_apps.csv', 'aggregated');
    if (csvs.length === 0) return null;
    const items = mergeTopN(csvs, 'Organization Unit Level1', '# Applications', 10);
    if (items.length === 0) return null;
    const reversed = [...items].reverse();
    return {
      tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } },
      grid: { left: 150, right: 30, bottom: 20, top: 20 },
      xAxis: { type: 'value' as const, axisLabel: { fontSize: 10 },
        splitLine: { lineStyle: { color: '#f0f0f0' } } },
      yAxis: { type: 'category' as const, data: reversed.map((d) => d.name),
        axisLabel: { fontSize: 9,
          formatter: (v: string) => v.length > 18 ? v.substring(0, 18) + '…' : v } },
      series: [{ type: 'bar', data: reversed.map((d) => d.value),
        itemStyle: { color: '#00BCD4', borderRadius: [0, 3, 3, 0] }, barMaxWidth: 24 }],
    };
  }, [resolved]);

  const pieOption = useMemo(() => {
    const csvs = getWidgetCsvData(resolved, 'top_10_risky_ai_apps.csv', 'aggregated');
    if (csvs.length === 0) return null;
    const items = mergeTopN(csvs, 'Application', '# Applications', 10);
    if (items.length === 0) return null;
    return {
      tooltip: { trigger: 'item' as const, formatter: '{b}: {c} ({d}%)' },
      legend: {
        type: 'scroll' as const, orient: 'vertical' as const,
        right: 0, top: 10, bottom: 10, width: 100,
        textStyle: { fontSize: 9 },
        formatter: (name: string) => name.length > 14 ? name.substring(0, 14) + '…' : name,
      },
      series: [{ type: 'pie', radius: ['0%', '60%'], center: ['32%', '50%'],
        data: items, label: { show: false }, color: CHART_COLORS,
        itemStyle: { borderColor: '#fff', borderWidth: 2 } }],
    };
  }, [resolved]);

  return (
    <div id="dashboard-ia-distribution">
      <div className="export-container">
        <ExportButton targetId="dashboard-ia-distribution" filename="ia_distribution" />
      </div>
      <div className="grid-3">
        <DashboardCard title="Users Accessing Risky AI Apps">
          {lineOption ? <ReactECharts option={lineOption} style={{ height: 320 }} notMerge={true} />
            : <FallbackMessage title="Datos no disponibles" />}
        </DashboardCard>
        <DashboardCard title="Top 10 Org Units Using Risky AI Apps">
          {barOption ? <ReactECharts option={barOption} style={{ height: 320 }} notMerge={true} />
            : <FallbackMessage title="Datos no disponibles" />}
        </DashboardCard>
        <DashboardCard title="Top 10 Risky AI Apps">
          {pieOption ? <ReactECharts option={pieOption} style={{ height: 320 }} notMerge={true} />
            : <FallbackMessage title="Datos no disponibles" />}
        </DashboardCard>
      </div>
    </div>
  );
};
