// scripts/gen-spain.mjs

import fs from 'node:fs';

const CURVES = {
  LOG: [[25,3,8],[40,4,8],[65,5,8],[90,6,7],[130,7,6],[175,9,5]],
  INF: [[20,3,9],[35,3,8],[50,4,8],[65,5,8],[85,5,7],[100,6,7]],
  ART: [[35,3,10],[55,4,10],[80,5,9],[110,6,9],[150,8,8],[210,10,6],[260,10,5]],
  TNK: [[25,3,8],[45,4,8],[70,5,7],[100,6,7],[130,7,6],[175,9,5],[230,10,4]],
  REC: [[20,3,9],[35,3,8],[50,4,8],[70,5,7],[105,6,7]],
  AA:  [[30,3,8],[50,4,8],[75,5,7],[100,6,7],[140,8,6]],
  HEL: [[40,4,10],[75,5,9],[100,6,9],[135,7,8],[170,9,7],[210,9,7]],
  AIR: [[130,7,8],[165,8,8],[190,9,7],[240,10,6],[265,10,5]],
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
  if (n.includes('mando')) tags.push('leader');
  if (n.includes('tiradores') || n.includes('guerrilleros')) tags.push('elite');
  if (n.includes('tow') || n.includes('milan')) tags.push('atgm');
  if (n.includes('hawk') || n.includes('aspide')) tags.push('sam');
  return [...new Set(tags)];
}

