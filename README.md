# WARNO ORBAT Randomizer

[![CI](https://github.com/Hung1510/Warno-Deck-Randomizer/actions/workflows/ci.yml/badge.svg)](https://github.com/Hung1510/Warno-Deck-Randomizer/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-e0b04a.svg)](LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6.svg)
![Made with React](https://img.shields.io/badge/React-18-4f86c6.svg)

A full-stack web app for **WARNO** that rolls a random **battlegroup (division)** and
fills it with a randomized deck. Slide the **chaos factor** anywhere between:

- **Meta (0)** - secures recon, tanks and AA first, then stacks the strongest cards
  within the division's activation-point budget.
- **Fun (100)** - wide, chaotic spread biased toward napalm, rockets, spam and gimmick
  units. Tank division with zero tanks and a helicopter circus? Absolutely.

Everything in between is a genuine blend, not a jump between two presets - and a
**theme** (Helicopter Rush, Napalm Spam, Heavy Armor, Recon Sniper) can force a category
to dominate the roll on top of wherever the slider sits.

Inspired by community deck builders like WaRYes. Every roll has a **seed**, so a deck
can be shared and reproduced via a link. Each deck also gets a portable **deck code**
you can copy and paste back in to re-load the exact same list, and rolls toward the
Meta end are weighted by each division's **competitive rating** (a win-rate proxy), so
stronger battlegroups come up more often the more Meta the slider leans.

> Fan-made / unofficial. WARNO © Eugen Systems. Division names, types and per-category
> limits are taken from the [WARNO wiki](https://warno.fandom.com/wiki/Divisions);
> unit rosters and meta/fun/power ratings are a curated, representative sample, not the
> full game database. Native in-game deck-code export was investigated and is currently
> **not possible** - see [Known limitations](#known-limitations--data-caveats).

## Features

- **Chaos slider** - continuous Fun↔Meta blend (`chaos: 0-100`), not a binary toggle.
- **Themes** - Helicopter Rush, Napalm Spam, Heavy Armor, Recon Sniper - guarantee a
  category dominates the roll.
- **Deck difficulty rating** - 1-5 stars, calibrated against ~670 real rolls across
  every division, aimed at telling newer players how demanding a rolled deck is to
  pilot (avg unit cost, avg meta rating, category spread, precision-tag share).
- **Division profile dashboard** - a radar chart of category strength per division,
  plus a meta score (reuses the existing `power` rating) and a meme score (limit-
  weighted average `fun` across the division's pool).
- **Combined-arms synergy graph** - a category-level doctrine graph (TNK↔AA, ART↔REC,
  etc.), click a category to see what it pairs with and why, dimmed for categories the
  current division doesn't field.
- **Interactive unit tree** - a collapsible, `tree`-style ASCII hierarchy of a
  division's full available pool, grouped by category.
- **Deck stats dashboard** - cost-curve histogram, category donut chart, and a tag
  cloud with doctrine-grounded vulnerability warnings (eg heavy SAM presence with no
  armor cover flags a SEAD vulnerability) - all dependency-free SVG/CSS, no charting
  library.
- **Unit search** - free-text search across the full unit dataset ("heavy tanks",
  "napalm units", "radar AA" via a `radar`→`sam` synonym, "cluster aircraft", or a
  plain name). See [`/units`](#api-reference).
- **Counter deck generator** - paste an opponent's deck code, or name a division
  (`/api/counter/division/:query`), and get a deck built against doctrine-grounded
  counters (armor → ATGM + attack helicopters, air presence → dedicated AA, artillery →
  recon + counter-battery, infantry mass → armor + suppressive fire).
- **Deck of the day** - `/api/daily`, one canonical roll shared by everyone on the same
  UTC calendar day (deterministic seed = today's date).
- **Keyboard shortcuts** - `R` reroll, `C` copy share link, `E` export a build list,
  `D` toggle the stats dashboard. Ignored while typing in any input, and won't hijack
  browser shortcuts (modifier keys pass through untouched).
- **Discord bot** - `/randomdeck`, `/daily`, `/division`, `/counter` - see
  [`discord-bot/README.md`](discord-bot/README.md).

---

## Divisions & DLC packs

56 battlegroups across 14 nations, grouped by pack and filterable in the UI:

- **Vanilla** (18), **NORTHAG** (10), **SOUTHAG** (10), **LANDJUT** (8),
  **Tropical Storm** (2), **Nemesis #1-#4** (2 each).
- Nations with divisions: USA, West Germany, United Kingdom, France, Soviet Union,
  East Germany, Poland, Czechoslovakia, Netherlands, Denmark, Spain, Belgium, Canada,
  Cuba. **Luxembourg** has a real unit pool (wiki-scraped) but no divisions in the
  dataset yet.
- Each division uses its **real per-category card limits** from the wiki, and a
  **50-AP activation-point cap** per the actual in-game maximum (`AP_BY_TYPE` in
  `divisions.ts` - a prior version of this had it topping out at 65, which was wrong
  and has been corrected).
- Data completeness by nation, transcribed from the actual in-game unit browser
  (screenshots, cross-checked against each category tab's "Units: N" counter) or
  scraped from the CC-BY-SA Fandom wiki:

  | Tier | Nations | Source |
  |------|---------|--------|
  | Full roster (63-267 units each) | USA, France, East Germany, Poland, West Germany, Czechoslovakia, United Kingdom, Spain, Netherlands, Denmark, Soviet Union, Canada, Belgium | Wiki scrape (`scrape-fandom.mjs`) for USA/UK/Canada/Belgium/Soviet Union/Luxembourg; manual screenshot transcription (`gen-<nation>.mjs` scripts) for the rest |
  | Thin (12 units) | Luxembourg | Wiki scrape - no divisions reference it yet |
  | Placeholder only (3 units) | Cuba | Cuba isn't released in-game yet (upcoming "Tropical Storm" DLC) - its division (`cub-1td`) exists in the dataset with wiki-estimated category limits but no real unit data. **This division is currently selectable by the random-division roll despite not existing in the shipped game** - see [Known limitations](#known-limitations--data-caveats). |

- Minor-data nations still draw on a same-coalition **donor pool** (NATO minors → West
  German gear, Pact minors → Soviet gear) to fill out decks, configured in
  `backend/src/logic/availability.ts`. Worth revisiting for Netherlands/Denmark/Spain
  now that they have full rosters of their own - they may not need the donor blend
  anymore.

---

## Stack

| Layer    | Tech                                              |
|----------|---------------------------------------------------|
| Backend  | Node.js + Express, **TypeScript** (ESM, run via `tsx`) |
| Frontend | React 18 + Vite, **TypeScript**, dependency-free SVG for all charts/graphs |
| Discord bot | Node.js + discord.js v14 (separate deployable, own `package.json`) |
| Data     | Plain TS modules (no DB required)                 |

```
warno-deck-randomizer/
├── backend/
│   ├── tsconfig.json
│   └── src/
│       ├── server.ts             # entry: starts Express + serves built frontend
│       ├── app.ts                # Express app + API routes (reused by Vercel fn)
│       ├── types.ts              # shared domain types
│       ├── data/
│       │   ├── divisions.ts      # battlegroups + category limits + AP budget per type
│       │   ├── units.ts          # unit pool (per nation, with meta/fun scores)
│       │   └── custom-units.json # wiki-scraped units (CC-BY-SA), merged at startup
│       └── logic/
│           ├── availability.ts   # which units a division can field + slot costs
│           ├── randomizer.ts     # seeded chaos-slider deck generation + themes
│           ├── deckcode.ts       # portable deck-code encode/decode (v2, chaos-aware)
│           ├── difficulty.ts     # 1-5 star deck difficulty rating
│           ├── profile.ts        # division category-strength / meta / meme scoring
│           ├── counter.ts        # doctrine-grounded counter-deck theme derivation
│           └── search.ts         # free-text unit search (category/tag synonyms)
├── frontend/
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts
│   ├── public/                   # robots.txt, sitemap.xml, og-image.png (SEO)
│   └── src/
│       ├── App.tsx               # state, data loading, share/import, keyboard shortcuts
│       ├── main.tsx              # router (/, /divisions, /division/:id, /units)
│       ├── api.ts                # typed API client
│       ├── types.ts              # API/domain types
│       ├── styles.css            # CRT terminal / Cold War command-console theme
│       ├── data/
│       │   └── synergy.ts        # combined-arms doctrine edges + category taglines
│       ├── hooks/
│       │   └── useDocumentMeta.ts
│       ├── pages/
│       │   ├── DivisionsIndex.tsx
│       │   ├── DivisionPage.tsx  # profile radar, synergy graph, unit tree
│       │   └── UnitSearchPage.tsx
│       └── components/           # Controls, Dossier, CategoryColumn, UnitCard,
│                                  # DifficultyStars, DivisionRadar, DivisionTree,
│                                  # CategorySynergyGraph, DeckStatsDashboard (.tsx)
├── discord-bot/                  # separate deployable - long-running gateway bot,
│   ├── package.json              # not a serverless function (see its README)
│   ├── .env.example
│   ├── README.md                 # setup steps + an honest "verified vs not" section
│   └── src/
│       ├── index.js              # gateway client + interaction handler
│       ├── commands.js           # slash command definitions
│       ├── register-commands.js  # one-off script to sync commands with Discord
│       ├── api.js                # thin fetch wrapper around this repo's REST API
│       └── embeds.js             # Discord embed formatting
├── api/
│   └── index.ts                  # Vercel serverless entry (re-exports the Express app)
├── scripts/
│   ├── import-units.mjs          # convert a WaRYes/WARNO JSON export -> custom-units.json
│   ├── scrape-fandom.mjs         # scrape the CC-BY-SA Fandom wiki -> custom-units.json
│   ├── gen-denmark.mjs           # screenshot-transcription -> RAW block generators,
│   ├── gen-netherlands.mjs       # one per manually-transcribed nation (see "Extending
│   └── gen-spain.mjs             # the data" below for the pattern)
├── .github/workflows/ci.yml      # CI: typecheck + build on push/PR
├── .gitattributes                # normalize line endings (LF)
├── SECURITY.md                   # vulnerability disclosure policy
├── LICENSE                       # MIT
├── vercel.json                   # build config + security & cache headers
├── package.json                  # convenience scripts (install/build/start/typecheck)
└── README.md
```

---

## Prerequisites

- **Node.js 18+** (tested on Node 22) and npm.

---

## Quick start (production - single command serves everything)

From the project root:

```bash
npm run setup     # installs backend + frontend deps, then builds the frontend
npm start         # starts the backend, which also serves the built frontend
```

Then open **http://localhost:4000**.

The backend runs TypeScript directly with [`tsx`](https://github.com/privatenumber/tsx) -
no separate compile step is needed to start it. `npm run setup` is just `install:all` +
`build` (the frontend build). If you prefer to do it by hand:

```bash
npm --prefix backend install
npm --prefix frontend install
npm --prefix frontend run build
npm --prefix backend start
```

**Type-checking / compiling (optional):**

```bash
npm run typecheck                 # type-check both backend and frontend
npm --prefix backend run build    # emit compiled JS to backend/dist (tsc)
```

**Discord bot** is a separate deployable with its own dependencies - see
[`discord-bot/README.md`](discord-bot/README.md) for setup (it needs a real Discord bot
token and a long-running host, not something `npm run setup` touches).

---

## Dev mode (hot reload, two terminals)

**Terminal 1 - backend (API on :4000):**
```bash
cd backend
npm install        # first time only
npm run dev        # tsx watch (hot reload)
```

**Terminal 2 - frontend (Vite dev server on :5173):**
```bash
cd frontend
npm install        # first time only
npm run dev
```

Open **http://localhost:5173**. The Vite dev server proxies `/api` to the backend on
`:4000`, so no CORS setup is needed.

> Want the backend somewhere else? Set `BACKEND_URL=http://host:port` before
> `npm run dev` (frontend) to retarget the proxy, or set `VITE_API_BASE` at build time
> to bake an absolute API URL into the production bundle.

---

## API reference

Base URL: `http://localhost:4000`

| Method | Endpoint                        | Description                                              |
|--------|----------------------------------|-----------------------------------------------------------|
| GET    | `/api/health`                   | Service status                                             |
| GET    | `/api/meta`                     | Categories, labels, nations, coalitions, dlcs (for filters) |
| GET    | `/api/divisions`                | All battlegroups                                           |
| GET    | `/api/divisions/lookup?q=...`   | Substring match against division id or name, eg `?q=79gtd` |
| GET    | `/api/divisions/:id`            | One battlegroup + its fieldable unit pool + profile         |
| POST   | `/api/randomize`                | Generate a deck (body below)                                |
| GET    | `/api/randomize`                | Same, via query params (handy for sharing)                  |
| GET    | `/api/decode`                   | Expand a deck code: `?code=...`                              |
| POST   | `/api/decode`                   | Expand a deck code: `{ "code": "..." }`                      |
| GET    | `/api/daily`                    | Deterministic "deck of the day" (seed = today's UTC date)    |
| GET    | `/api/units/search?q=...`       | Free-text unit search (category/tag synonyms, name fallback) |
| POST   | `/api/counter`                  | Counter an opponent's actual deck: `{ "opponentCode": "..." }` |
| GET    | `/api/counter/division/:query`  | Counter a division's *structural* profile (its category limits), eg `/api/counter/division/79gtd` |

**Randomize request** (body or query params):

```jsonc
{
  "chaos": 30,             // 0-100, 0 = pure Meta, 100 = pure Fun (default 100)
  "theme": "heavy_armor",  // optional: helicopter_rush | napalm_spam | heavy_armor | recon_sniper
  "divisionId": "us-3ad",  // a division id, or "random" / omitted
  "coalition": "NATO",     // optional filter when randomizing: "NATO" | "PACT"
  "dlc": "NORTHAG",        // optional filter when randomizing: a DLC/pack name
  "nation": "USA",         // optional filter when randomizing
  "seed": "abc123"         // optional - same seed + chaos + theme => same deck
}
```

> `mode: "fun" | "meta"` still works for backward compatibility - it's mapped to
> `chaos: 100` / `chaos: 0` respectively - but `chaos` is the real parameter now.

Example:

```bash
curl "http://localhost:4000/api/randomize?divisionId=sov-79gtd&chaos=20&seed=demo"
```

**Response shape (trimmed):**

```jsonc
{
  "seed": "demo",
  "mode": "meta",          // bucketed from chaos (chaos >= 50 -> "fun") - kept for
                            // styling/back-compat; `chaos` is the source of truth
  "chaos": 20,
  "theme": "Steel Rain",
  "division": { "id": "sov-79gtd", "name": "79-ya Gv. Tank. Div.",
                "nation": "Soviet Union", "coalition": "PACT", "type": "Armored",
                "power": 9, "activationPoints": 50, "categoryLimits": { "TNK": 10, "...": 0 } },
  "deck": { "TNK": [ { "name": "T-80U", "cost": 230, "apCost": 1, "meta": 9, "...": 0 } ],
            "AA": [ ... ], "...": [] },
  "summary": { "cards": 30, "apSpent": 49, "apTotal": 50, "totalPoints": 4100,
               "categories": { "TNK": 6, "...": 0 } },
  "difficulty": { "stars": 4, "score": 58, "label": "Demanding",
                   "breakdown": { "avgCost": 121.3, "avgMeta": 6.8, "categorySpread": 7,
                                  "precisionTagShare": 0.22 } },
  "counterOf": { "opponentDivision": "...", "opponentCategoryCounts": { "...": 0 },
                  "notes": [ "..." ] }  // only present on /api/counter responses
}
```

---

## How the randomizer works

- Each **division** has an **activation-point budget** (50 max, per division `type` via
  `AP_BY_TYPE`), a **per-category card limit**, and a **power** rating (1-10, a
  competitive/win-rate proxy).
- Adding the Nth card to a category costs progressively more activation points
  (slot-cost curve in `availability.ts`), just like the real deck builder gates how many
  cards you can field.
- Every unit carries a **`meta`** score and a **`fun`** score (1-10) plus tags.
- The **chaos slider** (`chaos: 0-100`) blends two tuned weight functions rather than
  picking one side: `weight = funWeight * ratio + metaWeight * (1 - ratio)`, where each
  side already has its own exponent shaping and tag bonuses (`atgm`/`heavy`/`spaag` favor
  Meta; `napalm`/`cluster`/`spam`/`rockets` favor Fun). At `chaos=0` and `chaos=100` this
  reproduces the old binary fun/meta output exactly; everything in between is a genuine
  smooth gradient, not a jump.
  - Category **target counts** and the **repeat-unit cap** (2 at pure Meta, 4 at pure
    Fun) blend the same way. **Queue order** (which category gets first claim on the AP
    budget) stays a threshold switch at `chaos=50` rather than a smooth blend - see the
    comment in `randomizer.ts` if tightening that further.
  - When rolling a *random* battlegroup, division choice is weighted by `power` at the
    Meta end and uniformly at the Fun end (the same linear blend, so it converges exactly
    at both extremes too).
- A **theme** (`helicopter_rush`, `napalm_spam`, `heavy_armor`, `recon_sniper`) maxes out
  its target categories against the division's real limits and jumps them to the front
  of the AP-budget queue regardless of where the chaos slider sits, plus gives a weight
  bonus to its associated tags everywhere else in the deck (eg Napalm Spam can still
  surface a napalm-tagged helicopter even though HEL isn't itself maxed).
- A **seeded RNG** (mulberry32) makes any roll reproducible. The UI's "Copy share link"
  encodes `seed`, `chaos`, `divisionId`, and `coalition` in the URL.
- A **deck code** (base64url, v2) carries the actual cards plus `chaos` and `theme`, not
  just a seed - paste it into the "Import a deck code" box (or share `?code=...`) to
  re-load the exact same deck, including its slider position, even if the dataset later
  changes. v1 codes (pre-chaos-slider) still decode fine - `chaos` is back-derived from
  the old binary `mode` field.
- **Difficulty rating** (`difficulty.ts`) is computed from the *actual rolled cards*, not
  the division's static profile - so difficulty varies per roll, calibrated with
  percentile breakpoints from ~670 real rolls rather than a naive linear map (which left
  almost everything bunched at 3 stars).
- **Counter deck generation** (`counter.ts`) checks an opponent's category counts against
  five doctrine thresholds (armor, air, helicopters, artillery, infantry - deliberately
  no entry for recon or logistics, since neither has a real category-level counter) and
  merges every triggered doctrine into one combined theme.

---

## Known limitations & data caveats

Being upfront about what doesn't work yet or has a known gap, rather than letting it
surface as a surprise:

- **Native in-game deck-code export is not possible right now.** WARNO has a real,
  reverse-engineered deck-code format (`@izohek/warno-deck-utils`, MIT), and the codec
  itself works - but the only public numeric-ID mapping found (`izohek/warno-db`) is
  badly stale (division ids topping out around 208 vs. real codes using ids like 429),
  and the game's own `.ndf` data files are packed in opaque bundles under `Data/PC/`, not
  loose text. The `E` export shortcut and the Dossier's "Export build list" instead
  produce a human-readable `.txt` build list, explicitly labeled as not a native import
  file. This would need a current ID mapping (eg extracted via the WARNO modding
  Discord, if a community unpacker exists) to become real.
- **Cuba (`cub-1td`) is selectable by the random-division roll** despite the DLC that adds
  it ("Tropical Storm") not being released yet, and its unit data being a 3-unit
  placeholder. Found via testing the Discord bot's `/randomdeck`, not fixed yet -
  probably wants excluding from the random pool until it has real data, the same
  treatment Netherlands/Denmark/Spain went through.
- **One unit is very likely miscategorized**: `F-16C` (USA, wiki-scraped) is tagged
  category `AA` with a `sam` tag - almost certainly should be `AIR`. Pre-existing in the
  wiki-scraped data, not introduced by any manual transcription.
- **The `sead` tag is referenced in the Meta-favor weighting list but assigned to zero
  units** in the current dataset - dead weighting logic, not incorrect, just unused.
- **Donor-pool blending** (`availability.ts`) still routes Netherlands/Denmark/Spain
  through a same-coalition donor nation even though all three now have full rosters of
  their own (95/85/110 units) - worth revisiting whether the blend is still wanted now
  that they're not thin stubs.
- **Discord bot**: the data layer and embed-building are verified against the real,
  running API. The live Discord gateway connection and slash-command registration are
  not - `discord.com` isn't reachable from the environment this was built in. See
  `discord-bot/README.md`'s "What's actually verified vs what isn't" section before
  treating it as production-ready.

---

## Security

- **HTTP security headers** via [`helmet`](https://helmetjs.github.io/) on the API, plus a
  matching Content-Security-Policy for the static site in `vercel.json` (allows only self +
  Google Fonts).
- **Rate limiting** - `/api` is capped at 120 requests/minute/IP (`express-rate-limit`),
  with `trust proxy` set so client IPs are correct behind Vercel.
- **Request body limit** of `64kb` on JSON.
- **No secrets in the repo** - `.env*` is git-ignored and the app needs no API keys (the
  Discord bot does need one, kept in its own `.env`, never committed).
- See [`SECURITY.md`](SECURITY.md) for the disclosure policy.

After the first push, turn on the free extras in **repo Settings → Code security**:
Dependabot alerts + security updates, and secret scanning.

---

## Repository setup

The repo is already initialized. To wire up discoverability and protection:

```bash
# add the new security/CI/meta files
git add .
git commit -m "Add security headers, rate limiting, CI, license, SEO FAQ"
git push

# discoverability: description + topics
gh repo edit Hung1510/Warno-Deck-Randomizer \
  --description "Roll a random WARNO battlegroup and build a fun or meta deck - 56 battlegroups, 14 nations." \
  --homepage "https://warno-deck-randomizer.vercel.app" \
  --add-topic warno --add-topic deck-builder --add-topic randomizer \
  --add-topic eugen-systems --add-topic wargame --add-topic rts \
  --add-topic react --add-topic typescript --add-topic vite --add-topic express \
  --add-topic nato --add-topic warsaw-pact --add-topic discord-bot
```

Branch protection on `main` (requires the CI check to pass before merge):

```bash
gh api -X PUT repos/Hung1510/Warno-Deck-Randomizer/branches/main/protection \
  -H "Accept: application/vnd.github+json" \
  -f "required_status_checks[strict]=true" \
  -f "required_status_checks[contexts][]=Typecheck & build" \
  -f "enforce_admins=false" \
  -f "required_pull_request_reviews[required_approving_review_count]=1" \
  -f "restrictions=" 2>/dev/null || echo "Or set it via Settings → Branches → Add rule."
```

> `gh` is the [GitHub CLI](https://cli.github.com/). If you'd rather click: add topics on
> the repo's main page (gear icon next to **About**), and add a branch rule under
> **Settings → Branches**.

---

## Extending the data

Add a **battlegroup** in `backend/src/data/divisions.ts`. `mk()` takes
`(id, name, nation, coalition, type, dlc, power, limits, blurb)`, where `limits` uses
`lim(LOG, INF, ART, TNK, REC, AA, HEL, AIR)` (the wiki's column order):

```ts
mk('us-3id', '3rd Infantry Division (Mech.)', 'USA', 'NATO', 'Mechanized', 'NORTHAG', 7,
   lim(6, 10, 6, 8, 6, 6, 5, 7), 'Your blurb here.'),
```

(Activation-point budget still comes from the division `type` via `AP_BY_TYPE`, capped at
the real in-game max of 50 AP. For a new nation, add a donor mapping in
`availability.ts` so its decks fill out until it has real data of its own.)

Add **units** in `backend/src/data/units.ts` under the matching nation, as
`[name, category, cost, meta, fun, tags]`:

```js
['M2 Bradley', 'INF', 55, 8, 5, ['ifv', 'atgm']],
```

Any division of that nation automatically gains access (subject to the airborne
heavy-tank filter in `availability.ts`). No database, no migrations.

**Swap in real exported data:** drop a `backend/src/data/custom-units.json` file and it's
merged automatically at startup (matching `id`s override the samples, new ones are added).
Shape:

```json
[
  { "name": "M1A2 Abrams", "nation": "USA", "cat": "TNK",
    "cost": 250, "meta": 10, "fun": 6, "tags": ["heavy"] }
]
```

This lets you replace the curated sample roster with a real exported WARNO unit table
without touching any code.

### Manually transcribing a nation from in-game screenshots

For nations the Fandom wiki doesn't cover well, the pattern used for Denmark,
Netherlands, and Spain: screenshot every category tab (LOG/INF/ART/TNK/REC/AA/HEL/AIR)
in the in-game unit browser with each tab's "Units: N" counter visible, transcribe
name/category/cost per unit (cross-checking the total against that counter), then write
a `scripts/gen-<nation>.mjs` generator that outputs the nation's `RAW` block and splices
it into `units.ts`. See `scripts/gen-denmark.mjs` for the reference shape (`ratings()`/
`tagsFor()` heuristics, duplicate-name handling for units that share a display name
across a leader/regular variant, etc.). Verify with a typecheck, a duplicate-ID scan
across the whole `UNITS` array, and a real `generateDeck()` call for one of that
nation's divisions before considering it done.

### Importing a real WaRYes / WARNO unit export

The live [waryes.com/units](https://waryes.com/units) table is rendered client-side and
the underlying data belongs to Eugen Systems (extracted from the game's `.ndf` files), so
it isn't something to screen-scrape wholesale. Instead, export/obtain a unit list as JSON
and convert it with the included script:

```bash
# place your export at scripts/waryes-units.json, then:
npm run import:units
# or: node scripts/import-units.mjs <input.json> <output.json>
```

It reads an array of unit objects (or `{ "units": [...] }`), maps nation codes
(`US`→`USA`, `RFA`→`West Germany`, `SOV`→`Soviet Union`, `POL`→`Poland`, …) and factory
names (`Tank`/`Char`→`TNK`, `Reco`→`REC`, `Support`→`ART`, `Defense`→`AA`, …) to the app's
schema, derives placeholder `meta`/`fun` ratings from cost, de-duplicates variants, and
writes `backend/src/data/custom-units.json`. See `scripts/example-waryes-units.json` for
the expected input shape, and adjust `FIELDS` / `NATION_MAP` / `CATEGORY_MAP` at the top of
the script if your export uses different keys.

### Scraping the WARNO Fandom wiki (licensed & scriptable)

The [WARNO Fandom wiki](https://warno.fandom.com/) is server-rendered MediaWiki with a
public API, and its content is **CC-BY-SA** - so it can be reused *with attribution*. The
included scraper pulls every unit page and writes `custom-units.json` directly:

```bash
node scripts/scrape-fandom.mjs --selftest   # verify the parser (no network)
node scripts/scrape-fandom.mjs --limit 25   # quick test: first 25 units
npm run scrape:fandom                        # full run (~hundreds of unit pages)
```

It enumerates `Category:Warno units` via the API, then reads each page's nation, type
(LOG/REC/INF/ART/TNK/AA/HEL/AIR) and deploy cost, mapping them to the app schema. It runs
one polite request at a time with a small delay and a descriptive `User-Agent`. Set your
own contact string in the `UA` constant before a big run. This has real, usable coverage
for USA, UK, Canada, Belgium, Soviet Union, and Luxembourg - other nations need the
manual screenshot-transcription path above.

> Two honesty notes: the wiki has on the order of a few hundred unit *pages* (one per unit,
> not the ~2,849 veterancy/transport variants waryes counts), and the underlying game values
> originate from Eugen Systems - keep the CC-BY-SA attribution if you publish the result.

> Imported units only appear in decks for nations that have divisions in the app, and the
> derived `meta`/`fun` scores are rough - tune them (or the heuristics in the script) to
> taste.

---

## Notes

- No personal data, accounts, or external calls from the web app - everything runs
  locally. The Discord bot is the one piece that talks to an external service
  (Discord's API), and only with credentials you provide yourself.
- Stats and balance here are hand-tuned for the randomizer, not pulled from game files.