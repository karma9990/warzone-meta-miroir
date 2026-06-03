'use client';

import { useState, useEffect, useRef } from 'react';

type MapId = 'rebirth' | 'haven';

interface CirclePhase {
  circle: number;
  label: string;
  duration: number;
  waitTime: number;
  damage: number;
  rotateAlert: number;
}

const PHASES: CirclePhase[] = [
  { circle: 1, label: 'Circle 1', duration: 120, waitTime: 90,  damage: 5,   rotateAlert: 30 },
  { circle: 2, label: 'Circle 2', duration: 90,  waitTime: 60,  damage: 10,  rotateAlert: 25 },
  { circle: 3, label: 'Circle 3', duration: 70,  waitTime: 45,  damage: 15,  rotateAlert: 20 },
  { circle: 4, label: 'Circle 4', duration: 55,  waitTime: 35,  damage: 20,  rotateAlert: 15 },
  { circle: 5, label: 'Circle 5', duration: 40,  waitTime: 20,  damage: 30,  rotateAlert: 10 },
];

const SPAWN_ALERTS: Record<MapId, Record<number, string>> = {
  rebirth: {
    1: 'Finish looting — push toward center or take high ground now.',
    2: 'Rotate NOW. Crossing the courtyard after this kills you in the gas.',
    3: 'Final position. If you are not in zone, you are dead.',
    4: 'Hold. Push only if you have angle advantage.',
    5: 'Final circle — don\'t move unless forced.',
  },
  haven: {
    1: 'Loot phase ending — move toward Basin or Mansion for zone control.',
    2: 'Rotate east or west based on circle drop. Don\'t cross Main Street under pressure.',
    3: 'Establish final position — Riverboat and Lumbermill finals require you here now.',
    4: 'Last rotation window. Hold cover and wait for their push.',
    5: 'Final circle — angles only. No unnecessary movement.',
  },
};

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function RingTimer() {
  const [map, setMap] = useState<MapId>('rebirth');
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [timer, setTimer] = useState({ elapsed: 0, running: false });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const phase = PHASES[phaseIdx];
  const { elapsed, running } = timer;
  const remaining = Math.max(0, phase.duration - elapsed);
  const waitRemaining = Math.max(0, phase.waitTime - elapsed);
  const isMoving = elapsed >= phase.waitTime;
  const alerting = remaining <= phase.rotateAlert && remaining > 0;
  const pct = ((phase.duration - remaining) / phase.duration) * 100;

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimer((current) => {
          const elapsedNext = Math.min(current.elapsed + 1, phase.duration);
          return {
            elapsed: elapsedNext,
            running: elapsedNext < phase.duration,
          };
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, phase.duration]);

  const reset = () => { setTimer({ elapsed: 0, running: false }); };
  const nextPhase = () => { setPhaseIdx(i => Math.min(i + 1, PHASES.length - 1)); reset(); };
  const prevPhase = () => { setPhaseIdx(i => Math.max(i - 1, 0)); reset(); };

  const ringColor = alerting ? '#ff4455' : isMoving ? '#ffcc00' : '#00ff88';

  return (
    <div className="border border-black/12 rounded mb-12 overflow-hidden font-mono">
      <div className="px-6 py-5 border-b border-black/10 bg-black/2 flex justify-between items-center">
        <div>
          <div className="text-xs tracking-normal opacity-40 mb-1">MAP INTELLIGENCE</div>
          <div className="text-base font-bold tracking-normal">RING TIMER</div>
        </div>
        <div className="flex gap-1">
          {(['rebirth', 'haven'] as MapId[]).map(m => (
            <button type="button" key={m} onClick={() => setMap(m)}
              className="font-mono text-xs tracking-normal cursor-pointer rounded-sm bg-transparent"
              style={{
                padding: '4px 12px',
                border: `1px solid ${map === m ? 'currentColor' : 'rgba(0,0,0,0.12)'}`,
                fontWeight: map === m ? 700 : 400,
                opacity: map === m ? 1 : 0.45,
              }}
            >
              {m === 'rebirth' ? 'REBIRTH' : 'HAVEN'}
            </button>
          ))}
        </div>
      </div>

      {/* Phase selector */}
      <div className="flex border-b border-black/8">
        {PHASES.map((p, i) => (
          <button type="button" key={`circle-${p.circle}`} onClick={() => { setPhaseIdx(i); reset(); }}
            className="font-mono text-xs tracking-normal cursor-pointer bg-transparent"
            style={{
              flex: 1, padding: '0.6rem 0', border: 'none',
              borderBottom: phaseIdx === i ? `2px solid ${ringColor}` : '2px solid transparent',
              color: phaseIdx === i ? 'inherit' : 'rgba(0,0,0,0.35)',
              fontWeight: phaseIdx === i ? 700 : 400,
            }}
          >
            C{p.circle}
          </button>
        ))}
      </div>

      {/* Timer display */}
      <div className="p-6 text-center">
        <div className="text-xs tracking-normal opacity-40 mb-2">
          {isMoving ? 'ZONE CLOSING' : `ZONE MOVES IN ${fmt(waitRemaining)}`}
        </div>
        <div className="text-5xl font-bold tracking-normal leading-none"
          style={{ color: ringColor, transition: 'color 0.3s' }}
        >
          {fmt(remaining)}
        </div>
        <div className="text-xs opacity-40 mt-2">{phase.damage} DMG/SEC IN GAS</div>

        {/* Progress bar */}
        <div className="my-6 h-1 bg-black/8 rounded-sm">
          <div className="h-full rounded-sm"
            style={{ width: `${pct}%`, background: ringColor, transition: 'width 0.9s linear, background 0.3s' }}
          />
        </div>

        {/* Alert */}
        {alerting && (
          <div className="mb-4 text-xs tracking-normal font-bold rounded-sm"
            style={{
              padding: '0.75rem 1rem',
              background: 'rgba(255,68,85,0.08)',
              border: '1px solid rgba(255,68,85,0.3)',
              color: '#ff4455',
            }}
          >
            ⚠ ROTATE NOW
          </div>
        )}

        {/* Spawn tip */}
        <div className="mb-6 text-xs opacity-65 leading-relaxed text-left rounded-sm px-4 py-3 bg-black/3"
        >
          <span className="opacity-40 text-xs tracking-normal block mb-1">ROTATION CALL</span>
          {SPAWN_ALERTS[map][phase.circle]}
        </div>

        {/* Controls */}
        <div className="flex gap-3 justify-center">
          <button type="button" onClick={prevPhase} disabled={phaseIdx === 0}
            className="font-mono text-xs tracking-normal rounded-sm bg-transparent"
            style={{
              padding: '6px 14px',
              border: '1px solid rgba(0,0,0,0.15)',
              cursor: phaseIdx === 0 ? 'not-allowed' : 'pointer',
              opacity: phaseIdx === 0 ? 0.3 : 0.7,
            }}
          >← PREV</button>
          <button type="button" onClick={() => setTimer((current) => ({ ...current, running: !current.running }))}
            className="font-mono text-xs tracking-normal cursor-pointer font-bold"
            style={{
              padding: '6px 24px',
              border: `1px solid ${ringColor}`,
              borderRadius: '2px',
              background: `${ringColor}18`,
              color: ringColor,
            }}
          >
            {running ? 'PAUSE' : 'START'}
          </button>
          <button type="button" onClick={reset}
            className="font-mono text-xs tracking-normal cursor-pointer rounded-sm bg-transparent opacity-70 px-3.5 py-1.5 border border-black/15"
          >RESET</button>
          <button type="button" onClick={nextPhase} disabled={phaseIdx === PHASES.length - 1}
            className="font-mono text-xs tracking-normal rounded-sm bg-transparent"
            style={{
              padding: '6px 14px',
              border: '1px solid rgba(0,0,0,0.15)',
              cursor: phaseIdx === PHASES.length - 1 ? 'not-allowed' : 'pointer',
              opacity: phaseIdx === PHASES.length - 1 ? 0.3 : 0.7,
            }}
          >NEXT →</button>
        </div>
      </div>

      <div className="px-6 py-2.5 border-t border-black/8 text-xs tracking-normal opacity-30">
        TIMINGS BASED ON RESURGENCE COMPETITIVE LOBBIES — S03 2026
      </div>
    </div>
  );
}
