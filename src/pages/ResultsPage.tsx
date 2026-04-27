/**
 * Results Page — v2.1
 * 
 * FIXES:
 * - Consistent dashboard ordering: Mapa → Protección → IA
 * - Hides dashboards with 0 cuts instead of showing fallback (cleaner for "Todas" view)
 * - Shows a summary when viewing all families showing which have data
 */
import React, { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { DashboardFilters } from '../components/filters/DashboardFilters';
import { MapaTopApps } from '../components/dashboards/MapaTopApps';
import { MapaPrivateAccess } from '../components/dashboards/MapaPrivateAccess';
import { ProteccionGdpr } from '../components/dashboards/ProteccionGdpr';
import { IaRiskyAppsKpi } from '../components/dashboards/IaRiskyAppsKpi';
import { IaRiskAttributes } from '../components/dashboards/IaRiskAttributes';
import { IaDistribution } from '../components/dashboards/IaDistribution';
import { IaCclOverview } from '../components/dashboards/IaCclOverview';
import { SwgSummary } from '../components/dashboards/SwgSummary';
import { FallbackMessage } from '../components/shared/FallbackMessage';
import { DASHBOARD_DEFINITIONS } from '../utils/validator';
import type { DashboardId, ResolvedDashboardData } from '../types';

// Fixed rendering order — Mapa first, then Protección, then IA
const ORDERED_DASHBOARDS: DashboardId[] = [
  'mapa_top_apps', 'mapa_private_access',
  'proteccion_gdpr',
  'ia_risky_kpi', 'ia_risk_attributes', 'ia_distribution', 'ia_ccl_overview',
  'swg_summary_main',
];

const FAMILY_LABELS: Record<string, string> = {
  mapa: '🗺️ Mapa',
  ia_en_riesgos: '🤖 IA en Riesgos',
  proteccion_datos_personales: '🛡️ Protección Datos',
  swg_summary: '🌐 SWG Summary',
};

export const ResultsPage: React.FC = () => {
  const zipEntities = useAppStore((s) => s.zipEntities);
  const query = useAppStore((s) => s.query);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const getResolvedData = useAppStore((s) => s.getResolvedData);

  // Resolve data for ALL families — always compute all 3
  const resolvedByFamily = useMemo((): Record<string, ResolvedDashboardData> => {
    const families = ['mapa', 'ia_en_riesgos', 'proteccion_datos_personales', 'swg_summary'] as const;
    const result: Record<string, ResolvedDashboardData> = {};
    for (const f of families) {
      result[f] = getResolvedData(f);
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zipEntities, query.reportingMonth, query.cutDate, query.viewMode, query.assignmentMode, query.graceDays]);

  // Determine which dashboards to show — respecting fixed order
  const visibleDashboards = useMemo((): DashboardId[] => {
    // If a specific dashboard is selected, show only that
    if (query.dashboardId !== 'all') return [query.dashboardId];

    // Get loaded families
    const loadedFamilies = new Set(zipEntities.map((e) => e.sourceType));

    // Filter by sourceType selection
    const activeFamilies = query.sourceType === 'all'
      ? loadedFamilies
      : new Set([query.sourceType]);

    // Use fixed ordering, only include dashboards whose family is active AND has data
    return ORDERED_DASHBOARDS.filter((dashId) => {
      const def = DASHBOARD_DEFINITIONS[dashId];
      if (!activeFamilies.has(def.family as any)) return false;
      if (!loadedFamilies.has(def.family as any)) return false;

      // Check if resolved data has cuts for this family
      const resolved = resolvedByFamily[def.family];
      return resolved && resolved.allCuts.length > 0;
    });
  }, [query.dashboardId, query.sourceType, zipEntities, resolvedByFamily]);

  // Families that are loaded but have no data for current month (for info message)
  const emptyFamilies = useMemo(() => {
    if (query.reportingMonth === 'all') return [];
    const loadedFamilies = [...new Set(zipEntities.map((e) => e.sourceType))];
    const activeFamilies = query.sourceType === 'all'
      ? loadedFamilies
      : loadedFamilies.filter((f) => f === query.sourceType);

    return activeFamilies.filter((f) => {
      const resolved = resolvedByFamily[f];
      return !resolved || resolved.allCuts.length === 0;
    });
  }, [query.reportingMonth, query.sourceType, zipEntities, resolvedByFamily]);

  if (zipEntities.length === 0) {
    return (
      <div>
        <FallbackMessage icon="📁" title="No hay archivos cargados"
          message="Ve a la pestaña 'Cargar' para subir archivos ZIP de Netskope" />
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button className="btn btn-primary" onClick={() => setActiveTab('upload')}>
            Ir a Cargar Archivos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>Dashboards</h1>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: 4 }}>
          Visualización de datos — {query.viewMode === 'monthly' ? 'Vista mensual' : 'Corte individual'}
        </p>
      </div>

      <DashboardFilters />

      {/* Info about families with no data for current month */}
      {emptyFamilies.length > 0 && (
        <div style={{
          padding: '10px 16px', marginBottom: 16, borderRadius: 6,
          background: '#fff8e1', border: '1px solid #ffe082', fontSize: '0.8rem',
        }}>
          ⚠️ Sin datos para este mes:{' '}
          {emptyFamilies.map((f) => FAMILY_LABELS[f] || f).join(', ')}
        </div>
      )}

      {visibleDashboards.length === 0 ? (
        <FallbackMessage icon="🔍" title="Sin dashboards disponibles"
          message="No hay datos para los filtros seleccionados. Prueba cambiando el mes o la familia." />
      ) : (
        <div>
          {visibleDashboards.map((dashId) => {
            const def = DASHBOARD_DEFINITIONS[dashId];
            const resolved = resolvedByFamily[def.family];
            // Build unique cuts info for this specific dashboard family
            const familyCuts = [...new Set(resolved.sortedCuts.map((e) => e.cutDate))];

            return (
              <div key={dashId} className="dashboard-section">
                <div className="dashboard-section-title">
                  {def.family === 'mapa' && '🗺️'}
                  {def.family === 'ia_en_riesgos' && '🤖'}
                  {def.family === 'proteccion_datos_personales' && '🛡️'}
                  {def.family === 'swg_summary' && '🌐'}
                  {' '}{def.title}
                  <span style={{ fontSize: '0.7rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: 12 }}>
                    {familyCuts.length} corte{familyCuts.length !== 1 ? 's' : ''}
                    {resolved.lastCut && ` · último: ${resolved.lastCut.cutDate}`}
                  </span>
                </div>

                {dashId === 'mapa_top_apps' && <MapaTopApps resolved={resolved} />}
                {dashId === 'mapa_private_access' && <MapaPrivateAccess resolved={resolved} />}
                {dashId === 'proteccion_gdpr' && <ProteccionGdpr resolved={resolved} />}
                {dashId === 'ia_risky_kpi' && <IaRiskyAppsKpi resolved={resolved} />}
                {dashId === 'ia_risk_attributes' && <IaRiskAttributes resolved={resolved} />}
                {dashId === 'ia_distribution' && <IaDistribution resolved={resolved} />}
                {dashId === 'ia_ccl_overview' && <IaCclOverview resolved={resolved} />}
                {dashId === 'swg_summary_main' && <SwgSummary resolved={resolved} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
