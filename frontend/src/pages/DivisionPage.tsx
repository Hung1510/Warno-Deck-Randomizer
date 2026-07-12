import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getDivision } from '../api';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import DivisionRadar from '../components/DivisionRadar';
import DivisionTree from '../components/DivisionTree';
import CategorySynergyGraph from '../components/CategorySynergyGraph';
import type { CategoryCode, DivisionDetail } from '../types';

const CATEGORY_ORDER: CategoryCode[] = ['LOG', 'REC', 'INF', 'ART', 'TNK', 'AA', 'HEL', 'AIR'];

export default function DivisionPage() {
  const { id = '' } = useParams<{ id: string }>();
  const [division, setDivision] = useState<DivisionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDivision(null);
    setError(null);
    getDivision(id)
      .then(setDivision)
      .catch((e: Error) => setError(e.message));
  }, [id]);

  // Fall back to a generic title while loading / on error, so the hook always
  // has something to set rather than being conditionally called.
  const title = division
    ? `${division.name} (${division.nation}) — WARNO Battlegroup Profile & Deck Randomizer`
    : `WARNO Battlegroup — ${id}`;
  const description = division
    ? `${division.name}: a ${division.nation} ${division.type} division in WARNO (${division.dlc}). ${division.blurb} Activation points: ${division.activationPoints}. Roll a random Fun or Meta deck for this exact battlegroup.`
    : `Profile for the WARNO battlegroup ${id}.`;

  useDocumentMeta({ title, description, canonicalPath: `/division/${id}` });

  if (error) {
    return (
      <div className="app">
        <div className="masthead">
          <div className="masthead__mark">W</div>
          <div className="masthead__text">
            <h1>Division not found</h1>
            <p>{error}</p>
          </div>
          <Link to="/divisions" className="div-index__back">← All divisions</Link>
        </div>
      </div>
    );
  }

  if (!division) {
    return (
      <div className="app">
        <p className="div-index__loading">Loading division…</p>
      </div>
    );
  }

  const coalitionClass = division.coalition === 'NATO' ? 'nato' : 'pact';

  return (
    <div className="app">
      <div className="masthead">
        <div className="masthead__mark">W</div>
        <div className="masthead__text">
          <h1>{division.name}</h1>
          <p>{division.nation} · {division.type} · {division.dlc}</p>
        </div>
        <Link to="/divisions" className="div-index__back">← All divisions</Link>
      </div>

      <div className="div-page">
        <section className="div-page__hero console">
          <span className={`div-page__badge div-page__badge--${coalitionClass}`}>{division.coalition}</span>
          <p className="div-page__blurb">{division.blurb}</p>
          <div className="div-page__stats">
            <div className="div-page__stat">
              <span className="console__label">Activation Points</span>
              <span className="div-page__stat-value">{division.activationPoints}</span>
            </div>
            <div className="div-page__stat">
              <span className="console__label">Power Rating</span>
              <span className="div-page__stat-value">{division.power}/10</span>
            </div>
          </div>
          <Link
            to={`/?divisionId=${encodeURIComponent(division.id)}&autoroll=1`}
            className="div-page__cta"
          >
            Roll a deck for this division →
          </Link>
        </section>

        <section className="div-page__limits console">
          <span className="console__label">Category Limits</span>
          <div className="div-page__limits-grid">
            {CATEGORY_ORDER.map((cat) => (
              <div key={cat} className="div-page__limit">
                <span className="div-page__limit-cat">{cat}</span>
                <span className="div-page__limit-val">{division.categoryLimits[cat]}</span>
              </div>
            ))}
          </div>
        </section>

        {division.profile && (
          <section className="div-page__profile console">
            <span className="console__label">Division Profile</span>
            <div className="div-page__profile-body">
              <DivisionRadar profile={division.profile} />
              <div className="div-page__profile-tiles">
                <div className="div-page__stat">
                  <span className="console__label">Meta score</span>
                  <span className="div-page__stat-value">{division.profile.metaScore}/10</span>
                </div>
                <div className="div-page__stat">
                  <span className="console__label">Meme score</span>
                  <span className="div-page__stat-value">{division.profile.memeScore}/10</span>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="div-page__synergy console">
          <span className="console__label">Combined-Arms Synergy</span>
          <p className="div-page__synergy-note">
            Category-level doctrine, not unit-level — every unit in a category shares its pattern.
            Dimmed categories aren't fielded by this division.
          </p>
          <CategorySynergyGraph categoryLimits={division.categoryLimits} />
        </section>

        {division.units.length > 0 && (
          <section className="div-page__units console">
            <span className="console__label">Available Units ({division.units.length})</span>
            <DivisionTree divisionName={division.name} units={division.units} />
          </section>
        )}
      </div>
    </div>
  );
}