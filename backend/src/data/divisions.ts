import type { CategoryCode, CategoryLimits, Coalition, Division, DivisionType } from '../types.js';

export const CATEGORIES: CategoryCode[] = ['LOG', 'REC', 'INF', 'ART', 'TNK', 'AA', 'HEL', 'AIR'];

export const CATEGORY_LABELS: Record<CategoryCode, string> = {
  LOG: 'Logistics',
  REC: 'Recon',
  INF: 'Infantry',
  ART: 'Artillery',
  TNK: 'Tanks',
  AA: 'Anti-Air',
  HEL: 'Helicopters',
  AIR: 'Air',
};

// Activation-point budget per division type (the lever that gates deck size).
// In-game max is 50 AP -- previous values here topped out at 65, which was wrong.
// Rescaled proportionally (old max 65 -> 50) to preserve relative ordering.
const AP_BY_TYPE: Record<DivisionType, number> = {
  Armored: 50, Cavalry: 50, Mechanized: 46, Motorized: 48,
  Airborne: 42, Airmobile: 42, Naval: 46, Territorial: 45,
};

// Build category limits from the wiki's column order: LOG INF ART TNK REC AA HEL AIR.
const lim = (
  LOG: number, INF: number, ART: number, TNK: number,
  REC: number, AA: number, HEL: number, AIR: number,
): CategoryLimits => ({ LOG, REC, INF, ART, TNK, AA, HEL, AIR });

function mk(
  id: string, name: string, nation: string, coalition: Coalition, type: DivisionType,
  dlc: string, power: number, limits: CategoryLimits, blurb: string,
): Division {
  return {
    id, name, nation, coalition, type, dlc, power, blurb,
    activationPoints: AP_BY_TYPE[type],
    categoryLimits: limits,
  };
}

