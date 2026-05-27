'use client';

import { useState } from 'react';

type MapId = 'rebirth' | 'haven';

interface ZoneData {
  spawn: string;
  zones: { area: string; probability: number; note: string }[];
  earlyAdvantage: string;
  lateRisk: string;
}

const REBIRTH_DATA: ZoneData[] = [
  {
    spawn: 'Bioweapons',
    zones: [
      { area: 'Bio Labs / Industry',   probability: 38, note: 'Northeast zones close here most often — elevation advantage preserved' },
      { area: 'HQ / Prison',           probability: 28, note: 'Central pull — easy rotation south via inner corridors' },
      { area: 'Chemical Engineer',     probability: 18, note: 'Eastern edge final — contested but manageable with height' },
      { area: 'Stronghold / Dock',     probability: 16, note: 'Western final — long rotation required, rotate early' },
    ],
    earlyAdvantage: 'Rooftop dominance in the NE quadrant. Zone pulls toward you 38% of games.',
    lateRisk: 'Western finals require a long exposed rotation — be ready to move at circle 3.',
  },
  {
    spawn: 'Prison',
    zones: [
      { area: 'HQ / Control Center',   probability: 35, note: 'Classic central final — Prison tower gives early read on the zone' },
      { area: 'Bio Labs / Industry',   probability: 25, note: 'East pull — rotate via north shore to avoid courtyard exposure' },
      { area: 'Prison / Turbines',     probability: 22, note: 'Zone stays on you — hold the tower and let them come to you' },
      { area: 'Dock / Stronghold',     probability: 18, note: 'West final — straight south rotation, low risk' },
    ],
    earlyAdvantage: 'Tower gives information advantage on 100% of approaches.',
    lateRisk: 'East finals require crossing open ground — if late, you arrive under fire.',
  },
  {
    spawn: 'HQ (Headquaters)',
    zones: [
      { area: 'HQ / Living Quarters',  probability: 42, note: 'Zone stays near spawn — highest frequency final for this drop' },
      { area: 'Control Center / Prison', probability: 28, note: 'Short north rotation — easy to establish before others arrive' },
      { area: 'Factory / Harbor',      probability: 18, note: 'South final — hold Factory roof before zone closes' },
      { area: 'Bio Labs',              probability: 12, note: 'Long east rotation — must move at circle 2 or arrive too late' },
    ],
    earlyAdvantage: 'Zone comes to you 42% of games — HQ is the highest-frequency final circle drop.',
    lateRisk: 'Bio Labs finals are nearly unwinnable from HQ if you delay the rotation past circle 2.',
  },
  {
    spawn: 'Factory',
    zones: [
      { area: 'Factory / Harbor',      probability: 35, note: 'South final — best-case scenario, short hold on Factory roof' },
      { area: 'Living Quarters / HQ',  probability: 30, note: 'Central pull — short north rotation via building line' },
      { area: 'Chemical Engineer',     probability: 20, note: 'East push — rotate before circle 2, not after' },
      { area: 'Prison',                probability: 15, note: 'Long north rotation — move immediately when zone drops' },
    ],
    earlyAdvantage: 'Quietest early game — full loot before first engagement.',
    lateRisk: 'Prison finals require crossing the entire island. If you are still at Factory at circle 3, you will die in the gas.',
  },
];

const HAVEN_DATA: ZoneData[] = [
  {
    spawn: 'Mansion',
    zones: [
      { area: 'Mansion / Pond',       probability: 40, note: 'Zone stays north — highest frequency final for north drops' },
      { area: 'Basin / Main Street',  probability: 30, note: 'Central pull — short rotation south before mid-game' },
      { area: 'Research Center',      probability: 18, note: 'East final — easy rotate via the north corridor' },
      { area: 'Riverboat',            probability: 12, note: 'South final — long rotation, must move at circle 2' },
    ],
    earlyAdvantage: 'Rooftop gives 360° early-game information. Zone stays north 40% of games.',
    lateRisk: 'Riverboat and Lumbermill finals require full-island rotations — recognize them early.',
  },
  {
    spawn: 'Train Station',
    zones: [
      { area: 'Train Station / Pond', probability: 38, note: 'West final — best-case zone for this spawn, hold and let them come' },
      { area: 'Main Street / Basin',  probability: 32, note: 'Central pull — rotate east early to establish before Basin is contested' },
      { area: 'Riverboat',            probability: 18, note: 'South final — southern rotation via the water edge, move at circle 2' },
      { area: 'Lumbermill',           probability: 12, note: 'East final — long rotation, abandon Train Station at first circle' },
    ],
    earlyAdvantage: 'Western corridor control — no one can rotate west without going through you.',
    lateRisk: 'East finals (Lumbermill, Research Center) require crossing Main Street under fire.',
  },
  {
    spawn: 'Basin',
    zones: [
      { area: 'Basin / Main Street',  probability: 45, note: 'Highest final frequency on Haven — Basin is the most common end zone' },
      { area: 'Pond / Mansion',       probability: 22, note: 'North final — short rotate, establish on Pond rooftop' },
      { area: 'Riverboat',            probability: 20, note: 'South final — easy short rotate to Riverboat staging point' },
      { area: 'Lumbermill / Research', probability: 13, note: 'East final — move through Coal Depot to avoid exposure' },
    ],
    earlyAdvantage: 'Center of the map = center of the final circle 45% of games. Hold Basin, win the game.',
    lateRisk: 'Being central means you are always contested — never static, always have a rotation plan.',
  },
  {
    spawn: 'Lumbermill',
    zones: [
      { area: 'Lumbermill / Coal Depot', probability: 35, note: 'East final — best case, hold the upper floor and wait' },
      { area: 'Basin / Main Street',     probability: 30, note: 'Central pull — rotate west through Coal Depot early' },
      { area: 'Research Center',         probability: 22, note: 'Northeast final — easy short rotate to Research' },
      { area: 'Riverboat',               probability: 13, note: 'South final — must cross Main Street, do it before circle 3' },
    ],
    earlyAdvantage: 'East side is underplayed — full loot and elevated position with low early-game pressure.',
    lateRisk: 'Western finals require crossing Main Street. That crossing is the most dangerous move on Haven.',
  },
];

