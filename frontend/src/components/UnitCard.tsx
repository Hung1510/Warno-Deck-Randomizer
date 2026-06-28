import type { DeckUnit, Mode } from '../types';

interface UnitCardProps {
  unit: DeckUnit;
  mode: Mode;
}

export default function UnitCard({ unit, mode }: UnitCardProps) {
  const score = mode === 'meta' ? unit.meta : unit.fun;
  return (
    <div className="unit">
      <div className="unit__top">
        <span className="unit__name">{unit.name}</span>
        <span className="unit__pts">{unit.cost}<span className="unit__pts-label">pts</span></span>
      </div>
      <div className="unit__meta">
        <span className="unit__ap" title="Activation points this card costs">AP {unit.apCost}</span>
        <span className="unit__score" title={mode === 'meta' ? 'Meta rating' : 'Fun rating'}>
          {mode === 'meta' ? 'M' : 'F'} {score}/10
        </span>
        {unit.tags.slice(0, 2).map((t) => (
          <span key={t} className="unit__tag">{t}</span>
        ))}
      </div>
    </div>
  );
}
