import { DIVISIONS, DIVISIONS_BY_ID, CATEGORIES } from '../data/divisions.js';
import { availableUnits, groupByCategory, slotCost } from './availability.js';
import { rateDifficulty } from './difficulty.js';
import type {
  CategoryCode, Deck, DeckResponse, DeckUnit, Division, Mode, RandomizeParams, Unit, ThemePreset,
} from '../types.js';

// ---------- seeded RNG (so a deck can be shared / reproduced) ----------
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}
function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeRng(seed: string): () => number {
  return mulberry32(xmur3(String(seed))());
}
const newSeed = (): string => Math.random().toString(36).slice(2, 10);
const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

// ---------- chaos slider (0 = pure Meta, 100 = pure Fun) ----------
// Replaces the old binary mode switch with a continuous blend, per the brief:
// "score = (fun * ratio) + (meta * (1 - ratio))". We blend the two *tuned*
// weight functions below (exponent + tag-bonus included) rather than the raw
// fun/meta stats directly -- that preserves the existing shaping at each
// extreme (ratio=0 reproduces the old meta formula exactly, ratio=1 the old
// fun formula exactly) instead of losing it.
function resolveChaos(params: RandomizeParams): number {
  if (params.chaos !== undefined && params.chaos !== null && params.chaos !== '') {
    const n = Number(params.chaos);
    if (!Number.isNaN(n)) return Math.max(0, Math.min(100, n));
  }
  // Back-compat: old clients only ever sent mode: 'fun' | 'meta'.
  return params.mode === 'meta' ? 0 : 100;
}
// A single 0-100 number doesn't carry enough information for the old binary
// mode-dependent styling (banner color, theme-name pool) -- bucket it, but
// the real source of truth returned to the client is the `chaos` number.
function bucketMode(chaos: number): Mode {
  return chaos >= 50 ? 'fun' : 'meta';
}

// ---------- theme presets ("chaos factor" flavor, not the fun/meta axis) ----------
// Each theme names the categories it structurally maxes out (guaranteed to
// dominate the deck's composition) and the tags it gives an extra pick-weight
// bonus to (so flavor units win their category's rolls, and units carrying
// the tag in *other* categories -- eg a napalm-tagged helicopter -- also get
// a nudge even though HEL isn't itself maxed).
export const THEME_PRESETS: Record<string, ThemePreset> = {
  helicopter_rush: { label: 'Helicopter Rush', categories: ['HEL'], tags: ['air'] },
  napalm_spam: { label: 'Napalm Spam', categories: ['AIR', 'ART'], tags: ['napalm', 'cluster', 'rockets', 'gun'] },
  heavy_armor: { label: 'Heavy Armor', categories: ['TNK'], tags: ['heavy', 'tank'] },
  recon_sniper: { label: 'Recon Sniper', categories: ['REC'], tags: ['recon', 'elite', 'stealth'] },
};

// ---------- weighting ----------
const META_FAVOR = ['atgm', 'elite', 'heavy', 'sead', 'spaag', 'topattack', 'longrange'];
const FUN_FAVOR = ['napalm', 'cluster', 'spam', 'rockets', 'gun', 'stealth', 'light'];

function metaWeight(unit: Unit): number {
  let w = Math.pow(unit.meta, 2.3) + 0.5;
  const hits = unit.tags.filter((t) => META_FAVOR.includes(t)).length;
  w *= 1 + hits * 0.25;
  return w;
}
function funWeight(unit: Unit): number {
  let w = Math.pow(unit.fun, 1.6) + 0.5;
  const hits = unit.tags.filter((t) => FUN_FAVOR.includes(t)).length;
  w *= 1 + hits * 0.45;
  return w;
}

function unitWeight(unit: Unit, ratio: number, theme: ThemePreset | null): number {
  let w = funWeight(unit) * ratio + metaWeight(unit) * (1 - ratio);
  if (theme) {
    const hits = unit.tags.filter((t) => theme.tags.includes(t)).length;
    if (hits > 0) w *= 1 + hits * 0.6;
  }
  return w;
}

