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
    <div className="border border-black/12 rounded mb-12 overflow-hidden font-mono">
      <div className="px-6 py-5 border-b border-black/10 bg-black/2">
        <div className="text-xs tracking-normal opacity-40 mb-1">PROGRESSION</div>
        <div className="text-base font-bold tracking-normal">DEATH ANALYZER</div>
      </div>

      <div className="grid grid-cols-2 gap-0">
        {/* Input */}
        <div className="p-5 border-r border-black/8">
          <div className="text-xs tracking-normal opacity-40 mb-3">WHY DID YOU DIE THIS SESSION?</div>
          <div className="flex flex-col gap-1 mb-4">
            {CAUSES.map(c => {
              const isOn = current.includes(c.id);
              return (
                <button type="button" key={c.id} onClick={() => toggle(c.id)}
                  className="font-mono text-xs cursor-pointer text-left w-full rounded-sm"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px',
                    border: `1px solid ${isOn ? CAT_COLOR[c.category] : 'rgba(0,0,0,0.1)'}`,
                    background: isOn ? `${CAT_COLOR[c.category]}12` : 'transparent',
                    color: isOn ? CAT_COLOR[c.category] : 'inherit',
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: CAT_COLOR[c.category] }} />
                  {c.label}
                </button>
              );
            })}
          </div>
          <input aria-label="Input" value={note} onChange={e => setNote(e.target.value)} placeholder="Optional note..."
            className="w-full font-mono text-xs px-2 py-1.5 border border-black/15 rounded-sm bg-transparent mb-3 box-border"
          />
          <button type="button" onClick={save} disabled={!current.length}
            className="font-mono text-xs tracking-normal font-bold rounded-sm"
            style={{
              padding: '7px 16px',
              border: '1px solid #00ff88',
              background: current.length ? 'rgba(0,255,136,0.08)' : 'transparent',
              color: '#00ff88',
              cursor: current.length ? 'pointer' : 'not-allowed',
              opacity: current.length ? 1 : 0.4,
            }}
          >LOG SESSION</button>
        </div>

        {/* Analysis */}
        <div className="p-5">
          {sessions.length === 0 ? (
            <div className="text-center opacity-35 text-xs pt-12">LOG A SESSION TO SEE YOUR PATTERNS</div>
          ) : (
            <>
              {topCategory && (
                <div className="p-[0.9rem] rounded-sm mb-4"
                  style={{ border: `1px solid ${CAT_COLOR[topCategory]}40`, background: `${CAT_COLOR[topCategory]}08` }}
                >
                  <div className="text-xs tracking-normal mb-1" style={{ color: CAT_COLOR[topCategory] }}>PRIMARY WEAKNESS</div>
                  <div className="text-sm font-bold uppercase tracking-normal" style={{ color: CAT_COLOR[topCategory] }}>{topCategory}</div>
                  <div className="text-xs opacity-60 mt-1.5">
                    {topCategory === 'positioning' && 'You are dying from bad map position. Focus on high ground and cover.'}
                    {topCategory === 'mechanics' && 'Your aim and gunfight execution needs work. Prioritize aim training.'}
                    {topCategory === 'decision' && 'Your in-game decisions are costing you. Focus on game sense.'}
                    {topCategory === 'team' && 'Team coordination is your weak link. Improve comms and callouts.'}
                  </div>
                </div>
              )}

              <div className="text-xs tracking-normal opacity-40 mb-2.5">DEATH FREQUENCY</div>
              {freq.slice(0, 5).map(c => (
                <div key={c.id} className="mb-3">
                  <div className="flex justify-between mb-[0.2rem]">
                    <span className="text-xs opacity-80">{c.label}</span>
                    <span className="text-xs font-bold" style={{ color: CAT_COLOR[c.category] }}>{c.count}×</span>
                  </div>
                  <div className="h-[3px] bg-black/7 rounded-xs">
                    <div className="h-full rounded-xs transition-[width] duration-300"
                      style={{ width: `${(c.count / (freq[0]?.count || 1)) * 100}%`, background: CAT_COLOR[c.category] }}
                    />
                  </div>
                  <div className="text-xs opacity-50 mt-[0.2rem] leading-relaxed">▸ {c.fix}</div>
                </div>
              ))}

              <div className="text-xs opacity-35 mt-3">{sessions.length} SESSION{sessions.length > 1 ? 'S' : ''} LOGGED</div>
            </>
          )}
        </div>
      </div>

      <div className="px-6 py-2.5 border-t border-black/8 text-xs tracking-normal opacity-30">
        DATA IS LOCAL — NOT PERSISTED BETWEEN PAGE RELOADS
      </div>
    </div>
  );
}
