'use client';

import Image from 'next/image';
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
  const el = document.getElementById(id);
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
    <div className="mb-10 border border-black/12 rounded overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-black/10 bg-black/2 flex justify-between items-center">
        <div>
          <div className="font-mono text-xs tracking-normal opacity-40 mb-0.5">INTERACTIVE MAP</div>
          <div className="font-mono text-sm font-bold tracking-normal">CLICK A POI TO JUMP TO ITS SECTION</div>
        </div>
        <div className="flex gap-2">
          {(['rebirth', 'haven'] as MapId[]).map(m => (
            <button type="button" key={m} onClick={() => setMap(m)}
              className="font-mono text-xs tracking-normal cursor-pointer rounded-sm"
              style={{
                padding: '5px 14px',
                border: `1px solid ${map === m ? '#00ff88' : 'rgba(0,0,0,0.2)'}`,
                background: map === m ? 'rgba(0,255,136,0.08)' : 'transparent',
                color: map === m ? '#00ff88' : 'rgba(0,0,0,0.5)',
              }}
            >
              {m === 'rebirth' ? 'REBIRTH' : 'HAVEN'}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="px-6 py-2.5 border-b border-black/6 flex gap-6">
        {(['hot', 'medium', 'quiet'] as const).map(d => (
          <div key={d} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ background: DIFF_COLOR[d] }} />
            <span className="font-mono text-xs tracking-normal opacity-50">
              {d === 'hot' ? 'HOT DROP' : d === 'medium' ? 'MEDIUM' : 'QUIET'}
            </span>
          </div>
        ))}
      </div>

      {/* Map */}
      <div className="relative w-full">
        <Image src={mapSrc} alt={map} width={1000} height={700} className="w-full h-auto block" />

        {pois.map(poi => (
          <button type="button" key={poi.id} onClick={() => scrollTo(poi.id)}
            onMouseEnter={() => setHovered(poi.id)}
            onMouseLeave={() => setHovered(null)}
            className="absolute bg-transparent border-none p-0 cursor-pointer"
            style={{
              left: `${poi.x}%`, top: `${poi.y}%`,
              transform: 'translate(-50%, -50%)', zIndex: 10,
            }}
          >
            <div className="rounded-full transition-all duration-150"
              style={{
                width: hovered === poi.id ? 14 : 10,
                height: hovered === poi.id ? 14 : 10,
                background: DIFF_COLOR[poi.difficulty],
                border: '2px solid rgba(0,0,0,0.5)',
                boxShadow: `0 0 6px ${DIFF_COLOR[poi.difficulty]}`,
              }}
            />
            {hovered === poi.id && (
              <div className="absolute font-mono text-xs tracking-normal whitespace-nowrap px-2 py-[3px] rounded-sm pointer-events-none"
                style={{
                  bottom: '120%', left: '50%', transform: 'translateX(-50%)',
                  background: 'rgba(0,0,0,0.85)', color: '#fff',
                }}
              >
                {poi.label}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
