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
  const [showStats, setShowStats] = useState<boolean>(false);

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

  const onExport = useCallback(() => {
    if (!deck) return;
    const lines: string[] = [];
    lines.push(`${deck.division.name} (${deck.division.nation}) -- WARNO build list`);
    lines.push('NOT a native WARNO import file -- Eugen\'s in-game deck code format needs current');
    lines.push('numeric unit/division IDs this tool doesn\'t have access to (see project notes).');
    lines.push('Rebuild this by hand in the Armory using the list below.');
    lines.push('');
    lines.push(`Mode: ${deck.chaos}% fun / ${100 - deck.chaos}% meta -- theme: ${deck.theme}`);
    lines.push(`Activation points: ${deck.summary.apSpent}/${deck.summary.apTotal} -- seed: ${deck.seed || 'n/a'}`);
    lines.push('');
    for (const cat of ['LOG', 'REC', 'INF', 'ART', 'TNK', 'AA', 'HEL', 'AIR'] as const) {
      const units = deck.deck[cat] || [];
      if (units.length === 0) continue;
      lines.push(`${cat} (${units.length})`);
      for (const u of units) lines.push(`  - ${u.name} (${u.cost} pts)`);
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const slug = deck.division.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    a.href = url;
    a.download = `warno-buildlist-${slug}-${deck.seed || 'roll'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [deck]);

  // Keyboard shortcuts: R reroll, C copy share link, E export build list, D
  // toggle stats dashboard. Ignored while typing in an input/textarea/select,
  // and while any modifier key is held (so Cmd/Ctrl+C etc. still work normally).
  useEffect(() => {
    function isTypingTarget(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return;
      switch (e.key.toLowerCase()) {
        case 'r': e.preventDefault(); onReroll(); break;
        case 'c': e.preventDefault(); onCopy(); break;
        case 'e': e.preventDefault(); onExport(); break;
        case 'd': e.preventDefault(); setShowStats((s) => !s); break;
        default: break;
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onReroll, onCopy, onExport]);

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
          <div className="shortcuts-hint">
            <span><kbd>R</kbd> reroll</span>
            <span><kbd>C</kbd> copy link</span>
            <span><kbd>E</kbd> export</span>
            <span><kbd>D</kbd> stats</span>
          </div>
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
            onExport={onExport}
            showStats={showStats}
            onToggleStats={() => setShowStats((s) => !s)}
          />
        </div>
      </main>

      <footer className="sitefoot">
        Fan-made tool · unofficial · inspired by community deck builders. WARNO © Eugen Systems.
      </footer>
    </div>
  );
}