'use client';

import { useState } from 'react';

type MapId = 'rebirth' | 'haven';
type Direction = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
type Risk = 'LOW' | 'MED' | 'HIGH';

interface Route {
  name: string;
  path: string;
  risk: Risk;
  time: string;
  note: string;
}

const ZONES: Record<MapId, string[]> = {
  rebirth: ['Bioweapons', 'Turbines', 'Industry', 'Chemical Engineer', 'Dock', 'Control Center', 'Prison', 'Harbor', 'HQ', 'Factory', 'Stronghold', 'Living Quarters'],
  haven:   ['Mansion', 'Pond', 'Research Center', 'Train Station', 'Basin', 'Coal Depot', 'Main Street', 'Riverboat', 'Lumbermill'],
};

const COMPASS: (Direction | null)[] = ['NW', 'N', 'NE', 'W', null, 'E', 'SW', 'S', 'SE'];

const RISK_COLOR: Record<Risk, string> = {
  LOW:  '#00ff88',
  MED:  '#ffcc00',
  HIGH: '#ff5555',
};

const EDGE_ZONES: Record<MapId, string[]> = {
  rebirth: ['Stronghold', 'Dock', 'Bioweapons', 'Chemical Engineer', 'Living Quarters', 'Factory'],
  haven:   ['Mansion', 'Train Station', 'Research Center', 'Riverboat', 'Lumbermill'],
};

const CENTRAL_ZONES: Record<MapId, string[]> = {
  rebirth: ['Prison', 'Control Center', 'HQ', 'Turbines'],
  haven:   ['Basin', 'Main Street'],
};

function getDirectionLabel(dir: Direction): string {
  const labels: Record<Direction, string> = {
    N: 'nord', NE: 'nord-est', E: 'est', SE: 'sud-est',
    S: 'sud', SW: 'sud-ouest', W: 'ouest', NW: 'nord-ouest',
  };
  return labels[dir];
}

