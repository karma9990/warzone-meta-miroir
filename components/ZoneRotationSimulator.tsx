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
    <div className="border border-black/12 rounded mb-8 overflow-hidden font-mono">
      <div className="px-6 py-5 border-b border-black/10 bg-black/2">
        <div className="text-xs tracking-normal opacity-40 mb-1">INTERACTIVE SIMULATOR</div>
        <div className="text-base font-bold tracking-normal">ZONE ROTATION SIMULATOR</div>
      </div>

      <div className="p-6">
        {/* Map selector */}
        <div className="mb-6">
          <div className="text-xs tracking-normal opacity-40 mb-2.5">MAP</div>
          <div className="flex gap-2">
            {(['rebirth', 'haven'] as MapId[]).map(m => (
              <button type="button" key={m} onClick={() => { setMap(m); setZone(''); setDir(null); }}
                className="font-mono text-xs tracking-normal cursor-pointer rounded-sm"
                style={{
                  padding: '6px 18px',
                  border: `1px solid ${map === m ? '#00ff88' : 'rgba(0,0,0,0.15)'}`,
                  background: map === m ? 'rgba(0,255,136,0.08)' : 'transparent',
                  color: map === m ? '#00ff88' : 'rgba(0,0,0,0.45)',
                }}
              >
                {m === 'rebirth' ? 'REBIRTH ISLAND' : 'HAVEN HOLLOW'}
              </button>
            ))}
          </div>
        </div>

        {/* Zone selector */}
        <div className="mb-6">
          <div className="text-xs tracking-normal opacity-40 mb-2.5">CURRENT POSITION</div>
          <div className="flex flex-wrap gap-1">
            {ZONES[map].map(z => (
              <button type="button" key={z} onClick={() => setZone(z)}
                className="font-mono text-xs tracking-normal cursor-pointer rounded-sm transition-[border-color] duration-100"
                style={{
                  padding: '5px 12px',
                  border: `1px solid ${zone === z ? '#00ff88' : 'rgba(0,0,0,0.12)'}`,
                  background: zone === z ? 'rgba(0,255,136,0.08)' : 'transparent',
                  color: zone === z ? '#00ff88' : 'rgba(0,0,0,0.5)',
                }}
              >
                {z}
              </button>
            ))}
          </div>
        </div>

        {/* Direction compass */}
        <div className="mb-6">
          <div className="text-xs tracking-normal opacity-40 mb-2.5">CIRCLE DIRECTION</div>
          <div className="inline-grid grid-cols-3 gap-[3px]" style={{ gridTemplateRows: 'repeat(3, 44px)' }}>
            {COMPASS.map((d, i) =>
              d === null ? (
                <div key={i} className="flex items-center justify-center text-xs opacity-30 tracking-normal rounded-sm"
                  style={{ background: 'rgba(0,0,0,0.06)' }}
                >POS</div>
              ) : (
                <button type="button" key={d} onClick={() => setDir(d)}
                  className="font-mono text-xs tracking-normal cursor-pointer rounded-sm transition-all duration-100"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1px solid ${dir === d ? '#00ff88' : 'rgba(0,0,0,0.12)'}`,
                    background: dir === d ? 'rgba(0,255,136,0.1)' : 'rgba(0,0,0,0.02)',
                    color: dir === d ? '#00ff88' : 'rgba(0,0,0,0.45)',
                    fontWeight: dir === d ? 700 : 400,
                  }}
                >
                  {d}
                </button>
              )
            )}
          </div>
        </div>

        {/* Routes output */}
        {routes ? (
          <div>
            <div className="text-xs tracking-normal opacity-40 mb-3">
              RECOMMENDED ROUTES - {zone.toUpperCase()} {'->'} CIRCLE {dir}
            </div>
            <div className="flex flex-col gap-[0.65rem]">
              {routes.map((route) => {
                const rc = RISK_COLOR[route.risk];
                return (
                  <div key={`${route.name}-${route.time}`} className="rounded-sm"
                    style={{
                      borderLeft: `3px solid ${rc}`, border: `1px solid ${rc}30`, borderLeftWidth: '3px',
                      padding: '1rem 1.25rem', background: `${rc}05`,
                    }}
                  >
                    <div className="flex justify-between items-center mb-[0.45rem]">
                      <span className="text-xs font-bold tracking-normal">{route.name}</span>
                      <div className="flex gap-2 items-center">
                        <span className="text-xs opacity-45 tracking-normal">{route.time}</span>
                        <span className="text-xs tracking-normal rounded-sm px-2 py-0.5"
                          style={{ background: `${rc}18`, border: `1px solid ${rc}45`, color: rc }}
                        >
                          {route.risk} RISK
                        </span>
                      </div>
                    </div>
                    <div className="text-xs opacity-45 tracking-normal mb-[0.45rem] italic">{route.path}</div>
                    <div className="text-xs opacity-65 leading-relaxed">{route.note}</div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 text-xs opacity-28 tracking-normal">
              STRATEGIC ROUTES - ADAPT IN REAL TIME TO ENEMY POSITIONS
            </div>
          </div>
        ) : (
          <div className="p-8 text-center border border-dashed border-black/10 rounded-sm">
            <div className="text-xs opacity-32 tracking-normal">
              {!zone ? 'SELECT YOUR CURRENT POSITION' : 'SELECT THE CIRCLE DIRECTION'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
