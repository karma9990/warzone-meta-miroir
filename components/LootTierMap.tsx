'use client';

import Image from 'next/image';
import { useState } from 'react';

type MapId = 'rebirth' | 'haven';
type Tier = 'S' | 'A' | 'B' | 'C';

interface LootZone {
  id: string;
  label: string;
  tier: Tier;
  x: number;
  y: number;
  items: string[];
  note: string;
}

const TIER_COLOR: Record<Tier, string> = { S: '#ff9900', A: '#ffcc00', B: '#00ff88', C: '#8899aa' };
const TIER_BG:    Record<Tier, string> = { S: 'rgba(255,153,0,0.15)', A: 'rgba(255,204,0,0.12)', B: 'rgba(0,255,136,0.1)', C: 'rgba(136,153,170,0.08)' };

const MAPS: Record<MapId, { label: string; image: string; zones: LootZone[] }> = {
  rebirth: {
    label: 'Rebirth Island',
    image: '/assets/tools/pro-movement/map-rebirth.jpg',
    zones: [
      { id: 'bioweapons', label: 'Bioweapons',      tier: 'S', x: 68, y: 22, items: ['Epic weapons ×2', 'Armor box', 'Cash +$4800'], note: 'Highest weapon quality on the island. Contested every game.' },
      { id: 'prison',     label: 'Prison',           tier: 'S', x: 51, y: 47, items: ['Epic weapons ×2', 'Killstreak', 'Cash +$4200'], note: 'Tower loot + interior chests. Very high density.' },
      { id: 'industry',   label: 'Industry',         tier: 'A', x: 61, y: 31, items: ['Rare weapons ×2', 'Armor satchel', 'Cash +$3200'], note: 'Reliable mid-tier loot, low competition vs Bioweapons.' },
      { id: 'chemical',   label: 'Chemical Eng.',    tier: 'A', x: 71, y: 33, items: ['Rare weapons ×2', 'Armor box', 'Cash +$3000'], note: 'Good loot with building cover. Route toward Harbor.' },
      { id: 'hq',         label: 'Headquaters',      tier: 'A', x: 36, y: 57, items: ['Rare weapons ×2', 'Armor box', 'Cash +$2800'], note: 'Multiple floors, consistent loot across all rooms.' },
      { id: 'harbor',     label: 'Harbor',           tier: 'A', x: 62, y: 51, items: ['Rare weapons ×1', 'Killstreak', 'Cash +$2600'], note: 'Killstreak spawns frequently. Low foot traffic.' },
      { id: 'turbines',   label: 'Turbines',         tier: 'B', x: 46, y: 28, items: ['Common weapons ×2', 'Cash +$2000'], note: 'Decent early loot but no guaranteed high-tier items.' },
      { id: 'control',    label: 'Control Center',   tier: 'B', x: 37, y: 47, items: ['Common weapons ×2', 'Armor', 'Cash +$1800'], note: 'Mid-quality, consistent. Good fallback loot zone.' },
      { id: 'factory',    label: 'Factory',          tier: 'B', x: 59, y: 59, items: ['Common weapons ×2', 'Cash +$1600'], note: 'Quiet south area. Good for uncontested looting.' },
      { id: 'dock',       label: 'Dock',             tier: 'C', x: 27, y: 41, items: ['Common weapons ×1', 'Cash +$1000'], note: 'Low density. Only viable if other zones are fully contested.' },
      { id: 'stronghold', label: 'Stronghold',       tier: 'C', x: 18, y: 65, items: ['Common weapons ×1', 'Cash +$900'], note: 'Poorest loot on island. Avoid unless dropping purely for safety.' },
      { id: 'living',     label: 'Living Quarters',  tier: 'C', x: 48, y: 73, items: ['Common weapons ×1', 'Cash +$1100'], note: 'Low density south zone. Loot then immediately rotate north.' },
    ],
  },
  haven: {
    label: 'Haven Hollow',
    image: '/assets/tools/pro-movement/map-haven.jpg',
    zones: [
      { id: 'mansion',    label: 'Mansion',          tier: 'S', x: 50, y: 21, items: ['Epic weapons ×2', 'Killstreak', 'Cash +$5000'], note: 'Best loot on Haven. Always contested. Multiple floors with high-tier spawns.' },
      { id: 'research',   label: 'Research Center',  tier: 'A', x: 75, y: 36, items: ['Rare weapons ×2', 'Armor box', 'Cash +$3500'], note: 'High-quality loot with low player traffic. Strong value pick.' },
      { id: 'lumbermill', label: 'Lumbermill',       tier: 'A', x: 64, y: 67, items: ['Rare weapons ×2', 'Armor satchel', 'Cash +$3200'], note: 'Consistent rare loot. Upper floor often has weapon crate.' },
      { id: 'coaldepot',  label: 'Coal Depot',       tier: 'A', x: 65, y: 50, items: ['Rare weapons ×1', 'Cash +$2800', 'Armor'], note: 'Mid-map value. Route between Research and Basin.' },
      { id: 'basin',      label: 'Basin / Barn',     tier: 'B', x: 42, y: 40, items: ['Common weapons ×2', 'Cash +$2200'], note: 'Decent density. High traffic from all sides — fight expected.' },
      { id: 'pond',       label: 'Pond',             tier: 'B', x: 35, y: 27, items: ['Common weapons ×2', 'Cash +$2000'], note: 'Rooftop has good loot. Safe approach from Mansion side.' },
      { id: 'mainstreet', label: 'Main Street',      tier: 'B', x: 33, y: 55, items: ['Common weapons ×2', 'Cash +$1800'], note: 'Multiple buildings with average loot. Central position offsets quality.' },
      { id: 'trainstation', label: 'Train Station',  tier: 'C', x: 21, y: 40, items: ['Common weapons ×1', 'Cash +$1200'], note: 'Low-density west zone. Rotate east after clearing.' },
      { id: 'riverboat',  label: 'Riverboat',        tier: 'C', x: 44, y: 67, items: ['Common weapons ×1', 'Cash +$1000'], note: 'Sparse loot. Only useful for positional value, not items.' },
    ],
  },
};

