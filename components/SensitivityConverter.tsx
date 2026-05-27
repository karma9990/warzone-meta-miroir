'use client';

import { useState } from 'react';

interface GameSingle {
  id: string; name: string; label: string;
  dual?: false;
  min: number; max: number; step: number; placeholder: string;
  convert: (v: number) => number;
  note: string;
}

interface GameDual {
  id: string; name: string; label: string;
  dual: true;
  minH: number; maxH: number; stepH: number; placeholderH: string;
  minV: number; maxV: number; stepV: number; placeholderV: string;
  convertH: (v: number) => number;
  convertV: (v: number) => number;
  note: string;
}

type Game = GameSingle | GameDual;

const GAMES: Game[] = [
  {
    id: 'apex',
    name: 'Apex Legends',
    label: 'Apex Legends (1 – 10)',
    min: 0.1, max: 10, step: 0.1, placeholder: '3.0',
    convert: (v) => v * 0.3875,
    note: 'Apex uses a 1–10 scale. Apex 3–4 corresponds to Warzone 1.55 — the recommended starting point.',
  },
  {
    id: 'fortnite',
    name: 'Fortnite',
    label: 'Fortnite (% — 0 to 100)',
    min: 1, max: 100, step: 1, placeholder: '38',
    convert: (v) => v * 0.03875,
    note: 'Fortnite sensitivity is displayed as a percentage. 35–40% corresponds to Warzone 1.55.',
  },
  {
    id: 'r6',
    name: 'Rainbow Six Siege',
    label: 'Rainbow Six Siege (separate H and V)',
    dual: true,
    minH: 1, maxH: 100, stepH: 1, placeholderH: '55',
    minV: 1, maxV: 100, stepV: 1, placeholderV: '30',
    convertH: (v) => v * (1.55 / 55),
    convertV: (v) => v * (1.55 / 30),
    note: 'R6 uses separate horizontal and vertical sensitivities. H=55 / V=30 corresponds to Warzone 1.55 on both axes — the recommended base.',
  },
];

function clamp(v: number) {
  return Math.min(2.25, Math.max(1.55, Math.round(v * 20) / 20));
}

