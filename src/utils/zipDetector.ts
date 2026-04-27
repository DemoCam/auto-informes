/**
 * ZIP Family Detector
 * Identifies which Netskope dashboard family a ZIP belongs to
 * based on its filename prefix.
 */
import type { ZipEntity } from '../types';

interface DetectionResult {
  sourceType: ZipEntity['sourceType'];
  expectedFolder: string;
  expectedCsvCount: number;
}

/**
 * Detect the family of a ZIP file from its filename.
 * Handles accent-stripped names (e.g., "proteccin" instead of "protección").
 */
export function detectZipFamily(filename: string): DetectionResult | null {
  const lower = filename.toLowerCase();

  if (lower.startsWith('ia_en_riesgos_')) {
    return {
      sourceType: 'ia_en_riesgos',
      expectedFolder: 'dashboard-ia_en_riesgos/',
      expectedCsvCount: 24,
    };
  }

  if (lower.startsWith('mapa_')) {
    return {
      sourceType: 'mapa',
      expectedFolder: 'dashboard-mapa/',
      expectedCsvCount: 19,
    };
  }

  // Protección — the ZIP name may come without accents
  if (
    lower.startsWith('protecci') ||
    lower.startsWith('protección') ||
    lower.startsWith('proteccion')
  ) {
    return {
      sourceType: 'proteccion_datos_personales',
      // The internal folder DOES have accents
      expectedFolder: 'dashboard-protección_protección_de_datos_personales/',
      expectedCsvCount: 10,
    };
  }

  // SWG Summary
  if (lower.startsWith('swg_summary_')) {
    return {
      sourceType: 'swg_summary',
      expectedFolder: 'dashboard-swg_summary/',
      expectedCsvCount: 5,
    };
  }

  return null;
}

/**
 * Normalize a folder path by stripping diacritics for comparison.
 * Used to match internal ZIP folders that may have accented characters.
 */
export function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Find the actual internal folder in a ZIP that matches the expected family folder.
 * Handles accent variations.
 */
export function findInternalFolder(
  zipPaths: string[],
  expectedFolder: string
): string | null {
  const normalizedExpected = stripDiacritics(expectedFolder.toLowerCase());

  // Try exact match first
  const exact = zipPaths.find((p) => p.startsWith(expectedFolder));
  if (exact) return expectedFolder;

  // Try accent-stripped match
  for (const p of zipPaths) {
    const normalizedPath = stripDiacritics(p.toLowerCase());
    if (normalizedPath.startsWith(normalizedExpected)) {
      // Return the folder portion of the actual path
      const slashIdx = p.indexOf('/');
      if (slashIdx > 0) {
        return p.substring(0, slashIdx + 1);
      }
    }
  }

  // Try just matching the dashboard prefix pattern
  for (const p of zipPaths) {
    const lower = stripDiacritics(p.toLowerCase());
    if (lower.startsWith('dashboard-')) {
      const slashIdx = p.indexOf('/');
      if (slashIdx > 0) {
        return p.substring(0, slashIdx + 1);
      }
    }
  }

  return null;
}
