import { CATEGORIES } from '../data/divisions.js';
import type { CategoryCode, Division, Unit } from '../types.js';

export interface CategoryStrength {
  limit: number;
  avgMeta: number;
  avgFun: number;
  strength: number; // 0-10, blend of capacity (limit) and quality (avgMeta)
}

export interface DivisionProfile {
  metaScore: number;   // reuses division.power directly -- see note below
  memeScore: number;   // limit-weighted average `fun` across the resolved pool
  categories: Record<CategoryCode, CategoryStrength>;
}

// Capacity is normalized against a fixed reference rather than the max limit
// seen in the current data, so a profile stays comparable as more nations/divisions
// get added -- 12 is comfortably above any category limit in the current dataset.
const CAPACITY_REFERENCE = 12;

/**
 * Computes a shareable per-division profile from data that already exists on
 * every Unit/Division -- no new fields required.
 *
 *  - metaScore: NOT recomputed -- reuses `division.power` (the existing
 *    competitive-rating field) directly. Computing a second "how good is this
 *    division" number here would just create two numbers that disagree.
 *  - memeScore: pool-average `fun`, weighted by each category's limit so a
 *    division's biggest categories dominate the score (a division with 10 INF
 *    slots and 2 HEL slots should be judged mostly on its infantry's fun, not
 *    equally on both).
 *  - categories[cat].strength: blend of capacity (limit, normalized against
 *    CAPACITY_REFERENCE) and quality (avgMeta of that category's pool), 50/50.
 *    This is a deliberately simple starting formula -- see the caller-facing
 *    note in the API docs / PR description about playtesting it before
 *    treating it as authoritative.
 */
export function computeDivisionProfile(division: Division, pool: Unit[]): DivisionProfile {
  const categories = {} as Record<CategoryCode, CategoryStrength>;
  let weightedFunSum = 0;
  let weightSum = 0;

  for (const cat of CATEGORIES) {
    const units = pool.filter((u) => u.cat === cat);
    const limit = division.categoryLimits[cat];
    const avgMeta = units.length ? units.reduce((s, u) => s + u.meta, 0) / units.length : 0;
    const avgFun = units.length ? units.reduce((s, u) => s + u.fun, 0) / units.length : 0;

    const capacityScore = Math.min(1, limit / CAPACITY_REFERENCE);
    const qualityScore = Math.min(1, avgMeta / 10);
    const strength = Math.round((capacityScore * 0.5 + qualityScore * 0.5) * 100) / 10;

    categories[cat] = { limit, avgMeta: +avgMeta.toFixed(1), avgFun: +avgFun.toFixed(1), strength };

    weightedFunSum += avgFun * limit;
    weightSum += limit;
  }

  return {
    metaScore: division.power,
    memeScore: weightSum ? +(weightedFunSum / weightSum).toFixed(1) : 0,
    categories,
  };
}