import { Medium } from '../types';

/**
 * Canonical shortName → Medium ID map.
 * Used as the single source of truth for medium resolution across the app.
 */
function buildLookupMaps(mediums: Medium[]) {
  const byId: Record<string, Medium> = {};
  const byShortName: Record<string, Medium> = {};
  const byCode: Record<string, Medium> = {};
  const byName: Record<string, Medium> = {};
  const idByUpperShort: Record<string, string> = {};

  for (const m of mediums) {
    if (m.id) byId[m.id] = m;
    if (m.shortName) byShortName[m.shortName] = m;
    if (m.code) byCode[m.code.toUpperCase()] = m;
    if (m.name) byName[m.name.toUpperCase()] = m;
    if (m.shortName) idByUpperShort[m.shortName.toUpperCase()] = m.id;
    if (m.code) idByUpperShort[m.code.toUpperCase()] = m.id;
    if (m.name) idByUpperShort[m.name.toUpperCase()] = m.id;
  }
  return { byId, byShortName, byCode, byName, idByUpperShort };
}

/**
 * Resolve a medium string (any form — code, name, shortName, id) to its canonical shortName.
 * Returns '' if not found.
 */
export function resolveMediumShortName(input: string, mediums: Medium[]): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (!trimmed) return '';
  const upper = trimmed.toUpperCase();

  const maps = buildLookupMaps(mediums);

  // Direct ID match
  if (maps.byId[trimmed]) return maps.byId[trimmed].shortName;
  // Direct shortName match (case-sensitive)
  if (maps.byShortName[trimmed]) return maps.byShortName[trimmed].shortName;
  // Code match (uppercase)
  if (maps.byCode[upper]) return maps.byCode[upper].shortName;
  // Name match (uppercase)
  if (maps.byName[upper]) return maps.byName[upper].shortName;
  return '';
}

/**
 * Resolve a medium string to its canonical Medium ID.
 * Returns '' if not found.
 */
export function resolveMediumId(input: string, mediums: Medium[]): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (!trimmed) return '';
  const upper = trimmed.toUpperCase();

  const maps = buildLookupMaps(mediums);

  // Direct ID match
  if (maps.byId[trimmed]) return trimmed;
  // ShortName match
  if (maps.byShortName[trimmed]) return maps.byShortName[trimmed].id;
  // Code match
  if (maps.byCode[upper]) return maps.byCode[upper].id;
  // Name match
  if (maps.byName[upper]) return maps.byName[upper].id;
  return '';
}

/**
 * Resolve a medium string to its canonical Medium code (e.g. 'TM', 'EM').
 * Returns '' if not found.
 */
export function resolveMediumCode(input: string, mediums: Medium[]): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (!trimmed) return '';
  const upper = trimmed.toUpperCase();

  const maps = buildLookupMaps(mediums);

  if (maps.byId[trimmed]) return maps.byId[trimmed].code;
  if (maps.byShortName[trimmed]) return maps.byShortName[trimmed].code;
  if (maps.byCode[upper]) return maps.byCode[upper].code;
  if (maps.byName[upper]) return maps.byName[upper].code;
  return '';
}

/**
 * Resolve a medium string to its canonical Medium name (e.g. 'Tamil Medium').
 * Returns '' if not found.
 */
export function resolveMediumName(input: string, mediums: Medium[]): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (!trimmed) return '';
  const upper = trimmed.toUpperCase();

  const maps = buildLookupMaps(mediums);

  if (maps.byId[trimmed]) return maps.byId[trimmed].name;
  if (maps.byShortName[trimmed]) return maps.byShortName[trimmed].name;
  if (maps.byCode[upper]) return maps.byCode[upper].name;
  if (maps.byName[upper]) return maps.byName[upper].name;
  return '';
}

/**
 * Get the full Medium object for any medium string input.
 * Returns undefined if not found.
 */
export function resolveMedium(input: string, mediums: Medium[]): Medium | undefined {
  if (!input) return undefined;
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  const upper = trimmed.toUpperCase();

  const maps = buildLookupMaps(mediums);

  if (maps.byId[trimmed]) return maps.byId[trimmed];
  if (maps.byShortName[trimmed]) return maps.byShortName[trimmed];
  if (maps.byCode[upper]) return maps.byCode[upper];
  if (maps.byName[upper]) return maps.byName[upper];
  return undefined;
}

/**
 * Legacy bridge: same as resolveMediumId.
 * Maps any medium string to the Medium ID for DB storage.
 * Accepts codes (TM/EM/MM/KM), shortNames (Tamil/English), full names (Tamil Medium).
 */
export function mediumNameToId(medium: string, mediums: Medium[]): string {
  return resolveMediumId(medium, mediums);
}

/**
 * Sort mediums strictly by displayOrder. Never alphabetically.
 */
export function sortMediums<T extends { displayOrder?: number }>(a: T, b: T): number {
  return (a.displayOrder || 0) - (b.displayOrder || 0);
}

/**
 * Get sorted unique medium shortNames from a list of mediums.
 * Sorted strictly by displayOrder.
 */
export function getMediumShortNames(mediums: Medium[]): string[] {
  const active = getActiveMediums(mediums);
  const seen = new Set<string>();
  const res: string[] = [];
  for (const m of active) {
    if (m.shortName && !seen.has(m.shortName)) {
      seen.add(m.shortName);
      res.push(m.shortName);
    }
  }
  return res;
}

/**
 * Get sorted active mediums (by displayOrder).
 */
export function getActiveMediums(mediums: Medium[]): Medium[] {
  return mediums.filter(m => m.active !== false).sort(sortMediums);
}

/**
 * Build a shortName → color map for consistent medium styling.
 * Returns predefined colors for known mediums, neutral for unknown.
 */
const MEDIUM_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Tamil: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  English: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
  Malayalam: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  Kannada: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
  Hindi: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  Arabic: { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-200' },
  Urdu: { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200' },
};

export function getMediumColor(shortName: string): { bg: string; text: string; border: string } {
  return MEDIUM_COLORS[shortName] || { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' };
}
