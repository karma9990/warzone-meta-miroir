'use client';

import { useState } from 'react';

type MapId = 'rebirth' | 'haven';

interface POI {
  id: string;
  label: string;
  x: number;
  y: number;
  difficulty: 'hot' | 'medium' | 'quiet';
}

const REBIRTH_POIS: POI[] = [
  { id: 'rebirth-headquarters', label: 'HQ',            x: 33, y: 65, difficulty: 'hot' },
  { id: 'rebirth-prison',       label: 'Prison',        x: 52, y: 48, difficulty: 'hot' },
  { id: 'rebirth-bioweapons',   label: 'Bioweapons',    x: 74, y: 18, difficulty: 'quiet' },
  { id: 'rebirth-chemical-engineer', label: 'Chem Eng', x: 82, y: 32, difficulty: 'quiet' },
  { id: 'rebirth-control-center',    label: 'Control',  x: 41, y: 50, difficulty: 'hot' },
  { id: 'rebirth-industry',    label: 'Industry',       x: 63, y: 28, difficulty: 'quiet' },
  { id: 'rebirth-turbines',    label: 'Turbines',       x: 49, y: 34, difficulty: 'medium' },
  { id: 'rebirth-factory',     label: 'Factory',        x: 55, y: 63, difficulty: 'medium' },
  { id: 'rebirth-dock',        label: 'Dock',           x: 23, y: 43, difficulty: 'quiet' },
  { id: 'rebirth-stronghold',  label: 'Stronghold',     x: 17, y: 73, difficulty: 'hot' },
  { id: 'rebirth-living-quarters', label: 'Living Qtrs',x: 36, y: 76, difficulty: 'medium' },
  { id: 'rebirth-harbor',      label: 'Harbor',         x: 65, y: 57, difficulty: 'quiet' },
];

const HAVEN_POIS: POI[] = [
  { id: 'haven-mansion',        label: 'Mansion',       x: 48, y: 21, difficulty: 'hot' },
  { id: 'haven-pond',           label: 'Pond',          x: 27, y: 31, difficulty: 'quiet' },
  { id: 'haven-train-station',  label: 'Train Stn',     x: 17, y: 43, difficulty: 'medium' },
  { id: 'haven-barn',           label: 'Barn',          x: 42, y: 44, difficulty: 'hot' },
  { id: 'haven-main-street',    label: 'Main St.',      x: 32, y: 59, difficulty: 'hot' },
  { id: 'haven-riverboat',      label: 'Riverboat',     x: 43, y: 69, difficulty: 'quiet' },
  { id: 'haven-research-center',label: 'Research',      x: 72, y: 38, difficulty: 'medium' },
  { id: 'haven-coal-depot',     label: 'Coal Depot',    x: 65, y: 55, difficulty: 'quiet' },
  { id: 'haven-lumbermill',     label: 'Lumbermill',    x: 63, y: 66, difficulty: 'medium' },
];

const DIFF_COLOR = {
  hot:    '#ff4455',
  medium: '#ffcc00',
  quiet:  '#00ff88',
};

function scrollTo(id: string) {
  const titleId = `rebirth-${id}` in document.getElementById ? id : id;
  const el = document.getElementById(titleId);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function SpawnMapSelector() {
  const [map, setMap] = useState<MapId>('rebirth');
  const [hovered, setHovered] = useState<string | null>(null);

  const pois = map === 'rebirth' ? REBIRTH_POIS : HAVEN_POIS;
  const mapSrc = map === 'rebirth'
    ? '/assets/tools/pro-movement/map-rebirth.jpg'
    : '/assets/tools/pro-movement/map-haven.jpg';

  return (
    <div style={{ marginBottom: '2.5rem', border: '1px solid rgba(0,0,0,0.12)', borderRadius: '4px', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.1)', background: 'rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: 'monospace', fontSize: '0.45rem', letterSpacing: '0.2em', opacity: 0.4, marginBottom: '0.2rem' }}>INTERACTIVE MAP</div>
          <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.08em' }}>CLICK A POI TO JUMP TO ITS SECTION</div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {(['rebirth', 'haven'] as MapId[]).map(m => (
            <button key={m} onClick={() => setMap(m)} style={{
              fontFamily: 'monospace', fontSize: '0.5rem', letterSpacing: '0.12em',
              padding: '5px 14px', borderRadius: '2px', cursor: 'pointer',
              border: `1px solid ${map === m ? '#00ff88' : 'rgba(0,0,0,0.2)'}`,
              background: map === m ? 'rgba(0,255,136,0.08)' : 'transparent',
              color: map === m ? '#00ff88' : 'rgba(0,0,0,0.5)',
            }}>
              {m === 'rebirth' ? 'REBIRTH' : 'HAVEN'}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ padding: '0.6rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', gap: '1.5rem' }}>
        {(['hot', 'medium', 'quiet'] as const).map(d => (
          <div key={d} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: DIFF_COLOR[d] }} />
            <span style={{ fontFamily: 'monospace', fontSize: '0.42rem', letterSpacing: '0.12em', opacity: 0.5 }}>
              {d === 'hot' ? 'HOT DROP' : d === 'medium' ? 'MEDIUM' : 'QUIET'}
            </span>
          </div>
        ))}
      </div>

      {/* Map */}
      <div style={{ position: 'relative', width: '100%' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mapSrc} alt={map} style={{ width: '100%', height: 'auto', display: 'block' }} />

        {pois.map(poi => (
          <button
            key={poi.id}
            onClick={() => scrollTo(poi.id)}
            onMouseEnter={() => setHovered(poi.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              position: 'absolute',
              left: `${poi.x}%`,
              top: `${poi.y}%`,
              transform: 'translate(-50%, -50%)',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              zIndex: 10,
            }}
          >
            <div style={{
              width: hovered === poi.id ? 14 : 10,
              height: hovered === poi.id ? 14 : 10,
              borderRadius: '50%',
              background: DIFF_COLOR[poi.difficulty],
              border: `2px solid rgba(0,0,0,0.5)`,
              boxShadow: `0 0 6px ${DIFF_COLOR[poi.difficulty]}`,
              transition: 'all 0.15s',
            }} />
            {hovered === poi.id && (
              <div style={{
                position: 'absolute',
                bottom: '120%',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.85)',
                color: '#fff',
                fontFamily: 'monospace',
                fontSize: '0.5rem',
                letterSpacing: '0.1em',
                padding: '3px 8px',
                borderRadius: '2px',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
              }}>
                {poi.label}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