function weightedPick(units: Unit[], ratio: number, theme: ThemePreset | null, rng: () => number): Unit {
  const weights = units.map((u) => unitWeight(u, ratio, theme));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < units.length; i++) {
    r -= weights[i];
    if (r <= 0) return units[i];
  }
  return units[units.length - 1];
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- fill planning ----------
type Targets = Record<CategoryCode, number>;

function metaTargets(division: Division): Targets {
  const L = division.categoryLimits;
  return {
    LOG: Math.min(2, L.LOG),
    REC: L.REC,
    INF: Math.max(2, Math.round(L.INF * 0.6)),
    ART: Math.min(3, L.ART),
    TNK: L.TNK,
    AA: Math.max(2, Math.round(L.AA * 0.8)),
    HEL: Math.min(2, L.HEL),
    AIR: Math.min(2, L.AIR),
  };
}

function funTargets(division: Division, rng: () => number): Targets {
  const L = division.categoryLimits;
  const t = {} as Targets;
  for (const c of CATEGORIES) {
    const min = c === 'LOG' ? 1 : 0;
    t[c] = Math.max(min, Math.floor(rng() * (L[c] + 1)));
  }
  if (t.LOG < 1) t.LOG = 1;
  if (t.INF + t.TNK < 2) t.INF = Math.max(t.INF, 2);
  return t;
}

// Blends the meta and fun target-count plans category-by-category, so moving
// the slider smoothly reshapes the deck's composition instead of jumping
// between two fixed plans at the midpoint.
function blendedTargets(division: Division, ratio: number, rng: () => number): Targets {
  const meta = metaTargets(division);
  const fun = funTargets(division, rng);
  const L = division.categoryLimits;
  const t = {} as Targets;
  for (const c of CATEGORIES) {
    const blended = Math.round(meta[c] * (1 - ratio) + fun[c] * ratio);
    t[c] = Math.max(0, Math.min(L[c], blended));
  }
  if (t.LOG < 1 && L.LOG >= 1) t.LOG = 1;
  if (t.INF + t.TNK < 2) t.INF = Math.min(L.INF, Math.max(t.INF, 2 - t.TNK));
  return t;
}

// Order in which slots are requested. Below the midpoint, essentials get
// secured first (meta-style); above it, order is shuffled (fun-style). This
// one step stays a threshold rather than a smooth blend -- see the theme
// front-loading below for the part that's guaranteed regardless of chaos.
function buildQueue(division: Division, ratio: number, rng: () => number, theme: ThemePreset | null): CategoryCode[] {
  const targets = blendedTargets(division, ratio, rng);
  if (theme) {
    for (const c of theme.categories) targets[c] = division.categoryLimits[c];
  }

  const queue: CategoryCode[] = [];
  for (const c of CATEGORIES) for (let i = 0; i < targets[c]; i++) queue.push(c);

  if (ratio <= 0.5) {
    const priority: Record<CategoryCode, number> =
      { LOG: 0, REC: 1, TNK: 2, AA: 3, INF: 4, ART: 5, HEL: 6, AIR: 7 };
    queue.sort((a, b) => priority[a] - priority[b]);
  } else {
    const idx = queue.indexOf('LOG');
    if (idx > -1) queue.splice(idx, 1);
    const rest = shuffle(queue, rng);
    queue.length = 0;
    queue.push('LOG', ...rest);
  }

  // Theme intent always wins a spot in the AP budget: pull its categories to
  // the very front regardless of the chaos-driven order above, so eg a
  // Helicopter Rush roll can't starve HEL out of the budget by being queued last.
  if (theme && theme.categories.length > 0) {
    const boosted = queue.filter((c) => theme.categories.includes(c));
    const rest = queue.filter((c) => !theme.categories.includes(c));
    return [...boosted, ...rest];
  }
  return queue;
}

const THEMES: Record<Mode, string[]> = {
  meta: ['Spearhead', 'Iron Wall', 'Combined Arms', 'Overwatch', 'Hammerblow', 'Vanguard', 'Steel Rain'],
  fun: ['Glorious Chaos', 'Send It', 'Napalm Sunday', 'Tin Can Tsunami', 'Helicopter Circus', 'Maximum Effort', 'For The Memes'],
};

