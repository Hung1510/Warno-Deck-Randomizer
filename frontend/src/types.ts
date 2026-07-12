export type CategoryCode = 'LOG' | 'REC' | 'INF' | 'ART' | 'TNK' | 'AA' | 'HEL' | 'AIR';
export type Coalition = 'NATO' | 'PACT';
export type Mode = 'fun' | 'meta';

export interface Unit {
  id: string;
  name: string;
  nation: string;
  cat: CategoryCode;
  cost: number;
  meta: number;
  fun: number;
  tags: string[];
}

export interface DeckUnit extends Unit {
  apCost: number;
}

export interface Division {
  id: string;
  name: string;
  nation: string;
  coalition: Coalition;
  type: string;
  dlc: string;
  power: number;
  blurb: string;
  activationPoints: number;
  categoryLimits: Record<CategoryCode, number>;
}

export interface DivisionDetail extends Division {
  units: Unit[];
}

export type Deck = Record<CategoryCode, DeckUnit[]>;

export interface DeckSummary {
  cards: number;
  apSpent: number;
  apTotal: number;
  totalPoints: number;
  categories: Record<CategoryCode, number>;
}

export interface DeckResponse {
  seed: string | null;
  mode: Mode;
  theme: string;
  code?: string;
  division: Division;
  deck: Deck;
  summary: DeckSummary;
}

export interface MetaResponse {
  categories: CategoryCode[];
  categoryLabels: Record<CategoryCode, string>;
  nations: string[];
  coalitions: string[];
  dlcs: string[];
}

export interface RandomizePayload {
  divisionId?: string;
  mode?: Mode;
  coalition?: string;
  nation?: string;
  dlc?: string;
  seed?: string;
}