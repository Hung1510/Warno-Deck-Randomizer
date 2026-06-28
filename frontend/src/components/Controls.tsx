import type { Division, Mode } from '../types';

interface ControlsProps {
  mode: Mode;
  setMode: (m: Mode) => void;
  coalition: string;
  setCoalition: (c: string) => void;
  dlc: string;
  setDlc: (d: string) => void;
  dlcs: string[];
  divisions: Division[];
  divisionId: string;
  setDivisionId: (id: string) => void;
  onGenerate: () => void;
  loading: boolean;
}

export default function Controls({
  mode, setMode,
  coalition, setCoalition,
  dlc, setDlc, dlcs,
  divisions, divisionId, setDivisionId,
  onGenerate, loading,
}: ControlsProps) {
  const filtered = divisions.filter((d) =>
    (coalition === 'ALL' || d.coalition === coalition) &&
    (dlc === 'ALL' || d.dlc === dlc)
  );

  return (
    <div className="console">
      <div className="console__row">
        <span className="console__label">Mix</span>
        <div className="toggle" role="group" aria-label="Mix mode">
          <button
            className={`toggle__opt ${mode === 'fun' ? 'is-on toggle__opt--fun' : ''}`}
            onClick={() => setMode('fun')}
            aria-pressed={mode === 'fun'}
          >
            Fun
          </button>
          <button
            className={`toggle__opt ${mode === 'meta' ? 'is-on toggle__opt--meta' : ''}`}
            onClick={() => setMode('meta')}
            aria-pressed={mode === 'meta'}
          >
            Meta
          </button>
        </div>
      </div>

      <div className="console__row">
        <span className="console__label">Coalition</span>
        <div className="seg" role="group" aria-label="Coalition filter">
          {['ALL', 'NATO', 'PACT'].map((c) => (
            <button
              key={c}
              className={`seg__opt ${coalition === c ? 'is-on' : ''} seg__opt--${c.toLowerCase()}`}
              onClick={() => { setCoalition(c); setDivisionId('random'); }}
              aria-pressed={coalition === c}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="console__row">
        <span className="console__label">DLC / Pack</span>
        <select
          className="select"
          value={dlc}
          onChange={(e) => { setDlc(e.target.value); setDivisionId('random'); }}
        >
          <option value="ALL">All packs</option>
          {dlcs.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      <div className="console__row">
        <span className="console__label">Battlegroup</span>
        <select
          className="select"
          value={divisionId}
          onChange={(e) => setDivisionId(e.target.value)}
        >
          <option value="random">🎲 Randomize battlegroup</option>
          {filtered.map((d) => (
            <option key={d.id} value={d.id}>
              [{d.coalition}] {d.name} · {d.nation}
            </option>
          ))}
        </select>
      </div>

      <button className="generate" onClick={onGenerate} disabled={loading}>
        {loading ? 'Generating…' : 'Generate ORBAT'}
      </button>
    </div>
  );
}
