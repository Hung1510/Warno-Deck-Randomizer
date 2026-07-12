import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { searchUnits } from '../api';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import type { SearchResult } from '../types';

const EXAMPLES = ['heavy tanks', 'napalm units', 'radar AA', 'cluster aircraft', 'cheap recon', 'elite infantry'];

export default function UnitSearchPage() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useDocumentMeta({
    title: 'Unit Search — Find WARNO Units by Category, Tag & Name | WARNO Deck Builder',
    description: 'Search all 1900+ WARNO units by category, tag, or name -- "heavy tanks", "napalm units", "radar AA", "cluster aircraft" and more.',
    canonicalPath: '/units',
  });

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResult(null); setError(null); return; }
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      searchUnits(query)
        .then((r) => { setResult(r); setError(null); })
        .catch((e: Error) => setError(e.message))
        .finally(() => setLoading(false));
    }, 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const matchSummary = result && (result.matched.categories.length || result.matched.tags.length || result.matched.freeText.length)
    ? [
        ...result.matched.categories.map((c) => `category: ${c}`),
        ...result.matched.tags.map((t) => `tag: ${t}`),
        ...result.matched.freeText.map((w) => `name contains "${w}"`),
      ].join(' + ')
    : null;

  return (
    <div className="app">
      <div className="masthead">
        <div className="masthead__mark">W</div>
        <div className="masthead__text">
          <h1>Unit Search</h1>
          <p>Free-text search across every unit in the dataset — try a category and a trait together.</p>
        </div>
        <Link to="/" className="div-index__back">← Randomizer</Link>
      </div>

      <div className="unit-search">
        <input
          type="text"
          className="unit-search__input"
          placeholder='Try "heavy tanks", "napalm units", "radar AA"…'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <div className="unit-search__examples">
          {EXAMPLES.map((ex) => (
            <button key={ex} className="unit-search__example" onClick={() => setQuery(ex)}>{ex}</button>
          ))}
        </div>

        {error && <div className="alert">{error}</div>}

        {result && (
          <div className="unit-search__meta">
            {matchSummary && <span>Parsed as: <code>{matchSummary}</code></span>}
            <span>{result.totalMatches} match{result.totalMatches === 1 ? '' : 'es'}{result.totalMatches > result.results.length ? ` (showing first ${result.results.length})` : ''}</span>
          </div>
        )}

        {loading && <p className="unit-search__hint">Searching…</p>}

        {result && !loading && result.results.length === 0 && (
          <p className="unit-search__hint">No units matched. Try a broader term — a category (tank, recon, artillery) or a trait (heavy, cheap, atgm).</p>
        )}

        {result && result.results.length > 0 && (
          <div className="unit-search__results">
            {result.results.map((u) => (
              <div key={u.id} className="unit-search__row">
                <span className="unit-search__cat">{u.cat}</span>
                <span className="unit-search__name">{u.name}</span>
                <span className="unit-search__nation">{u.nation}</span>
                <span className="unit-search__tags">
                  {u.tags.map((t) => <span key={t} className="unit-search__tag">{t}</span>)}
                </span>
                <span className="unit-search__cost">{u.cost} pts</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}