import { useState } from 'react';
import type { CategoryCode, Unit } from '../types';

const CATEGORY_ORDER: CategoryCode[] = ['LOG', 'REC', 'INF', 'ART', 'TNK', 'AA', 'HEL', 'AIR'];

interface DivisionTreeProps {
  divisionName: string;
  units: Unit[];
}

// Renders a `tree`-style ASCII hierarchy (Division -> Category -> Unit). Only
// two real levels of depth -- units are leaves, not further sub-branched --
// because that's the actual shape of the data; a fake third level would just
// be decoration. Categories start collapsed so a 35-unit pool (eg Netherlands
// INF) doesn't dump every name on the page at once.
export default function DivisionTree({ divisionName, units }: DivisionTreeProps) {
  const [expanded, setExpanded] = useState<Set<CategoryCode>>(new Set());

  const groups = CATEGORY_ORDER
    .map((cat) => ({
      cat,
      units: units.filter((u) => u.cat === cat).sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name)),
    }))
    .filter((g) => g.units.length > 0);

  const toggle = (cat: CategoryCode) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  return (
    <div className="div-tree" role="tree" aria-label={`${divisionName} unit pool by category`}>
      <div className="div-tree__row div-tree__row--root">{divisionName}</div>
      {groups.map((group, i) => {
        const isLastCat = i === groups.length - 1;
        const isOpen = expanded.has(group.cat);
        return (
          <div key={group.cat}>
            <button
              type="button"
              className="div-tree__row div-tree__branch"
              onClick={() => toggle(group.cat)}
              aria-expanded={isOpen}
            >
              <span className="div-tree__connector">{isLastCat ? '└─' : '├─'}</span>
              <span className="div-tree__toggle">{isOpen ? '▾' : '▸'}</span>
              <span className="div-tree__cat">{group.cat}</span>
              <span className="div-tree__count">({group.units.length})</span>
            </button>
            {isOpen && group.units.map((u, j) => {
              const isLastUnit = j === group.units.length - 1;
              return (
                <div key={u.id} className="div-tree__row div-tree__leaf">
                  <span className="div-tree__connector">
                    {isLastCat ? '  ' : '│ '}{isLastUnit ? '└─' : '├─'}
                  </span>
                  <span className="div-tree__unit-name">{u.name}</span>
                  <span className="div-tree__unit-cost">{u.cost} pts</span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}