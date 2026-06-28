import CategoryColumn from './CategoryColumn';
import type { CategoryCode, DeckResponse } from '../types';

const ORDER: CategoryCode[] = ['LOG', 'REC', 'INF', 'ART', 'TNK', 'AA', 'HEL', 'AIR'];

interface DossierProps {
  deck: DeckResponse | null;
  categoryLabels: Partial<Record<CategoryCode, string>>;
  onReroll: () => void;
  onCopy: () => void;
  copied: boolean;
  onCopyCode: () => void;
  copiedCode: boolean;
}

export default function Dossier({
  deck, categoryLabels, onReroll, onCopy, copied, onCopyCode, copiedCode,
}: DossierProps) {
  if (!deck) {
    return (
      <div className="dossier dossier--empty">
        <p className="dossier__placeholder">
          Awaiting orders. Pick a mix and generate a battlegroup ORBAT.
        </p>
      </div>
    );
  }

  const { division, summary, mode, theme, seed } = deck;
  const apPct = Math.min(100, Math.round((summary.apSpent / summary.apTotal) * 100));
  const coalitionClass = division.coalition === 'NATO' ? 'is-nato' : 'is-pact';

  return (
    <div className={`dossier ${coalitionClass}`}>
      <div className="dossier__banner">
        <span>FIELD ORBAT // RANDOMIZED</span>
        <span className={`tag-mode tag-mode--${mode}`}>{mode === 'meta' ? 'META MIX' : 'FUN MIX'}</span>
      </div>

      <header className="dossier__head">
        <div className="dossier__title">
          <h2>{division.name}</h2>
          <p className="dossier__sub">
            <span className={`pill pill--coalition ${coalitionClass}`}>{division.coalition}</span>
            <span className="pill">{division.nation}</span>
            <span className="pill">{division.type}</span>
            {division.dlc && <span className="pill pill--dlc">{division.dlc}</span>}
            {division.power != null && (
              <span className="pill pill--rating" title="Competitive rating (win-rate proxy)">
                ★ {division.power}/10
              </span>
            )}
            <span className="dossier__theme">“{theme}”</span>
          </p>
          <p className="dossier__blurb">{division.blurb}</p>
        </div>
      </header>

      <div className="stats">
        <div className="stat">
          <span className="stat__val">{summary.cards}</span>
          <span className="stat__key">cards</span>
        </div>
        <div className="stat">
          <span className="stat__val">{summary.totalPoints}</span>
          <span className="stat__key">unit pts</span>
        </div>
        <div className="stat stat--ap">
          <div className="stat__ap-head">
            <span className="stat__key">activation</span>
            <span className="stat__val stat__val--sm">{summary.apSpent}/{summary.apTotal}</span>
          </div>
          <div className="apbar"><div className="apbar__fill" style={{ width: `${apPct}%` }} /></div>
        </div>
      </div>

      <div className="grid">
        {ORDER.map((code) => (
          <CategoryColumn
            key={code}
            code={code}
            label={categoryLabels?.[code] || code}
            units={deck.deck[code] || []}
            limit={division.categoryLimits[code]}
            mode={mode}
          />
        ))}
      </div>

      <footer className="dossier__foot">
        <span className="seedline">SEED: <code>{seed || '—'}</code></span>
        <div className="dossier__actions">
          <button className="ghost" onClick={onCopy}>{copied ? 'Copied ✓' : 'Copy share link'}</button>
          <button className="ghost ghost--accent" onClick={onReroll}>↻ Reroll same mix</button>
        </div>
      </footer>

      {deck.code && (
        <div className="codebar">
          <span className="codebar__label">DECK CODE</span>
          <code className="codebar__value">{deck.code}</code>
          <button className="ghost codebar__btn" onClick={onCopyCode}>
            {copiedCode ? 'Copied ✓' : 'Copy code'}
          </button>
        </div>
      )}
    </div>
  );
}
