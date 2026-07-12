import type { CategoryCode } from '../types';

export interface SynergyEdge {
  a: CategoryCode;
  b: CategoryCode;
  weight: 1 | 2 | 3; // 3 = strong, 2 = moderate, 1 = light
  doctrine: string;
}

// Category-level, not unit-level: the dataset doesn't distinguish which
// specific unit pairs well with which -- every TNK entry shows the same
// synergy pattern as every other TNK entry. Each edge is grounded in a real
// combined-arms doctrine point, not an invented "vibes" pairing. Weight
// reflects how load-bearing the doctrine point is, not a computed score.
export const SYNERGY_EDGES: SynergyEdge[] = [
  { a: 'TNK', b: 'AA', weight: 3, doctrine: 'Armor draws air attention; organic air defense keeps the spearhead alive under CAS.' },
  { a: 'TNK', b: 'REC', weight: 3, doctrine: 'A recon screen finds the ambush, the minefield, and the flank before the tanks do.' },
  { a: 'TNK', b: 'INF', weight: 3, doctrine: 'In close or urban terrain, infantry walks with the tanks to keep ATGM teams off them.' },
  { a: 'ART', b: 'REC', weight: 3, doctrine: 'Indirect fire is only as good as the eyes calling and correcting it.' },
  { a: 'INF', b: 'ART', weight: 2, doctrine: 'An infantry assault leans on suppressive fire to close the last stretch of open ground.' },
  { a: 'TNK', b: 'LOG', weight: 2, doctrine: "A tank's thirst for fuel is what actually sets the pace of an armored advance." },
  { a: 'ART', b: 'LOG', weight: 2, doctrine: 'Sustained fire missions burn through ammunition faster than any other category.' },
  { a: 'AA', b: 'ART', weight: 2, doctrine: 'Batteries are high-value, thin-skinned, and worth escorting once counter-battery fire starts.' },
  { a: 'HEL', b: 'TNK', weight: 2, doctrine: 'Attack helicopters ride shotgun for an armored push as fast, flying tank-killers.' },
  { a: 'HEL', b: 'REC', weight: 1, doctrine: "Rotary scouts see over the next ridge before the ground screen gets there." },
  { a: 'AIR', b: 'REC', weight: 1, doctrine: 'Someone on the ground has to paint the target before fast air can hit it.' },
  { a: 'HEL', b: 'INF', weight: 1, doctrine: 'Air-assault doctrine: helicopters put infantry behind the line, not through it.' },
  { a: 'AIR', b: 'ART', weight: 1, doctrine: 'Deep strike and counter-battery fire are two tools aimed at the same enemy rear.' },
];

// Short doctrine-voice taglines per category -- shown alongside the graph, in
// the same register as the rest of the dossier ("FIELD ORBAT", "AWAITING ORDERS").
export const CATEGORY_FLAVOR: Record<CategoryCode, string> = {
  LOG: 'The tail that feeds the spear.',
  REC: 'Eyes forward of the line.',
  INF: 'Holds what the armor takes.',
  ART: 'The god of war, still.',
  TNK: 'The armored fist.',
  AA: 'The umbrella over the advance.',
  HEL: 'Cavalry with rotors.',
  AIR: 'Reach beyond the front.',
};