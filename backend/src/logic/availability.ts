import { UNITS } from '../data/units.js';
import { CATEGORIES } from '../data/divisions.js';
import type { CategoryCode, Division, Unit } from '../types.js';

// Cards within a category get progressively more expensive in activation points.
const SLOT_CURVE = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6];

export function slotCost(slotIndex: number): number {
  return SLOT_CURVE[Math.min(slotIndex, SLOT_CURVE.length - 1)];
}

// Minor nations have only a small signature pool, so their divisions also draw on
// a same-coalition "donor" nation's units (plausible shared NATO / Pact equipment).
const DONOR: Record<string, string> = {
  Belgium: 'West Germany',
  Netherlands: 'West Germany',
  Canada: 'West Germany',
  Spain: 'West Germany',
  Denmark: 'West Germany',
  Poland: 'Soviet Union',
  Czechoslovakia: 'Soviet Union',
  Cuba: 'Soviet Union',
};

// Units a division can field: its nation (+ donor pool for minor nations),
// with light type-based filtering.
export function availableUnits(division: Division): Unit[] {
  const nations = new Set<string>([division.nation]);
  const donor = DONOR[division.nation];
  if (donor) nations.add(donor);

  const lightForce = division.type === 'Airborne' || division.type === 'Airmobile';

  return UNITS.filter((u) => {
    if (!nations.has(u.nation)) return false;
    // Light (para / air-assault) forces can't bring heavy main battle tanks.
    if (lightForce && u.cat === 'TNK' && u.tags.includes('heavy')) return false;
    return true;
  });
}

export function groupByCategory(units: Unit[]): Record<CategoryCode, Unit[]> {
  const grouped = Object.fromEntries(CATEGORIES.map((c) => [c, []])) as unknown as Record<CategoryCode, Unit[]>;
  for (const u of units) grouped[u.cat].push(u);
  return grouped;
}
