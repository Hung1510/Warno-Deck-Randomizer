import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDivisions } from '../api';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import type { Division } from '../types';

export default function DivisionsIndex() {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [error, setError] = useState<string | null>(null);

  useDocumentMeta({
    title: 'All WARNO Divisions & Battlegroups — Full List | WARNO Deck Builder',
    description:
      'Every WARNO battlegroup across NATO and the Warsaw Pact — 56 divisions with activation points, category limits, and unit rosters. Pick one to see its full profile or roll a random deck.',
    canonicalPath: '/divisions',
  });

  useEffect(() => {
    getDivisions()
      .then(setDivisions)
      .catch((e: Error) => setError(e.message));
  }, []);

  const nato = divisions.filter((d) => d.coalition === 'NATO');
  const pact = divisions.filter((d) => d.coalition === 'PACT');

  const renderGroup = (label: string, group: Division[], coalitionClass: string) => (
    <section className="div-index__group">
      <h2 className={`div-index__group-title div-index__group-title--${coalitionClass}`}>{label}</h2>
      <div className="div-index__grid">
        {group.map((d) => (
          <Link key={d.id} to={`/division/${d.id}`} className="div-card">
            <span className={`div-card__flag div-card__flag--${coalitionClass}`}>{d.nation}</span>
            <span className="div-card__name">{d.name}</span>
            <span className="div-card__type">{d.type} · {d.dlc}</span>
          </Link>
        ))}
      </div>
    </section>
  );

  return (
    <div className="app">
      <div className="masthead">
        <div className="masthead__mark">W</div>
        <div className="masthead__text">
          <h1>All Battlegroups</h1>
          <p>Every WARNO division, NATO and Warsaw Pact. Pick one for the full profile.</p>
        </div>
        <Link to="/" className="div-index__back">← Randomizer</Link>
      </div>

      {error && <p className="div-index__error">{error}</p>}
      {!error && divisions.length === 0 && <p className="div-index__loading">Loading divisions…</p>}

      {renderGroup('NATO', nato, 'nato')}
      {renderGroup('Warsaw Pact', pact, 'pact')}
    </div>
  );
}