const MAP_DATA: Record<MapId, { label: string; zones: ZoneData[] }> = {
  rebirth: { label: 'Rebirth Island', zones: REBIRTH_DATA },
  haven:   { label: 'Haven Hollow',   zones: HAVEN_DATA },
};

export default function ZonePredictor() {
  const [map, setMap] = useState<MapId>('rebirth');
  const [spawn, setSpawn] = useState<string>(REBIRTH_DATA[0].spawn);

  const data = MAP_DATA[map];
  const spawnData = data.zones.find(z => z.spawn === spawn) ?? data.zones[0];

  const handleMapChange = (m: MapId) => {
    setMap(m);
    setSpawn(MAP_DATA[m].zones[0].spawn);
  };

  return (
    <div style={{ border: '1px solid rgba(0,0,0,0.12)', borderRadius: '4px', marginBottom: '3rem', overflow: 'hidden', fontFamily: 'monospace' }}>
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.1)', background: 'rgba(0,0,0,0.02)' }}>
        <div style={{ fontSize: '0.55rem', letterSpacing: '0.2em', opacity: 0.4, marginBottom: '0.3rem' }}>MAP INTELLIGENCE</div>
        <div style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.08em' }}>ZONE PREDICTOR</div>
      </div>

      {/* Map selector */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
        {(['rebirth', 'haven'] as MapId[]).map(m => (
          <button key={m} onClick={() => handleMapChange(m)} style={{
            padding: '0.75rem 1.5rem', border: 'none',
            borderBottom: map === m ? '2px solid currentColor' : '2px solid transparent',
            background: 'transparent', color: map === m ? 'inherit' : 'rgba(0,0,0,0.35)',
            fontSize: '0.6rem', letterSpacing: '0.15em', cursor: 'pointer', fontFamily: 'monospace', fontWeight: map === m ? 700 : 400,
          }}>
            {MAP_DATA[m].label.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Spawn selector */}
      <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
        {data.zones.map(z => (
          <button key={z.spawn} onClick={() => setSpawn(z.spawn)} style={{
            padding: '4px 12px', border: `1px solid ${spawn === z.spawn ? 'currentColor' : 'rgba(0,0,0,0.12)'}`,
            borderRadius: '2px', background: 'transparent', fontSize: '0.55rem', letterSpacing: '0.08em',
            cursor: 'pointer', fontFamily: 'monospace', fontWeight: spawn === z.spawn ? 700 : 400, opacity: spawn === z.spawn ? 1 : 0.5,
          }}>
            {z.spawn}
          </button>
        ))}
      </div>

      {/* Zone probabilities */}
      <div style={{ padding: '1.5rem' }}>
        <div style={{ fontSize: '0.45rem', letterSpacing: '0.15em', opacity: 0.4, marginBottom: '1rem' }}>
          FINAL CIRCLE PROBABILITY — DROP: {spawnData.spawn.toUpperCase()}
        </div>

        {spawnData.zones.map((zone, i) => (
          <div key={i} style={{ marginBottom: '1.1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>{zone.area}</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: zone.probability >= 35 ? '#00ff88' : zone.probability >= 20 ? '#ffcc00' : '#8899aa' }}>
                {zone.probability}%
              </span>
            </div>
            <div style={{ height: '5px', background: 'rgba(0,0,0,0.07)', borderRadius: '2px', marginBottom: '0.3rem' }}>
              <div style={{
                height: '100%', borderRadius: '2px', transition: 'width 0.4s',
                width: `${zone.probability}%`,
                background: zone.probability >= 35 ? '#00ff88' : zone.probability >= 20 ? '#ffcc00' : '#8899aa',
              }} />
            </div>
            <div style={{ fontSize: '0.54rem', opacity: 0.5, lineHeight: 1.5 }}>{zone.note}</div>
          </div>
        ))}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
          <div style={{ padding: '0.9rem', border: '1px solid rgba(0,255,136,0.2)', borderRadius: '3px', background: 'rgba(0,255,136,0.04)' }}>
            <div style={{ fontSize: '0.45rem', letterSpacing: '0.12em', color: '#00ff88', marginBottom: '0.4rem' }}>EARLY ADVANTAGE</div>
            <div style={{ fontSize: '0.57rem', opacity: 0.7, lineHeight: 1.6 }}>{spawnData.earlyAdvantage}</div>
          </div>
          <div style={{ padding: '0.9rem', border: '1px solid rgba(255,68,85,0.2)', borderRadius: '3px', background: 'rgba(255,68,85,0.04)' }}>
            <div style={{ fontSize: '0.45rem', letterSpacing: '0.12em', color: '#ff4455', marginBottom: '0.4rem' }}>LATE RISK</div>
            <div style={{ fontSize: '0.57rem', opacity: 0.7, lineHeight: 1.6 }}>{spawnData.lateRisk}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0.6rem 1.5rem', borderTop: '1px solid rgba(0,0,0,0.08)', fontSize: '0.5rem', letterSpacing: '0.12em', opacity: 0.3 }}>
        PROBABILITIES BASED ON COMPETITIVE LOBBY DATA — S03 2026
      </div>
    </div>
  );
}
