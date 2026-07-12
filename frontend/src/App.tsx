import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getMeta, getDivisions, randomize, decode, getCounterDeck } from './api';
import Controls from './components/Controls';
import Dossier from './components/Dossier';
import type { CategoryCode, DeckResponse, Division, RandomizePayload } from './types';

export default function App() {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [categoryLabels, setCategoryLabels] = useState<Partial<Record<CategoryCode, string>>>({});
  const [chaos, setChaos] = useState<number>(100); // 0 = pure meta, 100 = pure fun -- matches the old default (fun)
  const [theme, setTheme] = useState<string>('');
  const [coalition, setCoalition] = useState<string>('ALL');
  const [dlc, setDlc] = useState<string>('ALL');
  const [dlcs, setDlcs] = useState<string[]>([]);
  const [divisionId, setDivisionId] = useState<string>('random');
  const [deck, setDeck] = useState<DeckResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [importCode, setImportCode] = useState<string>('');
  const [opponentCode, setOpponentCode] = useState<string>('');

  const run = useCallback((payload: RandomizePayload): Promise<void> => {
    setLoading(true);
    setError(null);
    setCopied(false);
    setCopiedCode(false);
    return randomize(payload)
      .then((d) => setDeck(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // load metadata + divisions, then honor any shared deck in the URL
  useEffect(() => {
    Promise.all([getMeta(), getDivisions()])
      .then(([meta, divs]) => {
        setCategoryLabels(meta.categoryLabels);
        setDlcs(meta.dlcs || []);
        setDivisions(divs);

        const p = new URLSearchParams(window.location.search);
        if (p.get('code')) {
          setLoading(true);
          decode(p.get('code') as string)
            .then((d) => { setDeck(d); setChaos(d.chaos); })
            .catch((e: Error) => setError(e.message))
            .finally(() => setLoading(false));
        } else if (p.get('seed')) {
          // chaos takes priority; fall back to the old binary mode param for
          // links shared before the slider existed.
          const sharedChaos = p.get('chaos') ? Number(p.get('chaos')) : (p.get('mode') === 'meta' ? 0 : 100);
          const sharedDiv = p.get('divisionId') || 'random';
          const sharedCo = p.get('coalition') || 'ALL';
          const sharedTheme = p.get('theme') || '';
          setChaos(sharedChaos);
          setTheme(sharedTheme);
          setDivisionId(sharedDiv);
          setCoalition(sharedCo);
          run({
            chaos: sharedChaos,
            theme: sharedTheme || undefined,
            divisionId: sharedDiv,
            coalition: sharedCo === 'ALL' ? undefined : sharedCo,
            seed: p.get('seed') as string,
          });
        } else if (p.get('divisionId')) {
          // Arrived from a /division/:id page's "Roll a deck" CTA — no seed,
          // just preselect the division. Autoroll if asked to.
          const preselected = p.get('divisionId') as string;
          setDivisionId(preselected);
          if (p.get('autoroll')) {
            run({ chaos, divisionId: preselected });
          }
        }
      })
      .catch((e: Error) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onGenerate = () => {
    run({
      chaos,
      theme: theme || undefined,
      divisionId,
      coalition: coalition === 'ALL' ? undefined : coalition,
      dlc: dlc === 'ALL' ? undefined : dlc,
    });
  };

  const onReroll = () => {
    if (!deck) return onGenerate();
    run({
      chaos: deck.chaos,
      divisionId: deck.division.id,
      coalition: coalition === 'ALL' ? undefined : coalition,
    });
  };

  const onCopy = () => {
    if (!deck) return;
    const p = new URLSearchParams({
      seed: deck.seed || '',
      chaos: String(deck.chaos),
      mode: deck.mode, // kept for older links / third-party bookmarklets
      divisionId: deck.division.id,
      coalition,
    });
    const url = `${window.location.origin}${window.location.pathname}?${p.toString()}`;
    navigator.clipboard?.writeText(url).then(
      () => { setCopied(true); setTimeout(() => setCopied(false), 1800); },
      () => setError('Could not copy to clipboard')
    );
  };

  const onCopyCode = () => {
    if (!deck?.code) return;
    navigator.clipboard?.writeText(deck.code).then(
      () => { setCopiedCode(true); setTimeout(() => setCopiedCode(false), 1800); },
      () => setError('Could not copy to clipboard')
    );
  };

  const onImport = () => {
    const code = importCode.trim();
    if (!code) return;
    setLoading(true);
    setError(null);
    decode(code)
      .then((d) => { setDeck(d); setChaos(d.chaos); setImportCode(''); })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  const onGenerateCounter = () => {
    const code = opponentCode.trim();
    if (!code) return;
    setLoading(true);
    setError(null);
    setCopied(false);
    setCopiedCode(false);
    getCounterDeck({
      opponentCode: code,
      divisionId: divisionId === 'random' ? undefined : divisionId,
      coalition: coalition === 'ALL' ? undefined : coalition,
      chaos,
    })
      .then((d) => setDeck(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  return (
    <div className="app">
      <header className="masthead">
        <div className="masthead__mark">W</div>
        <div className="masthead__text">
          <h1>WARNO Deck Builder &amp; Randomizer</h1>
          <p>Roll a random battlegroup and build a deck — fun chaos or meta steel.</p>
        </div>
        <Link to="/divisions" className="div-index__back">All divisions →</Link>
      </header>

      <main className="layout">
        <aside className="layout__side">
          <Controls
            chaos={chaos} setChaos={setChaos}
            theme={theme} setTheme={setTheme}
            coalition={coalition} setCoalition={setCoalition}
            dlc={dlc} setDlc={setDlc} dlcs={dlcs}
            divisions={divisions}
            divisionId={divisionId} setDivisionId={setDivisionId}
            onGenerate={onGenerate} loading={loading}
          />
          <div className="legend">
            <p className="legend__title">How it works</p>
            <p>Slide the <strong className="legend__fun">chaos factor</strong> toward <strong className="legend__fun">Fun</strong> for a wide, chaotic spread biased toward napalm, rockets, spam and gimmick units — or toward <strong className="legend__meta">Meta</strong> to fill recon, tanks and AA first, stacking the strongest cards within budget.</p>
            <p>A <strong>theme</strong> guarantees a category dominates the roll (eg Helicopter Rush maxes out HEL) on top of whatever the slider is doing.</p>
            <p className="legend__note">56 battlegroups across 14 nations &amp; 9 packs (NORTHAG, SOUTHAG, LANDJUT, Tropical Storm, Nemesis). Stats are estimated, not from game files.</p>
          </div>

          <div className="importer">
            <label className="importer__label" htmlFor="deckcode">Import a deck code</label>
            <textarea
              id="deckcode"
              className="importer__input"
              placeholder="Paste a shared deck code…"
              value={importCode}
              onChange={(e) => setImportCode(e.target.value)}
              rows={2}
            />
            <button className="ghost importer__btn" onClick={onImport} disabled={!importCode.trim() || loading}>
              Load deck
            </button>
          </div>

          <div className="importer">
            <label className="importer__label" htmlFor="oppcode">Counter deck generator</label>
            <textarea
              id="oppcode"
              className="importer__input"
              placeholder="Paste an opponent's deck code…"
              value={opponentCode}
              onChange={(e) => setOpponentCode(e.target.value)}
              rows={2}
            />
            <button className="ghost ghost--accent importer__btn" onClick={onGenerateCounter} disabled={!opponentCode.trim() || loading}>
              Generate counter
            </button>
          </div>
        </aside>

        <div className="layout__main">
          {error && <div className="alert">{error}</div>}
          <Dossier
            deck={deck}
            categoryLabels={categoryLabels}
            onReroll={onReroll}
            onCopy={onCopy}
            copied={copied}
            onCopyCode={onCopyCode}
            copiedCode={copiedCode}
          />
        </div>
      </main>

      <footer className="sitefoot">
        Fan-made tool · unofficial · inspired by community deck builders. WARNO © Eugen Systems.
      </footer>
    </div>
  );
}