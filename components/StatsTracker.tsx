'use client';

import { useState, useRef } from 'react';
import type { ProfileStatsEntry } from '@/lib/profileStore';

type GameEntry = ProfileStatsEntry;

const STORAGE_KEY = 'wzmeta_stats';
const BRAND_BLUE = '#163cff';
const BRAND_BLUE_SOFT = 'rgba(22,60,255,0.08)';

function loadEntries(): GameEntry[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

function saveEntries(entries: GameEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

async function syncEntries(entries: GameEntry[]) {
  await fetch('/api/account/stats', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entries }),
  }).catch(() => undefined);
}

function avg(arr: number[]) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Extract a number after a keyword in OCR text
function extractAfter(text: string, keywords: string[]): number | null {
  const lines = text.toLowerCase().split('\n');
  for (const line of lines) {
    for (const kw of keywords) {
      if (line.includes(kw)) {
        const match = line.match(/\d+/g);
        if (match) return parseInt(match[match.length - 1]);
      }
    }
  }
  // Fallback: look in surrounding context
  const full = text.toLowerCase();
  for (const kw of keywords) {
    const idx = full.indexOf(kw);
    if (idx !== -1) {
      const after = full.slice(idx, idx + 30);
      const match = after.match(/\d+/);
      if (match) return parseInt(match[0]);
    }
  }
  return null;
}

