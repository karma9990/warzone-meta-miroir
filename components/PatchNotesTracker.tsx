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
    <div className="border border-black/12 rounded mb-12 overflow-hidden font-mono">
      <div className="px-6 py-5 border-b border-black/10 bg-black/2 flex justify-between items-center flex-wrap gap-4">
        <div>
          <div className="text-xs tracking-normal opacity-40 mb-1">META INTELLIGENCE</div>
          <div className="text-base font-bold tracking-normal">PATCH NOTES TRACKER</div>
        </div>
        <div className="flex gap-1">
          {(['all', 'buff', 'nerf', 'neutral'] as const).map(f => (
            <button type="button" key={f} onClick={() => setFilter(f)}
              className="font-mono text-xs tracking-normal cursor-pointer rounded-sm"
              style={{
                padding: '3px 10px',
                border: `1px solid ${filter === f ? (f === 'all' ? 'currentColor' : IMPACT_CONFIG[f as Impact].color) : 'rgba(0,0,0,0.12)'}`,
                background: filter === f && f !== 'all' ? IMPACT_CONFIG[f as Impact].bg : 'transparent',
                color: filter === f && f !== 'all' ? IMPACT_CONFIG[f as Impact].color : 'inherit',
                opacity: filter === f ? 1 : 0.5,
              }}
            >
              {f === 'all' ? 'ALL' : `${IMPACT_CONFIG[f as Impact].symbol} ${IMPACT_CONFIG[f as Impact].label}`}
            </button>
          ))}
        </div>
      </div>

      {filteredPatches.map(patch => (
        <div key={patch.version} className="border-b border-black/8">
          <button type="button"
            onClick={() => setExpanded(expanded === patch.version ? '' : patch.version)}
            className="w-full font-mono text-left cursor-pointer bg-transparent border-none"
            style={{ padding: '0.9rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <div>
              <span className="text-xs font-bold tracking-normal">{patch.version}</span>
              <span className="text-xs opacity-40 tracking-normal ml-4">{patch.date}</span>
            </div>
            <div className="flex gap-2 items-center">
              {(['buff', 'nerf', 'neutral'] as Impact[]).map(imp => {
                const cnt = patch.changes.filter(c => c.impact === imp).length;
                if (!cnt) return null;
                return <span key={imp} className="text-xs font-bold" style={{ color: IMPACT_CONFIG[imp].color }}>{IMPACT_CONFIG[imp].symbol}{cnt}</span>;
              })}
              <span className="text-xs opacity-40 ml-1">{expanded === patch.version ? '▲' : '▼'}</span>
            </div>
          </button>

          {expanded === patch.version && (
            <div>
              {patch.changes.map((change) => {
                const cfg = IMPACT_CONFIG[change.impact];
                return (
                  <div key={`${patch.version}-${change.weapon}-${change.category}-${change.impact}`}
                    className="grid grid-cols-[5rem_5rem_1fr_1fr] gap-4 items-start border-t border-black/5"
                    style={{ padding: '0.9rem 1.5rem', background: cfg.bg }}
                  >
                    <div>
                      <div className="text-xs font-bold">{change.weapon}</div>
                      <div className="text-xs tracking-normal mt-0.5"
                        style={{ color: CAT_COLORS[change.category] ?? '#888' }}
                      >{change.category}</div>
                    </div>
                    <span className="text-xs font-bold" style={{ color: cfg.color }}>{cfg.symbol} {cfg.label}</span>
                    <span className="text-xs opacity-65 leading-relaxed">{change.detail}</span>
                    <div className="text-xs opacity-55 leading-relaxed pl-2.5"
                      style={{ borderLeft: `2px solid ${cfg.color}` }}
                    >{change.metaShift}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      <div className="px-6 py-2.5 border-t border-black/8 text-xs tracking-normal opacity-30">
        DATA BASED ON OFFICIAL PATCH NOTES AND COMMUNITY DATAMINING — S03 2026
      </div>
    </div>
  );
}
