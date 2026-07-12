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

export type CategoryLimits = Record<CategoryCode, number>;

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
  categoryLimits: CategoryLimits;
}

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

export interface DivisionDetail extends Division {
  units: Unit[];
  profile: DivisionProfile;
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

export interface CounterInfo {
  opponentDivision: string;
  opponentCategoryCounts: Record<string, number>;
  notes: string[];
}

export interface DeckResponse {
  seed: string | null;
  mode: Mode;
  chaos: number;
  theme: string;
  code?: string;
  division: Division;
  deck: Deck;
  summary: DeckSummary;
  difficulty: DifficultyRating;
  counterOf?: CounterInfo;
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
  chaos?: number;
  theme?: string;
  coalition?: string;
  nation?: string;
  dlc?: string;
  seed?: string;
}

export interface CounterPayload extends RandomizePayload {
  opponentCode: string;
}