export default function StatsTracker({ initialEntries = [], syncToAccount = false }: {
  initialEntries?: GameEntry[];
  syncToAccount?: boolean;
}) {
  const [entries, setEntries] = useState<GameEntry[]>(() => initialEntries.length ? initialEntries : loadEntries());
  const [form, setForm] = useState({ kills: '', deaths: '', damage: '', placement: '', won: false });
  const [adding, setAdding] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrHint, setOcrHint] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleOCR = async (file: File) => {
    setOcrLoading(true);
    setOcrHint('Scanning...');
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      const kills     = extractAfter(text, ['kills', 'kill', 'eliminations']);
      const deaths    = extractAfter(text, ['deaths', 'death', 'morts', 'mort']);
      const damage    = extractAfter(text, ['damage', 'degats', 'dmg']);
      const placement = extractAfter(text, ['place', 'placement', 'rank', 'position', '#']);

      setForm(f => ({
        ...f,
        kills:     kills     !== null ? String(kills)     : f.kills,
        deaths:    deaths    !== null ? String(deaths)    : f.deaths,
        damage:    damage    !== null ? String(damage)    : f.damage,
        placement: placement !== null ? String(placement) : f.placement,
      }));

      const found = [kills, deaths, damage, placement].filter(v => v !== null).length;
      setOcrHint(found > 0
        ? `${found}/4 fields auto-detected — verify and correct if needed.`
        : 'No stats detected. Fill in manually.');
    } catch {
      setOcrHint('OCR error. Fill in manually.');
    } finally {
      setOcrLoading(false);
    }
  };

  const addEntry = () => {
    const entry: GameEntry = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('en-GB'),
      kills: parseInt(form.kills) || 0,
      deaths: parseInt(form.deaths) || 1,
      damage: parseInt(form.damage) || 0,
      placement: parseInt(form.placement) || 0,
      won: form.won,
    };
    const updated = [entry, ...entries];
    setEntries(updated);
    saveEntries(updated);
    if (syncToAccount) void syncEntries(updated);
    setForm({ kills: '', deaths: '', damage: '', placement: '', won: false });
    setOcrHint('');
    setAdding(false);
  };

  const removeEntry = (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    saveEntries(updated);
    if (syncToAccount) void syncEntries(updated);
  };

  const last20 = entries.slice(0, 20);
  const kd = avg(last20.map(e => e.kills / e.deaths));
  const avgDmg = avg(last20.map(e => e.damage));
  const avgKills = avg(last20.map(e => e.kills));
  const winRate = last20.length ? (last20.filter(e => e.won).length / last20.length) * 100 : 0;
  const kdColor = kd >= 2 ? BRAND_BLUE : kd >= 1 ? '#ffcc00' : '#ff4455';

  return (
    <div style={{ border: '1px solid rgba(0,0,0,0.12)', borderRadius: '4px', marginBottom: '2rem', overflow: 'hidden', fontFamily: 'monospace' }}>

      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.1)', background: 'rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.55rem', letterSpacing: '0.2em', opacity: 0.4, marginBottom: '0.3rem' }}>PERFORMANCE TRACKING</div>
          <div style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.08em' }}>STATS TRACKER</div>
        </div>
        <button onClick={() => { setAdding(a => !a); setOcrHint(''); }} style={{ padding: '6px 16px', border: `1px solid ${adding ? 'rgba(255,70,70,0.4)' : BRAND_BLUE}`, background: adding ? 'rgba(255,70,70,0.06)' : BRAND_BLUE_SOFT, color: adding ? 'rgba(255,80,80,0.9)' : BRAND_BLUE, fontFamily: 'monospace', fontSize: '0.55rem', letterSpacing: '0.12em', cursor: 'pointer', borderRadius: '2px' }}>
          {adding ? '✕ CANCEL' : '+ ADD A GAME'}
        </button>
      </div>

      {/* Stats summary */}
      {entries.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
          {[
            { label: 'K/D RATIO',     value: kd.toFixed(2),                       color: kdColor },
            { label: 'KILLS / GAME',  value: avgKills.toFixed(1),                 color: 'inherit' },
            { label: 'DAMAGE / GAME', value: Math.round(avgDmg).toLocaleString(), color: 'inherit' },
            { label: 'WIN RATE',      value: `${winRate.toFixed(0)}%`,            color: winRate >= 20 ? BRAND_BLUE : winRate >= 10 ? '#ffcc00' : 'inherit' },
          ].map((s, i) => (
            <div key={i} style={{ padding: '1rem', borderRight: i < 3 ? '1px solid rgba(0,0,0,0.06)' : 'none', textAlign: 'center' }}>
              <div style={{ fontSize: '0.42rem', letterSpacing: '0.12em', opacity: 0.35, marginBottom: '0.35rem' }}>{s.label}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.4rem', opacity: 0.3, marginTop: '2px' }}>{last20.length} GAMES</div>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {adding && (
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.08)', background: 'rgba(0,255,136,0.02)' }}>

          {/* OCR upload */}
          <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', border: '1px dashed rgba(0,0,0,0.15)', borderRadius: '3px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '0.2rem' }}>AUTO SCAN</div>
              <div style={{ fontSize: '0.45rem', opacity: 0.45 }}>Upload an end-of-game screenshot — stats will be auto-filled.</div>
              {ocrHint && (
                <div style={{ fontSize: '0.45rem', marginTop: '0.4rem', color: ocrHint.includes('error') || ocrHint.includes('No ') ? '#ff6644' : BRAND_BLUE }}>
                  {ocrLoading ? '⏳ ' : '✓ '}{ocrHint}
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleOCR(e.target.files[0]); }} />
            <button onClick={() => fileRef.current?.click()} disabled={ocrLoading} style={{ padding: '6px 14px', border: '1px solid rgba(0,0,0,0.2)', background: 'transparent', fontFamily: 'monospace', fontSize: '0.5rem', letterSpacing: '0.08em', cursor: ocrLoading ? 'wait' : 'pointer', borderRadius: '2px', opacity: ocrLoading ? 0.5 : 1, whiteSpace: 'nowrap' }}>
              {ocrLoading ? 'SCAN...' : '📷 UPLOAD'}
            </button>
          </div>

          {/* Manual fields */}
          <div style={{ fontSize: '0.45rem', letterSpacing: '0.15em', opacity: 0.4, marginBottom: '0.6rem' }}>MANUAL ENTRY</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) auto auto', gap: '0.6rem', alignItems: 'end' }}>
            {[
              { key: 'kills',     label: 'KILLS',     placeholder: '0' },
              { key: 'deaths',    label: 'DEATHS',    placeholder: '1' },
              { key: 'damage',    label: 'DAMAGE',    placeholder: '0' },
              { key: 'placement', label: 'PLACEMENT', placeholder: '1' },
            ].map(f => (
              <div key={f.key}>
                <div style={{ fontSize: '0.42rem', letterSpacing: '0.1em', opacity: 0.4, marginBottom: '0.3rem' }}>{f.label}</div>
                <input
                  type="number" min="0" placeholder={f.placeholder}
                  value={form[f.key as keyof typeof form] as string}
                  onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
                  style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 700, padding: '6px 8px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '2px', background: 'transparent', boxSizing: 'border-box' }}
                />
              </div>
            ))}
            <div>
              <div style={{ fontSize: '0.42rem', letterSpacing: '0.1em', opacity: 0.4, marginBottom: '0.3rem' }}>WIN</div>
              <button onClick={() => setForm(v => ({ ...v, won: !v.won }))} style={{ width: '100%', padding: '6px 8px', border: `1px solid ${form.won ? BRAND_BLUE : 'rgba(0,0,0,0.15)'}`, background: form.won ? BRAND_BLUE_SOFT : 'transparent', color: form.won ? BRAND_BLUE : 'rgba(0,0,0,0.4)', fontFamily: 'monospace', fontSize: '0.6rem', cursor: 'pointer', borderRadius: '2px' }}>
                {form.won ? '✓ YES' : 'NO'}
              </button>
            </div>
            <div>
              <div style={{ fontSize: '0.42rem', opacity: 0, marginBottom: '0.3rem' }}>_</div>
              <button onClick={addEntry} style={{ padding: '6px 18px', background: BRAND_BLUE_SOFT, border: `1px solid ${BRAND_BLUE}`, color: BRAND_BLUE, fontFamily: 'monospace', fontSize: '0.55rem', letterSpacing: '0.1em', cursor: 'pointer', borderRadius: '2px' }}>
                SAVE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {entries.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.35, fontSize: '0.6rem', letterSpacing: '0.12em' }}>
          NO GAMES — CLICK + ADD A GAME
        </div>
      ) : (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '5rem 3.5rem 3.5rem 4.5rem 5rem 4rem 1.5rem', gap: '0.5rem', padding: '0.6rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.06)', fontSize: '0.42rem', letterSpacing: '0.1em', opacity: 0.35 }}>
            <span>DATE</span><span>KILLS</span><span>DEATHS</span><span>K/D</span><span>DAMAGE</span><span>PLACE</span><span></span>
          </div>
          {entries.slice(0, 15).map(e => {
            const ekd = e.kills / e.deaths;
            const ekdColor = ekd >= 2 ? BRAND_BLUE : ekd >= 1 ? '#ffcc00' : '#ff4455';
            return (
              <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '5rem 3.5rem 3.5rem 4.5rem 5rem 4rem 1.5rem', gap: '0.5rem', padding: '0.55rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.04)', alignItems: 'center', fontSize: '0.6rem' }}>
                <span style={{ opacity: 0.45 }}>{e.date}</span>
                <span style={{ fontWeight: 700 }}>{e.kills}</span>
                <span style={{ opacity: 0.6 }}>{e.deaths}</span>
                <span style={{ fontWeight: 700, color: ekdColor }}>{ekd.toFixed(2)}</span>
                <span style={{ opacity: 0.75 }}>{e.damage.toLocaleString()}</span>
                <span style={{ opacity: 0.6 }}>#{e.placement}{e.won ? ' 🏆' : ''}</span>
                <button onClick={() => removeEntry(e.id)} style={{ background: 'none', border: 'none', color: 'rgba(0,0,0,0.25)', cursor: 'pointer', fontSize: '0.6rem', padding: 0, fontFamily: 'monospace' }}>×</button>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ padding: '0.6rem 1.5rem', borderTop: '1px solid rgba(0,0,0,0.08)', fontSize: '0.45rem', letterSpacing: '0.1em', opacity: 0.28 }}>
        {syncToAccount ? 'DATA SYNCED TO ACCOUNT' : 'DATA STORED LOCALLY'} · AVERAGES OVER LAST 20 GAMES
      </div>
    </div>
  );
}
