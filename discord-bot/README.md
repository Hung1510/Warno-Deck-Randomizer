# WARNO Deck Randomizer -- Discord Bot

Slash commands: `/randomdeck`, `/daily`, `/division`, `/counter`.

## What's actually verified vs what isn't

Being direct about this rather than letting it surface later:

- **Verified**: every command's data logic (`src/api.js`) was tested against
  the real, running backend -- `randomDeck`, `dailyDeck`, `findDivision`, and
  `counterDivision` all confirmed working with real HTTP calls. Embed building
  (`src/embeds.js`) was verified by constructing real `EmbedBuilder` objects
  from real API responses and inspecting the resulting JSON -- that works
  without a live Discord connection. All five source files pass `node --check`
  and load correctly under Node.
- **Not verified**: the actual Discord gateway connection, slash-command
  registration against Discord's live API, and interaction handling in a real
  server. `discord.com` isn't reachable from the sandbox this was built in,
  and there's no real bot token to test with. The code is written correctly
  against discord.js v14's documented API, but "correctly written" and
  "confirmed working live" are different claims -- this is the second one
  admittedly not fully checked. Budget a first real test run before assuming
  it's production-ready.

## Setup

1. **Create the Discord application**: discord.com/developers/applications -> New Application.
2. **Bot tab**: Reset Token, copy it into `.env` as `DISCORD_TOKEN`. Under
   Privileged Gateway Intents, none of the three toggles need to be on -- this
   bot only uses slash commands, no message content or member data.
3. **General Information tab**: copy the Application ID into `.env` as
   `DISCORD_CLIENT_ID`.
4. **Invite the bot** to a server: OAuth2 -> URL Generator -> scopes `bot` and
   `applications.commands`, no special permissions needed beyond sending
   messages/embeds in the channels it's added to. Open the generated URL and
   pick a server.
5. `cp .env.example .env` and fill in the values. Set `API_BASE_URL` to
   wherever the backend is actually deployed (or leave it at
   `http://localhost:4000` if you're just testing against a local `npm run
   dev` in `backend/`).
6. `npm install`
7. Register the commands: `npm run register` (add `DISCORD_GUILD_ID` in
   `.env` first if you want them to show up instantly in one server for
   testing -- global registration can take up to an hour).
8. `npm start` (or `npm run dev` for auto-restart on file changes).

## Commands

- `/randomdeck [division] [chaos] [theme]` -- rolls a deck. `division` is a
  free-text lookup (eg "11e" or "79gtd"), `chaos` is 0-100 (0=Meta, 100=Fun),
  `theme` is one of the four presets.
- `/daily` -- the deck of the day. Same division and cards for every server
  using this bot, resets at 00:00 UTC (it's just `generateDeck({ seed:
  today's date, chaos: 50 })` under the hood, so it's naturally reproducible,
  not a separately-stored value).
- `/division <query>` -- stats and category limits for a division.
- `/counter <division> [mydivision]` -- generates a deck built to counter the
  named division's *structural* composition (its category limits), not a
  specific rolled deck. See the doctrine notes in `backend/src/logic/counter.ts`
  for which category thresholds trigger which counters.

## Known gap surfaced while building this

Random rolls (both here and on the web app) can currently select
`1a Division de Tanques` (Cuba), a division tagged for the unreleased
"Tropical Storm" DLC with placeholder-only unit data ("Wiki stats TBD" per
its own blurb in `divisions.ts`). Not something this bot's code caused --
found while testing `/randomdeck` for real -- but worth excluding from the
random pool until Cuba actually ships and gets real unit data, the same
treatment the other nations went through.

## Hosting note

This is a long-running gateway bot (`client.login()` keeps a persistent
WebSocket open to Discord), not a serverless function -- it needs a host that
keeps a Node process alive continuously (a small VPS, Railway, Fly.io,
Render, etc.), not Vercel's serverless functions which the web app itself
might be using.