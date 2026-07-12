import type { DifficultyRating } from '../types';

interface DifficultyStarsProps {
  difficulty: DifficultyRating;
}

// Renders eg ★★★★☆ with a tooltip explaining what drove the rating -- useful
// for newer players deciding whether a rolled deck is one they can pilot well.
export default function DifficultyStars({ difficulty }: DifficultyStarsProps) {
  const { stars, label, breakdown } = difficulty;
  const title =
    `${label} (${stars}/5) -- avg unit cost ${breakdown.avgCost}, ` +
    `avg meta ${breakdown.avgMeta}, ${breakdown.categorySpread} systems in play, ` +
    `${Math.round(breakdown.precisionTagShare * 100)}% precision-tagged units`;

  return (
    <span className="pill pill--difficulty" data-stars={stars} title={title}>
      {'★'.repeat(stars)}
      <span className="pill--difficulty__empty">{'★'.repeat(5 - stars)}</span>
      <span className="pill--difficulty__label">{label}</span>
    </span>
  );
}