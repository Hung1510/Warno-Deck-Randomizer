import express, { type Request, type Response } from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

import { DIVISIONS, DIVISIONS_BY_ID, CATEGORIES, CATEGORY_LABELS, DLCS } from './data/divisions.js';
import { availableUnits } from './logic/availability.js';
import { generateDeck } from './logic/randomizer.js';
import { encodeDeck, decodeDeck } from './logic/deckcode.js';
import type { DeckResponse } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

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

app.get('/api/divisions/:id', (req: Request, res: Response) => {
  const division = DIVISIONS_BY_ID[req.params.id];
  if (!division) return res.status(404).json({ error: 'Division not found' });
  res.json({ ...division, units: availableUnits(division) });
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
