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
    <div className="border border-black/12 rounded mb-12 overflow-hidden font-mono">
      <div className="px-6 py-5 border-b border-black/10 bg-black/2 flex justify-between items-center">
        <div>
          <div className="text-xs tracking-normal opacity-40 mb-1">PROGRESSION</div>
          <div className="text-base font-bold tracking-normal">SESSION TRACKER</div>
        </div>
        <button type="button" onClick={() => setAdding(a => !a)}
          className="font-mono text-xs tracking-normal cursor-pointer rounded-sm bg-transparent border border-black/20"
          style={{ padding: '6px 14px' }}
        >
          {adding ? 'CANCEL' : '+ ADD SESSION'}
        </button>
      </div>

      {adding && (
        <div className="px-6 py-5 border-b border-black/8 bg-black/2">
          <div className="grid grid-cols-5 gap-4 mb-4">
            {([
              { key: 'kills', label: 'KILLS', min: 0, max: 50 },
              { key: 'deaths', label: 'DEATHS', min: 0, max: 20 },
              { key: 'placement', label: 'AVG PLACE', min: 1, max: 60 },
              { key: 'wins', label: 'WINS', min: 0, max: 20 },
              { key: 'duration', label: 'MIN PLAYED', min: 30, max: 360 },
            ] as { key: keyof typeof form; label: string; min: number; max: number }[]).map(({ key, label, min, max }) => (
              <div key={key}>
                <div className="text-xs tracking-normal opacity-40 mb-1.5">{label}</div>
                <input aria-label="Input" type="number" min={min} max={max} value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: Number(e.target.value) }))}
                  className="w-full font-mono text-xs px-2 py-1 border border-black/15 rounded-sm bg-transparent text-center box-border"
                />
              </div>
            ))}
          </div>
          <button type="button" onClick={add}
            className="font-mono text-xs tracking-normal font-bold cursor-pointer rounded-sm"
            style={{ padding: '7px 20px', border: '1px solid #00ff88', background: 'rgba(0,255,136,0.08)', color: '#00ff88' }}
          >
            SAVE SESSION
          </button>
        </div>
      )}

      {sessions.length > 0 && (
        <>
          {/* Stats summary */}
          <div className="px-6 py-4 border-b border-black/8 grid grid-cols-4 gap-4">
            {[
              { label: 'AVG KILLS', value: avg('kills'), t: trend('kills'), good: true },
              { label: 'K/D', value: kd, t: trend('kills'), good: true },
              { label: 'AVG PLACE', value: avg('placement'), t: trend('placement'), good: false },
              { label: 'WIN RATE', value: `${winRate}%`, t: null, good: true },
            ].map(({ label, value, t, good }) => (
              <div key={label} className="text-center p-3 bg-black/3 rounded-sm">
                <div className="text-xs tracking-normal opacity-40 mb-1.5">{label}</div>
                <div className="flex justify-center items-baseline gap-1">
                  <span className="text-lg font-bold">{value}</span>
                  {t && <span className="text-xs" style={{ color: (t === '↑') === good ? '#00ff88' : t === '→' ? '#8899aa' : '#ff4455' }}>{t}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Session list */}
          <div>
            <div className="px-6 py-2.5 grid gap-3 text-xs tracking-normal opacity-35 border-b border-black/6"
              style={{ gridTemplateColumns: '5rem 1fr 1fr 1fr 1fr 1fr 2rem' }}
            >
              <span>DATE</span><span>KILLS</span><span>DEATHS</span><span>PLACE</span><span>WINS</span><span>MIN</span><span />
            </div>
            {[...sessions].reverse().map((s, i) => (
              <div key={s.id} className="px-6 grid gap-3 items-center border-b border-black/5"
                style={{ paddingTop: '0.7rem', paddingBottom: '0.7rem', gridTemplateColumns: '5rem 1fr 1fr 1fr 1fr 1fr 2rem' }}
              >
                <span className="text-xs opacity-45">{s.date}</span>
                <span className="text-xs font-semibold">{s.kills}</span>
                <span className="text-xs opacity-60">{s.deaths}</span>
                <span className="text-xs opacity-60">{s.placement}</span>
                <span className="text-xs" style={{ color: s.wins > 0 ? '#00ff88' : 'inherit', fontWeight: s.wins > 0 ? 700 : 400 }}>{s.wins}</span>
                <span className="text-xs opacity-60">{s.duration}</span>
                <button type="button" onClick={() => remove(s.id)}
                  className="font-mono text-xs cursor-pointer bg-transparent border-none p-0 opacity-30"
                >×</button>
              </div>
            ))}
          </div>
        </>
      )}

      {sessions.length === 0 && !adding && (
        <div className="p-12 text-center opacity-35 text-xs tracking-normal">
          NO SESSIONS YET — ADD YOUR FIRST SESSION TO START TRACKING
        </div>
      )}

      <div className="px-6 py-2.5 border-t border-black/8 text-xs tracking-normal opacity-30">
        SESSION DATA IS LOCAL — NOT PERSISTED BETWEEN PAGE RELOADS
      </div>
    </div>
  );
}
