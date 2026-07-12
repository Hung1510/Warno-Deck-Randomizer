import { UNITS_BY_ID } from '../data/units.js';
import { DIVISIONS_BY_ID, CATEGORIES } from '../data/divisions.js';
import { rateDifficulty } from './difficulty.js';
import type { CategoryCode, Deck, DeckResponse, DeckUnit, Mode } from '../types.js';

interface DeckCodePayload {
  v: 1 | 2;
  d: string;                              // division id
  m: Mode;
  ch?: number;                            // chaos slider 0-100 (v2+; absent on old v1 codes)
  th: string;                             // theme
  s: string | null;                       // seed
  c: Array<[CategoryCode, string, number]>; // [category, unitId, apCost]
}

function b64urlEncode(str: string): string {
  return Buffer.from(str, 'utf8').toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(code: string): string {
  const pad = code.length % 4 === 0 ? '' : '='.repeat(4 - (code.length % 4));
  const b64 = code.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return Buffer.from(b64, 'base64').toString('utf8');
}

export function encodeDeck(deck: DeckResponse): string {
  const cards: Array<[CategoryCode, string, number]> = [];
  for (const cat of CATEGORIES) {
    for (const u of deck.deck[cat] || []) cards.push([cat, u.id, u.apCost]);
  }
  const payload: DeckCodePayload = {
    v: 2, d: deck.division.id, m: deck.mode, ch: deck.chaos, th: deck.theme, s: deck.seed, c: cards,
  };
  return b64urlEncode(JSON.stringify(payload));
}

export function decodeDeck(code: string): DeckResponse {
  let payload: DeckCodePayload;
  try {
    payload = JSON.parse(b64urlDecode(code));
  } catch {
    throw new Error('Invalid deck code');
  }
  if (!payload || (payload.v !== 1 && payload.v !== 2)) throw new Error('Unsupported deck code version');

  const division = DIVISIONS_BY_ID[payload.d];
  if (!division) throw new Error(`Unknown division in deck code: ${payload.d}`);

  const deck = Object.fromEntries(CATEGORIES.map((c) => [c, []])) as unknown as Deck;
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<CategoryCode, number>;
  let apSpent = 0;
  let totalPoints = 0;

  for (const [cat, id, apCost] of payload.c || []) {
    const base = UNITS_BY_ID[id];
    const unit: DeckUnit = base
      ? { ...base, apCost }
      : { id, name: id, nation: division.nation, cat, cost: 0, meta: 0, fun: 0, tags: [], apCost };
    deck[cat].push(unit);
    counts[cat] += 1;
    apSpent += apCost || 0;
    totalPoints += unit.cost || 0;
  }

  const cards = CATEGORIES.flatMap((c) => deck[c]);
  const mode: Mode = payload.m === 'meta' ? 'meta' : 'fun';
  // v1 codes predate the chaos slider -- derive an equivalent value from the
  // binary mode they were saved with, so old shared links still open sensibly.
  const chaos = typeof payload.ch === 'number' ? payload.ch : (mode === 'meta' ? 0 : 100);

  return {
    seed: payload.s || null,
    mode,
    chaos,
    theme: payload.th || '',
    code,
    division,
    deck,
    summary: {
      cards: Object.values(counts).reduce((a, b) => a + b, 0),
      apSpent,
      apTotal: division.activationPoints,
      totalPoints,
      categories: counts,
    },
    difficulty: rateDifficulty(cards),
  };
}