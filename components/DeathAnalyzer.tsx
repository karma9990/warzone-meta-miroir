'use client';

import { useState } from 'react';

interface DeathCause {
  id: string;
  label: string;
  category: 'positioning' | 'mechanics' | 'decision' | 'team';
  fix: string;
}

const CAUSES: DeathCause[] = [
  { id: 'bad_rotation',    label: 'Bad rotation timing',      category: 'decision',    fix: 'Move at 60% of zone time remaining, not when the gas hits.' },
  { id: 'bad_position',    label: 'Bad positioning / low ground', category: 'positioning', fix: 'Always identify and move toward high ground within the first 60s of landing.' },
  { id: 'outgunned',       label: 'Outgunned (aim lost)',     category: 'mechanics',   fix: 'Run daily aim training — 10 min Motiontrack + Gridshot before sessions.' },
  { id: 'corner_peeked',   label: 'Pre-peeked / corner pushed', category: 'positioning', fix: 'Jiggle before every corner. Never commit without seeing first.' },
  { id: 'gulag_lost',      label: 'Lost the Gulag',           category: 'mechanics',   fix: 'Pre-aim the center angles immediately on spawn — do not wait for the enemy.' },
  { id: 'flanked',         label: 'Flanked / third-partied',  category: 'decision',    fix: 'Always check your 6 during fights. End fights fast — prolonged fights attract 3rd parties.' },
  { id: 'bad_trade',       label: 'Traded for one kill',      category: 'decision',    fix: 'Do not rush down a downed enemy in the open — let the squad clean up.' },
  { id: 'no_armor',        label: 'Died without full armor',  category: 'decision',    fix: 'Armor up between every engagement. Never push with 1-plate.' },
  { id: 'bad_comms',       label: 'Poor team communication',  category: 'team',        fix: 'Use pre-agreed callouts. Call enemies first, then engage.' },
  { id: 'overaggressive',  label: 'Over-aggressive push',     category: 'decision',    fix: 'Ask yourself: is this fight necessary? Zone edges are not worth contesting.' },
  { id: 'water',           label: 'Died in water / open terrain', category: 'positioning', fix: 'Never cross open terrain under fire. Break line of sight before moving.' },
  { id: 'reload',          label: 'Died while reloading',     category: 'mechanics',   fix: 'Reload behind cover always. Never reload in the open after a kill.' },
];

const CAT_COLOR: Record<string, string> = {
  positioning: '#00ccff',
  mechanics:   '#ff4455',
  decision:    '#ffcc00',
  team:        '#cc88ff',
};

interface DeathEntry { causes: string[]; note: string }

