/**
 * Dashboard D: IA — Risky AI Apps KPI  
 * Both widgets are SNAPSHOT: use only last cut.
 */
import React, { useMemo } from 'react';
import { DashboardCard } from '../shared/DashboardCard';
import { FallbackMessage } from '../shared/FallbackMessage';
import { ExportButton } from '../shared/ExportButton';
import { getSnapshotCsv } from '../../utils/dataResolver';
import { getNumericValue, findColumn } from '../../utils/csvNormalizer';
import type { ResolvedDashboardData } from '../../types';

interface Props {
  resolved: ResolvedDashboardData;
}

export const IaRiskyAppsKpi: React.FC<Props> = ({ resolved }) => {
  // ─── Percentage (SNAPSHOT) ───
  const pctValue = useMemo(() => {
    const csv = getSnapshotCsv(resolved, '__of_risky_ai_apps_amongst_all_ai_apps.csv');
    if (!csv) return null;
    const col = findColumn(csv, '%RiskyApps');
    if (!col) return null;
    for (const row of csv.rows) {
      const val = row[col];
      if (val !== null && val !== undefined) return getNumericValue(val);
    }
    return null;
  }, [resolved]);

  // ─── Count (SNAPSHOT) ───
  const countValue = useMemo(() => {
    const csv = getSnapshotCsv(resolved, 'number_of_risky_ai_apps.csv');
    if (!csv) return null;
    // Column has variable spacing — match flexibly
    const col = csv.headers.find(
      (h) => h.toLowerCase().includes('applications') || h.toLowerCase().includes('# applications')
    );
    if (!col) return null;
    for (const row of csv.rows) {
      const val = row[col];
      if (val !== null && val !== undefined) return getNumericValue(val);
    }
    return null;
  }, [resolved]);

  const pctDisplay = pctValue !== null ? `${pctValue.toFixed(2)}%` : '—';

  return (
    <div id="dashboard-ia-risky-kpi">
      <div className="export-container">
        <ExportButton targetId="dashboard-ia-risky-kpi" filename="ia_risky_kpi" />
      </div>
      <div className="grid-2">
        <DashboardCard title="% of Risky AI Apps Amongst All AI Apps"
          subtitle="Risky applications are those with CCL level 'poor', 'low', and 'medium'.">
          {pctValue !== null ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
              <div className="risky-kpi-circle">
                <span className="risky-kpi-circle-value">{pctDisplay}</span>
              </div>
            </div>
          ) : <FallbackMessage title="Datos no disponibles" />}
        </DashboardCard>
        <DashboardCard title="">
          {countValue !== null ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: 280 }}>
              <div style={{ fontSize: '4rem', fontWeight: 700, color: '#1a1a2e', lineHeight: 1 }}>
                {countValue}
              </div>
              <div style={{ fontSize: '1rem', color: '#5f6368', marginTop: 12, fontWeight: 500 }}>
                Number of Risky AI Apps
              </div>
            </div>
          ) : <FallbackMessage title="Datos no disponibles" />}
        </DashboardCard>
      </div>
    </div>
  );
};
