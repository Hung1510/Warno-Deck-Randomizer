#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const inFile = process.argv[2] || path.join(__dirname, 'waryes-units.json');
const outFile = process.argv[3] || path.join(root, 'backend/src/data/custom-units.json');

// Candidate source field names, in priority order.
const FIELDS = {
  name: ['name', 'displayName', '_name', 'descriptorName', 'unitName'],
  nation: ['nation', 'country', 'motherCountry', 'unitNation', 'factionName'],
  category: ['factory', 'category', 'factoryName', 'typeForAcademy', 'unitCategory', 'type'],
  cost: ['commandPoint', 'commandPoints', 'cost', 'points', 'productionPrice', 'price'],
};

// WaRYes / WARNO nation codes -> the app's display nation strings.
const NATION_MAP = {
  US: 'USA', USA: 'USA',
  UK: 'United Kingdom', GB: 'United Kingdom', BRIT: 'United Kingdom',
  RFA: 'West Germany', FRG: 'West Germany', WG: 'West Germany', BRD: 'West Germany', GER: 'West Germany',
  FR: 'France', FRA: 'France',
  SOV: 'Soviet Union', USSR: 'Soviet Union', RUS: 'Soviet Union', UR: 'Soviet Union',
  DDR: 'East Germany', GDR: 'East Germany', EG: 'East Germany',
  BEL: 'Belgium', BE: 'Belgium',
  NL: 'Netherlands', HOL: 'Netherlands', NED: 'Netherlands',
  POL: 'Poland', PL: 'Poland',
  CAN: 'Canada', CA: 'Canada',
  ESP: 'Spain', SP: 'Spain',
  TCH: 'Czechoslovakia', CZ: 'Czechoslovakia', CS: 'Czechoslovakia',
  DAN: 'Denmark', DEN: 'Denmark', DK: 'Denmark',
  CUB: 'Cuba', CU: 'Cuba',
};

// Map a source category/factory string to the app's 8 category codes.
function mapCategory(raw) {
  const s = String(raw || '').toLowerCase();
  if (/log|supply|ravito/.test(s)) return 'LOG';
  if (/reco|recon|scout|rec\b/.test(s)) return 'REC';
  if (/inf|grenad|rifle|para|legion|motostr/.test(s)) return 'INF';
  if (/art|support|howitz|mortar|rocket|mlrs|sup\b/.test(s)) return 'ART';
  if (/tank|char|tnk|armou?r/.test(s)) return 'TNK';
  if (/def|dca|aa\b|anti.?air|sam|manpad/.test(s)) return 'AA';
  if (/hel|helo|chopper|avia.?hel/.test(s)) return 'HEL';
  if (/air|plane|avion|jet|sead|asf/.test(s)) return 'AIR';
  return null; // unknown -> skipped
}

const pick = (obj, keys) => {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
  }
  return undefined;
};
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// Heuristic meta / fun ratings (1-10). Tune to taste — the source has no such field.
function ratings(cat, cost) {
  const c = Number(cost) || 50;
  const meta = clamp(Math.round(c / 25) + 2, 1, 10);
  let fun = clamp(9 - Math.round(c / 45), 1, 10);
  if (cat === 'AIR' || cat === 'HEL' || cat === 'ART') fun = clamp(fun + 2, 1, 10);
  return { meta, fun };
}

function tagsFor(cat, cost) {
  const c = Number(cost) || 0;
  const t = [];
  if (cat === 'TNK') t.push(c >= 140 ? 'heavy' : 'tank');
  if (cat === 'REC') t.push('recon');
  if (cat === 'AA') t.push('sam');
  if (cat === 'HEL' || cat === 'AIR') t.push('air');
  if (c > 0 && c <= 30) t.push('cheap');
  return t;
}

function main() {
  if (!fs.existsSync(inFile)) {
    console.error(`Input not found: ${inFile}`);
    console.error('Pass a path, or place your export at scripts/waryes-units.json');
    process.exit(1);
  }

  const parsed = JSON.parse(fs.readFileSync(inFile, 'utf8'));
  const rows = Array.isArray(parsed) ? parsed : (parsed.units || parsed.data || []);
  if (!Array.isArray(rows) || rows.length === 0) {
    console.error('No unit array found (expected [...] or { units: [...] }).');
    process.exit(1);
  }

  const out = [];
  const seen = new Set();
  let skipped = 0;

  for (const u of rows) {
    const name = pick(u, FIELDS.name);
    const nationRaw = pick(u, FIELDS.nation);
    const catRaw = pick(u, FIELDS.category);
    const cost = pick(u, FIELDS.cost);

    const nation = NATION_MAP[String(nationRaw || '').toUpperCase()] || nationRaw;
    const cat = mapCategory(catRaw);
    if (!name || !nation || !cat) { skipped++; continue; }

    const id = `${slug(nation)}__${slug(name)}`;
    if (seen.has(id)) continue; // de-duplicate veterancy / transport variants
    seen.add(id);

    const costNum = Number(cost) || 50;
    const { meta, fun } = ratings(cat, costNum);
    out.push({ id, name: String(name), nation, cat, cost: costNum, meta, fun, tags: tagsFor(cat, costNum) });
  }

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(out, null, 2));
  console.log(`Imported ${out.length} units (skipped ${skipped} unmapped) -> ${path.relative(root, outFile)}`);
  const byNation = {};
  for (const u of out) byNation[u.nation] = (byNation[u.nation] || 0) + 1;
  console.log('Per nation:', byNation);
}

main();
