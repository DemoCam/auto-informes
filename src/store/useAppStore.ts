/**
 * Global App Store (Zustand) — v2
 * 
 * Single source of truth with reactive DashboardQueryState.
 * Every filter change triggers cascading recomputation.
 */
import { create } from 'zustand';
import type {
  ZipEntity, DashboardQueryState, DashboardId,
  ValidationIssue, ResolvedDashboardData,
} from '../types';
import { ingestZip, recalculateWeekSequences, detectDuplicates } from '../utils/zipIngester';
import { computeReportingMonth } from '../utils/dateParser';
import { resolveEntitiesForMonth, resolveEntitiesForCut } from '../utils/dataResolver';

const FAMILY_DASHBOARDS: Record<string, DashboardId[]> = {
  mapa: ['mapa_top_apps', 'mapa_private_access'],
  ia_en_riesgos: ['ia_risky_kpi', 'ia_risk_attributes', 'ia_distribution', 'ia_ccl_overview'],
  proteccion_datos_personales: ['proteccion_gdpr'],
};

function getDashboardsForFamily(family: string): DashboardId[] {
  if (family === 'all') return Object.values(FAMILY_DASHBOARDS).flat();
  return FAMILY_DASHBOARDS[family] || [];
}

interface AppState {
  zipEntities: ZipEntity[];
  globalIssues: ValidationIssue[];
  isLoading: boolean;
  loadingMessage: string;
  query: DashboardQueryState;
  activeTab: 'upload' | 'config' | 'results';

  addZips: (files: File[]) => Promise<void>;
  removeZip: (id: string) => void;
  clearAll: () => void;
  setQuery: (partial: Partial<DashboardQueryState>) => void;
  setActiveTab: (tab: 'upload' | 'config' | 'results') => void;

  getAvailableMonths: () => string[];
  getAvailableCutDates: () => string[];
  getAvailableFamilies: () => ZipEntity['sourceType'][];
  getAvailableDashboards: () => DashboardId[];
  getResolvedData: (family: ZipEntity['sourceType']) => ResolvedDashboardData;
}

const DEFAULT_QUERY: DashboardQueryState = {
  sourceType: 'all',
  reportingMonth: 'all',
  cutDate: 'all',
  dashboardId: 'all',
  viewMode: 'monthly',
  assignmentMode: 'calendar',
  graceDays: 3,
};

