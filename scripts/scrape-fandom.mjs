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
const DEBUG_TITLE = getFlag('--debug', null);

// ---- mapping tables ---------------------------------------------------------
// Canonical nation names EXACTLY as they appear in the wiki infobox "Nation" field,
// plus the adjective form used in lead sentences. Deliberately NO short codes
// ("us", "can", "bel"): those match ordinary English words in page prose and
// caused badly mis-assigned nations. Matching is exact + longest-first.
const NATION_CANON = {
  'soviet union': 'Soviet Union',   soviet: 'Soviet Union',
  'united states': 'USA',           american: 'USA', usa: 'USA',
  'united kingdom': 'United Kingdom', british: 'United Kingdom',
  'west germany': 'West Germany',   'west german': 'West Germany',
  'east germany': 'East Germany',   'east german': 'East Germany',
  france: 'France',                 french: 'France',
  poland: 'Poland',                 polish: 'Poland',
  czechoslovakia: 'Czechoslovakia', czechoslovak: 'Czechoslovakia', czechoslovakian: 'Czechoslovakia',
  belgium: 'Belgium',               belgian: 'Belgium',
  netherlands: 'Netherlands',       dutch: 'Netherlands',
  canada: 'Canada',                 canadian: 'Canada',
  spain: 'Spain',                   spanish: 'Spain',
  denmark: 'Denmark',               danish: 'Denmark',
  cuba: 'Cuba',                     cuban: 'Cuba',
  luxembourg: 'Luxembourg',         luxembourgish: 'Luxembourg',
};
// Longest keys first so "west germany" wins over "germany"-like prefixes.
const NATION_KEYS = Object.keys(NATION_CANON).sort((a, b) => b.length - a.length);

