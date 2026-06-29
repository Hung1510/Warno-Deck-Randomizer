import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CategoryCode, Unit } from '../types.js';

// Raw row tuple: [name, category, cost, meta, fun, tags?]
type RawRow = [string, CategoryCode, number, number, number, string[]?];

const slug = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function build(nation: string, rows: RawRow[]): Unit[] {
  return rows.map(([name, cat, cost, meta, fun, tags = []]) => ({
    id: `${slug(nation)}__${slug(name)}`,
    name, nation, cat, cost, meta, fun, tags,
  }));
}

const RAW: Record<string, RawRow[]> = {
  USA: [
    ['M997 Supply',     'LOG', 35,  6, 3, ['supply']],
    ['M35 Ammo Truck',  'LOG', 25,  5, 2, ['supply', 'cheap']],
    ['Scout-85',        'REC', 25,  7, 4, ['recon']],
    ['M3 Bradley CFV',  'REC', 60,  8, 5, ['recon', 'atgm']],
    ['OH-58C Kiowa',    'REC', 45,  7, 6, ['recon', 'air']],
    ['Rifles-85',       'INF', 35,  6, 4, ['line']],
    ['Airborne',        'INF', 45,  7, 6, ['elite', 'para']],
    ['Dragon AT Team',  'INF', 30,  5, 5, ['atgm']],
    ['M109A2 Paladin',  'ART', 90,  7, 4, ['howitzer']],
    ['M270 MLRS',       'ART', 180, 8, 7, ['rockets', 'longrange']],
    ['M106 Mortar',     'ART', 45,  5, 4, ['mortar']],
    ['M1 Abrams',       'TNK', 130, 8, 5, ['heavy']],
    ['M1A1 Abrams',     'TNK', 215, 9, 6, ['heavy']],
    ['M60A3',           'TNK', 95,  6, 5, ['heavy']],
    ['M163 VADS',       'AA',  40,  6, 7, ['spaag']],
    ['M48 Chaparral',   'AA',  55,  6, 4, ['sam']],
    ['M998 Avenger',    'AA',  50,  7, 5, ['manpads', 'sam']],
    ['AH-64 Apache',    'HEL', 210, 9, 7, ['atgm', 'topattack']],
    ['AH-1F Cobra TOW', 'HEL', 110, 7, 6, ['atgm']],
    ['F-16 Falcon',     'AIR', 120, 8, 6, ['multirole']],
    ['A-10 Thunderbolt','AIR', 145, 8, 9, ['cas', 'gun']],
    ['F-4E Phantom',    'AIR', 90,  6, 7, ['napalm', 'bomber']],
  ],
  'West Germany': [
    ['Versorgung',       'LOG', 35,  6, 3, ['supply']],
    ['M35 LKW',          'LOG', 25,  5, 2, ['supply', 'cheap']],
    ['Spah Luchs',       'REC', 40,  7, 5, ['recon']],
    ['Marder Spah',      'REC', 55,  7, 4, ['recon', 'atgm']],
    ['Bo-105 PAH Recon', 'REC', 50,  7, 6, ['recon', 'air']],
    ['Panzergrenadiere', 'INF', 40,  7, 4, ['line']],
    ['Fallschirmjager',  'INF', 45,  7, 6, ['elite', 'para']],
    ['Milan AT Team',    'INF', 35,  6, 5, ['atgm']],
    ['M109G',            'ART', 85,  7, 4, ['howitzer']],
    ['LARS 2',           'ART', 120, 7, 8, ['rockets', 'cluster']],
    ['Panzermorser',     'ART', 55,  6, 4, ['mortar']],
    ['Leopard 2',        'TNK', 175, 9, 6, ['heavy']],
    ['Leopard 2A4',      'TNK', 205, 9, 6, ['heavy']],
    ['Leopard 1A5',      'TNK', 110, 7, 6, ['heavy']],
    ['Gepard',           'AA',  75,  8, 7, ['spaag']],
    ['Roland 2',         'AA',  90,  8, 5, ['sam']],
    ['Fliegerfaust 2',   'AA',  35,  6, 4, ['manpads']],
    ['PAH-1 HOT',        'HEL', 95,  7, 6, ['atgm']],
    ['Bo-105 ATGM',      'HEL', 80,  7, 6, ['atgm']],
    ['Tornado IDS',      'AIR', 160, 8, 8, ['cluster', 'bomber']],
    ['Alpha Jet',        'AIR', 75,  6, 7, ['cas', 'cluster']],
    ['F-4F Phantom',     'AIR', 95,  6, 6, ['multirole']],
  ],
  'United Kingdom': [
    ['FV432 Supply',     'LOG', 35,  6, 3, ['supply']],
    ['Bedford Truck',    'LOG', 25,  5, 2, ['supply', 'cheap']],
    ['Scimitar',         'REC', 35,  7, 5, ['recon']],
    ['Scorpion',         'REC', 30,  6, 6, ['recon']],
    ['Gazelle Scout',    'REC', 40,  7, 6, ['recon', 'air']],
    ['Infantry',         'INF', 35,  6, 4, ['line']],
    ['Paras',            'INF', 45,  7, 6, ['elite', 'para']],
    ['Milan Team',       'INF', 35,  6, 5, ['atgm']],
    ['Abbot 105',        'ART', 70,  6, 4, ['howitzer']],
    ['M109 (UK)',        'ART', 85,  7, 4, ['howitzer']],
    ['FH-70',            'ART', 80,  6, 5, ['howitzer', 'longrange']],
    ['Challenger 1',     'TNK', 200, 9, 6, ['heavy']],
    ['Chieftain Mk11',   'TNK', 145, 8, 6, ['heavy']],
    ['Chieftain Mk5',    'TNK', 110, 6, 6, ['heavy']],
    ['Tracked Rapier',   'AA',  95,  9, 6, ['sam']],
    ['Marksman',         'AA',  75,  7, 6, ['spaag']],
    ['Javelin LML',      'AA',  35,  6, 4, ['manpads']],
    ['Lynx AH.7 TOW',    'HEL', 105, 8, 7, ['atgm']],
    ['Gazelle SNEB',     'HEL', 55,  5, 7, ['rockets']],
    ['Harrier GR.3',     'AIR', 110, 7, 7, ['cas', 'cluster']],
    ['Jaguar GR.1',      'AIR', 95,  6, 6, ['bomber']],
    ['Tornado GR.1',     'AIR', 150, 8, 7, ['cluster', 'bomber']],
  ],
  France: [
    ['VAB Supply',       'LOG', 35,  6, 3, ['supply']],
    ['TRM 2000',         'LOG', 25,  5, 2, ['supply', 'cheap']],
    ['VBL',              'REC', 20,  7, 5, ['recon', 'cheap']],
    ['AMX-10RC',         'REC', 75,  8, 6, ['recon', 'gun']],
    ['Gazelle Recon',    'REC', 45,  7, 6, ['recon', 'air']],
    ['Infanterie',       'INF', 35,  6, 4, ['line']],
    ['Legion Para',      'INF', 50,  8, 7, ['elite', 'para']],
    ['Milan',            'INF', 35,  6, 5, ['atgm']],
    ['AUF1 155mm',       'ART', 95,  7, 4, ['howitzer']],
    ['LRM',              'ART', 175, 8, 7, ['rockets', 'longrange']],
    ['Mortier 120',      'ART', 45,  5, 4, ['mortar']],
    ['AMX-30B2',         'TNK', 105, 6, 6, ['heavy']],
    ['AMX-30 Brenus',    'TNK', 135, 7, 6, ['heavy']],
    ['AMX-10P Pirat',    'TNK', 55,  5, 7, ['light']],
    ['AMX-30 Roland',    'AA',  85,  8, 5, ['sam']],
    ['Crotale',          'AA',  90,  8, 5, ['sam']],
    ['Mistral Team',     'AA',  40,  7, 5, ['manpads']],
    ['Gazelle HOT',      'HEL', 90,  8, 7, ['atgm', 'spam']],
    ['SA341 Gazelle',    'HEL', 50,  5, 7, ['rockets']],
    ['Mirage 2000',      'AIR', 130, 8, 6, ['multirole']],
    ['Jaguar A',         'AIR', 90,  6, 7, ['napalm', 'bomber']],
    ['Super Etendard',   'AIR', 110, 7, 6, ['bomber']],
  ],
  'Soviet Union': [
    ['Snabzhenie',       'LOG', 35,  6, 3, ['supply']],
    ['Ural-375 Truck',   'LOG', 20,  5, 2, ['supply', 'cheap']],
    ['BRM-1K',           'REC', 45,  7, 5, ['recon']],
    ['Razvedka BMP',     'REC', 40,  7, 5, ['recon']],
    ['Mi-24R Recon',     'REC', 55,  6, 6, ['recon', 'air']],
    ['Motostrelki',      'INF', 30,  6, 4, ['line', 'spam']],
    ['VDV',              'INF', 45,  8, 6, ['elite', 'para']],
    ['Spetsnaz',         'INF', 55,  8, 8, ['elite', 'stealth']],
    ['2S3 Akatsiya',     'ART', 85,  7, 4, ['howitzer']],
    ['BM-21 Grad',       'ART', 120, 7, 9, ['rockets', 'cluster', 'spam']],
    ['2S1 Gvozdika',     'ART', 60,  6, 4, ['howitzer']],
    ['T-80B',            'TNK', 145, 8, 6, ['heavy']],
    ['T-80U',            'TNK', 230, 9, 7, ['heavy']],
    ['T-72B',            'TNK', 125, 7, 6, ['heavy']],
    ['ZSU-23-4 Shilka',  'AA',  45,  7, 8, ['spaag', 'spam']],
    ['2K22 Tunguska',    'AA',  130, 9, 6, ['spaag', 'sam']],
    ['Strela MANPADS',   'AA',  25,  6, 4, ['manpads', 'cheap']],
    ['Mi-24V Hind',      'HEL', 175, 9, 8, ['atgm', 'gun']],
    ['Mi-28 Havoc',      'HEL', 200, 9, 7, ['atgm', 'topattack']],
    ['Su-25 Frogfoot',   'AIR', 120, 8, 8, ['cas', 'rockets']],
    ['MiG-29 Fulcrum',   'AIR', 145, 9, 6, ['interceptor']],
    ['Su-24 Fencer',     'AIR', 160, 8, 8, ['cluster', 'bomber']],
  ],
  'East Germany': [
    ['Versorgung DDR',   'LOG', 30,  6, 3, ['supply']],
    ['W50 Truck',        'LOG', 18,  5, 2, ['supply', 'cheap']],
    ['BRDM-2',           'REC', 25,  6, 5, ['recon', 'cheap']],
    ['Aufklarer BMP',    'REC', 40,  7, 5, ['recon']],
    ['Mi-2 Scout',       'REC', 30,  5, 6, ['recon', 'air']],
    ['Mot.-Schutzen',    'INF', 25,  6, 4, ['line', 'spam']],
    ['Fallschirmjager DDR','INF',45, 7, 6, ['elite', 'para']],
    ['RPG-18 Team',      'INF', 20,  5, 6, ['at', 'cheap', 'spam']],
    ['2S1 (DDR)',        'ART', 60,  6, 4, ['howitzer']],
    ['BM-21 (DDR)',      'ART', 115, 7, 9, ['rockets', 'cluster', 'spam']],
    ['Morser 120',       'ART', 40,  5, 4, ['mortar']],
    ['T-72M',            'TNK', 110, 7, 6, ['heavy']],
    ['T-55AM2',          'TNK', 65,  5, 7, ['heavy', 'spam']],
    ['T-72M1',           'TNK', 130, 7, 6, ['heavy']],
    ['ZSU-23-4 (DDR)',   'AA',  45,  7, 8, ['spaag', 'spam']],
    ['Strela-10',        'AA',  55,  7, 5, ['sam']],
    ['Strela-2 MANPADS', 'AA',  20,  5, 4, ['manpads', 'cheap']],
    ['Mi-24D (DDR)',     'HEL', 150, 8, 8, ['atgm', 'gun']],
    ['Mi-8 Gunship',     'HEL', 70,  5, 7, ['rockets', 'transport']],
    ['MiG-23 Flogger',   'AIR', 110, 7, 6, ['interceptor']],
    ['MiG-21 (DDR)',     'AIR', 70,  5, 7, ['cluster', 'cheap']],
    ['Su-22 Fitter',     'AIR', 105, 7, 7, ['napalm', 'bomber']],
  ],

  // ---- Minor nations: small signature pools. Divisions of these nations also
  // draw on a same-coalition "donor" pool (see availability.ts) so decks fill out.
  Belgium: [
    ['Leopard 1(BE)',     'TNK', 105, 6, 6, ['heavy']],
    ['Para-Commando',     'INF', 45,  7, 6, ['elite', 'para']],
    ['Spahcompanie CVRT', 'REC', 35,  7, 5, ['recon']],
    ['Gepard (BE)',       'AA',  75,  8, 6, ['spaag']],
  ],
  Netherlands: [
    ['Leopard 2(NL)',     'TNK', 195, 9, 6, ['heavy']],
    ['Pantserinfanterie', 'INF', 45,  7, 4, ['line']],
    ['M113 C&V',          'REC', 35,  6, 5, ['recon']],
    ['PRTL Cheetah',      'AA',  75,  8, 6, ['spaag']],
  ],
  Canada: [
    ['Leopard C1',           'TNK', 110, 6, 6, ['heavy']],
    ['Mech Infantry Grizzly','INF', 40,  6, 4, ['line']],
    ['Lynx Recon',           'REC', 35,  6, 5, ['recon']],
    ['ADATS',                'AA',  110, 9, 6, ['sam']],
  ],
  Spain: [
    ['AMX-30EM2', 'TNK', 100, 6, 6, ['heavy']],
    ['M48A5E',    'TNK', 80,  5, 6, ['heavy']],
    ['Cazadores', 'INF', 40,  6, 5, ['line']],
    ['Roland (ES)','AA', 85,  8, 5, ['sam']],
  ],
  Denmark: [
    ['Leopard 1A5DK', 'TNK', 130, 7, 6, ['heavy']],
    ['Centurion (DK)','TNK', 70,  5, 6, ['heavy']],
    ['Jægerkorps',    'INF', 50,  8, 7, ['elite', 'stealth']],
    ['M113 GVM (DK)', 'REC', 35,  6, 5, ['recon']],
  ],
  Poland: [
    ['T-72M1 (PL)',  'TNK', 125, 7, 6, ['heavy']],
    ['Zmechanizowani','INF', 30, 6, 4, ['line', 'spam']],
    ['BWP-1 Recon',  'REC', 40,  6, 5, ['recon']],
    ['ZSU-23-4 (PL)','AA',  45,  7, 8, ['spaag', 'spam']],
  ],
  Czechoslovakia: [
    ['T-72 (CS)',         'TNK', 120, 7, 6, ['heavy']],
    ['T-55AM2 Kladivo',   'TNK', 70,  5, 7, ['heavy', 'spam']],
    ['Mechanizovaná',     'INF', 30,  6, 4, ['line', 'spam']],
    ['OT-65 Recon',       'REC', 25,  6, 5, ['recon', 'cheap']],
  ],
  Cuba: [
    ['T-62 (CU)',    'TNK', 70, 5, 6, ['heavy', 'spam']],
    ['Milicianos',   'INF', 20, 5, 6, ['line', 'spam', 'cheap']],
    ['BRDM-2 (CU)',  'REC', 25, 6, 5, ['recon', 'cheap']],
  ],
};

export const UNITS: Unit[] = Object.entries(RAW).flatMap(([nation, rows]) => build(nation, rows));

type CustomUnit = Partial<Unit> & { name: string; nation: string; cat: CategoryCode };
try {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const file = path.join(here, 'custom-units.json');
  if (fs.existsSync(file)) {
    const extra: CustomUnit[] = JSON.parse(fs.readFileSync(file, 'utf8'));
    const byId = new Map<string, Unit>(UNITS.map((u) => [u.id, u]));
    for (const raw of extra) {
      const id = raw.id || `${slug(raw.nation)}__${slug(raw.name)}`;
      byId.set(id, {
        id, name: raw.name, nation: raw.nation, cat: raw.cat,
        cost: raw.cost ?? 50, meta: raw.meta ?? 5, fun: raw.fun ?? 5,
        tags: raw.tags ?? [],
      });
    }
    UNITS.length = 0;
    UNITS.push(...byId.values());
    console.log(`Loaded ${extra.length} custom units from custom-units.json`);
  }
} catch (err) {
  console.warn('custom-units.json present but could not be loaded:', (err as Error).message);
}

export const UNITS_BY_ID: Record<string, Unit> =
  Object.fromEntries(UNITS.map((u) => [u.id, u]));