// Per-category limits below are taken from the WARNO wiki Divisions table.
// power (1-10) is an estimated competitive rating used to weight Meta-mode rolls.
export const DIVISIONS: Division[] = [
  // ============================ VANILLA ============================
  // NATO
  mk('us-3ad',  '3rd Armored Division',          'USA',           'NATO', 'Armored',     'Vanilla', 8, lim(6, 7, 5, 10, 7, 6, 7, 6), 'US heavy armor — Abrams walls with Apache overwatch.'),
  mk('us-8id',  '8th Infantry Division (Mech.)', 'USA',           'NATO', 'Mechanized',  'Vanilla', 7, lim(7, 10, 7, 6, 6, 7, 6, 6), 'Balanced US combined-arms with strong air support.'),
  mk('us-82abn','82nd Airborne Division',        'USA',           'NATO', 'Airborne',    'Vanilla', 7, lim(6, 10, 5, 5, 7, 7, 7, 8), 'Elite US paratroopers — light, fast, air-rich.'),
  mk('us-11acr','11th Arm. Cavalry Regt.',       'USA',           'NATO', 'Cavalry',     'Vanilla', 8, lim(4, 5, 5, 10, 10, 5, 8, 8), 'Recon-heavy cavalry screen with Abrams and Apache.'),
  mk('rfa-2pg', '2. Pz.Grenadier-Division',      'West Germany',  'NATO', 'Mechanized',  'Vanilla', 7, lim(7, 10, 7, 7, 7, 7, 3, 7), 'Marder grenadiers backed by Leopards.'),
  mk('rfa-5pz', '5. Panzerdivision',             'West Germany',  'NATO', 'Armored',     'Vanilla', 9, lim(6, 8, 8, 10, 7, 6, 3, 6), 'Leopard 2 spearhead with Gepard AA.'),
  mk('rfa-terr-sud','Territorialkommando Süd',   'West Germany',  'NATO', 'Territorial', 'Vanilla', 5, lim(8, 10, 7, 6, 5, 7, 5, 7), 'German home defense — Jaguars and reservists.'),
  mk('uk-1ad',  '1st Armoured Division',         'United Kingdom','NATO', 'Armored',     'Vanilla', 7, lim(6, 7, 7, 10, 9, 5, 3, 6), 'Challenger armor under a Harrier umbrella.'),
  mk('uk-2id',  '2nd Infantry Division',         'United Kingdom','NATO', 'Motorized',   'Vanilla', 6, lim(6, 10, 7, 5, 7, 7, 5, 6), 'British motor infantry mass.'),
  mk('fr-5db',  '5e Division Blindée',           'France',        'NATO', 'Armored',     'Vanilla', 7, lim(6, 8, 7, 10, 7, 6, 4, 7), 'Fast AMX-30 armor with Gazelle HOT swarms.'),
  mk('fr-11dp', '11e Division Parachutiste',     'France',        'NATO', 'Airborne',    'Vanilla', 6, lim(6, 10, 5, 6, 8, 6, 6, 8), 'Elite French paras, light and Gazelle-heavy.'),
  // PACT
  mk('sov-39grd','39-ya Gv. Motostrelk. Div.',   'Soviet Union',  'PACT', 'Mechanized',  'Vanilla', 7, lim(7, 10, 7, 6, 6, 6, 7, 6), 'Motostrelki masses with Hind gunships.'),
  mk('sov-79gtd','79-ya Gv. Tank. Div.',         'Soviet Union',  'PACT', 'Armored',     'Vanilla', 9, lim(5, 7, 8, 10, 7, 8, 6, 5), 'T-80U steel tide — the Soviet armored fist.'),
  mk('sov-35dshb','35-ya Desantno-Shturm. Brig.','Soviet Union',  'PACT', 'Airborne',    'Vanilla', 7, lim(6, 10, 6, 5, 7, 6, 8, 7), 'Soviet air-assault brigade, helicopter-rich.'),
  mk('sov-119tp','119-y Otd. Tank. Polk',        'Soviet Union',  'PACT', 'Armored',     'Vanilla', 7, lim(5, 5, 6, 10, 8, 5, 8, 8), 'Independent tank regiment — armor and air.'),
  mk('ddr-4msd', '4. Mot.-Schützen-Division',    'East Germany',  'PACT', 'Mechanized',  'Vanilla', 6, lim(6, 10, 5, 8, 7, 6, 7, 6), 'East German mechanized division.'),
  mk('ddr-7pz',  '7. Panzerdivision',            'East Germany',  'PACT', 'Armored',     'Vanilla', 7, lim(6, 7, 7, 10, 7, 6, 6, 6), 'NVA armored division — T-72 spearhead.'),
  mk('ddr-kda-erfurt','K.d.A. Bezirk Erfurt',    'East Germany',  'PACT', 'Territorial', 'Vanilla', 4, lim(7, 10, 7, 6, 5, 7, 5, 7), 'Workers militia home defense.'),

  // ============================ NORTHAG ============================
  // NATO
  mk('us-9id',  '9th Infantry Division (Mot.)',  'USA',           'NATO', 'Motorized',   'NORTHAG', 7, lim(6, 10, 7, 7, 9, 6, 4, 5), 'US "High-Tech" motorized — HMMWV recon swarm.'),
  mk('uk-4ad',  '4th Armoured Division',         'United Kingdom','NATO', 'Armored',     'NORTHAG', 7, lim(7, 9, 8, 10, 7, 6, 3, 6), 'Chieftain/Challenger armor with strong artillery.'),
  mk('uk-mnad', 'MNAD',                          'United Kingdom','NATO', 'Airborne',    'NORTHAG', 6, lim(5, 10, 6, 9, 7, 6, 4, 8), 'Multinational ACE airborne, tank-capable.'),
  mk('bel-16pz','16de Pantserdivision',          'Belgium',       'NATO', 'Mechanized',  'NORTHAG', 6, lim(7, 10, 7, 7, 8, 6, 2, 7), 'Belgian mechanized division, Leopard 1.'),
  mk('nl-4div', '4e Divisie',                    'Netherlands',   'NATO', 'Mechanized',  'NORTHAG', 7, lim(6, 9, 7, 9, 8, 6, 0, 7), 'Dutch armor — Leopard 2 with strong recon.'),
  // PACT
  mk('sov-25td','25-ya Tank. Div.',              'Soviet Union',  'PACT', 'Armored',     'NORTHAG', 8, lim(6, 5, 7, 10, 7, 6, 6, 7), 'Soviet tank division, T-80 spearhead.'),
  mk('ddr-9pz', '9. Panzerdivision',             'East Germany',  'PACT', 'Armored',     'NORTHAG', 7, lim(6, 7, 7, 10, 6, 7, 4, 7), 'NVA armored division, T-72.'),
  mk('pol-4mech','4 Dyw. Zmechanizowana',        'Poland',        'PACT', 'Mechanized',  'NORTHAG', 6, lim(7, 10, 6, 8, 7, 6, 6, 5), 'Polish mechanized division.'),
  mk('pol-20panc','20 Dywizja Pancerna',         'Poland',        'PACT', 'Armored',     'NORTHAG', 6, lim(7, 7, 7, 10, 7, 6, 5, 6), 'Polish armored division, T-72.'),
  mk('pol-korpus','Korpus Desantowy',            'Poland',        'PACT', 'Naval',       'NORTHAG', 6, lim(6, 10, 6, 5, 8, 5, 8, 8), 'Polish naval-assault corps, helicopter-rich.'),

  // ============================ SOUTHAG ============================
  // NATO
  mk('rfa-1luft','1. Luftlande-Division',        'West Germany',  'NATO', 'Airborne',    'SOUTHAG', 6, lim(6, 10, 7, 7, 7, 6, 2, 7), 'German airborne division.'),
  mk('fr-6bl',  '6e Division Légère Blindée',    'France',        'NATO', 'Motorized',   'SOUTHAG', 7, lim(6, 8, 7, 10, 7, 7, 3, 7), 'French rapid-action light armor (AMX-10RC).'),
  mk('fr-rhin', 'Division du Rhin',              'France',        'NATO', 'Territorial', 'SOUTHAG', 5, lim(7, 10, 7, 8, 6, 7, 2, 7), 'French Rhine garrison, defensive.'),
  mk('can-1cad','1 Canadian Division',           'Canada',        'NATO', 'Mechanized',  'SOUTHAG', 7, lim(7, 10, 6, 9, 7, 6, 2, 8), 'Canadian mechanized division, Leopard C1.'),
  mk('esp-brunete','División Acorazada Brunete', 'Spain',         'NATO', 'Motorized',   'SOUTHAG', 6, lim(6, 7, 7, 10, 7, 7, 3, 6), 'Spanish armored division, AMX-30/M48.'),
  // PACT
  mk('sov-17gtd','17-ya Gv. Tank. Div.',         'Soviet Union',  'PACT', 'Armored',     'SOUTHAG', 8, lim(7, 7, 8, 10, 6, 7, 4, 6), 'Soviet guards tank division.'),
  mk('sov-31td','31-ya Tank. Div.',              'Soviet Union',  'PACT', 'Armored',     'SOUTHAG', 7, lim(6, 7, 7, 10, 7, 7, 5, 5), 'Soviet tank division.'),
  mk('tch-1td', '1. Tanková Divize',             'Czechoslovakia','PACT', 'Armored',     'SOUTHAG', 7, lim(5, 6, 8, 10, 8, 7, 3, 6), 'Czechoslovak tank division.'),
  mk('tch-19msd','19. Motostřelecká Divize',     'Czechoslovakia','PACT', 'Mechanized',  'SOUTHAG', 6, lim(7, 9, 7, 7, 6, 6, 6, 6), 'Czechoslovak motor-rifle division.'),
  mk('tch-303td','303. Tanková Divize',          'Czechoslovakia','PACT', 'Armored',     'SOUTHAG', 7, lim(7, 7, 7, 10, 6, 7, 3, 6), 'Czechoslovak reserve tank division.'),

  // ============================ LANDJUT ============================
  // NATO
  mk('us-2mar', '2nd Marine Division',           'USA',           'NATO', 'Naval',       'LANDJUT', 7, lim(6, 10, 6, 6, 8, 4, 7, 7), 'US Marines — combined-arms amphibious force.'),
  mk('rfa-6pg', '6. Pz.Grenadier-Division',      'West Germany',  'NATO', 'Mechanized',  'LANDJUT', 7, lim(7, 10, 6, 7, 7, 7, 4, 7), 'German grenadiers defending Jutland.'),
  mk('den-jyske','Jyske Division',               'Denmark',       'NATO', 'Mechanized',  'LANDJUT', 6, lim(7, 10, 7, 7, 6, 6, 2, 7), 'Danish Jutland division, Leopard 1.'),
  mk('den-ostre','Østre Landkommando',           'Denmark',       'NATO', 'Territorial', 'LANDJUT', 5, lim(7, 10, 7, 7, 8, 7, 0, 7), 'Danish eastern home defense.'),
  // PACT
  mk('sov-94grd','94-ya Gv. Motostrelk. Div.',   'Soviet Union',  'PACT', 'Mechanized',  'LANDJUT', 7, lim(6, 10, 7, 7, 7, 7, 0, 7), 'Soviet guards motor-rifle division.'),
  mk('sov-336mar','336-ya Brigada Morskoy Pekh.','Soviet Union',  'PACT', 'Naval',       'LANDJUT', 6, lim(7, 10, 7, 7, 7, 7, 3, 7), 'Soviet naval infantry brigade.'),
  mk('ddr-20msd','20. Mot.-Schützen-Division',   'East Germany',  'PACT', 'Mechanized',  'LANDJUT', 7, lim(7, 10, 7, 9, 7, 7, 2, 5), 'NVA motor-rifle division, T-72 heavy.'),
  mk('pol-15mech','15 Dyw. Zmechanizowana',      'Poland',        'PACT', 'Mechanized',  'LANDJUT', 6, lim(7, 10, 6, 6, 7, 7, 1, 9), 'Polish coastal mechanized division, air-rich.'),

  // ========================= TROPICAL STORM =========================
  // (wiki stat columns are blank/TBD for these two — limits estimated by type)
  mk('us-4mar', '4th Marine Division',           'USA',           'NATO', 'Naval',       'Tropical Storm', 6, lim(6, 10, 6, 6, 8, 4, 7, 7), 'US Marine reserve division. Wiki stats TBD — limits estimated.'),
  mk('cub-1td', '1a División de Tanques',        'Cuba',          'PACT', 'Armored',     'Tropical Storm', 5, lim(6, 6, 6, 10, 7, 6, 3, 5), 'Cuban tank division. Wiki stats TBD — limits estimated.'),

  // ============================ NEMESIS ============================
  // #1 - Air Assault
  mk('us-101',  '101st Airborne Division',       'USA',           'NATO', 'Airmobile',   'Nemesis #1', 7, lim(7, 10, 6, 4, 7, 5, 8, 6), 'US air-assault — helicopter cavalry.'),
  mk('sov-56dshb','56-ya Desantno-Shturm. Brig.','Soviet Union',  'PACT', 'Airmobile',   'Nemesis #1', 7, lim(7, 10, 6, 5, 7, 6, 7, 6), 'Soviet air-assault brigade.'),
  // #2 - Plateau d'Albion
  mk('fr-152', '152e Division d\'Infanterie',    'France',        'NATO', 'Territorial', 'Nemesis #2', 5, lim(8, 10, 6, 6, 7, 8, 3, 7), 'French territorial infantry.'),
  mk('sov-76vdv','76-ya Gv. Vozdushno-Des. Div.','Soviet Union',  'PACT', 'Airborne',    'Nemesis #2', 7, lim(6, 10, 7, 6, 9, 6, 0, 9), 'Soviet VDV airborne division.'),
  // #3 - Homefront
  mk('us-6lt', '6th Infantry Division (Light)',  'USA',           'NATO', 'Motorized',   'Nemesis #3', 6, lim(7, 10, 6, 6, 8, 5, 5, 8), 'US light infantry (Alaska).'),
  mk('sov-157','157-ya Motostrelk. Div.',        'Soviet Union',  'PACT', 'Mechanized',  'Nemesis #3', 6, lim(9, 10, 9, 7, 5, 5, 2, 8), 'Soviet reserve rifle division, artillery-heavy.'),
  // #4 - Capital Defense (PACT division's AA/HEL/AIR were truncated on the wiki — estimated)
  mk('uk-hdr', 'H.D.R. London',                  'United Kingdom','NATO', 'Territorial', 'Nemesis #4', 5, lim(7, 10, 4, 7, 6, 8, 2, 7), 'British home defense, London.'),
  mk('sov-2grd','2-ya Gv. Motostrelk. Div.',     'Soviet Union',  'PACT', 'Mechanized',  'Nemesis #4', 7, lim(7, 10, 7, 7, 7, 7, 4, 6), 'Soviet guards motor-rifle division. Some wiki stats estimated.'),
];

export const DIVISIONS_BY_ID: Record<string, Division> =
  Object.fromEntries(DIVISIONS.map((d) => [d.id, d]));

// DLC packs in display order.
export const DLCS: string[] = (() => {
  const order = ['Vanilla', 'NORTHAG', 'SOUTHAG', 'LANDJUT', 'Tropical Storm',
    'Nemesis #1', 'Nemesis #2', 'Nemesis #3', 'Nemesis #4'];
  const present = new Set(DIVISIONS.map((d) => d.dlc));
  return order.filter((d) => present.has(d));
})();