function buildRoutes(zone: string, dir: Direction, map: MapId): Route[] {
  const isEdge    = EDGE_ZONES[map].includes(zone);
  const isCentral = CENTRAL_ZONES[map].includes(zone);
  const dirLabel  = getDirectionLabel(dir);

  const DIRS: Direction[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const idx = DIRS.indexOf(dir);
  const flankDir = getDirectionLabel(DIRS[(idx + 2) % 8]);

  return [
    {
      name: 'DIRECT ROUTE',
      path: `${zone} -> straight line toward the ${dirLabel} edge of the circle`,
      risk: isEdge ? 'HIGH' : 'MED',
      time: '15–25s',
      note: isEdge
        ? `You are already starting from a map edge. The direct route crosses open ground and has high exposure risk. Take it only if no squad is ahead of you.`
        : `Fastest option. Watch for squads already posted in the rotation lane. Slide cancel while crossing open areas.`,
    },
    {
      name: 'FLANK APPROACH',
      path: `${zone} -> push ${flankDir} first -> converge on the circle from the side`,
      risk: 'MED',
      time: '25–40s',
      note: isCentral
        ? `Strong from a central position. The wide flank avoids the main lane and is usually less contested. You arrive with the surprise angle.`
        : `Takes about 10 seconds longer but reaches the target zone from an unexpected angle. Good for intercepting rotating squads.`,
    },
    {
      name: 'COVERED ROTATION',
      path: `${zone} -> building to building -> enter the zone from the protected side`,
      risk: 'LOW',
      time: '30–50s',
      note: `Use this when enemy squads are confirmed ahead of you. Slower, but you arrive with full armor and no gas damage. Recommended in top 5 late circles.`,
    },
  ];
}

export default function ZoneRotationSimulator() {
  const [map, setMap] = useState<MapId>('rebirth');
  const [zone, setZone] = useState('');
  const [dir, setDir] = useState<Direction | null>(null);

  const routes = zone && dir ? buildRoutes(zone, dir, map) : null;

  return (
    <div style={{ border: '1px solid rgba(0,0,0,0.12)', borderRadius: '4px', marginBottom: '2rem', overflow: 'hidden', fontFamily: 'monospace' }}>

      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.1)', background: 'rgba(0,0,0,0.02)' }}>
        <div style={{ fontSize: '0.55rem', letterSpacing: '0.2em', opacity: 0.4, marginBottom: '0.3rem' }}>INTERACTIVE SIMULATOR</div>
        <div style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.08em' }}>ZONE ROTATION SIMULATOR</div>
      </div>

      <div style={{ padding: '1.5rem' }}>

        {/* Map selector */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.5rem', letterSpacing: '0.12em', opacity: 0.4, marginBottom: '0.6rem' }}>MAP</div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(['rebirth', 'haven'] as MapId[]).map(m => (
              <button key={m} onClick={() => { setMap(m); setZone(''); setDir(null); }} style={{ padding: '6px 18px', border: `1px solid ${map === m ? '#00ff88' : 'rgba(0,0,0,0.15)'}`, background: map === m ? 'rgba(0,255,136,0.08)' : 'transparent', color: map === m ? '#00ff88' : 'rgba(0,0,0,0.45)', fontFamily: 'monospace', fontSize: '0.55rem', letterSpacing: '0.12em', cursor: 'pointer', borderRadius: '2px' }}>
                {m === 'rebirth' ? 'REBIRTH ISLAND' : 'HAVEN HOLLOW'}
              </button>
            ))}
          </div>
        </div>

        {/* Zone selector */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.5rem', letterSpacing: '0.12em', opacity: 0.4, marginBottom: '0.6rem' }}>CURRENT POSITION</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {ZONES[map].map(z => (
              <button key={z} onClick={() => setZone(z)} style={{ padding: '5px 12px', border: `1px solid ${zone === z ? '#00ff88' : 'rgba(0,0,0,0.12)'}`, background: zone === z ? 'rgba(0,255,136,0.08)' : 'transparent', color: zone === z ? '#00ff88' : 'rgba(0,0,0,0.5)', fontFamily: 'monospace', fontSize: '0.55rem', letterSpacing: '0.05em', cursor: 'pointer', borderRadius: '2px', transition: 'border-color 0.1s' }}>
                {z}
              </button>
            ))}
          </div>
        </div>

        {/* Direction compass */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.5rem', letterSpacing: '0.12em', opacity: 0.4, marginBottom: '0.6rem' }}>CIRCLE DIRECTION</div>
          <div style={{ display: 'inline-grid', gridTemplateColumns: 'repeat(3, 44px)', gridTemplateRows: 'repeat(3, 44px)', gap: '3px' }}>
            {COMPASS.map((d, i) =>
              d === null ? (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.06)', borderRadius: '3px', fontSize: '0.4rem', opacity: 0.3, letterSpacing: '0.06em' }}>POS</div>
              ) : (
                <button key={d} onClick={() => setDir(d)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${dir === d ? '#00ff88' : 'rgba(0,0,0,0.12)'}`, background: dir === d ? 'rgba(0,255,136,0.1)' : 'rgba(0,0,0,0.02)', color: dir === d ? '#00ff88' : 'rgba(0,0,0,0.45)', fontFamily: 'monospace', fontSize: '0.55rem', letterSpacing: '0.06em', cursor: 'pointer', borderRadius: '3px', fontWeight: dir === d ? 700 : 400, transition: 'all 0.1s' }}>
                  {d}
                </button>
              )
            )}
          </div>
        </div>

        {/* Routes output */}
        {routes ? (
          <div>
            <div style={{ fontSize: '0.5rem', letterSpacing: '0.12em', opacity: 0.4, marginBottom: '0.75rem' }}>
              RECOMMENDED ROUTES - {zone.toUpperCase()} {'->'} CIRCLE {dir}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {routes.map((route, i) => {
                const rc = RISK_COLOR[route.risk];
                return (
                  <div key={i} style={{ borderLeft: `3px solid ${rc}`, border: `1px solid ${rc}30`, borderLeftWidth: '3px', borderRadius: '3px', padding: '1rem 1.25rem', background: `${rc}05` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em' }}>{route.name}</span>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.45rem', opacity: 0.45, letterSpacing: '0.1em' }}>{route.time}</span>
                        <span style={{ padding: '2px 8px', background: `${rc}18`, border: `1px solid ${rc}45`, borderRadius: '2px', fontSize: '0.45rem', letterSpacing: '0.1em', color: rc }}>
                          {route.risk} RISK
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.52rem', opacity: 0.45, letterSpacing: '0.03em', marginBottom: '0.45rem', fontStyle: 'italic' }}>{route.path}</div>
                    <div style={{ fontSize: '0.56rem', opacity: 0.65, lineHeight: 1.65 }}>{route.note}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: '0.75rem', fontSize: '0.48rem', opacity: 0.28, letterSpacing: '0.08em' }}>
              STRATEGIC ROUTES - ADAPT IN REAL TIME TO ENEMY POSITIONS
            </div>
          </div>
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', border: '1px dashed rgba(0,0,0,0.1)', borderRadius: '3px' }}>
            <div style={{ fontSize: '0.55rem', opacity: 0.32, letterSpacing: '0.12em' }}>
              {!zone ? 'SELECT YOUR CURRENT POSITION' : 'SELECT THE CIRCLE DIRECTION'}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