export default function DeathAnalyzer() {
  const [sessions, setSessions] = useState<DeathEntry[]>([]);
  const [current, setCurrent] = useState<string[]>([]);
  const [note, setNote] = useState('');

  const toggle = (id: string) => setCurrent(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const save = () => {
    if (!current.length) return;
    setSessions(prev => [...prev, { causes: [...current], note }]);
    setCurrent([]);
    setNote('');
  };

  const allSelected = sessions.flatMap(s => s.causes);
  const freq = CAUSES.map(c => ({ ...c, count: allSelected.filter(x => x === c.id).length }))
    .sort((a, b) => b.count - a.count)
    .filter(c => c.count > 0);

  const topCategory = freq.length
    ? Object.entries(freq.reduce((acc, c) => { acc[c.category] = (acc[c.category] || 0) + c.count; return acc; }, {} as Record<string, number>))
        .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
    : null;

  return (
    <div style={{ border: '1px solid rgba(0,0,0,0.12)', borderRadius: '4px', marginBottom: '3rem', overflow: 'hidden', fontFamily: 'monospace' }}>
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.1)', background: 'rgba(0,0,0,0.02)' }}>
        <div style={{ fontSize: '0.55rem', letterSpacing: '0.2em', opacity: 0.4, marginBottom: '0.3rem' }}>PROGRESSION</div>
        <div style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.08em' }}>DEATH ANALYZER</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
        {/* Input */}
        <div style={{ padding: '1.25rem', borderRight: '1px solid rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '0.5rem', letterSpacing: '0.15em', opacity: 0.4, marginBottom: '0.75rem' }}>WHY DID YOU DIE THIS SESSION?</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1rem' }}>
            {CAUSES.map(c => {
              const isOn = current.includes(c.id);
              return (
                <button key={c.id} onClick={() => toggle(c.id)} style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px',
                  border: `1px solid ${isOn ? CAT_COLOR[c.category] : 'rgba(0,0,0,0.1)'}`,
                  borderRadius: '2px', background: isOn ? `${CAT_COLOR[c.category]}12` : 'transparent',
                  cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.57rem', textAlign: 'left', width: '100%',
                  color: isOn ? CAT_COLOR[c.category] : 'inherit',
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: CAT_COLOR[c.category], flexShrink: 0 }} />
                  {c.label}
                </button>
              );
            })}
          </div>
          <input
            value={note} onChange={e => setNote(e.target.value)} placeholder="Optional note..."
            style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.58rem', padding: '6px 8px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '2px', background: 'transparent', marginBottom: '0.75rem', boxSizing: 'border-box' }}
          />
          <button onClick={save} disabled={!current.length} style={{
            padding: '7px 16px', border: '1px solid #00ff88', borderRadius: '2px',
            background: current.length ? 'rgba(0,255,136,0.08)' : 'transparent',
            fontSize: '0.6rem', letterSpacing: '0.1em', cursor: current.length ? 'pointer' : 'not-allowed',
            fontFamily: 'monospace', color: '#00ff88', fontWeight: 700, opacity: current.length ? 1 : 0.4,
          }}>LOG SESSION</button>
        </div>

        {/* Analysis */}
        <div style={{ padding: '1.25rem' }}>
          {sessions.length === 0 ? (
            <div style={{ textAlign: 'center', opacity: 0.35, fontSize: '0.6rem', paddingTop: '3rem' }}>LOG A SESSION TO SEE YOUR PATTERNS</div>
          ) : (
            <>
              {topCategory && (
                <div style={{ padding: '0.9rem', border: `1px solid ${CAT_COLOR[topCategory]}40`, background: `${CAT_COLOR[topCategory]}08`, borderRadius: '3px', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.45rem', letterSpacing: '0.12em', color: CAT_COLOR[topCategory], marginBottom: '0.3rem' }}>PRIMARY WEAKNESS</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: CAT_COLOR[topCategory], textTransform: 'uppercase', letterSpacing: '0.08em' }}>{topCategory}</div>
                  <div style={{ fontSize: '0.55rem', opacity: 0.6, marginTop: '0.35rem' }}>
                    {topCategory === 'positioning' && 'You are dying from bad map position. Focus on high ground and cover.'}
                    {topCategory === 'mechanics' && 'Your aim and gunfight execution needs work. Prioritize aim training.'}
                    {topCategory === 'decision' && 'Your in-game decisions are costing you. Focus on game sense.'}
                    {topCategory === 'team' && 'Team coordination is your weak link. Improve comms and callouts.'}
                  </div>
                </div>
              )}

              <div style={{ fontSize: '0.45rem', letterSpacing: '0.15em', opacity: 0.4, marginBottom: '0.6rem' }}>DEATH FREQUENCY</div>
              {freq.slice(0, 5).map(c => (
                <div key={c.id} style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <span style={{ fontSize: '0.57rem', opacity: 0.8 }}>{c.label}</span>
                    <span style={{ fontSize: '0.55rem', fontWeight: 700, color: CAT_COLOR[c.category] }}>{c.count}×</span>
                  </div>
                  <div style={{ height: '3px', background: 'rgba(0,0,0,0.07)', borderRadius: '1px' }}>
                    <div style={{ height: '100%', width: `${(c.count / (freq[0]?.count || 1)) * 100}%`, background: CAT_COLOR[c.category], transition: 'width 0.3s' }} />
                  </div>
                  <div style={{ fontSize: '0.5rem', opacity: 0.5, marginTop: '0.2rem', lineHeight: 1.5 }}>▸ {c.fix}</div>
                </div>
              ))}

              <div style={{ fontSize: '0.45rem', opacity: 0.35, marginTop: '0.75rem' }}>{sessions.length} SESSION{sessions.length > 1 ? 'S' : ''} LOGGED</div>
            </>
          )}
        </div>
      </div>

      <div style={{ padding: '0.6rem 1.5rem', borderTop: '1px solid rgba(0,0,0,0.08)', fontSize: '0.5rem', letterSpacing: '0.12em', opacity: 0.3 }}>
        DATA IS LOCAL — NOT PERSISTED BETWEEN PAGE RELOADS
      </div>
    </div>
  );
}
