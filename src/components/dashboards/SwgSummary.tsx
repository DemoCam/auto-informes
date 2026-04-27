/**
 * Dashboard: SWG Summary
 *
 * Three horizontal cards:
 * 1. YouTube Consumption On-Premise  (table with data bars)
 * 2. YouTube Consumption Off-Premise (table with data bars)
 * 3. Top Blocked Categories           (pie chart with legend)
 *
 * All widgets use AGGREGATED mode — sum across all monthly cuts.
 */
import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { DashboardCard } from '../shared/DashboardCard';
import { FallbackMessage } from '../shared/FallbackMessage';
import { ExportButton } from '../shared/ExportButton';
import { CHART_COLORS, SWG_BLOCKED_CATEGORY_COLORS } from '../../utils/colorPalette';
import { getWidgetCsvData, mergeTopNMultiKey, mergeAndComputePercentages } from '../../utils/dataResolver';
import type { ResolvedDashboardData } from '../../types';

interface Props {
  resolved: ResolvedDashboardData;
}

// ─── Helpers ───

/** Format number with thousands separator and 2 decimals */
function fmtMB(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Get the color for a blocked category — falls back to CHART_COLORS */
function getCategoryColor(name: string, idx: number): string {
  return SWG_BLOCKED_CATEGORY_COLORS[name] || CHART_COLORS[idx % CHART_COLORS.length];
}

// ─── Component ───

export const SwgSummary: React.FC<Props> = ({ resolved }) => {
  // ── Widget 1: YouTube On-Premise ──
  const onPremData = useMemo(() => {
    const csvs = getWidgetCsvData(resolved, 'youtube_consumption_on-premise.csv', 'aggregated');
    if (csvs.length === 0) return null;
    return mergeTopNMultiKey(csvs, ['User', 'Application'], 'Sum - Total Bytes (MB)', 11);
  }, [resolved]);

  // ── Widget 2: YouTube Off-Premise ──
  const offPremData = useMemo(() => {
    const csvs = getWidgetCsvData(resolved, 'youtube_consumption_off-premise.csv', 'aggregated');
    if (csvs.length === 0) return null;
    return mergeTopNMultiKey(csvs, ['User', 'Application'], 'Sum - Total Bytes (MB)', 11);
  }, [resolved]);

  // ── Widget 3: Top Blocked Categories ──
  const blockedData = useMemo(() => {
    const csvs = getWidgetCsvData(resolved, 'top_blocked_categories.csv', 'aggregated');
    if (csvs.length === 0) return null;
    return mergeAndComputePercentages(csvs, 'Category', '# Blocked Events');
  }, [resolved]);

  // ── Max MB values for data bars ──
  const onPremMax = useMemo(() => {
    if (!onPremData || onPremData.length === 0) return 1;
    return Math.max(...onPremData.map((r) => (r._value as number) || 0), 1);
  }, [onPremData]);

  const offPremMax = useMemo(() => {
    if (!offPremData || offPremData.length === 0) return 1;
    return Math.max(...offPremData.map((r) => (r._value as number) || 0), 1);
  }, [offPremData]);

  // ── Pie chart option ──
  const pieOption = useMemo(() => {
    if (!blockedData || blockedData.length === 0) return null;
    const colorMap = blockedData.map((d, i) => getCategoryColor(d.name, i));
    return {
      tooltip: {
        trigger: 'item' as const,
        formatter: (params: any) =>
          `${params.name}<br/>Events: ${params.value.toLocaleString()}<br/>${params.data.percentage.toFixed(2)}%`,
      },
      legend: {
        type: 'scroll' as const,
        orient: 'vertical' as const,
        right: 0,
        top: 10,
        bottom: 10,
        width: 200,
        textStyle: { fontSize: 10 },
        formatter: (name: string) => {
          const item = blockedData.find((d) => d.name === name);
          const pct = item ? item.percentage.toFixed(2) : '0.00';
          const short = name.length > 24 ? name.substring(0, 24) + '…' : name;
          return `${short} ${pct}%`;
        },
      },
      series: [{
        type: 'pie',
        radius: ['0%', '70%'],
        center: ['35%', '50%'],
        data: blockedData.map((d) => ({
          name: d.name,
          value: d.value,
          percentage: d.percentage,
        })),
        label: { show: false },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.2)' } },
        itemStyle: { borderColor: '#fff', borderWidth: 2 },
        color: colorMap,
      }],
    };
  }, [blockedData]);

  return (
    <div id="dashboard-swg-summary">
      <div className="export-container">
        <ExportButton targetId="dashboard-swg-summary" filename="swg_summary" />
      </div>

      <div className="swg-summary-layout">
        {/* ── Card 1: On-Premise ── */}
        <DashboardCard title="YouTube Consumption On-Premise">
          {onPremData && onPremData.length > 0 ? (
            <div style={{ maxHeight: 420, overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 30 }}>#</th>
                    <th>User</th>
                    <th>Application</th>
                    <th style={{ textAlign: 'right' }}>Sum - Total Bytes (MB)</th>
                  </tr>
                </thead>
                <tbody>
                  {onPremData.map((row, idx) => {
                    const val = row._value as number;
                    const pct = Math.min((val / onPremMax) * 100, 100);
                    return (
                      <tr key={idx}>
                        <td>{row._index as number}</td>
                        <td>{String(row.User ?? '')}</td>
                        <td>{String(row.Application ?? '')}</td>
                        <td className="num">
                          <div className="inline-bar-container">
                            <div
                              className="inline-bar"
                              style={{ width: `${pct}%`, background: '#8BC34A', maxWidth: 100 }}
                            />
                            <span>{fmtMB(val)} MB</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <FallbackMessage title="Datos no disponibles" message="youtube_consumption_on-premise.csv" />
          )}
        </DashboardCard>

        {/* ── Card 2: Off-Premise ── */}
        <DashboardCard title="YouTube Consumption Off-Premise">
          {offPremData && offPremData.length > 0 ? (
            <div style={{ maxHeight: 420, overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 30 }}>#</th>
                    <th>User</th>
                    <th>Application</th>
                    <th style={{ textAlign: 'right' }}>Sum - Total Bytes (MB)</th>
                  </tr>
                </thead>
                <tbody>
                  {offPremData.map((row, idx) => {
                    const val = row._value as number;
                    const pct = Math.min((val / offPremMax) * 100, 100);
                    // Gradient: top value gets blue, lower values get green
                    const barColor = idx === 0 ? '#2196F3' : '#8BC34A';
                    return (
                      <tr key={idx}>
                        <td>{row._index as number}</td>
                        <td>{String(row.User ?? '')}</td>
                        <td>{String(row.Application ?? '')}</td>
                        <td className="num">
                          <div className="inline-bar-container">
                            <div
                              className="inline-bar"
                              style={{ width: `${pct}%`, background: barColor, maxWidth: 100 }}
                            />
                            <span>{fmtMB(val)} MB</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <FallbackMessage title="Datos no disponibles" message="youtube_consumption_off-premise.csv" />
          )}
        </DashboardCard>

        {/* ── Card 3: Top Blocked Categories ── */}
        <DashboardCard title="Top Blocked Categories">
          {pieOption ? (
            <ReactECharts option={pieOption} style={{ height: 380 }} notMerge={true} />
          ) : (
            <FallbackMessage title="Datos no disponibles" message="top_blocked_categories.csv" />
          )}
        </DashboardCard>
      </div>
    </div>
  );
};