export const useAppStore = create<AppState>((set, get) => ({
  zipEntities: [],
  globalIssues: [],
  isLoading: false,
  loadingMessage: '',
  query: { ...DEFAULT_QUERY },
  activeTab: 'upload',

  // ═══════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════

  addZips: async (files: File[]) => {
    set({ isLoading: true, loadingMessage: 'Procesando archivos ZIP...' });

    const { query } = get();
    const newEntities: ZipEntity[] = [];
    const newIssues: ValidationIssue[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      set({ loadingMessage: `Procesando ${file.name} (${i + 1}/${files.length})...` });
      try {
        const entity = await ingestZip(file, query.assignmentMode, query.graceDays);
        newEntities.push(entity);
      } catch (e) {
        newIssues.push({
          severity: 'error',
          message: e instanceof Error ? e.message : `Error procesando ${file.name}`,
          file: file.name,
        });
      }
    }

    const allEntities = [...get().zipEntities, ...newEntities];
    const sequenced = recalculateWeekSequences(allEntities);
    const duplicateIssues = detectDuplicates(sequenced);

    set({
      zipEntities: sequenced,
      globalIssues: [...get().globalIssues, ...newIssues, ...duplicateIssues],
      isLoading: false,
      loadingMessage: '',
    });
  },

  removeZip: (id: string) => {
    const filtered = get().zipEntities.filter((e) => e.id !== id);
    const sequenced = recalculateWeekSequences(filtered);
    set({ zipEntities: sequenced });

    // Cascade: check if current filters are still valid
    const q = { ...get().query };
    let changed = false;

    if (q.sourceType !== 'all') {
      if (!sequenced.some((e) => e.sourceType === q.sourceType)) {
        q.sourceType = 'all'; q.dashboardId = 'all'; changed = true;
      }
    }
    if (q.reportingMonth !== 'all') {
      if (!sequenced.some((e) => e.reportingMonth === q.reportingMonth)) {
        q.reportingMonth = 'all'; q.cutDate = 'all'; changed = true;
      }
    }
    if (q.cutDate !== 'all') {
      if (!sequenced.some((e) => e.cutDate === q.cutDate)) {
        q.cutDate = 'all'; changed = true;
      }
    }
    if (changed) set({ query: q });
  },

  clearAll: () => {
    set({
      zipEntities: [],
      globalIssues: [],
      query: { ...DEFAULT_QUERY },
    });
  },

  /**
   * Set query filters with CASCADING RESETS.
   * When a parent filter changes, child filters that are no longer valid get reset.
   */
  setQuery: (partial: Partial<DashboardQueryState>) => {
    const prev = get().query;
    const next = { ...prev, ...partial };

    // ─── Cascade: assignmentMode or graceDays changed → reassign all months ───
    const modeChanged = partial.assignmentMode !== undefined && partial.assignmentMode !== prev.assignmentMode;
    const graceChanged = partial.graceDays !== undefined && partial.graceDays !== prev.graceDays;

    if (modeChanged || graceChanged) {
      const entities = get().zipEntities.map((e) => {
        const { reportingMonth, ruleUsed } = computeReportingMonth(
          e.cutDate, next.assignmentMode, next.graceDays
        );
        return { ...e, reportingMonth, assignmentRuleUsed: ruleUsed };
      });
      set({ zipEntities: recalculateWeekSequences(entities) });
      next.reportingMonth = 'all';
      next.cutDate = 'all';
    }

    // ─── Cascade: sourceType changed → reset dashboard and cut if incompatible ───
    if (partial.sourceType !== undefined && partial.sourceType !== prev.sourceType) {
      if (next.dashboardId !== 'all') {
        const validDashboards = getDashboardsForFamily(next.sourceType);
        if (!validDashboards.includes(next.dashboardId)) {
          next.dashboardId = 'all';
        }
      }
      next.cutDate = 'all';
    }

    // ─── Cascade: reportingMonth changed → reset cutDate if incompatible ───
    if (partial.reportingMonth !== undefined && partial.reportingMonth !== prev.reportingMonth) {
      if (next.cutDate !== 'all') {
        const validCuts = get().zipEntities
          .filter((e) => {
            if (next.sourceType !== 'all' && e.sourceType !== next.sourceType) return false;
            if (next.reportingMonth !== 'all' && e.reportingMonth !== next.reportingMonth) return false;
            return true;
          })
          .map((e) => e.cutDate);
        if (!validCuts.includes(next.cutDate)) {
          next.cutDate = 'all';
        }
      }
    }

    // ─── Cascade: viewMode → monthly resets cutDate ───
    if (partial.viewMode === 'monthly') {
      next.cutDate = 'all';
    }

    set({ query: next });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  // ═══════════════════════════════════════════════
  // COMPUTED HELPERS
  // ═══════════════════════════════════════════════

  getAvailableMonths: () => {
    const { zipEntities, query } = get();
    const filtered = query.sourceType === 'all'
      ? zipEntities
      : zipEntities.filter((e) => e.sourceType === query.sourceType);
    return [...new Set(filtered.map((e) => e.reportingMonth))].sort();
  },

  getAvailableCutDates: () => {
    const { zipEntities, query } = get();
    const filtered = zipEntities.filter((e) => {
      if (query.sourceType !== 'all' && e.sourceType !== query.sourceType) return false;
      if (query.reportingMonth !== 'all' && e.reportingMonth !== query.reportingMonth) return false;
      return true;
    });
    return [...new Set(filtered.map((e) => e.cutDate))].sort();
  },

  getAvailableFamilies: () => {
    return [...new Set(get().zipEntities.map((e) => e.sourceType))];
  },

  getAvailableDashboards: () => {
    const families = get().getAvailableFamilies();
    const { query } = get();
    const activeFamilies = query.sourceType === 'all' ? families : [query.sourceType];
    return activeFamilies.flatMap((f) => getDashboardsForFamily(f));
  },

  /**
   * Resolve data for a specific family based on current query state.
   * Returns all cuts for the month (monthly view) or a single cut (single_cut view).
   */
  getResolvedData: (family: ZipEntity['sourceType']): ResolvedDashboardData => {
    const { zipEntities, query } = get();

    // Single cut mode
    if (query.viewMode === 'single_cut' && query.cutDate !== 'all') {
      return resolveEntitiesForCut(zipEntities, family, query.cutDate);
    }

    // Monthly mode with specific month
    if (query.reportingMonth !== 'all') {
      return resolveEntitiesForMonth(zipEntities, family, query.reportingMonth);
    }

    // No month filter: all cuts for this family
    const familyCuts = zipEntities
      .filter((e) => e.sourceType === family)
      .sort((a, b) => a.cutDate.localeCompare(b.cutDate));

    return {
      allCuts: familyCuts,
      lastCut: familyCuts.length > 0 ? familyCuts[familyCuts.length - 1] : null,
      reportingMonth: 'all',
      sortedCuts: familyCuts,
    };
  },
}));
