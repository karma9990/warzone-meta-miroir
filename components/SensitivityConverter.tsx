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
    <div className="border border-black/15 bg-black/2 mb-12">
      <div className="px-6 py-4 border-b border-black/10">
        <span className="font-mono text-xs tracking-normal opacity-40">EXCLUSIVE TOOL</span>
        <h2 className="font-mono text-sm tracking-normal mt-1">SENSITIVITY CONVERTER</h2>
      </div>

      <div className="p-6">
        <p className="font-mono text-xs tracking-normal opacity-35 mb-2">SOURCE GAME</p>
        <div className="flex flex-col gap-1 mb-5">
          {GAMES.map(g => (
            <button type="button" key={g.id} onClick={() => handleGameChange(g.id)}
              className="font-mono text-xs tracking-normal text-left cursor-pointer transition-all duration-150"
              style={{
                padding: '0.7rem 1rem',
                border: `1px solid ${gameId === g.id ? 'blue' : 'rgba(0,0,0,0.12)'}`,
                background: gameId === g.id ? 'rgba(0,0,255,0.04)' : 'rgba(255,255,255,0.5)',
              }}
            >
              {g.label}
            </button>
          ))}
        </div>

        <p className="font-mono text-xs tracking-normal opacity-35 mb-2">
          YOUR {game.name.toUpperCase()} SENSITIVITY
        </p>

        {game.dual ? (
          <div className="flex gap-3 mb-5 flex-wrap">
            <div className="flex-1 min-w-[120px]">
              <p className="font-mono text-xs tracking-normal opacity-35 mb-1">HORIZONTAL</p>
              <input aria-label="Input" type="number" min={game.minH} max={game.maxH} step={game.stepH} placeholder={game.placeholderH}
                value={inputH} onChange={e => { setInputH(e.target.value); setResultH(null); setResultV(null); }}
                className="w-full font-mono text-sm p-3 border border-black/18 bg-white/70 outline-2 outline-transparent box-border"
              />
            </div>
            <div className="flex-1 min-w-[120px]">
              <p className="font-mono text-xs tracking-normal opacity-35 mb-1">VERTICAL</p>
              <input aria-label="Input" type="number" min={game.minV} max={game.maxV} step={game.stepV} placeholder={game.placeholderV}
                value={inputV} onChange={e => { setInputV(e.target.value); setResultH(null); setResultV(null); }}
                className="w-full font-mono text-sm p-3 border border-black/18 bg-white/70 outline-2 outline-transparent box-border"
              />
            </div>
            <button type="button" onClick={handleConvert}
              className="font-mono text-xs tracking-normal border-none cursor-pointer whitespace-nowrap self-end"
              style={{ padding: '0.75rem 1.25rem', background: 'blue', color: 'white' }}
            >CONVERT →</button>
          </div>
        ) : (
          <div className="flex gap-3 mb-5">
            <input aria-label="Input" type="number" min={game.min} max={game.max} step={game.step} placeholder={game.placeholder}
              value={inputVal} onChange={e => { setInputVal(e.target.value); setResult(null); }}
              className="flex-1 font-mono text-sm p-3 border border-black/18 bg-white/70 outline-2 outline-transparent"
            />
            <button type="button" onClick={handleConvert}
              className="font-mono text-xs tracking-normal border-none cursor-pointer whitespace-nowrap"
              style={{ padding: '0.75rem 1.25rem', background: 'blue', color: 'white' }}
            >CONVERT →</button>
          </div>
        )}

        {hasResult && (
          <div className="mb-4 px-6 py-5" style={{ border: '1px solid rgba(0,0,255,0.2)', background: 'rgba(0,0,255,0.03)' }}>
            <p className="font-mono text-xs tracking-normal opacity-35 mb-3">WARZONE EQUIVALENT</p>
            {result !== null ? (
              <>
                <p className="font-mono text-3xl font-bold tracking-normal mb-2" style={{ color: 'blue' }}>{result.toFixed(2)}</p>
                <p className="font-mono text-xs opacity-50 leading-relaxed">Apply this value to both Horizontal and Vertical sensitivity in Warzone.</p>
              </>
            ) : (
              <div className="flex gap-8 flex-wrap">
                <div>
                  <p className="font-mono text-xs tracking-normal opacity-35 mb-1">HORIZONTAL</p>
                  <p className="font-mono text-3xl font-bold tracking-normal" style={{ color: 'blue' }}>{resultH?.toFixed(2)}</p>
                </div>
                <div>
                  <p className="font-mono text-xs tracking-normal opacity-35 mb-1">VERTICAL</p>
                  <p className="font-mono text-3xl font-bold tracking-normal" style={{ color: 'blue' }}>{resultV?.toFixed(2)}</p>
                </div>
              </div>
            )}
          </div>
        )}

        <p className="font-mono text-xs leading-relaxed opacity-[0.38]">
          {game.note} All conversions are approximate — treat this as a starting point and fine-tune over 5–10 sessions.
        </p>
      </div>
    </div>
  );
}
