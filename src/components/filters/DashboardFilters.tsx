/**
 * Dashboard Filters — v2.1
 * 
 * Single reactive filter bar that controls the global DashboardQueryState.
 * Shows unique cuts included per-family (no duplicates from other families).
 */
import React, { useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { formatReportingMonth } from '../../utils/dateParser';
import { DASHBOARD_DEFINITIONS } from '../../utils/validator';
import type { DashboardId, ViewMode } from '../../types';

export const DashboardFilters: React.FC = () => {
  const query = useAppStore((s) => s.query);
  const setQuery = useAppStore((s) => s.setQuery);
  const months = useAppStore((s) => s.getAvailableMonths());
  const cutDates = useAppStore((s) => s.getAvailableCutDates());
  const dashboards = useAppStore((s) => s.getAvailableDashboards());
  const zipEntities = useAppStore((s) => s.zipEntities);

  // Compute unique cut info for current selection — grouped by family
  const cutsInfo = useMemo(() => {
    if (query.reportingMonth === 'all') return null;

    const relevantEntities = zipEntities.filter((e) => {
      if (query.sourceType !== 'all' && e.sourceType !== query.sourceType) return false;
      return e.reportingMonth === query.reportingMonth;
    });

    if (relevantEntities.length === 0) return null;

    const zipCount = relevantEntities.length;

    // Unique cut dates across all relevant families (deduplicated)
    const uniqueCutDates = [...new Set(relevantEntities.map((e) => e.cutDate))].sort();

    // Per-family breakdown
    const familyBreakdown: Record<string, { cuts: string[]; lastCut: string }> = {};
    const families = [...new Set(relevantEntities.map((e) => e.sourceType))];
    for (const fam of families) {
      const famEntities = relevantEntities.filter((e) => e.sourceType === fam);
      const famCuts = [...new Set(famEntities.map((e) => e.cutDate))].sort();
      familyBreakdown[fam] = {
        cuts: famCuts,
        lastCut: famCuts[famCuts.length - 1],
      };
    }

    // Overall last cut
    const lastCut = uniqueCutDates[uniqueCutDates.length - 1];

    return { zipCount, uniqueCutDates, lastCut, familyBreakdown };
  }, [query.reportingMonth, query.sourceType, zipEntities]);

  const FAMILY_LABELS: Record<string, string> = {
    mapa: 'Mapa',
    ia_en_riesgos: 'IA',
    proteccion_datos_personales: 'Protección',
    swg_summary: 'SWG Summary',
  };

  return (
    <div>
      <div className="filters-bar">
        {/* Source Type / Family */}
        <div className="form-group">
          <label>Familia</label>
          <select className="form-select" value={query.sourceType}
            onChange={(e) => setQuery({ sourceType: e.target.value as any })}>
            <option value="all">Todas</option>
            <option value="mapa">Mapa</option>
            <option value="ia_en_riesgos">IA en Riesgos</option>
            <option value="proteccion_datos_personales">Protección Datos</option>
            <option value="swg_summary">SWG Summary</option>
          </select>
        </div>

        {/* View Mode */}
        <div className="form-group">
          <label>Vista</label>
          <select className="form-select" value={query.viewMode}
            onChange={(e) => setQuery({ viewMode: e.target.value as ViewMode })}>
            <option value="monthly">Mensual</option>
            <option value="single_cut">Por Corte Individual</option>
          </select>
        </div>

        {/* Reporting Month */}
        <div className="form-group">
          <label>Mes Reportado</label>
          <select className="form-select" value={query.reportingMonth}
            onChange={(e) => setQuery({ reportingMonth: e.target.value })}>
            <option value="all">Todos</option>
            {months.map((m) => (
              <option key={m} value={m}>{formatReportingMonth(m)}</option>
            ))}
          </select>
        </div>

        {/* Cut Date (only in single_cut mode) */}
        {query.viewMode === 'single_cut' && (
          <div className="form-group">
            <label>Fecha de Corte</label>
            <select className="form-select" value={query.cutDate}
              onChange={(e) => setQuery({ cutDate: e.target.value })}>
              <option value="all">Todas</option>
              {cutDates.map((d) => (<option key={d} value={d}>{d}</option>))}
            </select>
          </div>
        )}

        {/* Assignment Mode */}
        <div className="form-group">
          <label>Asignación</label>
          <select className="form-select" value={query.assignmentMode}
            onChange={(e) => setQuery({ assignmentMode: e.target.value as 'calendar' | 'operational' })}>
            <option value="calendar">Calendario</option>
            <option value="operational">Operacional</option>
          </select>
        </div>

        {/* Grace Days */}
        {query.assignmentMode === 'operational' && (
          <div className="form-group">
            <label>Días Gracia</label>
            <input className="form-input" type="number" min={0} max={10}
              value={query.graceDays} style={{ width: 70 }}
              onChange={(e) => setQuery({ graceDays: parseInt(e.target.value) || 0 })} />
          </div>
        )}

        {/* Dashboard selector */}
        <div className="form-group">
          <label>Dashboard</label>
          <select className="form-select" value={query.dashboardId}
            onChange={(e) => setQuery({ dashboardId: e.target.value as DashboardId | 'all' })}>
            <option value="all">Todos</option>
            {dashboards.map((d) => (
              <option key={d} value={d}>{DASHBOARD_DEFINITIONS[d].title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ─── Cuts Info Panel (only in monthly mode with a month selected) ─── */}
      {cutsInfo && query.viewMode === 'monthly' && (
        <div className="cuts-info-panel">
          <div className="cuts-info-row">
            <div className="cuts-info-block">
              <span className="cuts-info-label">Mes:</span>
              <span className="cuts-info-value accent">{formatReportingMonth(query.reportingMonth)}</span>
            </div>
            <div className="cuts-info-block">
              <span className="cuts-info-label">Modo:</span>
              <span className={`badge ${query.assignmentMode === 'operational' ? 'badge-warning' : 'badge-info'}`}>
                {query.assignmentMode}
              </span>
            </div>
            <div className="cuts-info-block">
              <span className="cuts-info-label">ZIPs:</span>
              <span className="cuts-info-value">{cutsInfo.zipCount}</span>
            </div>
            <div className="cuts-info-block">
              <span className="cuts-info-label">Cortes únicos ({cutsInfo.uniqueCutDates.length}):</span>
              <span className="cuts-info-dates">
                {cutsInfo.uniqueCutDates.map((d, i) => (
                  <span key={d} className="cuts-info-date-chip">
                    {d}{d === cutsInfo.lastCut ? ' ★' : ''}
                  </span>
                ))}
              </span>
            </div>
          </div>

          {/* Per-family breakdown */}
          {Object.keys(cutsInfo.familyBreakdown).length > 1 && (
            <div className="cuts-info-families">
              {Object.entries(cutsInfo.familyBreakdown).map(([fam, info]) => (
                <div key={fam} className="cuts-info-family-tag">
                  <strong>{FAMILY_LABELS[fam] || fam}:</strong>{' '}
                  {info.cuts.length} corte{info.cuts.length !== 1 ? 's' : ''}{' '}
                  · último: {info.lastCut}
                </div>
              ))}
            </div>
          )}

          <div className="cuts-info-hint">
            ⓘ KPIs snapshot → último corte · Charts aggregated → todos los cortes
          </div>
        </div>
      )}
    </div>
  );
};
