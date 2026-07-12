import { UNITS } from '../data/units.js';
import type { CategoryCode, Unit } from '../types.js';

// Words a person would naturally type that map onto a category code.
const CATEGORY_SYNONYMS: Record<string, CategoryCode> = {
  tank: 'TNK', tanks: 'TNK', armor: 'TNK', armour: 'TNK',
  infantry: 'INF', inf: 'INF', troops: 'INF', squad: 'INF', squads: 'INF',
  recon: 'REC', scout: 'REC', scouts: 'REC', reconnaissance: 'REC',
  artillery: 'ART', arty: 'ART', mortar: 'ART', mortars: 'ART', howitzer: 'ART', howitzers: 'ART',
  aa: 'AA', antiair: 'AA', 'anti-air': 'AA', flak: 'AA',
  helicopter: 'HEL', helicopters: 'HEL', heli: 'HEL', helis: 'HEL', chopper: 'HEL', choppers: 'HEL', rotary: 'HEL',
  aircraft: 'AIR', plane: 'AIR', planes: 'AIR', jet: 'AIR', jets: 'AIR', air: 'AIR', fighter: 'AIR', fighters: 'AIR', bomber: 'AIR', bombers: 'AIR',
  logistics: 'LOG', supply: 'LOG', support: 'LOG', truck: 'LOG', trucks: 'LOG',
};

// The dataset's real tag vocabulary (checked against actual UNITS -- see
// backend/src/data/units.ts). "radar"/"guided"/"veteran" aren't real tags,
// but they're the words a person would actually type, so they're mapped to
// the closest real tag rather than silently returning nothing.
const REAL_TAGS = new Set([
  'cheap', 'tank', 'recon', 'air', 'sam', 'heavy', 'leader', 'atgm', 'elite',
  'supply', 'howitzer', 'line', 'spaag', 'spam', 'para', 'rockets', 'bomber',
  'cluster', 'manpads', 'cas', 'longrange', 'topattack', 'gun', 'mortar',
  'multirole', 'napalm', 'stealth', 'interceptor',
]);
const TAG_SYNONYMS: Record<string, string> = {
  radar: 'sam', radars: 'sam', 'radar-guided': 'sam',
  guided: 'atgm', antitank: 'atgm', 'anti-tank': 'atgm',
  veteran: 'elite', elites: 'elite',
  cheapest: 'cheap', budget: 'cheap',
  paratrooper: 'para', paratroopers: 'para', airborne: 'para',
  manpad: 'manpads',
  longranged: 'longrange', 'long-range': 'longrange',
};

function singularize(word: string): string {
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.endsWith('es') && word.length > 3) return word.slice(0, -2);
  if (word.endsWith('s') && word.length > 3) return word.slice(0, -1);
  return word;
}

export interface SearchMatch {
  categories: CategoryCode[];
  tags: string[];
  freeText: string[];
}

export interface SearchResult {
  results: Unit[];
  matched: SearchMatch;
  totalMatches: number;
}

const MAX_RESULTS = 100;

export function searchUnits(query: string): SearchResult {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const categories = new Set<CategoryCode>();
  const tags = new Set<string>();
  const freeText: string[] = [];

  for (const raw of words) {
    if (raw in CATEGORY_SYNONYMS) { categories.add(CATEGORY_SYNONYMS[raw]); continue; }
    if (raw in TAG_SYNONYMS) { tags.add(TAG_SYNONYMS[raw]); continue; }
    if (REAL_TAGS.has(raw)) { tags.add(raw); continue; }
    const sing = singularize(raw);
    if (sing in CATEGORY_SYNONYMS) { categories.add(CATEGORY_SYNONYMS[sing]); continue; }
    if (sing in TAG_SYNONYMS) { tags.add(TAG_SYNONYMS[sing]); continue; }
    if (REAL_TAGS.has(sing)) { tags.add(sing); continue; }
    // Filler words that carry no filtering signal on their own.
    if (['show', 'me', 'all', 'the', 'a', 'an', 'find', 'with', 'units', 'unit'].includes(raw)) continue;
    freeText.push(raw);
  }

  const catList = [...categories];
  const tagList = [...tags];

  let results = UNITS.filter((u) => {
    if (catList.length && !catList.includes(u.cat)) return false;
    if (tagList.length && !tagList.every((t) => u.tags.includes(t))) return false;
    if (freeText.length && !freeText.every((w) => u.name.toLowerCase().includes(w))) return false;
    return true;
  });

  const totalMatches = results.length;
  // Most-relevant-first: more matched tags first (closer fit), then by meta rating.
  results = results
    .sort((a, b) => b.meta - a.meta)
    .slice(0, MAX_RESULTS);

  return { results, matched: { categories: catList, tags: tagList, freeText }, totalMatches };
}