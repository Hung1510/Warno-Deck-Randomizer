#!/usr/bin/env node
// ---------------------------------------------------------------------------
// scrape-fandom.mjs — pull WARNO unit data from the Fandom wiki's MediaWiki API
// and write the app's custom-units.json (auto-loaded by backend/src/data/units.ts).
//
// WHY THE FANDOM WIKI
//   warno.fandom.com is server-rendered MediaWiki with a public API, and its
//   content is licensed CC-BY-SA — so it can be reused *with attribution*. (The
//   waryes.com table is a client-side app and its data belongs to Eugen Systems,
//   so it isn't scraped here.) Underlying game values still originate from Eugen
//   Systems; keep the attribution below intact if you publish the result.
//
// USAGE  (run on your own machine — needs internet access)
//   node scripts/scrape-fandom.mjs                 # scrape all units -> custom-units.json
//   node scripts/scrape-fandom.mjs --limit 25      # quick test: first 25 units
//   node scripts/scrape-fandom.mjs --selftest      # parse a bundled sample, no network
//   node scripts/scrape-fandom.mjs --out path.json # custom output path
//
// Politeness: one request at a time with a small delay and a descriptive
// User-Agent, as MediaWiki/Fandom etiquette expects. ~700 unit pages ≈ a couple
// of minutes. Re-run any time the wiki updates.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const API = 'https://warno.fandom.com/api.php';
const UA = 'warno-deck-randomizer data importer (https://github.com/your/repo) - contact: you@example.com';
const CATEGORY = 'Category:Warno units';

const args = process.argv.slice(2);
const getFlag = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? (args[i + 1] ?? true) : def;
};
const LIMIT = Number(getFlag('--limit', 0)) || 0;
const DELAY_MS = Number(getFlag('--delay', 200)) || 200;
const OUT = getFlag('--out', path.join(root, 'backend/src/data/custom-units.json'));
const SELFTEST = args.includes('--selftest');

// ---- mapping tables (extend if the wiki uses tokens not listed) -------------
const NATION_MAP = {
  // adjectives (lead sentence) + nouns + codes -> app display nation
  soviet: 'Soviet Union', 'soviet union': 'Soviet Union', sov: 'Soviet Union', russian: 'Soviet Union',
  american: 'USA', us: 'USA', usa: 'USA', 'united states': 'USA',
  british: 'United Kingdom', uk: 'United Kingdom', 'united kingdom': 'United Kingdom',
  'west german': 'West Germany', 'west germany': 'West Germany', rfa: 'West Germany', frg: 'West Germany', 'w.german': 'West Germany',
  french: 'France', france: 'France', fr: 'France',
  'east german': 'East Germany', 'east germany': 'East Germany', ddr: 'East Germany', gdr: 'East Germany',
  polish: 'Poland', poland: 'Poland', pol: 'Poland',
  czechoslovak: 'Czechoslovakia', czechoslovakian: 'Czechoslovakia', czechoslovakia: 'Czechoslovakia', tch: 'Czechoslovakia',
  belgian: 'Belgium', belgium: 'Belgium', bel: 'Belgium',
  dutch: 'Netherlands', netherlands: 'Netherlands', nl: 'Netherlands',
  canadian: 'Canada', canada: 'Canada', can: 'Canada',
  spanish: 'Spain', spain: 'Spain', esp: 'Spain',
  danish: 'Denmark', denmark: 'Denmark', dk: 'Denmark',
  cuban: 'Cuba', cuba: 'Cuba',
  luxembourg: 'Luxembourg', luxembourgish: 'Luxembourg',
};

function mapType(raw) {
  const s = String(raw || '').toLowerCase();
  if (/logistic|supply/.test(s)) return 'LOG';
  if (/recon|reconnaissance/.test(s)) return 'REC';
  if (/infantry/.test(s)) return 'INF';
  if (/artillery|support/.test(s)) return 'ART';
  if (/tank/.test(s)) return 'TNK';
  if (/anti.?air|anti-air|\baa\b|defen/.test(s)) return 'AA';
  if (/helicopter|helo/.test(s)) return 'HEL';
  if (/aircraft|\bair\b|plane|jet/.test(s)) return 'AIR';
  return null;
}
const mapNation = (raw) => NATION_MAP[String(raw || '').trim().toLowerCase()] || null;

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function ratings(cat, cost) {
  const c = Number(cost) || 50;
  const meta = clamp(Math.round(c / 25) + 2, 1, 10);
  let fun = clamp(9 - Math.round(c / 45), 1, 10);
  if (cat === 'AIR' || cat === 'HEL' || cat === 'ART') fun = clamp(fun + 2, 1, 10);
  return { meta, fun };
}
function tagsFor(cat, cost, text) {
  const c = Number(cost) || 0;
  const t = [];
  if (cat === 'TNK') t.push(c >= 140 ? 'heavy' : 'tank');
  if (cat === 'REC') t.push('recon');
  if (cat === 'AA') t.push('sam');
  if (cat === 'HEL' || cat === 'AIR') t.push('air');
  if (/amphibious/i.test(text)) t.push('amphibious');
  if (c > 0 && c <= 30) t.push('cheap');
  return t;
}

