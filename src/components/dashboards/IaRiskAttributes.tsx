/**
 * Dashboard E: IA — Risk Attributes
 * All 5 widgets are SNAPSHOT: use only last cut.
 * Handles swapped percentage/count files by detecting column semantics.
 */
import React, { useMemo } from 'react';
import { DashboardCard } from '../shared/DashboardCard';
import { FallbackMessage } from '../shared/FallbackMessage';
import { ExportButton } from '../shared/ExportButton';
import { RISK_ATTR_COLORS } from '../../utils/colorPalette';
import { getSnapshotCsv } from '../../utils/dataResolver';
import { detectPercentageOrCount, getNumericValue, findColumn } from '../../utils/csvNormalizer';
import type { ResolvedDashboardData } from '../../types';

interface Props {
  resolved: ResolvedDashboardData;
}

interface RiskAttribute {
  label: string;
  percentage: number | null;
  count: number | null;
  color: string;
}

/**
 * Resolve percentage and count from a pair of SNAPSHOT CSVs.
 */
function resolveAttr(
  resolved: ResolvedDashboardData,
  baseFile: string,
  suppFile: string | null,
  totalApps: number
): { percentage: number | null; count: number | null } {
  let percentage: number | null = null;
  let count: number | null = null;

  const baseCsv = getSnapshotCsv(resolved, baseFile);
  if (baseCsv) {
    const r = detectPercentageOrCount(baseCsv);
    if (r.type === 'percentage') percentage = r.value;
    else if (r.type === 'count') count = r.value;
    else if (r.value !== null) {
      if (r.value <= 100) percentage = r.value; else count = r.value;
    }
  }

  if (suppFile) {
    const suppCsv = getSnapshotCsv(resolved, suppFile);
    if (suppCsv) {
      const r = detectPercentageOrCount(suppCsv);
      if (r.type === 'percentage' && percentage === null) percentage = r.value;
      else if (r.type === 'count' && count === null) count = r.value;
      else if (r.value !== null) {
        if (percentage === null) percentage = r.value;
        else if (count === null) count = r.value;
      }
    }
  }

  if (percentage !== null && count === null && totalApps > 0)
    count = Math.round((percentage * totalApps) / 100);
  if (count !== null && percentage === null && totalApps > 0)
    percentage = Math.round((count / totalApps) * 10000) / 100;

  return { percentage, count };
}

export const IaRiskAttributes: React.FC<Props> = ({ resolved }) => {
  const attributes = useMemo((): RiskAttribute[] => {
    // Total AI apps from last cut's count_of_ai_apps_by_ccl.csv
    const cclCsv = getSnapshotCsv(resolved, 'count_of_ai_apps_by_ccl.csv');
    let totalApps = 0;
    if (cclCsv) {
      const colApps = findColumn(cclCsv, '# Applications');
      if (colApps) {
        totalApps = cclCsv.rows.reduce((sum, r) => sum + getNumericValue(r[colApps]), 0);
      }
    }

    return [
      { label: '% of AI apps for which customer data is used for learning purposes',
        ...resolveAttr(resolved,
          '__of_genai_apps_for_which_customer_data_is_used_for_learning_purposes.csv',
          '__of_genai_apps_for_which_customer_data_is_used_for_learning_purposes_1.csv', totalApps),
        color: RISK_ATTR_COLORS[0] },
      { label: '% of AI apps for which customer data is shared with the vendor',
        ...resolveAttr(resolved,
          '__of_ai_apps_for_which_customer_data_is_shared_with_the_vendor.csv',
          '__of_ai_apps_for_which_customer_data_is_shared_with_the_vendor_1.csv', totalApps),
        color: RISK_ATTR_COLORS[1] },
      { label: '% of AI apps for which there is no tenant isolation support',
        ...resolveAttr(resolved,
          '__of_ai_apps_for_which_there_is_no_tenant_isolation_support.csv',
          '__of_ai_apps_for_which_there_is_no_tenant_isolation_support_1.csv', totalApps),
        color: RISK_ATTR_COLORS[2] },
      { label: '% of AI apps for which there are no AI risk regulations & compliance',
        ...resolveAttr(resolved,
          '__of_ai_apps_for_which_there_are_no_ai_risk_regulations_&_compliance.csv',
          '__of_ai_apps_for_which_there_are_no_ai_risk_regulations_&_compliance_1.csv', totalApps),
        color: RISK_ATTR_COLORS[3] },
      { label: '% of AI apps for which there is no genAI usage policy',
        ...resolveAttr(resolved,
          '__of_ai_apps_for_which_there_is_no_genai_usage_policy.csv',
          '__of_ai_apps_for_which_there_is_no_genai_usage_policy_1.csv', totalApps),
        color: RISK_ATTR_COLORS[4] },
    ];
  }, [resolved]);

  const hasData = attributes.some((a) => a.percentage !== null || a.count !== null);

  return (
    <div id="dashboard-ia-risk-attributes">
      <div className="export-container">
        <ExportButton targetId="dashboard-ia-risk-attributes" filename="ia_risk_attributes" />
      </div>
      <DashboardCard title="AI Applications Risk Attributes">
        {hasData ? (
          <table className="risk-attr-table">
            <thead><tr>
              <th style={{ textAlign: 'left' }}>AI Applications Risk Attributes</th>
              <th>Percentage</th>
              <th># Apps</th>
            </tr></thead>
            <tbody>
              {attributes.map((attr, idx) => (
                <tr key={idx}>
                  <td>{attr.label}</td>
                  <td style={{ textAlign: 'center' }}>
                    {attr.percentage !== null
                      ? <span className="risk-attr-pill" style={{ background: attr.color }}>{Math.round(attr.percentage)}%</span>
                      : '—'}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {attr.count !== null
                      ? <span className="risk-attr-count">{attr.count}</span>
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <FallbackMessage title="Datos no disponibles" message="No se encontraron archivos de atributos de riesgo IA" />}
      </DashboardCard>
    </div>
  );
};
