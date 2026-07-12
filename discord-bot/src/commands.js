import { SlashCommandBuilder } from 'discord.js';

export const commands = [
  new SlashCommandBuilder()
    .setName('randomdeck')
    .setDescription('Roll a random WARNO battlegroup deck')
    .addStringOption((opt) =>
      opt.setName('division').setDescription('Division name or id (leave blank for random)'))
    .addIntegerOption((opt) =>
      opt.setName('chaos').setDescription('0 = pure Meta, 100 = pure Fun (default 100)').setMinValue(0).setMaxValue(100))
    .addStringOption((opt) =>
      opt.setName('theme').setDescription('Force a theme').addChoices(
        { name: 'Helicopter Rush', value: 'helicopter_rush' },
        { name: 'Napalm Spam', value: 'napalm_spam' },
        { name: 'Heavy Armor', value: 'heavy_armor' },
        { name: 'Recon Sniper', value: 'recon_sniper' },
      )),

  new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Today\'s deck of the day -- same roll for everyone, resets at 00:00 UTC'),

  new SlashCommandBuilder()
    .setName('division')
    .setDescription('Look up a division\'s stats and category limits')
    .addStringOption((opt) =>
      opt.setName('query').setDescription('Division name or id, eg "11e" or "79gtd"').setRequired(true)),

  new SlashCommandBuilder()
    .setName('counter')
    .setDescription('Generate a deck that counters a division\'s typical composition')
    .addStringOption((opt) =>
      opt.setName('division').setDescription('Division to counter, eg "79gtd"').setRequired(true))
    .addStringOption((opt) =>
      opt.setName('mydivision').setDescription('Your own division (leave blank for random)')),
].map((c) => c.toJSON());