'use client';

import { useState } from 'react';

interface Session {
  id: number;
  date: string;
  kills: number;
  deaths: number;
  placement: number;
  wins: number;
  duration: number;
}

const EMPTY: Omit<Session, 'id' | 'date'> = { kills: 0, deaths: 0, placement: 10, wins: 0, duration: 120 };

export default function SessionTracker() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [adding, setAdding] = useState(false);

  const add = () => {
    setSessions(prev => [...prev, { ...form, id: Date.now(), date: new Date().toLocaleDateString('en-GB') }]);
    setForm({ ...EMPTY });
    setAdding(false);
  };

  const remove = (id: number) => setSessions(prev => prev.filter(s => s.id !== id));

  const avg = (key: keyof Omit<Session, 'id' | 'date'>) =>
    sessions.length ? +(sessions.reduce((s, x) => s + x[key], 0) / sessions.length).toFixed(1) : 0;

  const kd = sessions.length && avg('deaths') > 0 ? +(avg('kills') / avg('deaths')).toFixed(2) : avg('kills');
  const winRate = sessions.length ? +((sessions.reduce((s, x) => s + x.wins, 0) / sessions.length) * 100).toFixed(0) : 0;

  const trend = (key: keyof Omit<Session, 'id' | 'date'>) => {
    if (sessions.length < 2) return null;
    const last3 = sessions.slice(-3);
    const prev3 = sessions.slice(-6, -3);
    if (!prev3.length) return null;
    const l = last3.reduce((s, x) => s + x[key], 0) / last3.length;
    const p = prev3.reduce((s, x) => s + x[key], 0) / prev3.length;
    return l > p ? '↑' : l < p ? '↓' : '→';
  };

  return (
    <div style={{ border: '1px solid rgba(0,0,0,0.12)', borderRadius: '4px', marginBottom: '3rem', overflow: 'hidden', fontFamily: 'monospace' }}>
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.1)', background: 'rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.55rem', letterSpacing: '0.2em', opacity: 0.4, marginBottom: '0.3rem' }}>PROGRESSION</div>
          <div style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.08em' }}>SESSION TRACKER</div>
        </div>
        <button onClick={() => setAdding(a => !a)} style={{ padding: '6px 14px', border: '1px solid rgba(0,0,0,0.2)', borderRadius: '2px', background: 'transparent', fontSize: '0.55rem', letterSpacing: '0.1em', cursor: 'pointer', fontFamily: 'monospace' }}>
          {adding ? 'CANCEL' : '+ ADD SESSION'}
        </button>
      </div>

      {adding && (
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.08)', background: 'rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
            {([
              { key: 'kills', label: 'KILLS', min: 0, max: 50 },
              { key: 'deaths', label: 'DEATHS', min: 0, max: 20 },
              { key: 'placement', label: 'AVG PLACE', min: 1, max: 60 },
              { key: 'wins', label: 'WINS', min: 0, max: 20 },
              { key: 'duration', label: 'MIN PLAYED', min: 30, max: 360 },
            ] as { key: keyof typeof form; label: string; min: number; max: number }[]).map(({ key, label, min, max }) => (
              <div key={key}>
                <div style={{ fontSize: '0.45rem', letterSpacing: '0.12em', opacity: 0.4, marginBottom: '0.35rem' }}>{label}</div>
                <input
                  type="number" min={min} max={max} value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: Number(e.target.value) }))}
                  style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.75rem', padding: '5px 8px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '2px', background: 'transparent', textAlign: 'center', boxSizing: 'border-box' }}
                />
              </div>
            ))}
          </div>
          <button onClick={add} style={{ padding: '7px 20px', border: '1px solid #00ff88', borderRadius: '2px', background: 'rgba(0,255,136,0.08)', fontSize: '0.6rem', letterSpacing: '0.1em', cursor: 'pointer', fontFamily: 'monospace', color: '#00ff88', fontWeight: 700 }}>
            SAVE SESSION
          </button>
        </div>
      )}

      {sessions.length > 0 && (
        <>
          {/* Stats summary */}
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            {[
              { label: 'AVG KILLS', value: avg('kills'), t: trend('kills'), good: true },
              { label: 'K/D', value: kd, t: trend('kills'), good: true },
              { label: 'AVG PLACE', value: avg('placement'), t: trend('placement'), good: false },
              { label: 'WIN RATE', value: `${winRate}%`, t: null, good: true },
            ].map(({ label, value, t, good }) => (
              <div key={label} style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(0,0,0,0.03)', borderRadius: '3px' }}>
                <div style={{ fontSize: '0.45rem', letterSpacing: '0.12em', opacity: 0.4, marginBottom: '0.35rem' }}>{label}</div>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>{value}</span>
                  {t && <span style={{ fontSize: '0.7rem', color: (t === '↑') === good ? '#00ff88' : t === '→' ? '#8899aa' : '#ff4455' }}>{t}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Session list */}
          <div>
            <div style={{ padding: '0.6rem 1.5rem', display: 'grid', gridTemplateColumns: '5rem 1fr 1fr 1fr 1fr 1fr 2rem', gap: '0.75rem', fontSize: '0.45rem', letterSpacing: '0.1em', opacity: 0.35, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <span>DATE</span><span>KILLS</span><span>DEATHS</span><span>PLACE</span><span>WINS</span><span>MIN</span><span />
            </div>
            {[...sessions].reverse().map((s, i) => (
              <div key={s.id} style={{ padding: '0.7rem 1.5rem', display: 'grid', gridTemplateColumns: '5rem 1fr 1fr 1fr 1fr 1fr 2rem', gap: '0.75rem', alignItems: 'center', borderBottom: i < sessions.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                <span style={{ fontSize: '0.52rem', opacity: 0.45 }}>{s.date}</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>{s.kills}</span>
                <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>{s.deaths}</span>
                <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>{s.placement}</span>
                <span style={{ fontSize: '0.65rem', color: s.wins > 0 ? '#00ff88' : 'inherit', fontWeight: s.wins > 0 ? 700 : 400 }}>{s.wins}</span>
                <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>{s.duration}</span>
                <button onClick={() => remove(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.3, fontSize: '0.6rem', padding: 0 }}>×</button>
              </div>
            ))}
          </div>
        </>
      )}

      {sessions.length === 0 && !adding && (
        <div style={{ padding: '3rem 1.5rem', textAlign: 'center', opacity: 0.35, fontSize: '0.6rem', letterSpacing: '0.1em' }}>
          NO SESSIONS YET — ADD YOUR FIRST SESSION TO START TRACKING
        </div>
      )}

      <div style={{ padding: '0.6rem 1.5rem', borderTop: '1px solid rgba(0,0,0,0.08)', fontSize: '0.5rem', letterSpacing: '0.12em', opacity: 0.3 }}>
        SESSION DATA IS LOCAL — NOT PERSISTED BETWEEN PAGE RELOADS
      </div>
    </div>
  );
}
