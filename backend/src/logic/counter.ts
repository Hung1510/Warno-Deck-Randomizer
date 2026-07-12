import type { CategoryCode, DeckUnit, ThemePreset } from '../types.js';

interface CounterDoctrine {
  against: CategoryCode;
  threshold: number; // minimum card count in that category to trigger this counter
  counter: ThemePreset;
  note: string;
}

// Only categories with a real, defensible doctrinal answer get an entry here.
// REC and LOG deliberately have none: recon is denied by tactics (screening,
// concealment), not "countered" by fielding a category, and LOG isn't a
// combat category at all -- inventing a counter for either would be filler,
// not doctrine.
const COUNTER_DOCTRINE: CounterDoctrine[] = [
  {
    against: 'TNK',
    threshold: 4,
    counter: { label: 'Anti-Armor', categories: ['TNK', 'HEL'], tags: ['atgm'] },
    note: 'Enemy armor is heaviest -- matched with more armor, ATGM-equipped infantry/recon, and attack helicopters.',
  },
  {
    against: 'AIR',
    threshold: 3,
    counter: { label: 'Air Denial', categories: ['AA'], tags: ['sam'] },
    note: 'Enemy air presence is heavy -- dedicated air defense goes up to deny it airspace.',
  },
  {
    against: 'HEL',
    threshold: 3,
    counter: { label: 'Air Denial', categories: ['AA'], tags: ['sam'] },
    note: 'Enemy rotary presence is heavy -- dedicated air defense goes up to deny it low-level airspace.',
  },
  {
    against: 'ART',
    threshold: 3,
    counter: { label: 'Counter-Battery', categories: ['REC', 'ART'], tags: [] },
    note: 'Enemy artillery is heavy -- recon goes up to find the guns, and our own artillery to answer them.',
  },
  {
    against: 'INF',
    threshold: 6,
    counter: { label: 'Rooting Out', categories: ['ART', 'TNK'], tags: [] },
    note: 'Enemy infantry is heavy -- dug-in infantry gets rooted out by armor and suppressive fire, not more infantry.',
  },
];

export interface CounterAnalysis {
  opponentCategoryCounts: Record<string, number>;
  triggered: string[]; // doctrine notes that fired, in the order they fired
  theme: ThemePreset | null;
}

function computeCounterThemeFromCounts(counts: Record<string, number>, subjectLabel: string): CounterAnalysis {
  const triggered: string[] = [];
  const categories = new Set<CategoryCode>();
  const tags = new Set<string>();
  const labels: string[] = [];

  for (const doctrine of COUNTER_DOCTRINE) {
    const count = counts[doctrine.against] || 0;
    if (count < doctrine.threshold) continue;
    triggered.push(`${doctrine.note} (${subjectLabel} fields ${count} ${doctrine.against}).`);
    labels.push(doctrine.counter.label);
    for (const c of doctrine.counter.categories) categories.add(c);
    for (const t of doctrine.counter.tags) tags.add(t);
  }

  if (categories.size === 0) {
    return { opponentCategoryCounts: counts, triggered: [`${subjectLabel} has no single dominant category -- rolling a balanced response instead.`], theme: null };
  }

  return {
    opponentCategoryCounts: counts,
    triggered,
    theme: { label: `Counter: ${[...new Set(labels)].join(' + ')}`, categories: [...categories], tags: [...tags] },
  };
}

/**
 * Analyzes an opponent's actual rolled/decoded deck and derives a combined
 * ThemePreset that counters whatever categories it leans on. Merges every
 * triggered doctrine entry rather than picking just the single most common
 * category, since a deck can be threatening in more than one way at once.
 */
export function computeCounterTheme(opponentCards: DeckUnit[]): CounterAnalysis {
  const counts: Record<string, number> = {};
  for (const u of opponentCards) counts[u.cat] = (counts[u.cat] || 0) + 1;
  return computeCounterThemeFromCounts(counts, 'opponent');
}

/**
 * Same doctrine, but sourced from a division's structural categoryLimits
 * rather than one specific rolled deck -- "what does this division type
 * typically field" rather than "what did this one deck happen to roll".
 * Used by the /counter <division> Discord command, where pasting a full deck
 * code into a slash-command argument isn't a reasonable UX.
 */
export function computeCounterThemeForDivision(categoryLimits: Record<CategoryCode, number>, divisionName: string): CounterAnalysis {
  return computeCounterThemeFromCounts(categoryLimits, divisionName);
}