// ---- HTML -> text + field extraction (verified against a real unit page) ----
const stripHtml = (html) =>
  html.replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ').trim();

function parseUnitText(title, text) {
  // Lead sentence: "<Name> is a <Nation> <Type> unit."
  const lead = text.match(/\bis an?\s+([A-Z][\w.-]*(?:\s+[A-Z][\w.-]*)?)\s+(Logistics|Recon|Reconnaissance|Infantry|Artillery|Tanks?|Anti-?air|Helicopters?|Aircraft|Air)\s+unit/i);
  let nation = lead ? mapNation(lead[1]) : null;
  let cat = lead ? mapType(lead[2]) : null;

  // Fallbacks: explicit "Nation"/"Type" infobox labels.
  if (!cat) {
    const m = text.match(/\bType\s+(Logistics|Recon|Reconnaissance|Infantry|Artillery|Tanks?|Anti-?air|Helicopters?|Aircraft|Air)\b/i);
    if (m) cat = mapType(m[1]);
  }
  if (!nation) {
    for (const key of Object.keys(NATION_MAP)) {
      if (new RegExp(`\\bNation\\b[\\s\\S]{0,40}\\b${key}\\b`, 'i').test(text)) { nation = NATION_MAP[key]; break; }
    }
  }

  // Deploy Cost: "Deploy Cost 35"
  const costM = text.match(/Deploy Cost\D{0,12}(\d{1,4})/i);
  const cost = costM ? Number(costM[1]) : 50;

  const name = title.replace(/\s*\([^)]*\)\s*$/, '').trim(); // drop "(Sov)" suffix
  return { name, nation, cat, cost };
}

// ---- MediaWiki API helpers --------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`API ${res.status} for ${params.action}`);
  return res.json();
}

async function listUnitTitles() {
  const titles = [];
  let cont;
  do {
    const data = await api({
      action: 'query', list: 'categorymembers', cmtitle: CATEGORY,
      cmlimit: '500', cmtype: 'page', ...(cont ? { cmcontinue: cont } : {}),
    });
    for (const m of data?.query?.categorymembers || []) titles.push(m.title);
    cont = data?.continue?.cmcontinue;
    if (cont) await sleep(DELAY_MS);
  } while (cont);
  return titles;
}

async function fetchUnit(title) {
  const data = await api({ action: 'parse', page: title, prop: 'text', redirects: '1' });
  const html = data?.parse?.text;
  if (!html) return null;
  return parseUnitText(title, stripHtml(html));
}

// ---- self-test (no network): validates the parser on a real page sample -----
const SAMPLE = `BRDM-2 (Sov) Recon Units General Data Nation Soviet Union Type Recon
Traits AMPHIBIOUS Deploy Cost 35 Unit Cost Low Divisions ... Characteristics Armor
Front: 1 Side: 1 BRDM-2 is a Soviet Recon unit. Overview`;

async function main() {
  if (SELFTEST) {
    const u = parseUnitText('BRDM-2 (Sov)', SAMPLE);
    console.log('Self-test parse:', u);
    const ok = u.nation === 'Soviet Union' && u.cat === 'REC' && u.cost === 35;
    console.log(ok ? 'SELF-TEST PASS ✓' : 'SELF-TEST FAIL ✗');
    process.exit(ok ? 0 : 1);
  }

  console.log(`Listing units in ${CATEGORY} …`);
  let titles = await listUnitTitles();
  if (LIMIT) titles = titles.slice(0, LIMIT);
  console.log(`Found ${titles.length} unit pages. Fetching (delay ${DELAY_MS}ms)…`);

  const out = [];
  const seen = new Set();
  let skipped = 0;
  for (let i = 0; i < titles.length; i++) {
    const title = titles[i];
    try {
      const u = await fetchUnit(title);
      if (u && u.name && u.nation && u.cat) {
        const id = `${slug(u.nation)}__${slug(u.name)}`;
        if (!seen.has(id)) {
          seen.add(id);
          const { meta, fun } = ratings(u.cat, u.cost);
          out.push({ id, name: u.name, nation: u.nation, cat: u.cat, cost: u.cost, meta, fun, tags: tagsFor(u.cat, u.cost, '') });
        }
      } else {
        skipped++;
      }
    } catch (e) {
      skipped++;
      console.warn(`  ! ${title}: ${e.message}`);
    }
    if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${titles.length}…`);
    await sleep(DELAY_MS);
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(`\nWrote ${out.length} units (skipped ${skipped}) -> ${path.relative(root, OUT)}`);
  const byNation = {};
  for (const u of out) byNation[u.nation] = (byNation[u.nation] || 0) + 1;
  console.log('Per nation:', byNation);
  console.log('\nData: WARNO wiki (CC-BY-SA); game values © Eugen Systems. Keep attribution if you publish.');
}

main().catch((e) => { console.error(e); process.exit(1); });
