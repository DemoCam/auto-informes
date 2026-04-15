/**
 * Dashboard Validator
 * Checks that required CSV files and columns exist for each dashboard.
 */
import type { DashboardId, DashboardMeta, ParsedCsv, ValidationIssue } from '../types';
import { findColumn } from './csvNormalizer';

// ─── Dashboard definitions with required files and columns ───
export const DASHBOARD_DEFINITIONS: Record<DashboardId, DashboardMeta & { requiredColumns: Record<string, string[]> }> = {
  mapa_top_apps: {
    id: 'mapa_top_apps',
    title: 'Top Applications & Users',
    family: 'mapa',
    requiredFiles: [
      'top_10_applications_by_#_sessions.csv',
      'top_10_users_by_#_sessions.csv',
    ],
    requiredColumns: {
      'top_10_applications_by_#_sessions.csv': ['Application Destination', 'Sum - Total Network Sessions'],
      'top_10_users_by_#_sessions.csv': ['User', '# Network Sessions'],
    },
  },
  mapa_private_access: {
    id: 'mapa_private_access',
    title: 'Private Access Overview',
    family: 'mapa',
    requiredFiles: [
      'private_access_publisher_usage_by_bytes.csv',
      'most_used_policies.csv',
      'uploaded.csv',
      'downloaded.csv',
      'total_policies_access.csv',
      'active_publishers_count.csv',
      'discovered_apps.csv',
      'users.csv',
      'total_sessions.csv',
      'netskope_dc_count.csv',
      'top_private_apps_by_total_bytes.csv',
    ],
    requiredColumns: {
      'private_access_publisher_usage_by_bytes.csv': ['User', 'Policy Name', 'Publisher CN', 'Destination Host', 'Sum - Total Bytes (MB)'],
      'most_used_policies.csv': ['Policy Name', 'Sum - App Hits'],
      'uploaded.csv': ['Uploaded'],
      'downloaded.csv': ['Downloaded'],
      'total_policies_access.csv': ['Count of Policy Name'],
      'active_publishers_count.csv': ['Count of Publisher CN'],
      'discovered_apps.csv': ['Total Apps'],
      'users.csv': ['Count of User'],
      'total_sessions.csv': ['# Network Sessions'],
      'netskope_dc_count.csv': ['Count of Netskope Host POP'],
      'top_private_apps_by_total_bytes.csv': ['Destination Host', 'Total Bytes (MB)'],
    },
  },
  proteccion_gdpr: {
    id: 'proteccion_gdpr',
    title: 'GDPR Level & Top 20 Risky Apps',
    family: 'proteccion_datos_personales',
    requiredFiles: [
      '#_of_risky_applications_by_gdpr_level.csv',
      'top_20_risky_applications_with_low_gdpr_level.csv',
    ],
    requiredColumns: {
      '#_of_risky_applications_by_gdpr_level.csv': ['GDPR Level', '# Applications'],
      'top_20_risky_applications_with_low_gdpr_level.csv': ['Application', 'Category', 'CCL', '# Sessions', '# Users', 'Sum - Bytes Uploaded', 'Sum - Bytes Downloaded'],
    },
  },
  ia_risky_kpi: {
    id: 'ia_risky_kpi',
    title: '% of Risky AI Apps',
    family: 'ia_en_riesgos',
    requiredFiles: [
      '__of_risky_ai_apps_amongst_all_ai_apps.csv',
      'number_of_risky_ai_apps.csv',
    ],
    requiredColumns: {
      '__of_risky_ai_apps_amongst_all_ai_apps.csv': ['%RiskyApps'],
      'number_of_risky_ai_apps.csv': [],  // Column has variable spacing
    },
  },
  ia_risk_attributes: {
    id: 'ia_risk_attributes',
    title: 'AI Risk Attributes',
    family: 'ia_en_riesgos',
    requiredFiles: [
      '__of_genai_apps_for_which_customer_data_is_used_for_learning_purposes.csv',
      '__of_ai_apps_for_which_customer_data_is_shared_with_the_vendor.csv',
      '__of_ai_apps_for_which_there_is_no_tenant_isolation_support.csv',
      '__of_ai_apps_for_which_there_are_no_ai_risk_regulations_&_compliance.csv',
      '__of_ai_apps_for_which_there_is_no_genai_usage_policy.csv',
      'count_of_ai_apps_by_ccl.csv',
    ],
    requiredColumns: {
      'count_of_ai_apps_by_ccl.csv': ['CCL', '# Applications'],
    },
  },
  ia_distribution: {
    id: 'ia_distribution',
    title: 'Risky AI Apps Distribution',
    family: 'ia_en_riesgos',
    requiredFiles: [
      'number_of_users_accessing_risky_ai_apps.csv',
      'top_10_organization_unit_using_risky_ai_apps.csv',
      'top_10_risky_ai_apps.csv',
    ],
    requiredColumns: {
      'number_of_users_accessing_risky_ai_apps.csv': ['Event Date', '# Users'],
      'top_10_organization_unit_using_risky_ai_apps.csv': ['Organization Unit Level1', '# Applications'],
      'top_10_risky_ai_apps.csv': ['Application', '# Applications'],
    },
  },
  ia_ccl_overview: {
    id: 'ia_ccl_overview',
    title: 'CCL Overview',
    family: 'ia_en_riesgos',
    requiredFiles: [
      'count_of_ai_apps_by_ccl.csv',
      'ai_usage_in_total_bytes_by_ccl.csv',
      'ai_apps_used_by_ccl_score.csv',
    ],
    requiredColumns: {
      'count_of_ai_apps_by_ccl.csv': ['CCL', '# Applications'],
      'ai_usage_in_total_bytes_by_ccl.csv': ['CCL', 'Sum - Total Bytes (GB)'],
      'ai_apps_used_by_ccl_score.csv': ['Application', 'CCI'],
    },
  },
};

