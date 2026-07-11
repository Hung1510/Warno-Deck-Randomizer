# WARNO ORBAT Randomizer

[![CI](https://github.com/Hung1510/Warno-Deck-Randomizer/actions/workflows/ci.yml/badge.svg)](https://github.com/Hung1510/Warno-Deck-Randomizer/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-e0b04a.svg)](LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6.svg)
![Made with React](https://img.shields.io/badge/React-18-4f86c6.svg)

A full-stack web app for **WARNO** that rolls a random **battlegroup (division)** and
fills it with a randomized deck. Pick the vibe:

- **Fun mix** - wide, chaotic spread biased toward napalm, rockets, spam and gimmick
  units. Tank division with zero tanks and a helicopter circus? Absolutely.
- **Meta mix** - secures recon, tanks and AA first, then stacks the strongest cards
  within the division's activation-point budget.

Inspired by community deck builders like WaRYes. Every roll has a **seed**, so a deck
can be shared and reproduced via a link. Each deck also gets a portable **deck code**
you can copy and paste back in to re-load the exact same list, and **Meta mix** rolls
are weighted by each division's **competitive rating** (a win-rate proxy), so stronger
battlegroups come up more often.

> Fan-made / unofficial. WARNO © Eugen Systems. Division names, types and per-category
> limits are taken from the [WARNO wiki](https://warno.fandom.com/wiki/Divisions);
> unit rosters and meta/fun/power ratings are a curated, representative sample, not the
> full game database.

## Divisions & DLC packs

56 battlegroups across 14 nations, grouped by pack and filterable in the UI:

- **Vanilla** (18), **NORTHAG** (10), **SOUTHAG** (10), **LANDJUT** (8),
  **Tropical Storm** (2), **Nemesis #1–#4** (2 each).
- Nations: USA, West Germany, UK, France, Soviet Union, East Germany, plus Belgium,
  Netherlands, Poland, Canada, Spain, Czechoslovakia, Denmark and Cuba.
- Each division uses its **real per-category card limits** from the wiki.
- Minor nations have a small signature unit pool and also draw on a same-coalition
  **donor pool** (NATO minors → West German gear, Pact minors → Soviet gear) so their
  decks fill out plausibly. This is configurable in `backend/src/logic/availability.ts`.
- A couple of entries had blank/TBD stats on the wiki (Tropical Storm's two divisions,
  and one Nemesis #4 row whose columns were truncated) - those limits are estimated and
  flagged in their blurbs. Nemesis #5–#8 are announced but not yet populated on the wiki,
  so they're omitted for now.

---

## Stack

| Layer    | Tech                                              |
|----------|---------------------------------------------------|
| Backend  | Node.js + Express, **TypeScript** (ESM, run via `tsx`) |
| Frontend | React 18 + Vite, **TypeScript**                    |
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
│       │   ├── divisions.ts      # battlegroups + category limits per type
│       │   └── units.ts          # unit pool (per nation, with meta/fun scores)
│       └── logic/
│           ├── availability.ts   # which units a division can field + slot costs
│           ├── randomizer.ts     # seeded fun/meta deck generation
│           └── deckcode.ts       # portable deck-code encode/decode
├── frontend/
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts
│   ├── public/                   # robots.txt, sitemap.xml, og-image.png (SEO)
│   └── src/
│       ├── App.tsx               # state, data loading, share/import
│       ├── api.ts                # typed API client
│       ├── types.ts              # API/domain types
│       ├── styles.css            # Cold War command-terminal theme
│       └── components/           # Controls, Dossier, CategoryColumn, UnitCard (.tsx)
├── api/
│   └── index.ts                  # Vercel serverless entry (re-exports the Express app)
├── scripts/
│   ├── import-units.mjs          # convert a WaRYes/WARNO JSON export -> custom-units.json
│   └── scrape-fandom.mjs         # scrape the CC-BY-SA Fandom wiki -> custom-units.json
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

| Method | Endpoint              | Description                                              |
|--------|-----------------------|---------------------------------------------------------|
| GET    | `/api/health`         | Service status                                          |
| GET    | `/api/meta`           | Categories, labels, nations, coalitions, dlcs (for filters)   |
| GET    | `/api/divisions`      | All battlegroups                                        |
| GET    | `/api/divisions/:id`  | One battlegroup + its fieldable unit pool               |
| POST   | `/api/randomize`      | Generate a deck (body below)                            |
| GET    | `/api/randomize`      | Same, via query params (handy for sharing)              |
| GET    | `/api/decode`         | Expand a deck code: `?code=...`                         |
| POST   | `/api/decode`         | Expand a deck code: `{ "code": "..." }`                 |

**Randomize request** (body or query params):

```jsonc
{
  "mode": "fun",          // "fun" | "meta"  (default "fun")
  "divisionId": "us-3ad", // a division id, or "random" / omitted
  "coalition": "NATO",    // optional filter when randomizing: "NATO" | "PACT"
  "dlc": "NORTHAG",       // optional filter when randomizing: a DLC/pack name
  "nation": "USA",        // optional filter when randomizing
  "seed": "abc123"        // optional - same seed + mode => same deck
}
```

Example:

```bash
curl "http://localhost:4000/api/randomize?mode=meta&divisionId=sov-79gtd&seed=demo"
```

**Response shape (trimmed):**

```jsonc
{
  "seed": "demo",
  "mode": "meta",
  "theme": "Iron Wall",
  "division": { "id": "sov-79gtd", "name": "79th Guards Tank Division",
                "nation": "Soviet Union", "coalition": "PACT", "type": "Armored",
                "activationPoints": 65, "categoryLimits": { "TNK": 10, "...": 0 } },
  "deck": { "TNK": [ { "name": "T-80U", "cost": 230, "apCost": 1, "meta": 9, "...": 0 } ],
            "AA": [ ... ], "...": [] },
  "summary": { "cards": 30, "apSpent": 49, "apTotal": 65, "totalPoints": 4100,
               "categories": { "TNK": 6, "...": 0 } }
}
```

---

## How the randomizer works

- Each **division** has an **activation-point budget**, a **per-category card limit**,
  and a **power** rating (1–10, a competitive/win-rate proxy).
- Adding the Nth card to a category costs progressively more activation points
  (slot-cost curve in `availability.ts`), just like the real deck builder gates how many
  cards you can field.
- Every unit carries a **`meta`** score and a **`fun`** score (1–10) plus tags.
  - **Meta mix** weights selection by `meta` (sharpened), favours tags like `atgm`,
    `heavy`, `spaag`, fills recon/tanks/AA toward their limits first, and - when rolling a
    *random* battlegroup - weights division choice by `power` so stronger divisions appear
    more often.
  - **Fun mix** weights by `fun`, favours `napalm`/`cluster`/`spam`/`rockets`, spreads
    cards across categories at random counts, and picks divisions uniformly.
- A **seeded RNG** (mulberry32) makes any roll reproducible. The UI's "Copy share link"
  encodes `seed`, `mode`, `divisionId`, and `coalition` in the URL.
- A **deck code** (base64url) carries the actual cards, not just a seed - paste it into
  the "Import a deck code" box (or share `?code=...`) to re-load the exact same deck even
  if the dataset later changes.

---

## Security

- **HTTP security headers** via [`helmet`](https://helmetjs.github.io/) on the API, plus a
  matching Content-Security-Policy for the static site in `vercel.json` (allows only self +
  Google Fonts).
- **Rate limiting** - `/api` is capped at 120 requests/minute/IP (`express-rate-limit`),
  with `trust proxy` set so client IPs are correct behind Vercel.
- **Request body limit** of `64kb` on JSON.
- **No secrets in the repo** - `.env*` is git-ignored and the app needs no API keys.
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
  --add-topic nato --add-topic warsaw-pact
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

(Activation-point budget still comes from the division `type` via `AP_BY_TYPE`. For a new
nation, add a donor mapping in `availability.ts` so its decks fill out.)

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
own contact string in the `UA` constant before a big run.

> Two honesty notes: the wiki has on the order of a few hundred unit *pages* (one per unit,
> not the ~2,849 veterancy/transport variants waryes counts), and the underlying game values
> originate from Eugen Systems - keep the CC-BY-SA attribution if you publish the result.

> Imported units only appear in decks for nations that have divisions in the app, and the
> derived `meta`/`fun` scores are rough - tune them (or the heuristics in the script) to
> taste.

---

## Notes

- No personal data, accounts, or external calls - everything runs locally.
- Stats and balance here are hand-tuned for the randomizer, not pulled from game files.
