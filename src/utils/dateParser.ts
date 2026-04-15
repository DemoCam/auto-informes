/**
 * Date Parser
 * Extracts cut dates from ZIP filenames and computes reporting months.
 */

/**
 * Extract a YYYY-MM-DD date from a filename.
 * Examples:
 *   "IA_en_riesgos_2024-03-15_..." → "2024-03-15"
 *   "Mapa_2024-03-15_..." → "2024-03-15"
 */
export function extractCutDate(filename: string): string | null {
  const match = filename.match(/(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

/**
 * Compute the reporting month from a cut date.
 * 
 * Calendar mode: reporting month = month of the cut date
 * Operational mode: if the cut date falls within the first `graceDays` of a month,
 *   it can be assigned to the previous month.
 */
export function computeReportingMonth(
  cutDate: string,
  mode: 'calendar' | 'operational',
  graceDays: number = 3
): { reportingMonth: string; ruleUsed: 'calendar' | 'operational' } {
  const date = new Date(cutDate + 'T00:00:00');
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed
  const day = date.getDate();

  if (mode === 'operational' && day <= graceDays) {
    // Assign to previous month
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    return {
      reportingMonth: `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}`,
      ruleUsed: 'operational',
    };
  }

  return {
    reportingMonth: `${year}-${String(month + 1).padStart(2, '0')}`,
    ruleUsed: 'calendar',
  };
}

/**
 * Format a reporting month for display: "2024-03" → "Marzo 2024"
 */
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function formatReportingMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-');
  const idx = parseInt(month, 10) - 1;
  return `${MONTH_NAMES[idx] || month} ${year}`;
}

/**
 * Format a cut date for display.
 */
export function formatCutDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
