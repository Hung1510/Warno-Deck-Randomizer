import { EmbedBuilder } from 'discord.js';

const NATO_COLOR = 0x5b9bdb;
const PACT_COLOR = 0xe2483d;
const CATEGORY_ORDER = ['LOG', 'REC', 'INF', 'ART', 'TNK', 'AA', 'HEL', 'AIR'];

function categoryField(deck) {
  const lines = CATEGORY_ORDER
    .map((cat) => `${cat} ${deck.summary.categories[cat] || 0}`)
    .join(' · ');
  return lines;
}

export function deckEmbed(deck, { title } = {}) {
  const color = deck.division.coalition === 'NATO' ? NATO_COLOR : PACT_COLOR;
  const chaosLabel = deck.chaos === 50 ? 'Balanced' : deck.chaos > 50 ? `${deck.chaos}% Fun` : `${100 - deck.chaos}% Meta`;
  const stars = deck.difficulty ? '★'.repeat(deck.difficulty.stars) + '☆'.repeat(5 - deck.difficulty.stars) : null;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title || deck.division.name)
    .setDescription(`_"${deck.theme}"_ -- ${deck.division.nation} · ${deck.division.type}`)
    .addFields(
      { name: 'Mix', value: chaosLabel, inline: true },
      { name: 'Activation', value: `${deck.summary.apSpent}/${deck.summary.apTotal} AP`, inline: true },
      { name: 'Cards', value: `${deck.summary.cards} (${deck.summary.totalPoints} pts)`, inline: true },
      { name: 'Categories', value: categoryField(deck) },
    );

  if (stars) embed.addFields({ name: 'Difficulty', value: `${stars} (${deck.difficulty.label})`, inline: true });
  if (deck.seed) embed.addFields({ name: 'Seed', value: `\`${deck.seed}\``, inline: true });
  if (deck.code) embed.setFooter({ text: deck.code.length > 90 ? deck.code.slice(0, 87) + '...' : deck.code });

  return embed;
}

export function counterEmbed(deck) {
  const embed = deckEmbed(deck, { title: `Counter deck vs ${deck.counterOf.opponentDivision}` });
  if (deck.counterOf.notes.length) {
    embed.addFields({ name: 'Doctrine', value: deck.counterOf.notes.map((n) => `- ${n}`).join('\n').slice(0, 1024) });
  }
  return embed;
}

export function divisionEmbed(division) {
  const color = division.coalition === 'NATO' ? NATO_COLOR : PACT_COLOR;
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(division.name)
    .setDescription(division.blurb || '')
    .addFields(
      { name: 'Nation', value: division.nation, inline: true },
      { name: 'Type', value: division.type, inline: true },
      { name: 'Pack', value: division.dlc || 'Vanilla', inline: true },
      { name: 'Activation Points', value: String(division.activationPoints), inline: true },
      { name: 'Meta rating', value: `${division.power}/10`, inline: true },
      {
        name: 'Category limits',
        value: CATEGORY_ORDER.map((c) => `${c} ${division.categoryLimits[c]}`).join(' · '),
      },
    );
}

export function errorEmbed(message) {
  return new EmbedBuilder().setColor(0xe2483d).setDescription(`⚠ ${message}`);
}