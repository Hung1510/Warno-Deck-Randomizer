import 'dotenv/config';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import * as api from './api.js';
import { deckEmbed, counterEmbed, divisionEmbed, errorEmbed } from './embeds.js';

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('Missing DISCORD_TOKEN in the environment (see .env.example).');
  process.exit(1);
}

// Slash-command-only bot -- no message content, no member list, no presence
// tracking needed, so the Guilds intent alone is enough.
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (c) => {
  console.log(`Logged in as ${c.user.tag}. API base: ${process.env.API_BASE_URL || 'http://localhost:4000'}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    switch (interaction.commandName) {
      case 'randomdeck': {
        await interaction.deferReply();
        const divisionQuery = interaction.options.getString('division');
        const chaos = interaction.options.getInteger('chaos') ?? undefined;
        const theme = interaction.options.getString('theme') ?? undefined;

        let divisionId;
        if (divisionQuery) {
          const division = await api.findDivision(divisionQuery);
          divisionId = division.id;
        }
        const deck = await api.randomDeck({ divisionId, chaos, theme });
        await interaction.editReply({ embeds: [deckEmbed(deck)] });
        break;
      }

      case 'daily': {
        await interaction.deferReply();
        const deck = await api.dailyDeck();
        await interaction.editReply({ embeds: [deckEmbed(deck, { title: `Deck of the Day -- ${deck.date}` })] });
        break;
      }

      case 'division': {
        await interaction.deferReply();
        const query = interaction.options.getString('query', true);
        const division = await api.findDivision(query);
        await interaction.editReply({ embeds: [divisionEmbed(division)] });
        break;
      }

      case 'counter': {
        await interaction.deferReply();
        const target = interaction.options.getString('division', true);
        const myDivisionQuery = interaction.options.getString('mydivision');
        let divisionId;
        if (myDivisionQuery) {
          const mine = await api.findDivision(myDivisionQuery);
          divisionId = mine.id;
        }
        const deck = await api.counterDivision(target, { divisionId });
        await interaction.editReply({ embeds: [counterEmbed(deck)] });
        break;
      }

      default:
        await interaction.reply({ embeds: [errorEmbed(`Unknown command: ${interaction.commandName}`)], ephemeral: true });
    }
  } catch (err) {
    const embed = errorEmbed(err.message || 'Something went wrong.');
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
});

client.login(token);