export default function LootTierMap() {
  const [activeMap, setActiveMap] = useState<MapId>('rebirth');
  const [activeZone, setActiveZone] = useState<string | null>(null);
  const [filterTier, setFilterTier] = useState<Tier | 'all'>('all');

  const map = MAPS[activeMap];
  const zone = activeZone ? map.zones.find(z => z.id === activeZone) ?? null : null;
  const filtered = filterTier === 'all' ? map.zones : map.zones.filter(z => z.tier === filterTier);

  return (
    <div className="border border-black/12 rounded mb-12 overflow-hidden font-mono">
      <div className="px-6 py-5 border-b border-black/10 bg-black/2">
        <div className="text-xs tracking-normal opacity-40 mb-1">MAP INTELLIGENCE</div>
        <div className="text-base font-bold tracking-normal">LOOT TIER MAP</div>
      </div>

      <div className="flex border-b border-black/10">
        {(['rebirth', 'haven'] as MapId[]).map(m => (
          <button type="button" key={m} onClick={() => { setActiveMap(m); setActiveZone(null); }}
            className="font-mono text-xs tracking-normal cursor-pointer bg-transparent border-none"
            style={{
              padding: '0.75rem 1.5rem',
              borderBottom: activeMap === m ? '2px solid currentColor' : '2px solid transparent',
              color: activeMap === m ? 'inherit' : 'rgba(0,0,0,0.35)',
              fontWeight: activeMap === m ? 700 : 400,
            }}
          >{MAPS[m].label.toUpperCase()}</button>
        ))}
        <div className="ml-auto flex gap-1 px-4 items-center">
          {(['all', 'S', 'A', 'B', 'C'] as const).map(t => (
            <button type="button" key={t} onClick={() => setFilterTier(t)}
              className="font-mono text-xs tracking-normal cursor-pointer rounded-sm bg-transparent"
              style={{
                padding: '3px 8px',
                border: `1px solid ${filterTier === t ? (t === 'all' ? 'currentColor' : TIER_COLOR[t as Tier]) : 'rgba(0,0,0,0.12)'}`,
                color: filterTier === t && t !== 'all' ? TIER_COLOR[t as Tier] : 'inherit',
                fontWeight: filterTier === t ? 700 : 400,
                opacity: filterTier === t ? 1 : 0.45,
              }}
            >{t === 'all' ? 'ALL' : `[${t}]`}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_280px] items-start">
        <div className="relative bg-[#111] border-r border-black/8">
          <Image src={map.image} alt={map.label} width={1000} height={700} className="w-full h-auto block opacity-70" />
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
            {filtered.map(z => {
              const isActive = z.id === activeZone;
              const color = TIER_COLOR[z.tier];
              return (
                <g key={z.id} className="cursor-pointer" onClick={() => setActiveZone(isActive ? null : z.id)}>
                  <circle cx={z.x} cy={z.y} r="4" fill="transparent" />
                  <circle cx={z.x} cy={z.y} r={isActive ? 3 : 2.2} fill={isActive ? color : `${color}99`} stroke={color} strokeWidth="0.4" />
                  {isActive && <circle cx={z.x} cy={z.y} r="4.5" fill="none" stroke={color} strokeWidth="0.4" opacity="0.5" />}
                  <text x={z.x} y={z.y + 0.4} textAnchor="middle" dominantBaseline="middle" fontSize="1.8" fontWeight="bold" fill={isActive ? '#000' : '#fff'} className="pointer-events-none font-mono">{z.tier}</text>
                </g>
              );
            })}
          </svg>
          {!activeZone && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs tracking-normal whitespace-nowrap px-2.5 py-1 rounded-sm text-white/50 bg-black/50"
            >
              SELECT A ZONE
            </div>
          )}
        </div>

        <div className="p-5 flex flex-col gap-3">
          {!zone ? (
            <>
              <div className="text-xs tracking-normal opacity-40 mb-1">ZONE RANKING</div>
              {(['S', 'A', 'B', 'C'] as Tier[]).map(tier => {
                const zones = map.zones.filter(z => z.tier === tier && (filterTier === 'all' || filterTier === tier));
                if (!zones.length) return null;
                return (
                  <div key={tier}>
                    <div className="text-xs font-bold tracking-normal mb-1.5" style={{ color: TIER_COLOR[tier] }}>[{tier}] TIER</div>
                    {zones.map(z => (
                      <button type="button" key={z.id} onClick={() => setActiveZone(z.id)}
                        className="font-mono text-xs tracking-normal cursor-pointer text-left w-full rounded-sm mb-1"
                        style={{
                          display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px',
                          background: TIER_BG[z.tier], border: `1px solid ${TIER_COLOR[z.tier]}30`,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = TIER_COLOR[z.tier])}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = `${TIER_COLOR[z.tier]}30`)}
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: TIER_COLOR[z.tier] }} />
                        {z.label}
                      </button>
                    ))}
                  </div>
                );
              })}
            </>
          ) : (
            <>
              <button type="button" onClick={() => setActiveZone(null)}
                className="font-mono text-xs tracking-normal opacity-40 cursor-pointer bg-transparent border-none p-0 text-left"
              >← ALL ZONES</button>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-sm" style={{ color: TIER_COLOR[zone.tier], border: `1px solid ${TIER_COLOR[zone.tier]}` }}>[{zone.tier}]</span>
                <span className="text-sm font-bold">{zone.label}</span>
              </div>
              <div className="p-3 rounded-sm text-xs opacity-70 leading-relaxed" style={{ background: TIER_BG[zone.tier] }}>{zone.note}</div>
              <div>
                <div className="text-xs tracking-normal opacity-40 mb-2">EXPECTED LOOT</div>
                {zone.items.map((item) => (
                  <div key={`${zone.id}-${item}`} className="flex gap-1.5 items-center mb-1">
                    <span className="text-xs shrink-0" style={{ color: TIER_COLOR[zone.tier] }}>▸</span>
                    <span className="text-xs opacity-70">{item}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="px-6 py-2.5 border-t border-black/8 text-xs tracking-normal opacity-30">
        LOOT TIERS BASED ON ITEM DENSITY AND QUALITY — COMPETITIVE LOBBIES S03 2026
      </div>
    </div>
  );
}
