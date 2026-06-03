'use client';

import { useState } from 'react';
import { WEAPON_CATALOG, CATEGORY_COLORS } from '@/lib/weaponData';

type Trend = 'rising' | 'stable' | 'falling';

interface WeaponTrend {
  name: string;
  category: string;
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
  { ...WEAPON_CATALOG.find(w => w.name === 'Kogot-7')!,     tier: 'S', trend: 'rising',  note: 'Fastest ADS in the current patch',      delta: '+2' },
  { ...WEAPON_CATALOG.find(w => w.name === 'VST')!,          tier: 'S', trend: 'rising',  note: 'Unmatched TTK under 15m',               delta: '+1' },
  { ...WEAPON_CATALOG.find(w => w.name === 'DS20 Mirage')!,  tier: 'S', trend: 'stable',  note: 'Mid-range dominant for 3 patches',      delta: '=' },
  { ...WEAPON_CATALOG.find(w => w.name === 'Voyak KT-3')!,   tier: 'S', trend: 'falling', note: 'Recoil nerf currently in testing',      delta: '-1' },
  { ...WEAPON_CATALOG.find(w => w.name === 'Carbon 57')!,    tier: 'S', trend: 'rising',  note: 'Silent buff in last hotfix',            delta: '+3' },
  { ...WEAPON_CATALOG.find(w => w.name === 'MK.78')!,        tier: 'A', trend: 'stable',  note: 'Zone control unchanged',               delta: '=' },
  { ...WEAPON_CATALOG.find(w => w.name === 'Dravec 45')!,    tier: 'A', trend: 'falling', note: 'Outclassed by Kogot-7 and VST',        delta: '-2' },
  { ...WEAPON_CATALOG.find(w => w.name === 'M15 MOD 0')!,    tier: 'B', trend: 'rising',  note: 'Semi-auto establishing itself',        delta: '+2' },
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
    <div className="border border-black/12 rounded mb-12 overflow-hidden font-mono">
      {/* Header */}
      <div className="px-6 py-5 border-b border-black/10 flex items-center justify-between flex-wrap gap-4 bg-black/2">
        <div>
          <div className="text-xs tracking-normal opacity-40 mb-1">
            LIVE META SNAPSHOT — UPDATE 2026-05-10
          </div>
          <div className="text-base font-bold tracking-normal">
            META DASHBOARD
          </div>
        </div>
        <div className="flex gap-4">
          {([
            { trend: 'rising'  as Trend, count: rising },
            { trend: 'stable'  as Trend, count: stable },
            { trend: 'falling' as Trend, count: falling },
          ] as { trend: Trend; count: number }[]).map(({ trend, count }) => (
            <div key={trend} className="text-center">
              <div className="text-lg font-bold" style={{ color: TREND_CONFIG[trend].color }}>
                {TREND_CONFIG[trend].arrow} {count}
              </div>
              <div className="text-xs tracking-normal opacity-45">
                {TREND_CONFIG[trend].label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-black/10">
        {([
          { key: 'weapons',   label: 'WEAPONS' },
          { key: 'equipment', label: 'EQUIPMENT' },
          { key: 'perks',     label: 'PERKS' },
        ] as { key: Tab; label: string }[]).map(tab => (
          <button type="button"
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="font-mono text-xs tracking-normal cursor-pointer bg-transparent transition-all duration-150"
            style={{
              padding: '0.75rem 1.25rem',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid currentColor' : '2px solid transparent',
              color: activeTab === tab.key ? 'inherit' : 'rgba(0,0,0,0.35)',
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
          <div className="px-6 py-3 flex gap-2 border-b border-black/7 flex-wrap">
            {(['all', 'rising', 'stable', 'falling'] as const).map(f => (
              <button type="button"
                key={f}
                onClick={() => setFilterTrend(f)}
                className="font-mono text-xs tracking-normal cursor-pointer rounded-sm"
                style={{
                  padding: '3px 10px',
                  border: `1px solid ${filterTrend === f ? (f === 'all' ? 'currentColor' : TREND_CONFIG[f as Trend].color) : 'rgba(0,0,0,0.12)'}`,
                  background: filterTrend === f && f !== 'all' ? TREND_CONFIG[f as Trend].bg : 'transparent',
                  color: filterTrend === f && f !== 'all' ? TREND_CONFIG[f as Trend].color : 'inherit',
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
                  className="grid grid-cols-[2rem_3rem_6rem_1fr_3.5rem_3rem] gap-3 items-center px-6 transition-[background] duration-100"
                  style={{
                    paddingTop: '0.85rem',
                    paddingBottom: '0.85rem',
                    borderBottom: i < filteredWeapons.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                    background: tc.bg,
                  }}
                >
                  <span className="text-xs opacity-30">{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-xs font-bold tracking-normal" style={{ color: TIER_COLOR[w.tier] }}>
                    [{w.tier}]
                  </span>
                  <span className="text-xs tracking-normal whitespace-nowrap rounded-sm px-1.5 py-0.5"
                    style={{
                      background: `${CATEGORY_COLORS[w.category]}18`,
                      color: CATEGORY_COLORS[w.category],
                    }}
                  >
                    {w.category}
                  </span>
                  <div>
                    <div className="text-[0.78rem] font-semibold tracking-normal">{w.name}</div>
                    <div className="text-xs opacity-45 mt-px">{w.note}</div>
                  </div>
                  <span className="text-xs font-bold tracking-normal text-center"
                    style={{ color: tc.color }}
                  >
                    {tc.arrow} {tc.label}
                  </span>
                  <span className="text-xs font-bold text-right opacity-80"
                    style={{ color: tc.color }}
                  >
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
                className="grid grid-cols-[5rem_1fr_auto] gap-4 items-center px-6"
                style={{
                  paddingTop: '0.9rem',
                  paddingBottom: '0.9rem',
                  borderBottom: i < EQUIPMENT_TRENDS.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                  background: tc.bg,
                }}
              >
                <span className="text-xs tracking-normal opacity-40 uppercase">
                  {eq.slot}
                </span>
                <div>
                  <div className="text-[0.78rem] font-semibold tracking-normal mb-0.5">{eq.name}</div>
                  <div className="text-xs opacity-50">{eq.reason}</div>
                </div>
                <span className="text-xs font-bold tracking-normal whitespace-nowrap"
                  style={{ color: tc.color }}
                >
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
                className="grid grid-cols-[1fr_auto] gap-4 items-center px-6"
                style={{
                  paddingTop: '0.9rem',
                  paddingBottom: '0.9rem',
                  borderBottom: i < PERK_TRENDS.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                  background: tc.bg,
                }}
              >
                <div>
                  <div className="text-[0.78rem] font-semibold tracking-normal mb-0.5">{p.name}</div>
                  <div className="text-xs opacity-50">{p.note}</div>
                </div>
                <span className="text-xs font-bold tracking-normal whitespace-nowrap"
                  style={{ color: tc.color }}
                >
                  {tc.arrow} {tc.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-3 border-t border-black/8 text-xs tracking-normal opacity-35 flex justify-between">
        <span>DATA BASED ON COMPETITIVE LOBBIES / WARZONE S03 2026</span>
        <span>WZPRO-META INTEL</span>
      </div>
    </div>
  );
}
