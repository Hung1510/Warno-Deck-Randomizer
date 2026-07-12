export type CategoryCode = 'LOG' | 'REC' | 'INF' | 'ART' | 'TNK' | 'AA' | 'HEL' | 'AIR';
export type Coalition = 'NATO' | 'PACT';
export type DivisionType =
  | 'Armored' | 'Cavalry' | 'Mechanized' | 'Motorized'
  | 'Airborne' | 'Airmobile' | 'Naval' | 'Territorial';
export type Mode = 'fun' | 'meta';

export type CategoryLimits = Record<CategoryCode, number>;

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
  type: DivisionType;
  dlc: string;
  power: number;
  blurb: string;
  activationPoints: number;
  categoryLimits: CategoryLimits;
}

// Division as returned in a deck payload (same shape, kept explicit for the API).
export type PublicDivision = Division;

export interface CategoryStrength {
  limit: number;
  avgMeta: number;
  avgFun: number;
  strength: number;
}

export interface DivisionProfile {
  metaScore: number;
  memeScore: number;
  categories: Record<CategoryCode, CategoryStrength>;
}

export type Deck = Record<CategoryCode, DeckUnit[]>;

export interface DeckSummary {
  cards: number;
  apSpent: number;
  apTotal: number;
  totalPoints: number;
  categories: Record<CategoryCode, number>;
}

export interface DifficultyRating {
  stars: number;
  score: number;
  label: 'Trivial' | 'Easy' | 'Moderate' | 'Demanding' | 'Hard';
  breakdown: {
    avgCost: number;
    avgMeta: number;
    categorySpread: number;
    precisionTagShare: number;
  };
}

export interface ThemePreset {
  label: string;
  categories: CategoryCode[];
  tags: string[];
}

export interface DeckResponse {
  seed: string | null;
  mode: Mode;
  chaos: number;
  theme: string;
  code?: string;
  division: PublicDivision;
  deck: Deck;
  summary: DeckSummary;
  difficulty: DifficultyRating;
}

export interface CounterDeckResponse extends DeckResponse {
  counterOf: {
    opponentDivision: string;
    opponentCategoryCounts: Record<string, number>;
    notes: string[];
  };
}

export interface RandomizeParams {
  divisionId?: string;
  mode?: Mode | string;
  chaos?: number | string;
  theme?: string;
  coalition?: Coalition | string;
  nation?: string;
  dlc?: string;
  seed?: string;
}