'use client';

import { useState, useEffect, useRef } from 'react';

type MapId = 'rebirth' | 'haven';

interface CirclePhase {
  circle: number;
  label: string;
  duration: number; // seconds
  waitTime: number; // seconds before zone moves
  damage: number;   // per second
  rotateAlert: number; // seconds before end to alert
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
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const phase = PHASES[phaseIdx];
  const remaining = Math.max(0, phase.duration - elapsed);
  const waitRemaining = Math.max(0, phase.waitTime - elapsed);
  const isMoving = elapsed >= phase.waitTime;
  const alerting = remaining <= phase.rotateAlert && remaining > 0;
  const pct = ((phase.duration - remaining) / phase.duration) * 100;

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setElapsed(e => {
          if (e + 1 >= phase.duration) {
            setRunning(false);
            return phase.duration;
          }
          return e + 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, phase.duration]);

  const reset = () => { setElapsed(0); setRunning(false); };
  const nextPhase = () => { setPhaseIdx(i => Math.min(i + 1, PHASES.length - 1)); reset(); };
  const prevPhase = () => { setPhaseIdx(i => Math.max(i - 1, 0)); reset(); };

  const ringColor = alerting ? '#ff4455' : isMoving ? '#ffcc00' : '#00ff88';

  return (
    <div style={{ border: '1px solid rgba(0,0,0,0.12)', borderRadius: '4px', marginBottom: '3rem', overflow: 'hidden', fontFamily: 'monospace' }}>
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.1)', background: 'rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.55rem', letterSpacing: '0.2em', opacity: 0.4, marginBottom: '0.3rem' }}>MAP INTELLIGENCE</div>
          <div style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.08em' }}>RING TIMER</div>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {(['rebirth', 'haven'] as MapId[]).map(m => (
            <button key={m} onClick={() => setMap(m)} style={{
              padding: '4px 12px', border: `1px solid ${map === m ? 'currentColor' : 'rgba(0,0,0,0.12)'}`,
              borderRadius: '2px', background: 'transparent', fontSize: '0.55rem', letterSpacing: '0.08em',
              cursor: 'pointer', fontFamily: 'monospace', fontWeight: map === m ? 700 : 400, opacity: map === m ? 1 : 0.45,
            }}>
              {m === 'rebirth' ? 'REBIRTH' : 'HAVEN'}
            </button>
          ))}
        </div>
      </div>

      {/* Phase selector */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
        {PHASES.map((p, i) => (
          <button key={i} onClick={() => { setPhaseIdx(i); reset(); }} style={{
            flex: 1, padding: '0.6rem 0', border: 'none',
            borderBottom: phaseIdx === i ? `2px solid ${ringColor}` : '2px solid transparent',
            background: 'transparent', fontSize: '0.55rem', letterSpacing: '0.1em',
            color: phaseIdx === i ? 'inherit' : 'rgba(0,0,0,0.35)',
            cursor: 'pointer', fontFamily: 'monospace', fontWeight: phaseIdx === i ? 700 : 400,
          }}>C{p.circle}</button>
        ))}
      </div>

      {/* Timer display */}
      <div style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '0.5rem', letterSpacing: '0.2em', opacity: 0.4, marginBottom: '0.5rem' }}>
          {isMoving ? 'ZONE CLOSING' : `ZONE MOVES IN ${fmt(waitRemaining)}`}
        </div>
        <div style={{ fontSize: '4rem', fontWeight: 700, letterSpacing: '0.05em', color: ringColor, transition: 'color 0.3s', lineHeight: 1 }}>
          {fmt(remaining)}
        </div>
        <div style={{ fontSize: '0.5rem', opacity: 0.4, marginTop: '0.5rem' }}>{phase.damage} DMG/SEC IN GAS</div>

        {/* Progress bar */}
        <div style={{ margin: '1.5rem 0', height: '4px', background: 'rgba(0,0,0,0.08)', borderRadius: '2px' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: ringColor, borderRadius: '2px', transition: 'width 0.9s linear, background 0.3s' }} />
        </div>

        {/* Alert */}
        {alerting && (
          <div style={{ padding: '0.75rem 1rem', background: 'rgba(255,68,85,0.08)', border: '1px solid rgba(255,68,85,0.3)', borderRadius: '3px', marginBottom: '1rem', fontSize: '0.6rem', color: '#ff4455', letterSpacing: '0.1em', fontWeight: 700 }}>
            ⚠ ROTATE NOW
          </div>
        )}

        {/* Spawn tip */}
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.03)', borderRadius: '3px', marginBottom: '1.5rem', fontSize: '0.58rem', opacity: 0.65, lineHeight: 1.6, textAlign: 'left' }}>
          <span style={{ opacity: 0.4, fontSize: '0.45rem', letterSpacing: '0.12em', display: 'block', marginBottom: '0.3rem' }}>ROTATION CALL</span>
          {SPAWN_ALERTS[map][phase.circle]}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button onClick={prevPhase} disabled={phaseIdx === 0} style={{ padding: '6px 14px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '2px', background: 'transparent', fontSize: '0.55rem', letterSpacing: '0.1em', cursor: phaseIdx === 0 ? 'not-allowed' : 'pointer', fontFamily: 'monospace', opacity: phaseIdx === 0 ? 0.3 : 0.7 }}>← PREV</button>
          <button onClick={() => setRunning(r => !r)} style={{ padding: '6px 24px', border: `1px solid ${ringColor}`, borderRadius: '2px', background: `${ringColor}18`, fontSize: '0.65rem', letterSpacing: '0.1em', cursor: 'pointer', fontFamily: 'monospace', color: ringColor, fontWeight: 700 }}>
            {running ? 'PAUSE' : 'START'}
          </button>
          <button onClick={reset} style={{ padding: '6px 14px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '2px', background: 'transparent', fontSize: '0.55rem', letterSpacing: '0.1em', cursor: 'pointer', fontFamily: 'monospace', opacity: 0.7 }}>RESET</button>
          <button onClick={nextPhase} disabled={phaseIdx === PHASES.length - 1} style={{ padding: '6px 14px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '2px', background: 'transparent', fontSize: '0.55rem', letterSpacing: '0.1em', cursor: phaseIdx === PHASES.length - 1 ? 'not-allowed' : 'pointer', fontFamily: 'monospace', opacity: phaseIdx === PHASES.length - 1 ? 0.3 : 0.7 }}>NEXT →</button>
        </div>
      </div>

      <div style={{ padding: '0.6rem 1.5rem', borderTop: '1px solid rgba(0,0,0,0.08)', fontSize: '0.5rem', letterSpacing: '0.12em', opacity: 0.3 }}>
        TIMINGS BASED ON RESURGENCE COMPETITIVE LOBBIES — S03 2026
      </div>
    </div>
  );
}