/**
 * Validate that a ZIP has the required files and columns for a given dashboard.
 */
export function validateDashboard(
  dashboardId: DashboardId,
  normalizedData: Record<string, ParsedCsv>
): { ready: boolean; issues: ValidationIssue[] } {
  const def = DASHBOARD_DEFINITIONS[dashboardId];
  const issues: ValidationIssue[] = [];
  let ready = true;

  for (const file of def.requiredFiles) {
    const csv = normalizedData[file];
    if (!csv) {
      // Try accent-normalized filename
      const altKey = Object.keys(normalizedData).find(
        (k) => k.toLowerCase() === file.toLowerCase()
      );
      if (!altKey) {
        issues.push({
          severity: 'error',
          message: `Archivo requerido faltante: ${file}`,
          file,
        });
        ready = false;
        continue;
      }
    }

    const csvData = csv || normalizedData[Object.keys(normalizedData).find(
      (k) => k.toLowerCase() === file.toLowerCase()
    )!];

    if (!csvData) continue;

    if (csvData.isEmpty) {
      issues.push({
        severity: 'warning',
        message: `Archivo vacío: ${file}`,
        file,
      });
    }

    // Check required columns
    const reqCols = def.requiredColumns[file];
    if (reqCols) {
      for (const col of reqCols) {
        if (!findColumn(csvData, col)) {
          issues.push({
            severity: 'warning',
            message: `Columna faltante en ${file}: "${col}"`,
            file,
            column: col,
          });
        }
      }
    }
  }

  return { ready, issues };
}

/**
 * Get all dashboards available for a given family.
 */
export function getDashboardsForFamily(family: string): DashboardId[] {
  return (Object.values(DASHBOARD_DEFINITIONS) as (DashboardMeta & { requiredColumns: Record<string, string[]> })[])
    .filter((d) => d.family === family)
    .map((d) => d.id);
}
