import type { Unit } from '../types.js';

// Tags that generally demand precise positioning/timing/coordination to get value
// from (a whiffed ATGM shot or a misused stealth asset costs more than a misused
// cheap rifleman does) -- these push difficulty up.
const PRECISION_TAGS = ['atgm', 'elite', 'stealth', 'leader', 'sam', 'topattack', 'sead'];
// Tags that are forgiving of misuse -- mass, cheap, replaceable -- these pull it down.
const FORGIVING_TAGS = ['cheap', 'spam', 'line'];

export interface DifficultyRating {
  /** 1 (easiest) - 5 (hardest), for star display */
  stars: number;
  /** 0-100 continuous score behind the stars, for tooltips/sorting */
  score: number;
  label: 'Trivial' | 'Easy' | 'Moderate' | 'Demanding' | 'Hard';
  breakdown: {
    avgCost: number;
    avgMeta: number;
    categorySpread: number;
    precisionTagShare: number;
  };
}

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

/**
 * Rates how demanding a set of units is to pilot well, aimed at newer players.
 * Pass the units actually rolled into a deck for a per-roll rating, or a
 * division's full resolved pool (availableUnits(division)) for a static
 * per-division rating (e.g. an "easiest/hardest divisions" list).
 *
 * Signals (all derived from existing Unit fields, no new data needed):
 *  - avgCost: pricier units are typically fewer, higher-value picks where a
 *    misplay costs more -- correlates with "premium tier, unforgiving" gear.
 *  - avgMeta: higher meta-rated units tend to require more precise application
 *    to earn their rating (that's why they're rated highly in the first place).
 *  - categorySpread: how many distinct systems (LOG/INF/ART/TNK/REC/AA/HEL/AIR)
 *    are in play -- more systems means more to juggle simultaneously.
 *  - precisionTagShare vs forgivingTagShare: tag-based proxy for how much of the
 *    unit mix rewards careful use (ATGM, elite, stealth) vs tolerates mistakes
 *    (cheap, spam, line infantry).
 */
export function rateDifficulty(units: Unit[]): DifficultyRating {
  if (units.length === 0) {
    return {
      stars: 1, score: 0, label: 'Trivial',
      breakdown: { avgCost: 0, avgMeta: 0, categorySpread: 0, precisionTagShare: 0 },
    };
  }

  const avgCost = units.reduce((s, u) => s + u.cost, 0) / units.length;
  const avgMeta = units.reduce((s, u) => s + u.meta, 0) / units.length;
  const categorySpread = new Set(units.map((u) => u.cat)).size;
  const precisionShare = units.filter((u) => u.tags.some((t) => PRECISION_TAGS.includes(t))).length / units.length;
  const forgivingShare = units.filter((u) => u.tags.some((t) => FORGIVING_TAGS.includes(t))).length / units.length;

  // Denominators are calibrated against real generateDeck() output (not raw
  // division pools, which wash out to near-identical averages across every
  // division -- see git history / PR notes if retuning this). A deck's average
  // unit cost is dragged down by mandatory cheap LOG/INF slots, so it rarely
  // exceeds ~150 even for elite-heavy divisions; avgMeta clusters ~4.5-7.5.
  const costScore = clamp01(avgCost / 170);
  const metaScore = clamp01((avgMeta - 3) / 6);
  const spreadScore = clamp01((categorySpread - 2) / 6);
  const precisionScore = clamp01(precisionShare / 0.4);
  const forgivingDiscount = forgivingShare * 0.5;

  const raw = clamp01(
    costScore * 0.30 + metaScore * 0.30 + spreadScore * 0.20 + precisionScore * 0.20 - forgivingDiscount,
  );

  const score = Math.round(raw * 100);
  // Breakpoints are the ~10th/35th/65th/90th percentiles of score across ~670
  // real generateDeck() rolls spanning every division and both modes, using the
  // corrected 50-AP-max deck sizes -- a naive linear 0-100 -> 1-5 map left
  // almost everything bunched at 3 stars, because a deck's average cost/meta is
  // dragged toward the middle by mandatory cheap LOG/INF slots. Re-run the
  // calibration sweep if the unit pool or AP budgets change enough to shift
  // the distribution.
  const stars = score < 29 ? 1 : score < 38 ? 2 : score < 46 ? 3 : score < 55 ? 4 : 5;
  const labels: DifficultyRating['label'][] = ['Trivial', 'Easy', 'Moderate', 'Demanding', 'Hard'];

  return {
    stars,
    score,
    label: labels[stars - 1],
    breakdown: {
      avgCost: +avgCost.toFixed(1),
      avgMeta: +avgMeta.toFixed(1),
      categorySpread,
      precisionTagShare: +precisionShare.toFixed(2),
    },
  };
}