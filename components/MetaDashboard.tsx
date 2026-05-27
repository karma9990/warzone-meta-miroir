'use client';

import { useState } from 'react';

type Trend = 'rising' | 'stable' | 'falling';
type Category = 'SMG' | 'AR' | 'Marksman' | 'LMG' | 'Sniper' | 'Shotgun';

interface WeaponTrend {
  name: string;
  category: Category;
  tier: 'S' | 'A' | 'B' | 'C';
  trend: Trend;
  note: string;
  delta: string;
}

interface EquipmentTrend {
  name: string;
  slot: string;
  trend: Trend;
  reason: string;
}

const WEAPON_TRENDS: WeaponTrend[] = [
  { name: 'Kogot-7',      category: 'SMG',      tier: 'S', trend: 'rising',  note: 'Fastest ADS in the current patch',      delta: '+2' },
  { name: 'VST',          category: 'SMG',      tier: 'S', trend: 'rising',  note: 'Unmatched TTK under 15m',               delta: '+1' },
  { name: 'DS20 Mirage',  category: 'AR',       tier: 'S', trend: 'stable',  note: 'Mid-range dominant for 3 patches',      delta: '=' },
  { name: 'Voyak KT-3',   category: 'AR',       tier: 'S', trend: 'falling', note: 'Recoil nerf currently in testing',      delta: '-1' },
  { name: 'Carbon 57',    category: 'SMG',      tier: 'S', trend: 'rising',  note: 'Silent buff in last hotfix',            delta: '+3' },
  { name: 'MK.78',        category: 'LMG',      tier: 'A', trend: 'stable',  note: 'Zone control unchanged',               delta: '=' },
  { name: 'Dravec 45',    category: 'SMG',      tier: 'A', trend: 'falling', note: 'Outclassed by Kogot-7 and VST',        delta: '-2' },
  { name: 'M15 MOD 0',    category: 'AR',       tier: 'B', trend: 'rising',  note: 'Semi-auto establishing itself',        delta: '+2' },
];

const EQUIPMENT_TRENDS: EquipmentTrend[] = [
  { name: 'Drill Charge',       slot: 'Lethal',    trend: 'rising',  reason: 'Penetrates cover — flushes campers in one rotation' },
  { name: 'Semtex',             slot: 'Lethal',    trend: 'falling', reason: 'Less effective since the Drill Charge buff' },
  { name: 'Snapshot Grenade',   slot: 'Tactical',  trend: 'rising',  reason: 'Mandatory for checking rooftops before pushing' },
  { name: 'Stun Grenade',       slot: 'Tactical',  trend: 'stable',  reason: 'Remains standard for breaking rotations' },
];

const PERK_TRENDS = [
  { name: 'Ghost',      trend: 'stable'  as Trend, note: 'Non-negotiable — still dominant' },
  { name: 'Resolute',   trend: 'rising'  as Trend, note: 'Perfect pair with Ghost in resurgence' },
  { name: 'Tracker',    trend: 'rising'  as Trend, note: 'Replacing Vigilance for aggressive players' },
  { name: 'Vigilance',  trend: 'falling' as Trend, note: 'Outclassed by Tracker in aggressive lobbies' },
  { name: 'Tempered',   trend: 'stable'  as Trend, note: 'Armored in 2 plates — still viable' },
  { name: 'Survivor',   trend: 'rising'  as Trend, note: 'Quiet buff — reduced redeploy delay' },
];

const TREND_CONFIG: Record<Trend, { label: string; color: string; bg: string; arrow: string }> = {
  rising:  { label: 'RISING',  color: '#00ff88', bg: 'rgba(0,255,136,0.08)', arrow: '↑' },
  stable:  { label: 'STABLE',  color: '#8899aa', bg: 'rgba(136,153,170,0.06)', arrow: '→' },
  falling: { label: 'FALLING', color: '#ff4455', bg: 'rgba(255,68,85,0.08)', arrow: '↓' },
};

