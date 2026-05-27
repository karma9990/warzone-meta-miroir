'use client';

import { useState } from 'react';

type Impact = 'buff' | 'nerf' | 'neutral';

interface PatchEntry {
  date: string;
  version: string;
  changes: { weapon: string; category: string; impact: Impact; detail: string; metaShift: string }[];
}

const PATCHES: PatchEntry[] = [
  {
    date: '2026-05-10', version: 'S03 HOT FIX',
    changes: [
      { weapon: 'Carbon 57',   category: 'SMG', impact: 'buff',    detail: 'Torso damage multiplier increased from 1.0 to 1.08', metaShift: 'Now within 20ms TTK of Kogot-7 under 12m — expect rising pick rate' },
      { weapon: 'Semtex',      category: 'Lethal', impact: 'nerf', detail: 'Fuse timer increased by 0.3s', metaShift: 'More time to react — Drill Charge dominance increases further' },
      { weapon: 'Survivor',    category: 'Perk', impact: 'buff',   detail: 'Redeploy delay reduced by 15%', metaShift: 'Resurgence value up significantly — watch for it to enter top perk discussions' },
    ],
  },
  {
    date: '2026-04-28', version: 'S03 UPDATE 1.4',
    changes: [
      { weapon: 'Drill Charge', category: 'Lethal', impact: 'buff',  detail: 'Penetration radius increased by 12%', metaShift: 'Tier jump from A to S — now mandatory lethal for competitive squads' },
      { weapon: 'Voyak KT-3',  category: 'AR',      impact: 'nerf', detail: 'Horizontal recoil increased by 8% at 30m+', metaShift: 'Mid-range dominance weakened — DS20 Mirage takes the top AR slot' },
      { weapon: 'Snapshot Grenade', category: 'Tactical', impact: 'buff', detail: 'Detection radius increased from 6m to 8m', metaShift: 'More useful for rooftop checks — rising pick rate confirmed' },
    ],
  },
  {
    date: '2026-04-14', version: 'S03 LAUNCH',
    changes: [
      { weapon: 'Kogot-7',     category: 'SMG', impact: 'buff',    detail: 'ADS time reduced by 12ms — now 148ms base', metaShift: 'Established as fastest ADS SMG — instant S-tier entry' },
      { weapon: 'VST',         category: 'SMG', impact: 'buff',    detail: 'Damage range extended by 2m at close bracket', metaShift: 'Joined Kogot-7 at S-tier — SMG meta shift begins' },
      { weapon: 'MK.78',       category: 'LMG', impact: 'neutral', detail: 'No stat changes — visual hitbox adjustment only', metaShift: 'Stable A-tier zone control weapon — unchanged meta position' },
      { weapon: 'Dravec 45',   category: 'SMG', impact: 'nerf',   detail: 'Headshot multiplier reduced from 1.5 to 1.35', metaShift: 'Fell from B to C — outclassed by Kogot-7 in every metric' },
    ],
  },
  {
    date: '2026-03-30', version: 'S02 HOT FIX',
    changes: [
      { weapon: 'M15 MOD 0',   category: 'AR',  impact: 'buff',   detail: 'Semi-auto damage increased from 52 to 56', metaShift: 'Semi-auto ARs become viable — starts the marksman rifle meta' },
      { weapon: 'Ghost',       category: 'Perk', impact: 'neutral', detail: 'No changes — confirmed working as intended', metaShift: 'Remains mandatory — no competitive meta changes expected' },
    ],
  },
];

const IMPACT_CONFIG: Record<Impact, { label: string; color: string; bg: string; symbol: string }> = {
  buff:    { label: 'BUFF',    color: '#00ff88', bg: 'rgba(0,255,136,0.08)',    symbol: '↑' },
  nerf:    { label: 'NERF',    color: '#ff4455', bg: 'rgba(255,68,85,0.08)',    symbol: '↓' },
  neutral: { label: 'NEUTRAL', color: '#8899aa', bg: 'rgba(136,153,170,0.06)', symbol: '→' },
};

const CAT_COLORS: Record<string, string> = {
  SMG: '#00ccff', AR: '#00ff88', LMG: '#ff6600', Sniper: '#cc88ff',
  Lethal: '#ff4455', Tactical: '#ffcc00', Perk: '#8899aa',
};

