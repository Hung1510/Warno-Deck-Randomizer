// scripts/gen-netherlands.mjs
//
// Generates the Netherlands RAW block for backend/src/data/units.ts.
// Source: 9 in-game screenshots (2026-07-12), all 8 category tabs, cross-checked
// against each tab's "Units: N" counter. Same ratings()/tagsFor() curve as
// gen-denmark.mjs / gen-spain.mjs (see gen-denmark.mjs header for why it's a
// reverse-fit curve, not your original formula).

import fs from 'node:fs';

const CURVES = {
  LOG: [[25,3,8],[40,4,8],[65,5,8],[90,6,7],[130,7,6],[175,9,5]],
  INF: [[20,3,9],[35,3,8],[50,4,8],[65,5,8],[85,5,7],[100,6,7]],
  ART: [[35,3,10],[55,4,10],[80,5,9],[110,6,9],[150,8,8],[210,10,6],[300,10,5]],
  TNK: [[25,3,8],[45,4,8],[70,5,7],[100,6,7],[130,7,6],[175,9,5],[290,10,4]],
  REC: [[20,3,9],[35,3,8],[50,4,8],[70,5,7],[105,6,7]],
  AA:  [[30,3,8],[50,4,8],[75,5,7],[100,6,7],[140,8,6]],
  HEL: [[40,4,10],[75,5,9],[100,6,9],[135,7,8],[170,9,7],[210,9,7]],
  AIR: [[130,7,8],[175,8,8],[215,9,7],[240,10,6],[265,10,5]],
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
  const cheapCeiling = { LOG: 30, INF: 25, TNK: 30, REC: 25, AA: 30, HEL: 45, ART: 40, AIR: 130 }[cat] ?? 30;
  if (cost <= cheapCeiling) tags.push('cheap');
  if (cat === 'TNK') tags.push('tank');
  if (cat === 'REC') tags.push('recon');
  if (cat === 'AA') tags.push('sam');
  if (cat === 'HEL' || cat === 'AIR') tags.push('air');
  if (n.includes('cmg') || n.includes('commando')) tags.push('leader');
  if (n.includes('commando') || n.includes('kct')) tags.push('elite');
  if (n.includes('tow') || n.includes('dragon') || n.includes('law')) tags.push('atgm');
  if (n.includes('hawk') || n.includes('stinger')) tags.push('sam');
  return [...new Set(tags)];
}

