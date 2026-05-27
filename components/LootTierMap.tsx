'use client';

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
    <div style={{ border: '1px solid rgba(0,0,0,0.12)', borderRadius: '4px', marginBottom: '3rem', overflow: 'hidden', fontFamily: 'monospace' }}>
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.1)', background: 'rgba(0,0,0,0.02)' }}>
        <div style={{ fontSize: '0.55rem', letterSpacing: '0.2em', opacity: 0.4, marginBottom: '0.3rem' }}>MAP INTELLIGENCE</div>
        <div style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.08em' }}>LOOT TIER MAP</div>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
        {(['rebirth', 'haven'] as MapId[]).map(m => (
          <button key={m} onClick={() => { setActiveMap(m); setActiveZone(null); }} style={{
            padding: '0.75rem 1.5rem', border: 'none',
            borderBottom: activeMap === m ? '2px solid currentColor' : '2px solid transparent',
            background: 'transparent', color: activeMap === m ? 'inherit' : 'rgba(0,0,0,0.35)',
            fontSize: '0.6rem', letterSpacing: '0.15em', cursor: 'pointer', fontFamily: 'monospace', fontWeight: activeMap === m ? 700 : 400,
          }}>{MAPS[m].label.toUpperCase()}</button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem', padding: '0 1rem', alignItems: 'center' }}>
          {(['all', 'S', 'A', 'B', 'C'] as const).map(t => (
            <button key={t} onClick={() => setFilterTier(t)} style={{
              padding: '3px 8px', border: `1px solid ${filterTier === t ? (t === 'all' ? 'currentColor' : TIER_COLOR[t as Tier]) : 'rgba(0,0,0,0.12)'}`,
              borderRadius: '2px', background: 'transparent',
              color: filterTier === t && t !== 'all' ? TIER_COLOR[t as Tier] : 'inherit',
              fontSize: '0.5rem', letterSpacing: '0.08em', cursor: 'pointer', fontFamily: 'monospace',
              fontWeight: filterTier === t ? 700 : 400, opacity: filterTier === t ? 1 : 0.45,
            }}>{t === 'all' ? 'ALL' : `[${t}]`}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', alignItems: 'start' }}>
        <div style={{ position: 'relative', background: '#111', borderRight: '1px solid rgba(0,0,0,0.08)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={map.image} alt={map.label} style={{ width: '100%', height: 'auto', display: 'block', opacity: 0.7 }} />
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            {filtered.map(z => {
              const isActive = z.id === activeZone;
              const color = TIER_COLOR[z.tier];
              return (
                <g key={z.id} style={{ cursor: 'pointer' }} onClick={() => setActiveZone(isActive ? null : z.id)}>
                  <circle cx={z.x} cy={z.y} r="4" fill="transparent" />
                  <circle cx={z.x} cy={z.y} r={isActive ? 3 : 2.2} fill={isActive ? color : `${color}99`} stroke={color} strokeWidth="0.4" />
                  {isActive && <circle cx={z.x} cy={z.y} r="4.5" fill="none" stroke={color} strokeWidth="0.4" opacity="0.5" />}
                  <text x={z.x} y={z.y + 0.4} textAnchor="middle" dominantBaseline="middle" fontSize="1.8" fontWeight="bold" fill={isActive ? '#000' : '#fff'} style={{ pointerEvents: 'none', fontFamily: 'monospace' }}>{z.tier}</text>
                </g>
              );
            })}
          </svg>
          {!activeZone && (
            <div style={{ position: 'absolute', bottom: '1rem', left: '50%', transform: 'translateX(-50%)', fontSize: '0.5rem', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.5)', background: 'rgba(0,0,0,0.5)', padding: '4px 10px', borderRadius: '2px', whiteSpace: 'nowrap' }}>
              SELECT A ZONE
            </div>
          )}
        </div>

        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {!zone ? (
            <>
              <div style={{ fontSize: '0.55rem', letterSpacing: '0.12em', opacity: 0.4, marginBottom: '0.25rem' }}>ZONE RANKING</div>
              {(['S', 'A', 'B', 'C'] as Tier[]).map(tier => {
                const zones = map.zones.filter(z => z.tier === tier && (filterTier === 'all' || filterTier === tier));
                if (!zones.length) return null;
                return (
                  <div key={tier}>
                    <div style={{ fontSize: '0.5rem', fontWeight: 700, color: TIER_COLOR[tier], letterSpacing: '0.1em', marginBottom: '0.35rem' }}>[{tier}] TIER</div>
                    {zones.map(z => (
                      <button key={z.id} onClick={() => setActiveZone(z.id)} style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', width: '100%',
                        background: TIER_BG[z.tier], border: `1px solid ${TIER_COLOR[z.tier]}30`,
                        borderRadius: '2px', cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.6rem',
                        letterSpacing: '0.05em', textAlign: 'left', marginBottom: '0.25rem',
                      }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = TIER_COLOR[z.tier])}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = `${TIER_COLOR[z.tier]}30`)}
                      >
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: TIER_COLOR[z.tier], flexShrink: 0 }} />
                        {z.label}
                      </button>
                    ))}
                  </div>
                );
              })}
            </>
          ) : (
            <>
              <button onClick={() => setActiveZone(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.5rem', letterSpacing: '0.12em', opacity: 0.4, padding: 0, textAlign: 'left' }}>← ALL ZONES</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: TIER_COLOR[zone.tier], border: `1px solid ${TIER_COLOR[zone.tier]}`, padding: '2px 6px', borderRadius: '2px' }}>[{zone.tier}]</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{zone.label}</span>
              </div>
              <div style={{ padding: '0.75rem', background: TIER_BG[zone.tier], borderRadius: '3px', fontSize: '0.57rem', opacity: 0.7, lineHeight: 1.6 }}>{zone.note}</div>
              <div>
                <div style={{ fontSize: '0.45rem', letterSpacing: '0.15em', opacity: 0.4, marginBottom: '0.5rem' }}>EXPECTED LOOT</div>
                {zone.items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <span style={{ color: TIER_COLOR[zone.tier], fontSize: '0.55rem', flexShrink: 0 }}>▸</span>
                    <span style={{ fontSize: '0.58rem', opacity: 0.7 }}>{item}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ padding: '0.6rem 1.5rem', borderTop: '1px solid rgba(0,0,0,0.08)', fontSize: '0.5rem', letterSpacing: '0.12em', opacity: 0.3 }}>
        LOOT TIERS BASED ON ITEM DENSITY AND QUALITY — COMPETITIVE LOBBIES S03 2026
      </div>
    </div>
  );
}
