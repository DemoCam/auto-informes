// ─── ZIP Entity: the main model for each uploaded ZIP ───
export interface ZipEntity {
  id: string;
  sourceType: 'mapa' | 'ia_en_riesgos' | 'proteccion_datos_personales' | 'swg_summary';
  originalFileName: string;
  cutDate: string;            // ISO date string YYYY-MM-DD
  reportingMonth: string;     // YYYY-MM
  assignmentRuleUsed: 'calendar' | 'operational';
  weekSequenceInMonth: number;
  internalFolderName: string;
  csvFilesDetected: string[];
  validationIssues: ValidationIssue[];
  normalizedData: Record<string, ParsedCsv>;
}

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  file?: string;
  column?: string;
}

export interface ParsedCsv {
  fileName: string;
  headers: string[];
  rows: Record<string, unknown>[];
  isEmpty: boolean;
}

// ─── App Configuration ───
export interface AppConfig {
  assignmentMode: 'calendar' | 'operational';
  graceDays: number;
}

// ─── Dashboard identifiers ───
export type DashboardId =
  | 'mapa_top_apps'
  | 'mapa_private_access'
  | 'proteccion_gdpr'
  | 'ia_risky_kpi'
  | 'ia_risk_attributes'
  | 'ia_distribution'
  | 'ia_ccl_overview'
  | 'swg_summary_main';

export interface DashboardMeta {
  id: DashboardId;
  title: string;
  family: ZipEntity['sourceType'];
  requiredFiles: string[];
}

// ─── View mode ───
export type ViewMode = 'monthly' | 'single_cut';

// ─── Dashboard Query State ───
// This is the single source of truth for what data dashboards see.
// Every filter change recalculates this state, and all widgets derive from it.
export interface DashboardQueryState {
  sourceType: ZipEntity['sourceType'] | 'all';
  reportingMonth: string | 'all';
  cutDate: string | 'all';          // only used in single_cut mode
  dashboardId: DashboardId | 'all';
  viewMode: ViewMode;
  assignmentMode: 'calendar' | 'operational';
  graceDays: number;
}

// ─── Resolved data for a dashboard ───
// After filters and aggregation are applied, each dashboard receives this.
export interface ResolvedDashboardData {
  /** All cuts included in this reportingMonth for this family */
  allCuts: ZipEntity[];
  /** Last cut of the reportingMonth (for snapshot widgets) */
  lastCut: ZipEntity | null;
  /** The reportingMonth being viewed */
  reportingMonth: string;
  /** Cuts sorted ascending by cutDate */
  sortedCuts: ZipEntity[];
}