// [name, category, cost] as transcribed from screenshots.
const ROWS = [
  // LOG -- Units: 8 (all legible)
  ['YPR-765 PRV',         'LOG', 25],
  ['DAF YA-4400 Vracht',  'LOG', 40],
  ['DAF YHZ-2300 Vracht', 'LOG', 60],
  ['M577 PRCO',           'LOG', 40],
  ['YPR-765 PRCO-CI',     'LOG', 55],
  ['M38A1 CMG',           'LOG', 80],
  ['YP-408 PWCO',         'LOG', 60],
  ['Munitiedepot',        'LOG', 175],

  // INF -- Units: 35 (all legible)
  ['M40A1',                 'INF', 45],
  ['Dragon I',               'INF', 70],
  ['Marinier Dragon I',      'INF', 80],
  ['I-TOW',                  'INF', 95],
  ['TOW-2',                  'INF', 95],
  ['MAG 7,62mm',             'INF', 15],
  ['M2HB 12,7mm',            'INF', 30],
  ['M38A1 Nekaf',            'INF', 20],
  ['DAF YA-4400',            'INF', 20],
  ['DAF YHZ-2300',           'INF', 20],
  ['Laro',                   'INF', 20],
  ['Marechaussee CMG',       'INF', 40],
  ['Marechaussee',           'INF', 20],
  ['Marechaussee (MG)',      'INF', 45],
  ['Rover KMAR',             'INF', 20],
  ['VW T3 KMAR',             'INF', 20],
  ['Genie CMG',              'INF', 50],
  ['Res. Genie',             'INF', 25],
  ['Genie',                  'INF', 45],
  ['Beveiliging CMG',        'INF', 50],
  ['Beveiliging',            'INF', 30],
  ['Natres',                 'INF', 35],
  ['Beveiliging Mobiel',     'INF', 45],
  ['Tankjagers',             'INF', 30],
  ['Pantserinf. CMG',        'INF', 30],
  ['Pantserinf. (LAW)',      'INF', 35],
  ['Pantserinf. (Dragon)',   'INF', 40],
  ['Pantserinfanterie',      'INF', 40],
  ['M38A1C M40A1',           'INF', 40],
  ['Marinier',               'INF', 45],
  ['Infanterie CMG',         'INF', 65],
  ['Infanterie',             'INF', 50],
  ['Infanterie (LAW)',       'INF', 50],
  ['Commando CMG',           'INF', 75],
  ['Commando',               'INF', 70],

  // ART -- Units: 8 (all legible)
  ['M30 107mm',        'ART', 45],
  ['MO-120-RT61',      'ART', 50],
  ['M101 105mm',       'ART', 70],
  ['M114 155mm',       'ART', 100],
  ['M114/39 155mm',    'ART', 120],
  ['M109A2',           'ART', 210],
  ['M110A2',           'ART', 260],
  ['M270 MLRS [CLU]',  'ART', 300],

  // TNK -- Units: 14 (all legible EXCEPT: "Leopard IV CMG" / "Leopard INL" /
  // "Leopard IV" almost certainly read wrong -- these are very likely
  // "Leopard 1 CMG" / "Leopard 1(NL)" / "Leopard 1", not "Leopard IV" (a
  // roman-numeral IV Leopard doesn't exist; "1" vs "I"/"IV" is an easy OCR
  // mix-up in this font). Transcribed literally as displayed -- please
  // confirm the real names before trusting them.
  ['M113A1',            'TNK', 25],
  ['YPR-765 PRI.50',    'TNK', 25],
  ['YPR-765 PRI',       'TNK', 45],
  ['YP-408 PWI',        'TNK', 25],
  ['M38A1 TOW',         'TNK', 40],
  ['YP-408 PWAT',       'TNK', 70],
  ['YPR-765 PRAT',      'TNK', 75],
  ['Centurion Mk.5/2',  'TNK', 80],
  ['Leopard IV CMG',    'TNK', 130],
  ['Leopard INL',       'TNK', 90],
  ['Leopard IV',        'TNK', 110],
  ['Leopard 2A4(B) CMG','TNK', 290],
  ['Leopard 2A4(B)',    'TNK', 250],
  ['Leopard 2A4(C)',    'TNK', 280],

  // REC -- Units: 15 (all legible)
  ['M113 C&V KMAR',      'REC', 35],
  ['M38A1 Verk.',        'REC', 25],
  ['M113A1 Verk.',       'REC', 30],
  ['Alouette III',       'REC', 30],
  ['BO-105 CB',          'REC', 35],
  ['BO-105 CB Minigun',  'REC', 45],
  ['Green Archer',       'REC', 30],
  ['YP-408 PWRDR',       'REC', 30],
  ['YPR-765 PRRDR',      'REC', 30],
  ['Verkenners',         'REC', 35],
  ['Verkenners (AT)',    'REC', 40],
  ['Genie Verk',         'REC', 45],
  ['Pantserverkenners',  'REC', 50],
  ['M113 C&V',           'REC', 55],
  ['KCT Verkenners',     'REC', 60],

  // AA -- Units: 5 (all legible)
  ['M55 Maxson',     'AA', 30],
  ['Bofors 40L70G',  'AA', 50],
  ['Stinger',        'AA', 50],
  ['Cheetah PRTL',   'AA', 90],
  ['I-HAWK',         'AA', 110],

  // HEL -- Units: 1 (all legible; "Alouette III" reused from REC as a
  // distinct helicopter -- legitimate cross-category reuse)
  ['Alouette III', 'HEL', 30],

  // AIR -- Units: 9 (all legible)
  ['NF-5A [AA]',    'AIR', 125],
  ['NF-5A [RKT]',   'AIR', 125],
  ['NF-5A [CLU]',   'AIR', 175],
  ['NF-5A [HE]',    'AIR', 175],
  ['NF-5A [NPLM]',  'AIR', 175],
  ['F-16A [AA]',    'AIR', 205],
  ['F-16A [AA2]',   'AIR', 215],
  ['F-16A [CLU]',   'AIR', 265],
  ['F-16A [HE]',    'AIR', 265],
];

const lines = ROWS.map(([name, cat, cost]) => {
  const [meta, fun] = ratings(cat, cost);
  const tags = tagsFor(cat, name, cost);
  const tagStr = tags.length ? `, [${tags.map((t) => `'${t}'`).join(', ')}]` : '';
  return `    ['${name.replace(/'/g, "\\'")}', '${cat}', ${cost}, ${meta}, ${fun}${tagStr}],`;
});

const block = `  Netherlands: [\n${lines.join('\n')}\n  ],`;

fs.writeFileSync('scripts/.netherlands-block.txt', block);
console.log(block);
console.log(`\n// total units: ${ROWS.length}`);