const TIER_COLOR: Record<string, string> = {
  S: 'var(--tier-s, #ff9900)',
  A: 'var(--tier-a, #ffcc00)',
  B: 'var(--tier-b, #88aaff)',
  C: 'var(--tier-c, #888888)',
};

const CATEGORY_COLORS: Record<Category, string> = {
  SMG:      '#00ccff',
  AR:       '#00ff88',
  Marksman: '#ffaa00',
  LMG:      '#ff6600',
  Sniper:   '#cc88ff',
  Shotgun:  '#ff4455',
};

type Tab = 'weapons' | 'equipment' | 'perks';

export default function MetaDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('weapons');
  const [filterTrend, setFilterTrend] = useState<Trend | 'all'>('all');

  const filteredWeapons = filterTrend === 'all'
    ? WEAPON_TRENDS
    : WEAPON_TRENDS.filter(w => w.trend === filterTrend);

  const rising  = WEAPON_TRENDS.filter(w => w.trend === 'rising').length;
  const falling = WEAPON_TRENDS.filter(w => w.trend === 'falling').length;
  const stable  = WEAPON_TRENDS.filter(w => w.trend === 'stable').length;

  return (
    <div style={{
      border: '1px solid rgba(0,0,0,0.12)',
      borderRadius: '4px',
      marginBottom: '3rem',
      overflow: 'hidden',
      fontFamily: 'monospace',
    }}>
      {/* Header */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        background: 'rgba(0,0,0,0.02)',
      }}>
        <div>
          <div style={{ fontSize: '0.55rem', letterSpacing: '0.2em', opacity: 0.4, marginBottom: '0.3rem' }}>
            LIVE META SNAPSHOT — UPDATE 2026-05-10
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.08em' }}>
            META DASHBOARD
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {[
            { trend: 'rising'  as Trend, count: rising },
            { trend: 'stable'  as Trend, count: stable },
            { trend: 'falling' as Trend, count: falling },
          ].map(({ trend, count }) => (
            <div key={trend} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: TREND_CONFIG[trend].color }}>
                {TREND_CONFIG[trend].arrow} {count}
              </div>
              <div style={{ fontSize: '0.5rem', letterSpacing: '0.15em', opacity: 0.45 }}>
                {TREND_CONFIG[trend].label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
        {([
          { key: 'weapons',   label: 'WEAPONS' },
          { key: 'equipment', label: 'EQUIPMENT' },
          { key: 'perks',     label: 'PERKS' },
        ] as { key: Tab; label: string }[]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '0.75rem 1.25rem',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid currentColor' : '2px solid transparent',
              background: 'transparent',
              color: activeTab === tab.key ? 'inherit' : 'rgba(0,0,0,0.35)',
              fontSize: '0.6rem',
              letterSpacing: '0.15em',
              cursor: 'pointer',
              fontFamily: 'monospace',
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Weapons tab */}
      {activeTab === 'weapons' && (
        <>
          {/* Filter */}
          <div style={{ padding: '0.75rem 1.5rem', display: 'flex', gap: '0.5rem', borderBottom: '1px solid rgba(0,0,0,0.07)', flexWrap: 'wrap' }}>
            {(['all', 'rising', 'stable', 'falling'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilterTrend(f)}
                style={{
                  padding: '3px 10px',
                  border: `1px solid ${filterTrend === f ? (f === 'all' ? 'currentColor' : TREND_CONFIG[f as Trend].color) : 'rgba(0,0,0,0.12)'}`,
                  borderRadius: '2px',
                  background: filterTrend === f && f !== 'all' ? TREND_CONFIG[f as Trend].bg : 'transparent',
                  color: filterTrend === f && f !== 'all' ? TREND_CONFIG[f as Trend].color : 'inherit',
                  fontSize: '0.55rem',
                  letterSpacing: '0.12em',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  opacity: filterTrend === f ? 1 : 0.5,
                }}
              >
                {f === 'all' ? 'ALL' : TREND_CONFIG[f as Trend].arrow + ' ' + TREND_CONFIG[f].label}
              </button>
            ))}
          </div>

          {/* Weapon rows */}
          <div>
            {filteredWeapons.map((w, i) => {
              const tc = TREND_CONFIG[w.trend];
              return (
                <div
                  key={w.name}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2rem 3rem 6rem 1fr 3.5rem 3rem',
                    gap: '0.75rem',
                    alignItems: 'center',
                    padding: '0.85rem 1.5rem',
                    borderBottom: i < filteredWeapons.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                    background: tc.bg,
                    transition: 'background 0.1s',
                  }}
                >
                  <span style={{ fontSize: '0.5rem', opacity: 0.3 }}>{String(i + 1).padStart(2, '0')}</span>
                  <span style={{
                    fontSize: '0.55rem',
                    fontWeight: 700,
                    color: TIER_COLOR[w.tier],
                    letterSpacing: '0.08em',
                  }}>
                    [{w.tier}]
                  </span>
                  <span style={{
                    fontSize: '0.55rem',
                    padding: '2px 6px',
                    borderRadius: '2px',
                    background: `${CATEGORY_COLORS[w.category]}18`,
                    color: CATEGORY_COLORS[w.category],
                    letterSpacing: '0.08em',
                    whiteSpace: 'nowrap',
                  }}>
                    {w.category}
                  </span>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.04em' }}>{w.name}</div>
                    <div style={{ fontSize: '0.6rem', opacity: 0.45, marginTop: '1px' }}>{w.note}</div>
                  </div>
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: tc.color,
                    letterSpacing: '0.08em',
                    textAlign: 'center',
                  }}>
                    {tc.arrow} {tc.label}
                  </span>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: tc.color,
                    textAlign: 'right',
                    opacity: 0.8,
                  }}>
                    {w.delta}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Equipment tab */}
      {activeTab === 'equipment' && (
        <div>
          {EQUIPMENT_TRENDS.map((eq, i) => {
            const tc = TREND_CONFIG[eq.trend];
            return (
              <div
                key={eq.name}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '5rem 1fr auto',
                  gap: '1rem',
                  alignItems: 'center',
                  padding: '0.9rem 1.5rem',
                  borderBottom: i < EQUIPMENT_TRENDS.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                  background: tc.bg,
                }}
              >
                <span style={{
                  fontSize: '0.5rem',
                  letterSpacing: '0.1em',
                  opacity: 0.4,
                  textTransform: 'uppercase',
                }}>
                  {eq.slot}
                </span>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.04em', marginBottom: '2px' }}>{eq.name}</div>
                  <div style={{ fontSize: '0.62rem', opacity: 0.5 }}>{eq.reason}</div>
                </div>
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  color: tc.color,
                  letterSpacing: '0.08em',
                  whiteSpace: 'nowrap',
                }}>
                  {tc.arrow} {tc.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Perks tab */}
      {activeTab === 'perks' && (
        <div>
          {PERK_TRENDS.map((p, i) => {
            const tc = TREND_CONFIG[p.trend];
            return (
              <div
                key={p.name}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: '1rem',
                  alignItems: 'center',
                  padding: '0.9rem 1.5rem',
                  borderBottom: i < PERK_TRENDS.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                  background: tc.bg,
                }}
              >
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.04em', marginBottom: '2px' }}>{p.name}</div>
                  <div style={{ fontSize: '0.62rem', opacity: 0.5 }}>{p.note}</div>
                </div>
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  color: tc.color,
                  letterSpacing: '0.08em',
                  whiteSpace: 'nowrap',
                }}>
                  {tc.arrow} {tc.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div style={{
        padding: '0.75rem 1.5rem',
        borderTop: '1px solid rgba(0,0,0,0.08)',
        fontSize: '0.5rem',
        letterSpacing: '0.12em',
        opacity: 0.35,
        display: 'flex',
        justifyContent: 'space-between',
      }}>
        <span>DATA BASED ON COMPETITIVE LOBBIES / WARZONE S03 2026</span>
        <span>WZPRO-META INTEL</span>
      </div>
    </div>
  );
}