export default function SensitivityConverter() {
  const [gameId, setGameId] = useState<string>(GAMES[0].id);
  const [inputVal, setInputVal] = useState('');
  const [inputH, setInputH] = useState('');
  const [inputV, setInputV] = useState('');
  const [result, setResult] = useState<number | null>(null);
  const [resultH, setResultH] = useState<number | null>(null);
  const [resultV, setResultV] = useState<number | null>(null);

  const game = GAMES.find(g => g.id === gameId)!;

  function handleConvert() {
    if (game.dual) {
      const h = parseFloat(inputH);
      const v = parseFloat(inputV);
      if (isNaN(h) || isNaN(v)) return;
      setResultH(clamp(game.convertH(h)));
      setResultV(clamp(game.convertV(v)));
      setResult(null);
    } else {
      const v = parseFloat(inputVal);
      if (isNaN(v)) return;
      setResult(clamp(game.convert(v)));
      setResultH(null);
      setResultV(null);
    }
  }

  function handleGameChange(id: string) {
    setGameId(id);
    setInputVal(''); setInputH(''); setInputV('');
    setResult(null); setResultH(null); setResultV(null);
  }

  const hasResult = result !== null || (resultH !== null && resultV !== null);

  return (
    <div style={{ border: '1px solid rgba(0,0,0,0.15)', background: 'rgba(0,0,0,0.02)', marginBottom: '3rem' }}>
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
        <span style={{ fontFamily: 'monospace', fontSize: '0.55rem', letterSpacing: '0.2em', opacity: 0.4 }}>EXCLUSIVE TOOL</span>
        <h2 style={{ fontFamily: 'monospace', fontSize: '0.95rem', letterSpacing: '0.1em', margin: '0.25rem 0 0' }}>SENSITIVITY CONVERTER</h2>
      </div>

      <div style={{ padding: '1.5rem' }}>
        <p style={{ fontFamily: 'monospace', fontSize: '0.55rem', letterSpacing: '0.18em', opacity: 0.35, margin: '0 0 0.5rem' }}>SOURCE GAME</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.25rem' }}>
          {GAMES.map(g => (
            <button key={g.id} onClick={() => handleGameChange(g.id)} style={{
              textAlign: 'left', padding: '0.7rem 1rem',
              border: `1px solid ${gameId === g.id ? 'blue' : 'rgba(0,0,0,0.12)'}`,
              background: gameId === g.id ? 'rgba(0,0,255,0.04)' : 'rgba(255,255,255,0.5)',
              cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.72rem',
              letterSpacing: '0.04em', transition: 'all 0.15s',
            }}>
              {g.label}
            </button>
          ))}
        </div>

        <p style={{ fontFamily: 'monospace', fontSize: '0.55rem', letterSpacing: '0.18em', opacity: 0.35, margin: '0 0 0.5rem' }}>
          YOUR {game.name.toUpperCase()} SENSITIVITY
        </p>

        {game.dual ? (
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '120px' }}>
              <p style={{ fontFamily: 'monospace', fontSize: '0.5rem', letterSpacing: '0.15em', opacity: 0.35, margin: '0 0 0.3rem' }}>HORIZONTAL</p>
              <input type="number" min={game.minH} max={game.maxH} step={game.stepH} placeholder={game.placeholderH}
                value={inputH} onChange={e => { setInputH(e.target.value); setResultH(null); setResultV(null); }}
                style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.9rem', padding: '0.75rem 1rem', border: '1px solid rgba(0,0,0,0.18)', background: 'rgba(255,255,255,0.7)', outline: 'none', color: 'inherit', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ flex: 1, minWidth: '120px' }}>
              <p style={{ fontFamily: 'monospace', fontSize: '0.5rem', letterSpacing: '0.15em', opacity: 0.35, margin: '0 0 0.3rem' }}>VERTICAL</p>
              <input type="number" min={game.minV} max={game.maxV} step={game.stepV} placeholder={game.placeholderV}
                value={inputV} onChange={e => { setInputV(e.target.value); setResultH(null); setResultV(null); }}
                style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.9rem', padding: '0.75rem 1rem', border: '1px solid rgba(0,0,0,0.18)', background: 'rgba(255,255,255,0.7)', outline: 'none', color: 'inherit', boxSizing: 'border-box' }}
              />
            </div>
            <button onClick={handleConvert} style={{
              fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.12em',
              padding: '0.75rem 1.25rem', background: 'blue', color: 'white',
              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', alignSelf: 'flex-end',
            }}>CONVERT →</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <input type="number" min={game.min} max={game.max} step={game.step} placeholder={game.placeholder}
              value={inputVal} onChange={e => { setInputVal(e.target.value); setResult(null); }}
              style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.9rem', padding: '0.75rem 1rem', border: '1px solid rgba(0,0,0,0.18)', background: 'rgba(255,255,255,0.7)', outline: 'none', color: 'inherit' }}
            />
            <button onClick={handleConvert} style={{
              fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.12em',
              padding: '0.75rem 1.25rem', background: 'blue', color: 'white',
              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
            }}>CONVERT →</button>
          </div>
        )}

        {hasResult && (
          <div style={{ border: '1px solid rgba(0,0,255,0.2)', background: 'rgba(0,0,255,0.03)', padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
            <p style={{ fontFamily: 'monospace', fontSize: '0.55rem', letterSpacing: '0.18em', opacity: 0.35, margin: '0 0 0.75rem' }}>WARZONE EQUIVALENT</p>
            {result !== null ? (
              <>
                <p style={{ fontFamily: 'monospace', fontSize: '2rem', fontWeight: 700, color: 'blue', margin: '0 0 0.5rem', letterSpacing: '0.05em' }}>{result.toFixed(2)}</p>
                <p style={{ fontFamily: 'monospace', fontSize: '0.65rem', opacity: 0.5, margin: 0, lineHeight: 1.7 }}>Apply this value to both Horizontal and Vertical sensitivity in Warzone.</p>
              </>
            ) : (
              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontFamily: 'monospace', fontSize: '0.5rem', letterSpacing: '0.15em', opacity: 0.35, margin: '0 0 0.3rem' }}>HORIZONTAL</p>
                  <p style={{ fontFamily: 'monospace', fontSize: '2rem', fontWeight: 700, color: 'blue', margin: 0, letterSpacing: '0.05em' }}>{resultH?.toFixed(2)}</p>
                </div>
                <div>
                  <p style={{ fontFamily: 'monospace', fontSize: '0.5rem', letterSpacing: '0.15em', opacity: 0.35, margin: '0 0 0.3rem' }}>VERTICAL</p>
                  <p style={{ fontFamily: 'monospace', fontSize: '2rem', fontWeight: 700, color: 'blue', margin: 0, letterSpacing: '0.05em' }}>{resultV?.toFixed(2)}</p>
                </div>
              </div>
            )}
          </div>
        )}

        <p style={{ fontFamily: 'monospace', fontSize: '0.62rem', lineHeight: 1.8, opacity: 0.38, margin: 0 }}>
          {game.note} All conversions are approximate — treat this as a starting point and fine-tune over 5–10 sessions.
        </p>
      </div>
    </div>
  );
}
