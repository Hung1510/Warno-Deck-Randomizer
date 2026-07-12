// Run this once after setting DISCORD_TOKEN/DISCORD_CLIENT_ID (and optionally
// DISCORD_GUILD_ID for instant guild-scoped registration during development --
// global commands can take up to an hour to propagate).
//   node src/register-commands.js
import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { commands } from './commands.js';

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId) {
  console.error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in the environment (see .env.example).');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

try {
  const route = guildId
    ? Routes.applicationGuildCommands(clientId, guildId)
    : Routes.applicationCommands(clientId);
  const result = await rest.put(route, { body: commands });
  console.log(`Registered ${result.length} command(s)${guildId ? ` to guild ${guildId}` : ' globally'}.`);
} catch (err) {
  console.error('Command registration failed:', err);
  process.exit(1);
}