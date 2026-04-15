/**
 * ZIP Ingester
 * Orchestrates the full pipeline:
 * unzip → detect family → extract date → validate → normalize → ZipEntity
 */
import JSZip from 'jszip';
import type { ZipEntity, ValidationIssue, ParsedCsv } from '../types';
import { detectZipFamily, findInternalFolder, stripDiacritics } from './zipDetector';
import { extractCutDate, computeReportingMonth } from './dateParser';
import { parseCsvString } from './csvNormalizer';

let entityCounter = 0;

/**
 * Process a single ZIP file and return a ZipEntity.
 */
export async function ingestZip(
  file: File,
  assignmentMode: 'calendar' | 'operational',
  graceDays: number
): Promise<ZipEntity> {
  const issues: ValidationIssue[] = [];
  const id = `zip_${++entityCounter}_${Date.now()}`;

  // 1. Detect family from filename
  const detection = detectZipFamily(file.name);
  if (!detection) {
    throw new Error(
      `No se pudo detectar la familia del ZIP: ${file.name}. ` +
      `Esperados: IA_en_riesgos_*, Mapa_*, proteccin_* / protección_*`
    );
  }

  // 2. Extract cut date
  const cutDate = extractCutDate(file.name);
  if (!cutDate) {
    issues.push({
      severity: 'warning',
      message: `No se encontró fecha en el nombre del archivo: ${file.name}. Usando fecha actual.`,
      file: file.name,
    });
  }

  const effectiveCutDate = cutDate || new Date().toISOString().split('T')[0];

  // 3. Compute reporting month
  const { reportingMonth, ruleUsed } = computeReportingMonth(
    effectiveCutDate,
    assignmentMode,
    graceDays
  );

  if (ruleUsed === 'operational' && assignmentMode === 'operational') {
    issues.push({
      severity: 'info',
      message: `Fecha ${effectiveCutDate} asignada al mes anterior por regla operacional (graceDays=${graceDays}).`,
      file: file.name,
    });
  }

  // 4. Unzip
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  const allPaths = Object.keys(zip.files);

  // 5. Find internal folder
  const actualFolder = findInternalFolder(allPaths, detection.expectedFolder);
  if (!actualFolder) {
    issues.push({
      severity: 'error',
      message: `Carpeta interna esperada no encontrada: ${detection.expectedFolder}`,
      file: file.name,
    });
  }

  // 6. Extract and normalize CSV files
  const normalizedData: Record<string, ParsedCsv> = {};
  const csvFilesDetected: string[] = [];

  for (const [path, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue;
    if (!path.toLowerCase().endsWith('.csv')) continue;

    // Get the filename relative to the internal folder
    let relativeName = path;
    if (actualFolder) {
      // Strip the folder prefix
      const normalizedPath = stripDiacritics(path.toLowerCase());
      const normalizedFolder = stripDiacritics(actualFolder.toLowerCase());
      if (normalizedPath.startsWith(normalizedFolder)) {
        relativeName = path.substring(actualFolder.length);
      } else if (path.includes('/')) {
        // Fallback: take everything after the first /
        relativeName = path.substring(path.indexOf('/') + 1);
      }
    } else if (path.includes('/')) {
      relativeName = path.substring(path.indexOf('/') + 1);
    }

    csvFilesDetected.push(relativeName);

    try {
      const content = await zipEntry.async('string');
      const { data, issues: csvIssues } = parseCsvString(content, relativeName);
      normalizedData[relativeName] = data;
      issues.push(...csvIssues);
    } catch (e) {
      issues.push({
        severity: 'error',
        message: `Error al leer ${relativeName}: ${e instanceof Error ? e.message : String(e)}`,
        file: relativeName,
      });
    }
  }

  // 7. Check expected CSV count
  const expectedCount = detection.expectedCsvCount;
  if (csvFilesDetected.length < expectedCount) {
    issues.push({
      severity: 'warning',
      message: `Se esperaban ${expectedCount} archivos CSV, se encontraron ${csvFilesDetected.length}.`,
      file: file.name,
    });
  }

  return {
    id,
    sourceType: detection.sourceType,
    originalFileName: file.name,
    cutDate: effectiveCutDate,
    reportingMonth,
    assignmentRuleUsed: ruleUsed,
    weekSequenceInMonth: 1, // Will be recalculated when added to store
    internalFolderName: actualFolder || detection.expectedFolder,
    csvFilesDetected,
    validationIssues: issues,
    normalizedData,
  };
}

/**
 * Recalculate weekSequenceInMonth for all ZIPs of the same type and month.
 */
export function recalculateWeekSequences(entities: ZipEntity[]): ZipEntity[] {
  const grouped: Record<string, ZipEntity[]> = {};

  for (const e of entities) {
    const key = `${e.sourceType}_${e.reportingMonth}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  }

  const result: ZipEntity[] = [];
  for (const group of Object.values(grouped)) {
    group.sort((a, b) => a.cutDate.localeCompare(b.cutDate));
    group.forEach((e, i) => {
      result.push({ ...e, weekSequenceInMonth: i + 1 });
    });
  }

  return result;
}

/**
 * Detect possible duplicates: two ZIPs of the same type within 3 days of each other.
 */
export function detectDuplicates(entities: ZipEntity[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const grouped: Record<string, ZipEntity[]> = {};

  for (const e of entities) {
    const key = `${e.sourceType}_${e.reportingMonth}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  }

  for (const group of Object.values(grouped)) {
    group.sort((a, b) => a.cutDate.localeCompare(b.cutDate));
    for (let i = 1; i < group.length; i++) {
      const prev = new Date(group[i - 1].cutDate + 'T00:00:00');
      const curr = new Date(group[i].cutDate + 'T00:00:00');
      const diffDays = Math.abs((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 3) {
        issues.push({
          severity: 'warning',
          message: `Posible duplicado: "${group[i - 1].originalFileName}" y "${group[i].originalFileName}" (${diffDays} días de diferencia).`,
        });
      }
    }
  }

  return issues;
}
