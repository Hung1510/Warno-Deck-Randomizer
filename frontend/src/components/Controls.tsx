import type { Division } from '../types';

const THEME_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'No theme' },
  { value: 'helicopter_rush', label: 'Helicopter Rush' },
  { value: 'napalm_spam', label: 'Napalm Spam' },
  { value: 'heavy_armor', label: 'Heavy Armor' },
  { value: 'recon_sniper', label: 'Recon Sniper' },
];

interface ControlsProps {
  chaos: number;
  setChaos: (n: number) => void;
  theme: string;
  setTheme: (t: string) => void;
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
  chaos, setChaos,
  theme, setTheme,
  coalition, setCoalition,
  dlc, setDlc, dlcs,
  divisions, divisionId, setDivisionId,
  onGenerate, loading,
}: ControlsProps) {
  const filtered = divisions.filter((d) =>
    (coalition === 'ALL' || d.coalition === coalition) &&
    (dlc === 'ALL' || d.dlc === dlc)
  );
  const leaning = chaos === 50 ? 'balanced' : chaos > 50 ? 'fun' : 'meta';

  return (
    <div className="console">
      <div className="console__row">
        <span className="console__label">Chaos factor</span>
        <div className="chaos-slider">
          <div className="chaos-slider__ends">
            <span className="chaos-slider__end chaos-slider__end--meta">Meta</span>
            <span className={`chaos-slider__readout chaos-slider__readout--${leaning}`}>
              {chaos === 50 ? 'BALANCED' : chaos > 50 ? `${chaos}% FUN` : `${100 - chaos}% META`}
            </span>
            <span className="chaos-slider__end chaos-slider__end--fun">Fun</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={chaos}
            onChange={(e) => setChaos(Number(e.target.value))}
            aria-label="Chaos factor: 0 is pure meta, 100 is pure fun"
            className="chaos-slider__input"
          />
        </div>
      </div>

      <div className="console__row">
        <span className="console__label">Theme</span>
        <select
          className="select"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
        >
          {THEME_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
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