// [name, category, cost] as transcribed from screenshots.
const ROWS = [
  // LOG -- Units: 10 (all legible)
  ['HU.10 Carga',              'LOG', 35],
  ['Pegaso 3046 Abas.',        'LOG', 45],
  ['Pegaso 3055 Abas.',        'LOG', 60],
  ['C-3464 Abas.',             'LOG', 80],
  ['TOA-PC',                   'LOG', 40],
  ['TOA Carga',                'LOG', 50],
  ['HR.15 Mando',              'LOG', 60],
  ['Santana Mando',            'LOG', 85],
  ['BMR-PC',                   'LOG', 90],
  ['Punto de Abastecimiento',  'LOG', 175],

  // INF -- Units: 25 (all legible)
  ['MG-42/58 7,62mm',      'INF', 15],
  ['LAG-40 40mm',          'INF', 45],
  ['C20/120 GAI-B01',      'INF', 50],
  ['Santana',              'INF', 20],
  ['C-3464',               'INF', 20],
  ['Pegaso 3046',          'INF', 20],
  ['Pegaso 3055',          'INF', 20],
  ['Policia Militar',      'INF', 20],
  ['Santana PM',           'INF', 20],
  ['Siata 500 PM',         'INF', 20],
  ['Fusileros Mando',      'INF', 40],
  ['Fusileros',            'INF', 40],
  ['Fusileros (C90)',      'INF', 55],
  ['Fusileros (M65)',      'INF', 55],
  ['Santana CSR-106',      'INF', 40],
  ['Zapadores Mando',      'INF', 40],
  ['Zapadores',            'INF', 40],
  ['Zapadores (BMR)',      'INF', 40],
  ['Zapadores (M65)',      'INF', 45],
  ['CSR-106',              'INF', 45],
  ['MCC Milan 1',          'INF', 50],
  ['MCC Milan 2',          'INF', 65],
  ['MCC I-TOW',            'INF', 80],
  ['Fusileros (BMR) Mando','INF', 55],
  ['Fusileros (BMR)',      'INF', 45],

  // ART -- Units: 14 (all legible)
  ['L65/81 81mm',           'ART', 35],
  ['L65/120 120mm',         'ART', 50],
  ['TOA-PM-81',             'ART', 65],
  ['BMR-PM-81',             'ART', 65],
  ['TOA-PM-120',            'ART', 80],
  ['Obus 105/26 Reinosa',   'ART', 75],
  ['Obus 155/23 M114',      'ART', 100],
  ['Canon 122/45 Ruso .31', 'ART', 110],
  ['Obus 203/25 M115',      'ART', 130],
  ['M-108',                 'ART', 100],
  ['M-109A1B',              'ART', 210],
  ['M-110A2',               'ART', 260],
  ['L-1003',                'ART', 235],
  ['Teruel',                'ART', 240],

  // TNK -- Units: 20 (all legible)
  ['TOA',              'TNK', 20],
  ['TOA-VCZ',           'TNK', 20],
  ['TOA C/C Milan',     'TNK', 30],
  ['TOA-LAG',           'TNK', 30],
  ['BMR-PP',            'TNK', 30],
  ['BMR-PP VCZ',        'TNK', 30],
  ['BMR C/C Milan',     'TNK', 40],
  ['BMR-PP LAG',        'TNK', 40],
  ['Santana Milan',     'TNK', 50],
  ['TOA C/C I-TOW',     'TNK', 60],
  ['BMR C/C TOW',       'TNK', 85],
  ['AMX-30E Mando',     'TNK', 100],
  ['AMX-30E',           'TNK', 80],
  ['M47E2 Mando',       'TNK', 100],
  ['M47E2',             'TNK', 80],
  ['M48A5E2 Mando',     'TNK', 140],
  ['M48A5E2',           'TNK', 120],
  ['AMX-30EM2 Mando',   'TNK', 155],
  ['AMX-30EM2',         'TNK', 135],
  ['AMX-30EM2 Sabblir', 'TNK', 145],

  // REC -- Units: 14 (all legible; "M47EI" / "AMX-30EMI Reco." transcribed
  // literally as displayed -- these read as an "I" but may actually be "1"
  // in-game, i.e. "M47E1" / "AMX-30EM1 Reco." -- please double check)
  ['Tiradores',          'REC', 35],
  ['Reconocimiento',     'REC', 20],
  ['Jinetes',            'REC', 50],
  ['Exploradores',       'REC', 55],
  ['Santana Rasura',     'REC', 20],
  ['Teleoka',            'REC', 25],
  ['TOA Reco.',          'REC', 25],
  ['BMR-PP Reco.',       'REC', 35],
  ['HR.15',              'REC', 35],
  ['VEC-90',             'REC', 65],
  ['VEC-25',             'REC', 70],
  ['Guerrilleros',       'REC', 70],
  ['M47EI',              'REC', 70],
  ['AMX-30EMI Reco.',    'REC', 105],

  // AA -- Units: 9 (all legible)
  ['CAA 20/120 GAI-B01',   'AA', 25],
  ['CAA 20/120 Bitubo',    'AA', 35],
  ['CAA 40/70 P-87',       'AA', 35],
  ['Oerlikon GDF-005',     'AA', 60],
  ['Pegaso 3046 GAI B01',  'AA', 35],
  ['Pegaso 3046 Bitubo',   'AA', 55],
  ['Aspide Toledo',        'AA', 90],
  ['I-HAWK',               'AA', 110],
  ['AMX-30RE',             'AA', 105],

  // HEL -- Units: 6 (all legible; "HR.15" reused from REC as a distinct
  // helicopter -- legitimate cross-category reuse per your earlier note)
  ['HRU.15',           'HEL', 30],
  ['HU.10',             'HEL', 35],
  ['HU.21',             'HEL', 45],
  ['HR.15',             'HEL', 50],
  ['HA.15',             'HEL', 55],
  ['HUA.10 Artillado',  'HEL', 60],

  // AIR -- Units: 12 (all legible)
  ['C.11 [RKT]',      'AIR', 120],
  ['C.12 [RKT]',      'AIR', 165],
  ['C.12 [AA]',       'AIR', 175],
  ['C.12 [NPLM]',     'AIR', 175],
  ['C.12 [HE]',       'AIR', 185],
  ['C.14A [CLU]',     'AIR', 175],
  ['C.14A [HE/CLU]',  'AIR', 240],
  ['C.14A [HE]',      'AIR', 240],
  ['C.14B [AA1]',     'AIR', 195],
  ['C.14B [AA2]',     'AIR', 200],
  ['C.15 [AT]',       'AIR', 265],
  ['C.15 [AA]',       'AIR', 260],
];

const lines = ROWS.map(([name, cat, cost]) => {
  const [meta, fun] = ratings(cat, cost);
  const tags = tagsFor(cat, name, cost);
  const tagStr = tags.length ? `, [${tags.map((t) => `'${t}'`).join(', ')}]` : '';
  return `    ['${name.replace(/'/g, "\\'")}', '${cat}', ${cost}, ${meta}, ${fun}${tagStr}],`;
});

const block = `  Spain: [\n${lines.join('\n')}\n  ],`;

fs.writeFileSync('scripts/.spain-block.txt', block);
console.log(block);
console.log(`\n// total units: ${ROWS.length}`);
