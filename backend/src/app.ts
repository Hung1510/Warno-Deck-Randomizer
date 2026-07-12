import express, { type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

import { DIVISIONS, DIVISIONS_BY_ID, CATEGORIES, CATEGORY_LABELS, DLCS } from './data/divisions.js';
import { availableUnits } from './logic/availability.js';
import { generateDeck, generateDeckWithThemeOverride } from './logic/randomizer.js';
import { computeDivisionProfile } from './logic/profile.js';
import { computeCounterTheme, computeCounterThemeForDivision } from './logic/counter.js';
import { searchUnits } from './logic/search.js';
import { encodeDeck, decodeDeck } from './logic/deckcode.js';
import type { DeckResponse, CounterDeckResponse } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// Correct client IPs behind Vercel / proxies (needed for rate limiting).
app.set('trust proxy', 1);

// Security headers + a Content-Security-Policy tuned for this app
// (self + Google Fonts; inline styles are needed for the bundled CSS).
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors());
app.use(express.json({ limit: '64kb' }));

// Basic abuse protection: cap API requests per IP.
app.use('/api', rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
}));

// attach a portable deck code to a generated deck
function withCode(deck: DeckResponse): DeckResponse {
  return { ...deck, code: encodeDeck(deck) };
}

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'warno-deck-randomizer', divisions: DIVISIONS.length });
});

app.get('/api/meta', (_req: Request, res: Response) => {
  const nations = [...new Set(DIVISIONS.map((d) => d.nation))];
  const coalitions = [...new Set(DIVISIONS.map((d) => d.coalition))];
  res.json({ categories: CATEGORIES, categoryLabels: CATEGORY_LABELS, nations, coalitions, dlcs: DLCS });
});

app.get('/api/divisions', (_req: Request, res: Response) => {
  res.json(DIVISIONS);
});

app.get('/api/divisions/lookup', (req: Request, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  const division = findDivision(q);
  if (!division) return res.status(404).json({ error: `No division matches "${q}"` });
  res.json(division);
});

app.get('/api/divisions/:id', (req: Request, res: Response) => {
  const division = DIVISIONS_BY_ID[req.params.id];
  if (!division) return res.status(404).json({ error: 'Division not found' });
  const units = availableUnits(division);
  res.json({ ...division, units, profile: computeDivisionProfile(division, units) });
});

// Generate a randomized deck.
//   body: { divisionId?, mode: 'fun'|'meta', coalition?, nation?, seed? }
app.post('/api/randomize', (req: Request, res: Response) => {
  try {
    res.json(withCode(generateDeck(req.body || {})));
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// Convenience GET variant: /api/randomize?mode=fun&divisionId=us-3ad
app.get('/api/randomize', (req: Request, res: Response) => {
  try {
    res.json(withCode(generateDeck(req.query as Record<string, string>)));
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// Decode a shared deck code back into a full deck.
function handleDecode(code: unknown, res: Response) {
  try {
    if (!code || typeof code !== 'string') return res.status(400).json({ error: 'Missing deck code' });
    res.json(decodeDeck(code));
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}
app.get('/api/decode', (req: Request, res: Response) => handleDecode(req.query.code, res));
app.post('/api/decode', (req: Request, res: Response) => handleDecode((req.body || {}).code, res));

// Substring match against id or name, case-insensitive -- "79gtd" -> sov-79gtd,
// "11e" -> "11e Division Parachutiste". Exact id match wins if there is one.
function findDivision(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const exact = DIVISIONS.find((d) => d.id.toLowerCase() === q);
  if (exact) return exact;
  return DIVISIONS.find((d) => d.id.toLowerCase().includes(q) || d.name.toLowerCase().includes(q)) || null;
}

// Deterministic "deck of the day" -- same division and cards for everyone on
// the same UTC calendar day, since the seeded RNG makes seed=date fully
// reproducible. Fixed chaos=50/no theme so it's one canonical roll, not a
// per-user choice.
app.get('/api/daily', (_req: Request, res: Response) => {
  const date = new Date().toISOString().slice(0, 10);
  const deck = generateDeck({ seed: `daily-${date}`, chaos: 50 });
  res.json({ ...deck, code: encodeDeck(deck), date });
});

// Counter a division's structural profile (categoryLimits) rather than one
// specific rolled deck -- built for /counter <division> in Discord, where
// pasting a full deck code as a slash-command argument isn't reasonable UX.
app.get('/api/counter/division/:query', (req: Request, res: Response) => {
  try {
    const target = findDivision(req.params.query);
    if (!target) return res.status(404).json({ error: `No division matches "${req.params.query}"` });

    const analysis = computeCounterThemeForDivision(target.categoryLimits, target.name);
    const params = {
      divisionId: req.query.divisionId as string | undefined,
      coalition: req.query.coalition as string | undefined,
      chaos: req.query.chaos as string | undefined,
    };
    const deck: DeckResponse = analysis.theme
      ? generateDeckWithThemeOverride(params, analysis.theme)
      : generateDeck(params);

    const response: CounterDeckResponse = {
      ...deck,
      counterOf: { opponentDivision: target.name, opponentCategoryCounts: analysis.opponentCategoryCounts, notes: analysis.triggered },
    };
    res.json({ ...response, code: encodeDeck(response) });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.get('/api/units/search', (req: Request, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  if (!q.trim()) return res.json({ results: [], matched: { categories: [], tags: [], freeText: [] }, totalMatches: 0 });
  res.json(searchUnits(q));
});

// Generate a deck that counters an opponent's deck code.
//   body: { opponentCode: string, divisionId?, coalition?, nation?, dlc?, chaos?, seed? }
app.post('/api/counter', (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const opponentCode = body.opponentCode;
    if (!opponentCode || typeof opponentCode !== 'string') {
      return res.status(400).json({ error: 'Missing opponentCode' });
    }
    const opponent = decodeDeck(opponentCode);
    const opponentCards = Object.values(opponent.deck).flat();
    const analysis = computeCounterTheme(opponentCards);

    const params = { ...body };
    delete params.opponentCode;

    const deck: DeckResponse = analysis.theme
      ? generateDeckWithThemeOverride(params, analysis.theme)
      : generateDeck(params);

    const response: CounterDeckResponse = {
      ...deck,
      counterOf: {
        opponentDivision: opponent.division.name,
        opponentCategoryCounts: analysis.opponentCategoryCounts,
        notes: analysis.triggered,
      },
    };
    res.json({ ...response, code: encodeDeck(response) });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// ---- Serve the built frontend when running as a normal server (local) ----
// On Vercel the static files are served by the platform, so this guard is a no-op
// there (dist doesn't exist next to the function).
const distDir = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^\/(?!api\/).*/, (_req: Request, res: Response) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

export default app;
export { distDir };