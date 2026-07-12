// scripts/gen-denmark.mjs

import fs from 'node:fs';

/** cost breakpoints -> [meta, fun] per category, fit from existing RAW data */
const CURVES = {
  LOG: [[25,3,8],[40,4,8],[65,5,8],[90,6,7],[130,7,6],[175,9,5]],
  INF: [[20,3,9],[35,3,8],[50,4,8],[65,5,8],[85,5,7],[100,6,7]],
  ART: [[35,3,10],[55,4,10],[80,5,9],[110,6,9],[150,8,8],[210,10,6],[250,10,5]],
  TNK: [[25,3,8],[45,4,8],[70,5,7],[100,6,7],[130,7,6],[175,9,5],[230,10,4]],
  REC: [[20,3,9],[35,3,8],[50,4,8],[70,5,7],[95,6,7]],
  AA:  [[30,3,8],[50,4,8],[75,5,7],[100,6,7],[140,8,6]],
  HEL: [[40,4,10],[75,5,9],[100,6,9],[135,7,8],[170,9,7],[210,9,7]],
  AIR: [[80,5,9],[130,7,8],[160,8,8],[200,9,7],[240,10,6],[275,10,5]],
};

function ratings(cat, cost) {
  const curve = CURVES[cat] ?? CURVES.INF;
  for (const [c, meta, fun] of curve) {
    if (cost <= c) return [meta, fun];
  }
  const last = curve[curve.length - 1];
  return [last[1], last[2]];
}

function tagsFor(cat, name, cost) {
  const tags = [];
  const n = name.toLowerCase();
  const cheapCeiling = { LOG: 30, INF: 25, TNK: 30, REC: 25, AA: 30, HEL: 45, ART: 40, AIR: 90 }[cat] ?? 30;
  if (cost <= cheapCeiling) tags.push('cheap');
  if (cat === 'TNK') tags.push('tank');
  if (cat === 'REC') tags.push('recon');
  if (cat === 'AA') tags.push('sam');
  if (cat === 'HEL' || cat === 'AIR') tags.push('air');
  if (n.includes('fører') || n.includes('kommando')) tags.push('leader');
  if (n.includes('jægere') || n.includes('jægerkorps') || n.includes('frømænd')) tags.push('elite');
  if (n.includes('tow') || n.includes('konkurs') || n.includes('atgm')) tags.push('atgm');
  if (n.includes('hawk') || n.includes('stinger')) tags.push('sam');
  return [...new Set(tags)];
}