// Resolve a nation ONLY from an exact canonical phrase. Returns null if unsure.
function mapNation(raw) {
  const s = String(raw || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (!s) return null;
  if (NATION_CANON[s]) return NATION_CANON[s];            // exact field value
  for (const k of NATION_KEYS) {                          // phrase inside a short field
    if (new RegExp(`(^|\\s)${k}(\\s|$)`).test(s)) return NATION_CANON[k];
  }
  return null;
}

function mapType(raw) {
  const s = String(raw || '').toLowerCase();
  if (/logistic|supply/.test(s)) return 'LOG';
  if (/recon|reconnaissance/.test(s)) return 'REC';
  if (/infantry/.test(s)) return 'INF';
  if (/artillery|support/.test(s)) return 'ART';
  if (/tank|armou?r/.test(s)) return 'TNK';
  if (/anti.?air|air.?defen[cs]e|\baa\b/.test(s)) return 'AA';
  if (/helicopter|helo/.test(s)) return 'HEL';
  if (/aircraft|\bair\b|plane|jet/.test(s)) return 'AIR';
  return null;
}

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

// ---- HTML -> text + STRICT infobox extraction -------------------------------
const stripHtml = (html) =>
  html.replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ').trim();

// The infobox renders as a flat label/value run, e.g.:
//   "General Data Nation Soviet Union Type Recon Traits AMPHIBIOUS Deploy Cost 35 ..."
// Read each field only between its own label and the NEXT known label. Anything
// outside the infobox is ignored — prose is never scanned for nation names.
const NEXT_LABEL = '(?:Type|Traits?|Deploy Cost|Unit Cost|Divisions?|Characteristics|Armor|Overview|Category|Categories)';

function parseUnitText(title, text) {
  // Nation: strictly the value between "Nation" and the next infobox label.
  const nationM = text.match(new RegExp(`\\bNation\\b\\s*[:\\-]?\\s*(.{2,40}?)\\s+${NEXT_LABEL}\\b`, 'i'));
  let nation = nationM ? mapNation(nationM[1]) : null;

  // Type: value between "Type" and the next label.
  const typeM = text.match(new RegExp(`\\bType\\b\\s*[:\\-]?\\s*(.{2,40}?)\\s+${NEXT_LABEL}\\b`, 'i'));
  let cat = typeM ? mapType(typeM[1]) : null;

  // Fallback ONLY to the strict lead sentence: "<Name> is a <Nation> <Type> unit."
  if (!nation || !cat) {
    const lead = text.match(
      /\bis an?\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+(Logistics|Recon|Reconnaissance|Infantry|Artillery|Tanks?|Anti-?air|Helicopters?|Aircraft|Air)\s+unit/i,
    );
    if (lead) {
      if (!nation) nation = mapNation(lead[1]);
      if (!cat) cat = mapType(lead[2]);
    }
  }

  const costM = text.match(/Deploy Cost\D{0,12}(\d{1,4})/i);
  const cost = costM ? Number(costM[1]) : null;

  const name = title.replace(/\s*\([^)]*\)\s*$/, '').trim(); // drop "(Sov)" suffix

  // Why was it rejected? (helps distinguish "not a unit page" from "parser gap")
  const missing = [];
  if (!nation) missing.push('nation');
  if (!cat) missing.push('type');
  if (cost == null) missing.push('cost');
  const hasInfobox = !!(nationM || typeM || costM);

  return {
    name, nation, cat, cost,
    rawNation: nationM ? nationM[1].trim() : null,
    rawType: typeM ? typeM[1].trim() : null,
    missing, hasInfobox,
  };
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

// Enumerate EVERY main-namespace page. The "Warno units" category turned out to be
// incomplete (e.g. Leopard 2A4 isn't in it), which skewed the dataset badly. Pages
// without a unit infobox are simply rejected by the parser, so scanning everything
// is both safer and more complete than trusting the category.
async function listAllTitles() {
  const titles = [];
  let cont;
  do {
    const data = await api({
      action: 'query', list: 'allpages', apnamespace: '0',
      aplimit: '500', apfilterredir: 'nonredirects', ...(cont ? { apcontinue: cont } : {}),
    });
    for (const p of data?.query?.allpages || []) titles.push(p.title);
    cont = data?.continue?.apcontinue;
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

// ---- self-test (no network): real page shapes, incl. ones that used to break --
const SAMPLES = [
  {
    title: 'BRDM-2 (Sov)',
    text: `BRDM-2 (Sov) Recon Units General Data Nation Soviet Union Type Recon
           Traits AMPHIBIOUS Deploy Cost 35 Unit Cost Low Divisions ... Characteristics Armor
           Front: 1 Side: 1 BRDM-2 is a Soviet Recon unit. Overview`,
    expect: { nation: 'Soviet Union', cat: 'REC', cost: 35 },
  },
  {
    title: 'Leopard 2A4',
    text: `Leopard 2A4 General Data Nation West Germany Type Tank Deploy Cost 205
           Unit Cost High Divisions 5. Panzerdivision Overview The main tank of the 5. Panzer
           Official Battlegroup, the leopard is the Germans answer to the T-80UD. It can take
           a few hits and can fight at long range.`,
    // Prose here contains "can" and "German" — the old loose matcher mis-read pages
    // like this as Canada. Strict infobox parsing must return West Germany.
    expect: { nation: 'West Germany', cat: 'TNK', cost: 205 },
  },
  {
    title: 'M1A1 Abrams (US)',
    text: `M1A1 Abrams General Data Nation United States Type Tank Deploy Cost 215
           Unit Cost High Divisions 3rd Armored Overview American heavy tank.`,
    expect: { nation: 'USA', cat: 'TNK', cost: 215 },
  },
  {
    title: 'Some Vehicle Page',
    text: `Some Vehicle A page with no infobox at all. It can be used by troops and
           the crew can fight. Nothing structured here.`,
    expect: null, // must be SKIPPED, not guessed
  },
];

function selftest() {
  let pass = 0;
  for (const s of SAMPLES) {
    const u = parseUnitText(s.title, s.text.replace(/\s+/g, ' '));
    const got = u.nation && u.cat && u.cost != null
      ? { nation: u.nation, cat: u.cat, cost: u.cost }
      : null;
    const ok = JSON.stringify(got) === JSON.stringify(s.expect);
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${s.title.padEnd(22)} -> ${JSON.stringify(got)}`);
    if (!ok) console.log(`      expected ${JSON.stringify(s.expect)}`);
    if (ok) pass++;
  }
  console.log(`\n${pass}/${SAMPLES.length} passed`);
  process.exit(pass === SAMPLES.length ? 0 : 1);
}

async function main() {
  if (SELFTEST) return selftest();

  if (DEBUG_TITLE) {
    // Dump one page's full stripped text + what the parser extracted from it.
    // Use this to see the REAL infobox layout for a page/nation that's coming
    // up empty, instead of guessing at regexes blind.
    const data = await api({ action: 'parse', page: DEBUG_TITLE, prop: 'text', redirects: '1' });
    const html = data?.parse?.text;
    if (!html) {
      console.log(`No page content returned for "${DEBUG_TITLE}" (bad title, or it's a redirect the API didn't resolve).`);
      return;
    }
    const text = stripHtml(html);
    console.log(`--- FULL STRIPPED TEXT: "${DEBUG_TITLE}" (${text.length} chars) ---\n`);
    console.log(text);
    console.log(`\n--- PARSED RESULT ---`);
    console.log(JSON.stringify(parseUnitText(DEBUG_TITLE, text), null, 2));
    return;
  }

  const useCategory = String(getFlag('--source', 'all')) === 'category';
  console.log(useCategory
    ? `Listing units in ${CATEGORY} …`
    : 'Listing ALL wiki pages (category is incomplete; infobox decides what is a unit) …');
  let titles = useCategory ? await listUnitTitles() : await listAllTitles();
  if (LIMIT) titles = titles.slice(0, LIMIT);
  console.log(`Found ${titles.length} unit pages. Fetching (delay ${DELAY_MS}ms)…`);

  const out = [];
  const seen = new Set();
  const nearMisses = [];
  let nonUnitPages = 0;

  for (let i = 0; i < titles.length; i++) {
    const title = titles[i];
    try {
      const u = await fetchUnit(title);
      // Strict: a unit is only kept if nation, category AND cost were all read
      // confidently from the page. No guessing — a bad row is worse than a missing one.
      if (u && u.name && u.nation && u.cat && u.cost != null) {
        const id = `${slug(u.nation)}__${slug(u.name)}`;
        if (!seen.has(id)) {
          seen.add(id);
          const { meta, fun } = ratings(u.cat, u.cost);
          out.push({ id, name: u.name, nation: u.nation, cat: u.cat, cost: u.cost, meta, fun, tags: tagsFor(u.cat, u.cost, '') });
        }
      } else if (u && u.hasInfobox) {
        // Had a stats infobox but a field wouldn't parse -> a real parser gap. Report it.
        nearMisses.push(`${title} [missing: ${u.missing.join(', ')}]`
          + (u.rawNation ? ` nation="${u.rawNation}"` : '')
          + (u.rawType ? ` type="${u.rawType}"` : ''));
      } else {
        nonUnitPages++;  // no infobox at all -> not a unit page (division, guide, etc.)
      }
    } catch (e) {
      nearMisses.push(`${title} (error: ${e.message})`);
    }
    if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${titles.length}…`);
    await sleep(DELAY_MS);
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));

  console.log(`\nWrote ${out.length} units -> ${path.relative(root, OUT)}`);
  console.log(`Ignored ${nonUnitPages} non-unit page(s) (no stats infobox).`);

  const byNation = {};
  const byCat = {};
  for (const u of out) {
    byNation[u.nation] = (byNation[u.nation] || 0) + 1;
    byCat[u.cat] = (byCat[u.cat] || 0) + 1;
  }
  console.log('\nPer nation:');
  for (const [n, c] of Object.entries(byNation).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(c).padStart(4)}  ${n}`);
  }
  console.log('\nPer category:', byCat);

  if (nearMisses.length) {
    console.log(`\n${nearMisses.length} page(s) HAD an infobox but a field would not parse (parser gaps):`);
    for (const t of nearMisses.slice(0, 40)) console.log(`  - ${t}`);
    if (nearMisses.length > 40) console.log(`  … and ${nearMisses.length - 40} more`);
    console.log('Paste these back if any look like real units — the label variant can be added.');
  }

  console.log('\nData: WARNO wiki (CC-BY-SA); game values © Eugen Systems. Keep attribution if you publish.');
}

main().catch((e) => { console.error(e); process.exit(1); });
