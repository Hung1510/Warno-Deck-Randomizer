import { DIVISIONS, DIVISIONS_BY_ID, CATEGORIES } from '../data/divisions.js';
import { availableUnits, groupByCategory, slotCost } from './availability.js';
import type {
  CategoryCode, Deck, DeckResponse, DeckUnit, Division, Mode, RandomizeParams, Unit,
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

// ---------- weighting ----------
const META_FAVOR = ['atgm', 'elite', 'heavy', 'sead', 'spaag', 'topattack', 'longrange'];
const FUN_FAVOR = ['napalm', 'cluster', 'spam', 'rockets', 'gun', 'stealth', 'light'];

function unitWeight(unit: Unit, mode: Mode): number {
  const base = mode === 'meta' ? unit.meta : unit.fun;
  const exponent = mode === 'meta' ? 2.3 : 1.6;
  let w = Math.pow(base, exponent) + 0.5;
  const favored = mode === 'meta' ? META_FAVOR : FUN_FAVOR;
  const hits = unit.tags.filter((t) => favored.includes(t)).length;
  w *= 1 + hits * (mode === 'meta' ? 0.25 : 0.45);
  return w;
}

function weightedPick(units: Unit[], mode: Mode, rng: () => number): Unit {
  const weights = units.map((u) => unitWeight(u, mode));
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

// Order in which slots are requested. Meta secures essentials first; fun is chaos.
function buildQueue(division: Division, mode: Mode, rng: () => number): CategoryCode[] {
  const targets = mode === 'meta' ? metaTargets(division) : funTargets(division, rng);
  const queue: CategoryCode[] = [];
  for (const c of CATEGORIES) for (let i = 0; i < targets[c]; i++) queue.push(c);

  if (mode === 'meta') {
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
  return queue;
}

const THEMES: Record<Mode, string[]> = {
  meta: ['Spearhead', 'Iron Wall', 'Combined Arms', 'Overwatch', 'Hammerblow', 'Vanguard', 'Steel Rain'],
  fun: ['Glorious Chaos', 'Send It', 'Napalm Sunday', 'Tin Can Tsunami', 'Helicopter Circus', 'Maximum Effort', 'For The Memes'],
};

// ---------- main ----------
export function generateDeck(params: RandomizeParams = {}): DeckResponse {
  const { divisionId, coalition, nation, dlc, seed } = params;
  const mode: Mode = params.mode === 'meta' ? 'meta' : 'fun';
  const usedSeed = seed || newSeed();
  const rng = makeRng(`${usedSeed}|${mode}`);

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
    if (mode === 'meta') {
      // Meta mode favours higher-rated (win-rate) divisions; Fun mode is uniform.
      const weights = pool.map((d) => Math.pow(d.power || 5, 2.2));
      const total = weights.reduce((a, b) => a + b, 0);
      let r = rng() * total;
      division = pool[pool.length - 1];
      for (let i = 0; i < pool.length; i++) {
        r -= weights[i];
        if (r <= 0) { division = pool[i]; break; }
      }
    } else {
      division = pool[Math.floor(rng() * pool.length)];
    }
  }

  const byCat = groupByCategory(availableUnits(division));
  const queue = buildQueue(division, mode, rng);

  const deck = Object.fromEntries(CATEGORIES.map((c) => [c, []])) as unknown as Deck;
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<CategoryCode, number>;
  const repeats: Record<string, number> = {};
  let apSpent = 0;
  const apTotal = division.activationPoints;
  const maxRepeat = mode === 'meta' ? 2 : 4;

  for (const cat of queue) {
    if (counts[cat] >= division.categoryLimits[cat]) continue;
    const cost = slotCost(counts[cat]);
    if (apSpent + cost > apTotal) continue;
    const candidates = byCat[cat].filter((u) => (repeats[u.id] || 0) < maxRepeat);
    if (candidates.length === 0) continue;

    const unit = weightedPick(candidates, mode, rng);
    const deckUnit: DeckUnit = { ...unit, apCost: cost };
    deck[cat].push(deckUnit);
    counts[cat] += 1;
    repeats[unit.id] = (repeats[unit.id] || 0) + 1;
    apSpent += cost;
  }

  const cards = CATEGORIES.flatMap((c) => deck[c]);
  const totalPoints = cards.reduce((sum, u) => sum + u.cost, 0);
  const themeList = THEMES[mode];
  const theme = themeList[Math.floor(rng() * themeList.length)];

  return {
    seed: usedSeed,
    mode,
    theme,
    division,
    deck,
    summary: {
      cards: cards.length,
      apSpent,
      apTotal,
      totalPoints,
      categories: counts,
    },
  };
}
