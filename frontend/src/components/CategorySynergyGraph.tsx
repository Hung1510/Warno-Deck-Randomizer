import { useState } from 'react';
import { SYNERGY_EDGES, CATEGORY_FLAVOR } from '../data/synergy';
import type { CategoryCode, CategoryLimits } from '../types';

const NODES: CategoryCode[] = ['LOG', 'REC', 'INF', 'ART', 'TNK', 'AA', 'HEL', 'AIR'];
const SIZE = 340;
const CENTER = SIZE / 2;
const RADIUS = 130;

function point(index: number): [number, number] {
  const angle = (Math.PI * 2 * index) / NODES.length - Math.PI / 2;
  return [CENTER + RADIUS * Math.cos(angle), CENTER + RADIUS * Math.sin(angle)];
}

const NODE_POS: Record<CategoryCode, [number, number]> = Object.fromEntries(
  NODES.map((cat, i) => [cat, point(i)]),
) as Record<CategoryCode, [number, number]>;

interface CategorySynergyGraphProps {
  /** When provided, categories the division doesn't field (limit 0) render dimmed. */
  categoryLimits?: CategoryLimits;
}

// Circular layout, same node-placement math as DivisionRadar, so the two
// visuals read as part of the same system rather than two different styles.
export default function CategorySynergyGraph({ categoryLimits }: CategorySynergyGraphProps) {
  const [selected, setSelected] = useState<CategoryCode | null>(null);

  const hasCategory = (cat: CategoryCode) => !categoryLimits || categoryLimits[cat] > 0;
  const edgesFor = (cat: CategoryCode) => SYNERGY_EDGES.filter((e) => e.a === cat || e.b === cat);
  const isEdgeActive = (a: CategoryCode, b: CategoryCode) =>
    selected === null || selected === a || selected === b;

  return (
    <div className="synergy">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="synergy__svg"
        role="img"
        aria-label="Combined-arms category synergy graph"
      >
        {SYNERGY_EDGES.map((edge) => {
          const [x1, y1] = NODE_POS[edge.a];
          const [x2, y2] = NODE_POS[edge.b];
          const active = isEdgeActive(edge.a, edge.b);
          const dimmed = !hasCategory(edge.a) || !hasCategory(edge.b);
          return (
            <line
              key={`${edge.a}-${edge.b}`}
              x1={x1} y1={y1} x2={x2} y2={y2}
              className="synergy__edge"
              strokeWidth={edge.weight * 1.2}
              opacity={dimmed ? 0.12 : active ? 0.85 : 0.15}
            >
              <title>{`${edge.a} <-> ${edge.b}: ${edge.doctrine}`}</title>
            </line>
          );
        })}
        {NODES.map((cat) => {
          const [x, y] = NODE_POS[cat];
          const dimmed = !hasCategory(cat);
          const isSelected = selected === cat;
          return (
            <g
              key={cat}
              className="synergy__node"
              data-dimmed={dimmed || undefined}
              data-selected={isSelected || undefined}
              onClick={() => setSelected(isSelected ? null : cat)}
              tabIndex={0}
              role="button"
              aria-pressed={isSelected}
              aria-label={`${cat}: ${CATEGORY_FLAVOR[cat]}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(isSelected ? null : cat); }
              }}
            >
              <circle cx={x} cy={y} r={22} />
              <text x={x} y={y} textAnchor="middle" dominantBaseline="middle">{cat}</text>
              <title>{`${cat}: ${CATEGORY_FLAVOR[cat]}`}</title>
            </g>
          );
        })}
      </svg>

      <div className="synergy__readout">
        {selected ? (
          <>
            <p className="synergy__readout-head">
              <span className="synergy__readout-cat">{selected}</span> — {CATEGORY_FLAVOR[selected]}
            </p>
            <ul className="synergy__readout-list">
              {edgesFor(selected).map((e) => {
                const other = e.a === selected ? e.b : e.a;
                return <li key={other}><strong>{other}</strong> — {e.doctrine}</li>;
              })}
            </ul>
          </>
        ) : (
          <p className="synergy__readout-hint">Select a category to see its combined-arms doctrine links.</p>
        )}
      </div>
    </div>
  );
}