// [name, category, cost] as transcribed from screenshots.
// Two entries have unreadable/cut-off cost badges in the screenshots
// (flagged inline below) and are deliberately EXCLUDED from ROWS rather
// than guessed -- see the TODO comment at the bottom of this file.
const ROWS = [
  // LOG -- Units: 6 (screenshot total matches, all 6 legible)
  ['Bedford MJ2P Supply', 'LOG', 40],
  ['MD Jupiter Mun.',     'LOG', 50],
  ['Laro Kommando',       'LOG', 85],
  ['M113AI KSN',          'LOG', 45],
  ['S-61A Supply',        'LOG', 45],
  ['Ammunitionsdepot',    'LOG', 175],

  // INF -- Units: 26 (24 legible below + 2 flagged/excluded = 26)
  ['MG M/62 7,62mm',        'INF', 15],
  ['TMG M/50 12,7mm',       'INF', 30],
  ['Laro',                  'INF', 20],
  ['Bedford MJ2P',          'INF', 20],
  ['MD Jupiter',             'INF', 20],
  ['Militærpoliti',         'INF', 20],
  ['Panserværnsskytter',    'INF', 30],
  ['Ingeniørfører',         'INF', 40],
  ['HJV Ingeniører',        'INF', 35],
  ['Ingeniører',            'INF', 45],
  ['Ingeniører (CG-HE)',    'INF', 50],
  ['Infanterifører',        'INF', 35],
  ['Infanteri',             'INF', 40],
  ['Infanteri (PNÆV)',      'INF', 40],
  ['Livgarden',             'INF', 50],
  ['HJV Dykn M/56',         'INF', 40],
  ['M/87 I-TOW',            'INF', 80],
  ['HJV Fører',             'INF', 60],
  ['HJV Reservister',       'INF', 40],
  ['HJV',                   'INF', 50],
  ['M38A1 M/56 106mm',      'INF', 40],
  ['Panserinfanterifører',  'INF', 70],
  ['Panserinfanteri',       'INF', 45],
  ['Jægere',                'INF', 50],

  // ART -- Units: 9 (all legible)
  ['Morter M/57 81mm',       'ART', 35],
  ['Morter M/50 120mm',      'ART', 50],
  ['M125',                   'ART', 65],
  ['Haubits M/50 105mm',     'ART', 70],
  ['Haubits M/51 155mm',     'ART', 100],
  ['Kanon M/52 155mm',       'ART', 110],
  ['Haubits M114/39 155mm',  'ART', 120],
  ['M109A3',                 'ART', 210],
  ['Haubits M/55 203mm',     'ART', 140],

  // TNK -- Units: 14 (all legible; 3 names duplicated between a leader/command
  // card and the regular card -- distinguished with " Fører" per this roster's
  // own naming convention, since the in-game leader badge carries no text)
  ['M113A1',              'TNK', 20],
  ['M113A2 PNMK',         'TNK', 35],
  ['HJV M/10',            'TNK', 45],
  ['M41-DK1',             'TNK', 80],
  ['Laro M/87',           'TNK', 60],
  ['M113 M/87 TOW-2',     'TNK', 70],
  ['Centurion Mk.V Fører','TNK', 100],
  ['Centurion Mk.V',      'TNK', 80],
  ['Centurion Mk.V/2 Fører', 'TNK', 125],
  ['Centurion Mk.V/2',    'TNK', 80],
  ['Centurion Mk.V/2 DK', 'TNK', 105],
  ['Leopard I DK Fører',  'TNK', 115],
  ['Leopard I DK',        'TNK', 95],
  ['Leopard 1A5-DK',      'TNK', 125],

  // REC -- Units: 11 (all legible; several names legitimately reuse LOG/TNK
  // names as distinct recon-category units, per your confirmation)
  ['HJV Spejdere',      'REC', 30],
  ['Spejdere',           'REC', 20],
  ['Spejdere (Dykn)',    'REC', 30],
  ['Panserspejdere',     'REC', 60],
  ['M113A1',             'REC', 30],
  ['MPR M/67',           'REC', 30],
  ['OH-6',               'REC', 35],
  ['S-61A',              'REC', 50],
  ['SEP/ELK',            'REC', 65],
  ['SEP/VLK',            'REC', 65],
  ['M41-DK1',            'REC', 95],

  // AA -- Units: 7 (all legible)
  ['Firling 12,7mm',        'AA', 30],
  ['LVK M/60 40mm',         'AA', 25],
  ['LVK M/70 40mm',         'AA', 35],
  ['LVR M/73 Hamlet',       'AA', 25],
  ['Kom Stinger',           'AA', 50],
  ['Bedford Firling 12,7mm','AA', 35],
  ['I-HAWK',                'AA', 110],

  // HEL -- Units: 2 (all legible)
  ['Lynx Mk.80', 'HEL', 40],
  ['PVH Fennec', 'HEL', 85],

  // AIR -- Units: 12 (all legible, but this screenshot was the most number-dense
  // -- please double-check the F-16A costs below against your own screenshot
  // before trusting them; I'm fairly but not fully confident on CLU/HE/HE-CLU)
  ['F 35 WDNS [AA]',      'AIR', 100],
  ['F 35 WDNS [RKT]',     'AIR', 175],
  ['F 35 WDNS [CLU]',     'AIR', 230],
  ['F 35 WDNS [HE]',      'AIR', 240],
  ['F 35 WDNS [HE/CLU]',  'AIR', 250],
  ['F-16A [AA1]',         'AIR', 200],
  ['F-16A [AA2]',         'AIR', 205],
  ['F-16A [AA3]',         'AIR', 210],
  ['F-16A [AT]',          'AIR', 223],
  ['F-16A [CLU]',         'AIR', 265],
  ['F-16A [HE]',          'AIR', 270],
  ['F-16A [HE/CLU]',      'AIR', 295],
];

// TODO follow-up gap: two INF units had cost badges that were not legibly
// readable in the screenshots and were deliberately left OUT of ROWS above
// (not guessed):
//   - "M/255 Militærpoliti" (INF) -- cost badge not visible in screenshot
//   - "Frømænd" (INF) -- cost badge cut off at bottom of visible list
// Send a screenshot with these two fully in frame (scroll so their cost
// badges aren't clipped) and I'll add them in a follow-up patch.

const lines = ROWS.map(([name, cat, cost]) => {
  const [meta, fun] = ratings(cat, cost);
  const tags = tagsFor(cat, name, cost);
  const tagStr = tags.length ? `, [${tags.map((t) => `'${t}'`).join(', ')}]` : '';
  return `    ['${name.replace(/'/g, "\\'")}', '${cat}', ${cost}, ${meta}, ${fun}${tagStr}],`;
});

const block = `  Denmark: [\n${lines.join('\n')}\n  ],`;

fs.writeFileSync('scripts/.denmark-block.txt', block);
console.log(block);
console.log(`\n// total units: ${ROWS.length} (flagged/excluded: 2 -- see TODO comment)`);
