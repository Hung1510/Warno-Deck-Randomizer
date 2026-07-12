import type { CategoryCode, DeckResponse } from '../types';

interface DeckStatsDashboardProps {
  deck: DeckResponse;
  categoryLabels: Partial<Record<CategoryCode, string>>;
}

const CATEGORY_ORDER: CategoryCode[] = ['LOG', 'REC', 'INF', 'ART', 'TNK', 'AA', 'HEL', 'AIR'];
const CATEGORY_COLOR: Record<CategoryCode, string> = {
  LOG: '#8c8f7d', REC: '#5b9bdb', INF: '#c9a15a', ART: '#e2483d',
  TNK: '#ffb627', AA: '#6fae52', HEL: '#9a7fd1', AIR: '#4fb8a0',
};

const COST_BINS: Array<[number, number, string]> = [
  [0, 29, '<30'], [30, 59, '30-59'], [60, 99, '60-99'],
  [100, 149, '100-149'], [150, 199, '150-199'], [200, Infinity, '200+'],
];

// Doctrine-grounded, based on tags/categories that actually appear in this
// deck's cards -- not a fixed list of "scary" tag names. Every threshold is
// checked against the deck's own composition, not the global unit pool.
function buildWarnings(cats: Record<CategoryCode, number>, tagCounts: Record<string, number>, total: number): string[] {
  const warnings: string[] = [];
  const share = (n: number) => (total ? n / total : 0);
  const samCount = tagCounts.sam || 0;
  const atgmCount = tagCounts.atgm || 0;
  const heavyCount = tagCounts.heavy || 0;
  const cheapCount = tagCounts.cheap || 0;
  const eliteCount = tagCounts.elite || 0;

  if ((cats.AA || 0) === 0 && ((cats.TNK || 0) + (cats.INF || 0)) >= 4) {
    warnings.push('No dedicated air defense fielded — the ground push has no cover against enemy CAS or attack helicopters.');
  }
  if (samCount >= 4 && atgmCount + heavyCount <= 1) {
    warnings.push(`${samCount} SAM-tagged systems with almost no armor cover — a SEAD-capable strike could gut the air defense before anything else engages.`);
  }
  if ((cats.TNK || 0) >= 6 && atgmCount === 0 && (cats.REC || 0) <= 1) {
    warnings.push('Armor-heavy with almost no recon screen or ATGM support — vulnerable to ambush or being flanked by cheaper anti-tank teams.');
  }
  if (share(cheapCount) >= 0.6) {
    warnings.push('Mostly cheap units — resilient to losses, but individually light on firepower.');
  }
  if (share(eliteCount + heavyCount) >= 0.25) {
    warnings.push('Premium-heavy mix — expensive to replace losses, rewards careful play over spam.');
  }
  return warnings;
}

export default function DeckStatsDashboard({ deck, categoryLabels }: DeckStatsDashboardProps) {
  const cards = Object.values(deck.deck).flat();
  const total = cards.length;
  const cats = deck.summary.categories;

  const tagCounts: Record<string, number> = {};
  for (const c of cards) for (const t of c.tags) tagCounts[t] = (tagCounts[t] || 0) + 1;
  const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
  const maxTagCount = sortedTags[0]?.[1] || 1;

  const bins = COST_BINS.map(([lo, hi, label]) => ({
    label, count: cards.filter((c) => c.cost >= lo && c.cost <= hi).length,
  }));
  const maxBin = Math.max(1, ...bins.map((b) => b.count));

  // Donut via stacked stroke-dasharray segments -- classic dependency-free technique.
  const R = 62;
  const CIRC = 2 * Math.PI * R;
  let cumulative = 0;
  const segments = CATEGORY_ORDER
    .map((cat) => ({ cat, count: cats[cat] || 0 }))
    .filter((s) => s.count > 0)
    .map((s) => {
      const frac = total ? s.count / total : 0;
      const seg = { cat: s.cat, count: s.count, frac, offset: cumulative };
      cumulative += frac;
      return seg;
    });

  const warnings = buildWarnings(cats, tagCounts, total);

  return (
    <div className="stats-dash">
      <div className="stats-dash__row">
        <div className="stats-dash__panel">
          <span className="console__label">Category breakdown</span>
          <div className="donut">
            <svg viewBox="0 0 160 160" role="img" aria-label="Category breakdown donut chart">
              <circle cx="80" cy="80" r={R} fill="none" stroke="var(--line-soft)" strokeWidth="20" />
              {segments.map((s) => (
                <circle
                  key={s.cat}
                  cx="80" cy="80" r={R} fill="none"
                  stroke={CATEGORY_COLOR[s.cat]} strokeWidth="20"
                  strokeDasharray={`${s.frac * CIRC} ${CIRC}`}
                  strokeDashoffset={-s.offset * CIRC}
                  transform="rotate(-90 80 80)"
                >
                  <title>{`${categoryLabels[s.cat] || s.cat}: ${s.count}`}</title>
                </circle>
              ))}
              <text x="80" y="76" textAnchor="middle" className="donut__total">{total}</text>
              <text x="80" y="94" textAnchor="middle" className="donut__total-label">cards</text>
            </svg>
            <ul className="donut__legend">
              {segments.map((s) => (
                <li key={s.cat}>
                  <span className="donut__swatch" style={{ background: CATEGORY_COLOR[s.cat] }} />
                  {categoryLabels[s.cat] || s.cat} <span className="donut__legend-count">{s.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="stats-dash__panel">
          <span className="console__label">Cost curve</span>
          <div className="histogram">
            {bins.map((b) => (
              <div key={b.label} className="histogram__col">
                <span className="histogram__count">{b.count || ''}</span>
                <div className="histogram__bar" style={{ height: `${(b.count / maxBin) * 100}%` }} />
                <span className="histogram__label">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="stats-dash__panel">
        <span className="console__label">Dominant traits</span>
        <div className="tag-cloud">
          {sortedTags.length === 0 && <span className="tag-cloud__empty">No tagged units in this deck.</span>}
          {sortedTags.map(([tag, count]) => {
            const scale = count / maxTagCount;
            return (
              <span
                key={tag}
                className="tag-cloud__tag"
                style={{ fontSize: `${11 + scale * 11}px`, opacity: 0.55 + scale * 0.45 }}
              >
                {tag} <span className="tag-cloud__count">{count}</span>
              </span>
            );
          })}
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="stats-dash__warnings">
          <span className="console__label">Vulnerabilities</span>
          <ul>
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}