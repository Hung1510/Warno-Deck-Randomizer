import UnitCard from './UnitCard';
import type { DeckUnit, Mode } from '../types';

interface CategoryColumnProps {
  code: string;
  label: string;
  units: DeckUnit[];
  limit: number;
  mode: Mode;
}

export default function CategoryColumn({ code, label, units, limit, mode }: CategoryColumnProps) {
  const empty = units.length === 0;
  return (
    <section className={`cat ${empty ? 'cat--empty' : ''}`}>
      <header className="cat__head">
        <span className="cat__code">{code}</span>
        <span className="cat__label">{label}</span>
        <span className="cat__count">{units.length}<span className="cat__limit">/{limit}</span></span>
      </header>
      <div className="cat__body">
        {empty ? (
          <p className="cat__none">— no cards —</p>
        ) : (
          units.map((u, i) => <UnitCard key={`${u.id}-${i}`} unit={u} mode={mode} />)
        )}
      </div>
    </section>
  );
}