// Shared core so generateDeck() (public theme presets) and generateCounterDeck()
// (a computed, ad-hoc theme override from opponent analysis) share one code path.
function generateDeckCore(params: RandomizeParams, themeOverride: ThemePreset | null): DeckResponse {
  const { divisionId, coalition, nation, dlc, seed } = params;
  const chaos = resolveChaos(params);
  const ratio = clamp01(chaos / 100);
  const mode = bucketMode(chaos);
  const theme = themeOverride ?? (params.theme ? THEME_PRESETS[params.theme] ?? null : null);
  const usedSeed = seed || newSeed();
  const rng = makeRng(`${usedSeed}|${chaos}|${theme?.label ?? ''}`);

  // resolve division
  let division: Division;
  if (divisionId && divisionId !== 'random') {
    const found = DIVISIONS_BY_ID[divisionId];
    if (!found) throw new Error(`Unknown divisionId: ${divisionId}`);
    division = found;
  } else {
    let pool = DIVISIONS;
    if (coalition) pool = pool.filter((d) => d.coalition === coalition);
    if (nation) pool = pool.filter((d) => d.nation === nation);
    if (dlc) pool = pool.filter((d) => d.dlc === dlc);
    if (pool.length === 0) throw new Error('No division matches the given filters');
    // Blend division-selection weight too: pure power-weighted at ratio=0,
    // pure uniform at ratio=1 (the meta term vanishes exactly at ratio=1).
    const weights = pool.map((d) => Math.pow(d.power || 5, 2.2) * (1 - ratio) + 1 * ratio);
    const total = weights.reduce((a, b) => a + b, 0);
    let r = rng() * total;
    division = pool[pool.length - 1];
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) { division = pool[i]; break; }
    }
  }

  const byCat = groupByCategory(availableUnits(division));
  const queue = buildQueue(division, ratio, rng, theme);

  const deck = Object.fromEntries(CATEGORIES.map((c) => [c, []])) as unknown as Deck;
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<CategoryCode, number>;
  const repeats: Record<string, number> = {};
  let apSpent = 0;
  const apTotal = division.activationPoints;
  const maxRepeat = Math.round(2 + ratio * 2); // 2 at pure meta, 4 at pure fun

  for (const cat of queue) {
    if (counts[cat] >= division.categoryLimits[cat]) continue;
    const cost = slotCost(counts[cat]);
    if (apSpent + cost > apTotal) continue;
    const candidates = byCat[cat].filter((u) => (repeats[u.id] || 0) < maxRepeat);
    if (candidates.length === 0) continue;

    const unit = weightedPick(candidates, ratio, theme, rng);
    const deckUnit: DeckUnit = { ...unit, apCost: cost };
    deck[cat].push(deckUnit);
    counts[cat] += 1;
    repeats[unit.id] = (repeats[unit.id] || 0) + 1;
    apSpent += cost;
  }

  const cards = CATEGORIES.flatMap((c) => deck[c]);
  const totalPoints = cards.reduce((sum, u) => sum + u.cost, 0);
  const themeNamePool = THEMES[mode];
  const themeName = theme ? theme.label : themeNamePool[Math.floor(rng() * themeNamePool.length)];

  return {
    seed: usedSeed,
    mode,
    chaos,
    theme: themeName,
    division,
    deck,
    summary: {
      cards: cards.length,
      apSpent,
      apTotal,
      totalPoints,
      categories: counts,
    },
    difficulty: rateDifficulty(cards),
  };
}

// ---------- main ----------
export function generateDeck(params: RandomizeParams = {}): DeckResponse {
  return generateDeckCore(params, null);
}

// Used by the counter-deck generator (logic/counter.ts) to inject a computed
// theme override instead of a named preset.
export function generateDeckWithThemeOverride(params: RandomizeParams, override: ThemePreset): DeckResponse {
  return generateDeckCore(params, override);
}