/**
 * Color palette matching the Netskope BI reference screenshots.
 * Corporate, clean colors — no neon, no glassmorphism.
 */

export const CHART_COLORS = [
  '#00BCD4', // turquoise/cyan
  '#E91E8C', // magenta
  '#8BC34A', // lime green
  '#9C27B0', // purple
  '#2196F3', // blue
  '#4CAF50', // green
  '#FFC107', // yellow/amber
  '#FF5722', // red/coral
  '#AB47BC', // light purple
  '#FF9800', // orange
  '#78909C', // blue-grey (for "Other")
];

/** CCL level colors */
export const CCL_COLORS: Record<string, string> = {
  high: '#4CAF50',
  medium: '#FFC107',
  low: '#FF9800',
  poor: '#F44336',
  unknown: '#9E9E9E',
};

/** GDPR level colors */
export const GDPR_COLORS: Record<string, string> = {
  high: '#4CAF50',
  medium: '#FFC107',
  unknown: '#9E9E9E',
  low: '#F44336',
};

/** Risk attribute row colors (from reference screenshot) */
export const RISK_ATTR_COLORS = [
  '#FFD54F', // yellow soft — learning purposes
  '#FF9800', // orange — shared with vendor
  '#FFC107', // yellow — no tenant isolation
  '#F44336', // red — no AI risk regulations
  '#4CAF50', // green — no genAI usage policy
];

/** KPI card value colors for Private Access dashboard */
export const KPI_COLORS: Record<string, string> = {
  uploaded: '#2196F3',
  downloaded: '#FF9800',
  policiesAccessed: '#1976D2',
  activePublishers: '#212121',
  discoveredApps: '#E91E8C',
  discoveredUsers: '#4CAF50',
  sessions: '#212121',
  dataCenters: '#212121',
};

/** SWG Summary — Top Blocked Categories colors by category name */
export const SWG_BLOCKED_CATEGORY_COLORS: Record<string, string> = {
  'Cat_All': '#00BCD4',
  'Chat, IM & other communication': '#E91E8C',
  'Social': '#8BC34A',
  'Streaming & Downloadable Video': '#9C27B0',
  'Cat_Riesgo_Seguridad': '#2196F3',
  'n/a': '#4CAF50',
  'Cat_Navegacion': '#FFC107',
};
