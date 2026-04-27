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
        right: '25%',
        top: 'middle' as const,
        textStyle: { fontSize: 12 },
        formatter: (name: string) => {
          const item = blockedData.find((d) => d.name === name);
          const pct = item ? item.percentage.toFixed(2) : '0.00';
          const short = name.length > 30 ? name.substring(0, 30) + '…' : name;
          return `${short}  ${pct}%`;
        },
        itemWidth: 14,
        itemHeight: 14,
        itemGap: 10,
      },
      series: [{
        type: 'pie',
        radius: ['0%', '75%'],
        center: ['32%', '50%'],
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

  /** Bar color gradient based on ranking: top = dark blue, middle = teal, bottom = green */
  const getBarColor = (idx: number, total: number): string => {
    const colors = [
      '#1a237e', // 1 - dark indigo
      '#283593', // 2 - indigo
      '#1565c0', // 3 - dark blue
      '#1976d2', // 4 - blue
      '#0288d1', // 5 - light blue
      '#00838f', // 6 - teal
      '#00897b', // 7 - dark teal
      '#43a047', // 8 - green
      '#7cb342', // 9 - light green
      '#8bc34a', // 10 - lime
      '#aed581', // 11 - light lime
    ];
    return colors[Math.min(idx, colors.length - 1)];
  };

  /** Render a YouTube consumption table */
  const renderYoutubeTable = (
    data: Record<string, unknown>[] | null,
    maxVal: number,
    fallbackFile: string,
  ) => {
    if (!data || data.length === 0) {
      return <FallbackMessage title="Datos no disponibles" message={fallbackFile} />;
    }
    return (
      <div style={{ maxHeight: 440, overflowY: 'auto' }}>
        <table className="data-table swg-table">
          <thead>
            <tr>
              <th style={{ width: 28 }}>#</th>
              <th>User</th>
              <th>Application</th>
              <th style={{ textAlign: 'right', minWidth: 180 }}>Sum - Total Bytes (MB)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => {
              const val = row._value as number;
              const pct = Math.min((val / maxVal) * 100, 100);
              const barColor = getBarColor(idx, data.length);
              return (
                <tr key={idx}>
                  <td>{row._index as number}</td>
                  <td style={{ fontSize: '0.72rem' }}>{String(row.User ?? '')}</td>
                  <td>{String(row.Application ?? '')}</td>
                  <td className="num">
                    <div className="swg-bar-cell">
                      <span className="swg-bar-value">{fmtMB(val)} MB</span>
                      <div className="swg-bar-track">
                        <div
                          className="swg-bar-fill"
                          style={{ width: `${pct}%`, background: barColor }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div id="dashboard-swg-summary">
      <div className="export-container">
        <ExportButton targetId="dashboard-swg-summary" filename="swg_summary" />
      </div>

      {/* ── Row 1: Two YouTube tables side by side ── */}
      <div className="grid-2" style={{ marginBottom: 'var(--space-xl)' }}>
        <DashboardCard title="YouTube Consumption On-Premise">
          {renderYoutubeTable(onPremData, onPremMax, 'youtube_consumption_on-premise.csv')}
        </DashboardCard>

        <DashboardCard title="YouTube Consumption Off-Premise">
          {renderYoutubeTable(offPremData, offPremMax, 'youtube_consumption_off-premise.csv')}
        </DashboardCard>
      </div>

      {/* ── Row 2: Top Blocked Categories full width ── */}
      <DashboardCard title="Top Blocked Categories">
        {pieOption ? (
          <ReactECharts option={pieOption} style={{ height: 380 }} notMerge={true} />
        ) : (
          <FallbackMessage title="Datos no disponibles" message="top_blocked_categories.csv" />
        )}
      </DashboardCard>
    </div>
  );
};
