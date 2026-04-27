/**
 * Widget Configuration
 * Defines the default aggregation mode for every widget in every dashboard.
 * 
 * snapshot  = use ONLY the last cut of the reportingMonth
 * aggregated = use ALL cuts of the reportingMonth, merged/summed
 */
import type { DashboardId } from '../types';

export type WidgetAggregation = 'snapshot' | 'aggregated';

export interface WidgetConfig {
  id: string;
  label: string;
  aggregation: WidgetAggregation;
}

/**
 * Per-dashboard widget aggregation defaults.
 * These are the MASTER rules — every widget must follow its assigned mode.
 */
export const WIDGET_CONFIGS: Record<DashboardId, WidgetConfig[]> = {
  // ─── IA ───
  ia_risky_kpi: [
    { id: 'pct_risky', label: '% of Risky AI Apps', aggregation: 'snapshot' },
    { id: 'count_risky', label: 'Number of Risky AI Apps', aggregation: 'snapshot' },
  ],
  ia_risk_attributes: [
    { id: 'learning_purposes', label: 'Customer data for learning', aggregation: 'snapshot' },
    { id: 'shared_vendor', label: 'Data shared with vendor', aggregation: 'snapshot' },
    { id: 'no_tenant_isolation', label: 'No tenant isolation', aggregation: 'snapshot' },
    { id: 'no_regulations', label: 'No AI risk regulations', aggregation: 'snapshot' },
    { id: 'no_genai_policy', label: 'No genAI usage policy', aggregation: 'snapshot' },
  ],
  ia_distribution: [
    { id: 'users_line', label: 'Users Accessing Risky AI Apps', aggregation: 'aggregated' },
    { id: 'org_units_bar', label: 'Top 10 Org Units', aggregation: 'aggregated' },
    { id: 'risky_apps_pie', label: 'Top 10 Risky AI Apps', aggregation: 'aggregated' },
  ],
  ia_ccl_overview: [
    { id: 'ccl_apps_donut', label: 'Count of AI Apps by CCL', aggregation: 'snapshot' },
    { id: 'ccl_bytes_donut', label: 'AI Usage Bytes by CCL', aggregation: 'aggregated' },
    { id: 'ccl_score_table', label: 'AI Apps by CCL Score', aggregation: 'snapshot' },
  ],

  // ─── Protección ───
  proteccion_gdpr: [
    { id: 'gdpr_pie', label: 'GDPR Level Distribution', aggregation: 'snapshot' },
    { id: 'top20_table', label: 'Top 20 Risky Apps', aggregation: 'snapshot' },
  ],

  // ─── Mapa ───
  mapa_top_apps: [
    { id: 'apps_pie', label: 'Top Apps by Sessions', aggregation: 'aggregated' },
    { id: 'users_bar', label: 'Top Users by Sessions', aggregation: 'aggregated' },
  ],
  mapa_private_access: [
    { id: 'sankey', label: 'Publisher Usage by Bytes', aggregation: 'aggregated' },
    { id: 'policies_pie', label: 'Most Used Policies', aggregation: 'aggregated' },
    { id: 'uploaded', label: 'Uploaded (GB)', aggregation: 'aggregated' },
    { id: 'downloaded', label: 'Downloaded (GB)', aggregation: 'aggregated' },
    { id: 'policies_accessed', label: 'Policies Accessed', aggregation: 'snapshot' },
    { id: 'active_publishers', label: 'Active Publishers', aggregation: 'snapshot' },
    { id: 'discovered_apps', label: 'Discovered Apps', aggregation: 'snapshot' },
    { id: 'discovered_users', label: 'Discovered Users', aggregation: 'snapshot' },
    { id: 'sessions', label: 'Sessions', aggregation: 'aggregated' },
    { id: 'data_centers', label: 'Data Centers', aggregation: 'snapshot' },
    { id: 'private_apps_pie', label: 'Top Private Apps by Bytes', aggregation: 'aggregated' },
  ],

  // ─── SWG Summary ───
  swg_summary_main: [
    { id: 'yt_onpremise', label: 'YouTube Consumption On-Premise', aggregation: 'aggregated' },
    { id: 'yt_offpremise', label: 'YouTube Consumption Off-Premise', aggregation: 'aggregated' },
    { id: 'top_blocked', label: 'Top Blocked Categories', aggregation: 'aggregated' },
  ],
};

/**
 * Get the default aggregation mode for a specific widget.
 */
export function getWidgetAggregation(
  dashboardId: DashboardId,
  widgetId: string
): WidgetAggregation {
  const configs = WIDGET_CONFIGS[dashboardId];
  const cfg = configs?.find((w) => w.id === widgetId);
  return cfg?.aggregation ?? 'snapshot';
}