export default function PatchNotesTracker() {
  const [filter, setFilter] = useState<Impact | 'all'>('all');
  const [expanded, setExpanded] = useState<string>(PATCHES[0].version);

  const filteredPatches = PATCHES.map(p => ({
    ...p,
    changes: filter === 'all' ? p.changes : p.changes.filter(c => c.impact === filter),
  })).filter(p => p.changes.length > 0);

  return (
    <div style={{ border: '1px solid rgba(0,0,0,0.12)', borderRadius: '4px', marginBottom: '3rem', overflow: 'hidden', fontFamily: 'monospace' }}>
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.1)', background: 'rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.55rem', letterSpacing: '0.2em', opacity: 0.4, marginBottom: '0.3rem' }}>META INTELLIGENCE</div>
          <div style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.08em' }}>PATCH NOTES TRACKER</div>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {(['all', 'buff', 'nerf', 'neutral'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '3px 10px', border: `1px solid ${filter === f ? (f === 'all' ? 'currentColor' : IMPACT_CONFIG[f as Impact].color) : 'rgba(0,0,0,0.12)'}`,
              borderRadius: '2px', background: filter === f && f !== 'all' ? IMPACT_CONFIG[f as Impact].bg : 'transparent',
              color: filter === f && f !== 'all' ? IMPACT_CONFIG[f as Impact].color : 'inherit',
              fontSize: '0.5rem', letterSpacing: '0.12em', cursor: 'pointer', fontFamily: 'monospace',
              opacity: filter === f ? 1 : 0.5,
            }}>
              {f === 'all' ? 'ALL' : `${IMPACT_CONFIG[f as Impact].symbol} ${IMPACT_CONFIG[f as Impact].label}`}
            </button>
          ))}
        </div>
      </div>

      {filteredPatches.map(patch => (
        <div key={patch.version} style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
          <button
            onClick={() => setExpanded(expanded === patch.version ? '' : patch.version)}
            style={{
              width: '100%', padding: '0.9rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'monospace', textAlign: 'left',
            }}
          >
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em' }}>{patch.version}</span>
              <span style={{ fontSize: '0.5rem', opacity: 0.4, letterSpacing: '0.1em', marginLeft: '1rem' }}>{patch.date}</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {(['buff', 'nerf', 'neutral'] as Impact[]).map(imp => {
                const cnt = patch.changes.filter(c => c.impact === imp).length;
                if (!cnt) return null;
                return <span key={imp} style={{ fontSize: '0.5rem', color: IMPACT_CONFIG[imp].color, fontWeight: 700 }}>{IMPACT_CONFIG[imp].symbol}{cnt}</span>;
              })}
              <span style={{ fontSize: '0.5rem', opacity: 0.4, marginLeft: '0.25rem' }}>{expanded === patch.version ? '▲' : '▼'}</span>
            </div>
          </button>

          {expanded === patch.version && (
            <div>
              {patch.changes.map((change, i) => {
                const cfg = IMPACT_CONFIG[change.impact];
                return (
                  <div key={i} style={{
                    padding: '0.9rem 1.5rem', borderTop: '1px solid rgba(0,0,0,0.05)',
                    background: cfg.bg, display: 'grid', gridTemplateColumns: '5rem 5rem 1fr 1fr', gap: '1rem', alignItems: 'start',
                  }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700 }}>{change.weapon}</div>
                      <div style={{ fontSize: '0.45rem', color: CAT_COLORS[change.category] ?? '#888', letterSpacing: '0.08em', marginTop: '2px' }}>{change.category}</div>
                    </div>
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, color: cfg.color }}>{cfg.symbol} {cfg.label}</span>
                    <span style={{ fontSize: '0.57rem', opacity: 0.65, lineHeight: 1.55 }}>{change.detail}</span>
                    <div style={{ fontSize: '0.55rem', opacity: 0.55, lineHeight: 1.55, borderLeft: `2px solid ${cfg.color}`, paddingLeft: '0.6rem' }}>{change.metaShift}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      <div style={{ padding: '0.6rem 1.5rem', borderTop: '1px solid rgba(0,0,0,0.08)', fontSize: '0.5rem', letterSpacing: '0.12em', opacity: 0.3 }}>
        DATA BASED ON OFFICIAL PATCH NOTES AND COMMUNITY DATAMINING — S03 2026
      </div>
    </div>
  );
}
