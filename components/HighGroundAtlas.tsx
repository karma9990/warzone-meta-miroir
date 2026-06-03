'use client';

import Image from 'next/image';
import { useState } from 'react';

type MapId = 'rebirth' | 'haven';
type Tier = 'S' | 'A' | 'B';

interface Spot {
  id: string;
  label: string;
  x: number;
  y: number;
  tier: Tier;
  why: string;
  approach: string;
  weakness: string;
}

const ATLAS: Record<MapId, { label: string; image: string; spots: Spot[] }> = {
  rebirth: {
    label: 'Rebirth Island',
    image: '/assets/tools/pro-movement/map-rebirth.jpg',
    spots: [
      {
        id: 'prison-tower', label: 'Prison Tower', x: 51, y: 47, tier: 'A',
        why: 'Highest point on the island. Clear 270-degree sightline. Controls rotations from Prison, Harbor and central courtyard.',
        approach: 'Use the interior stairs only. The outside wall is fully exposed from Bioweapons and Chemical Engineer.',
        weakness: 'Visible to rooftop snipers on Bioweapons. Hard to hold solo in late circles unless stair access is covered.',
      },
      {
        id: 'lighthouse', label: 'Lighthouse', x: 46, y: 59, tier: 'S',
        why: 'Dominant view over the full island. Lines of fire toward Harbor, Prison, Chemical Engineer and Industry. One of the few positions covering both east side and center map.',
        approach: 'Use the interior lighthouse stairs. Approach from the east along the coast from Harbor. Do not cross open ground between Industry and Prison.',
        weakness: 'Fixed position with limited escape angles. Easy for enemy teams to identify. Difficult exit if the zone pulls west.',
      },
      {
        id: 'water-tower', label: 'Water Tower', x: 64, y: 41, tier: 'A',
        why: 'Elevation inside the Prison compound. Controls main courtyard and southern access. Strong overwatch position for cell block entries.',
        approach: 'Exterior ladder at the base of the structure. Clear the ladder base before climbing because the entire climb is exposed.',
        weakness: 'Small top platform. Prison Tower has a downward angle on this position. Do not hold it alone.',
      },
      {
        id: 'bioweapons-roof', label: 'Bioweapons Roof', x: 68, y: 22, tier: 'A',
        why: 'North-east anchor. Hard to push from multiple directions. Controls Chemical Engineer and Industry rotation corridors.',
        approach: 'Exterior stairs on the east side. Fast from Bioweapons spawn. Pre-check roof edges before climbing.',
        weakness: 'Isolated position. If the circle pulls west or south, you are among the last players able to rotate safely.',
      },
      {
        id: 'control-top', label: 'Control Center Upper', x: 37, y: 47, tier: 'A',
        why: 'Mid-island dominance. Controls the main north-south rotation lane. Flank pressure mainly comes from HQ or Dock.',
        approach: 'Interior staircase. Do not climb from outside because Prison and Industry have full exposure angles.',
        weakness: 'Multiple upper-floor entry points. Requires two players to hold efficiently.',
      },
      {
        id: 'industry-roof', label: 'Industry Rooftop', x: 61, y: 31, tier: 'B',
        why: 'Mid-map elevation hub linking Bioweapons, Turbines and Harbor. Strong early-game position.',
        approach: 'South-side ladder. Fast access from Industry spawn.',
        weakness: 'Exposed to Prison Tower and Bioweapons at the same time. Not reliable in late circles.',
      },
    ],
  },
  haven: {
    label: 'Haven Hollow',
    image: '/assets/tools/pro-movement/map-haven.jpg',
    spots: [
      {
        id: 'mansion-roof', label: 'Mansion Rooftop', x: 50, y: 21, tier: 'S',
        why: 'Highest point on Haven. Covers Pond, Research Center and the entire north half. A squad holding this controls early rotations.',
        approach: 'Interior stairs to the upper floor, then exterior ladder to the roof. Never approach from the south because it is fully exposed.',
        weakness: 'Visible from Pond building and Research Center. Can be pressured from range before you stabilize.',
      },
      {
        id: 'pond-top', label: 'Pond Building Upper', x: 35, y: 27, tier: 'A',
        why: 'Controls the west approach to Mansion and the Pond-Basin rotation lane. Strong counter to Mansion holds.',
        approach: 'Interior stairs. Arrive before the Mansion team settles. Losing that timing means fighting from low ground.',
        weakness: 'Lower tier than Mansion. Any Mansion squad with a sniper has line of sight on this roof.',
      },
      {
        id: 'coal-upper', label: 'Coal Depot Upper', x: 65, y: 50, tier: 'A',
        why: 'East mid-map anchor. Controls the Research Center approach and Basin-east rotation. Key for late circles pulling south-east.',
        approach: 'East exterior stairs. Rotate from Research Center or Basin depending on spawn.',
        weakness: 'Exposed from Mansion to the north. Double exposure from Basin and Lumbermill.',
      },
      {
        id: 'lumbermill-upper', label: 'Lumbermill Upper', x: 64, y: 67, tier: 'B',
        why: 'Late-game anchor for south-east circles. Long sightlines toward Riverboat and Main Street. Underused position.',
        approach: 'Interior staircase. Come from Coal Depot. Approaching from the south along the water exposes you to Main Street.',
        weakness: 'Lower than Coal Depot. Isolated from main rotations. Effective only when the circle comes to you.',
      },
      {
        id: 'mainstreet-top', label: 'Main Street Parapet', x: 33, y: 55, tier: 'B',
        why: 'Central cover position in the most contested area. Controls Train Station approach and west Basin.',
        approach: 'Enter the building from the north. Do not climb from the south street in open air.',
        weakness: 'No elevation advantage over Pond or Mansion. Its value is cover and sightlines, not height.',
      },
    ],
  },
};

const TIER_COLOR: Record<Tier, string> = { S: '#00ff88', A: '#ffcc00', B: '#ff9944' };

export default function HighGroundAtlas() {
  const [activeMap, setActiveMap] = useState<MapId>('rebirth');
  const [activeSpot, setActiveSpot] = useState<string | null>(null);
  const map = ATLAS[activeMap];
  const spot = activeSpot ? map.spots.find((s) => s.id === activeSpot) ?? null : null;

  return (
    <div className="border border-black/12 rounded mb-8 overflow-hidden font-mono">
      <div className="px-6 py-5 border-b border-black/10 bg-black/[0.02]">
        <div className="text-xs tracking-normal opacity-40 mb-[0.3rem]">INTERACTIVE ATLAS</div>
        <div className="text-base font-bold tracking-normal">HIGH GROUND ATLAS</div>
      </div>

      <div className="flex items-center border-b border-black/10">
        {(['rebirth', 'haven'] as MapId[]).map((id) => (
          <button type="button" key={id} onClick={() => { setActiveMap(id); setActiveSpot(null); }}
            className="px-6 py-3 border-none bg-transparent text-xs tracking-normal cursor-pointer font-mono"
            style={{
              borderBottom: activeMap === id ? '2px solid currentColor' : '2px solid transparent',
              color: activeMap === id ? 'inherit' : 'rgba(0,0,0,0.35)',
              fontWeight: activeMap === id ? 700 : 400,
            }}>
            {ATLAS[id].label.toUpperCase()}
          </button>
        ))}
        <div className="ml-auto flex gap-4 pr-6">
          {(Object.entries(TIER_COLOR) as [Tier, string][]).map(([tier, color]) => (
            <div key={tier} className="flex items-center gap-1 text-xs tracking-normal opacity-55">
              <div className="size-2 rounded-full" style={{ background: color }} />
              TIER {tier}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_280px] items-start">
        <div className="relative border-r border-black/8 bg-[#111] overflow-hidden">
          <Image src={map.image} alt={map.label} width={1000} height={700} className="w-full h-auto block opacity-75" />
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
            {map.spots.map((s) => {
              const isActive = s.id === activeSpot;
              const color = TIER_COLOR[s.tier];
              return (
                <g key={s.id} className="cursor-pointer" onClick={() => setActiveSpot(isActive ? null : s.id)}>
                  <circle cx={s.x} cy={s.y} r="5" fill="transparent" />
                  {isActive && <circle cx={s.x} cy={s.y} r="5.5" fill="none" stroke={color} strokeWidth="0.6" opacity="0.55" />}
                  <circle cx={s.x} cy={s.y} r={isActive ? 3 : 2.3} fill={isActive ? color : `${color}35`} stroke={color} strokeWidth="0.6" />
                  <text x={s.x} y={s.y + 0.5} textAnchor="middle" dominantBaseline="middle" fontSize="2" fill="#000" fontFamily="monospace" fontWeight="bold">{s.tier}</text>
                </g>
              );
            })}
          </svg>
          {!activeSpot && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs tracking-normal text-white/50 bg-black/55 px-2.5 py-1 rounded whitespace-nowrap">
              SELECT A POSITION
            </div>
          )}
        </div>

        <div className="p-5 flex flex-col gap-3 min-h-[300px]">
          {!spot ? (
            <div>
              <div className="text-xs tracking-normal opacity-40 mb-3">HIGH GROUND POSITIONS</div>
              <div className="flex flex-col gap-[0.4rem]">
                {map.spots.map((s) => {
                  const color = TIER_COLOR[s.tier];
                  return (
                    <button type="button" key={s.id} onClick={() => setActiveSpot(s.id)}
                      className="flex items-center gap-2 px-[10px] py-2 bg-transparent border border-black/10 rounded cursor-pointer font-mono text-xs text-left w-full"
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = color)}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)')}>
                      <span className="size-[17px] rounded-full flex items-center justify-center text-xs text-black font-bold shrink-0" style={{ background: color }}>
                        {s.tier}
                      </span>
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              <div>
                <button type="button" onClick={() => setActiveSpot(null)}
                  className="bg-transparent border-none cursor-pointer font-mono text-xs tracking-normal opacity-40 p-0 mb-3">
                  BACK TO ALL POSITIONS
                </button>
                <div className="flex items-center gap-2">
                  <span className="size-[18px] rounded-full flex items-center justify-center text-xs text-black font-bold shrink-0" style={{ background: TIER_COLOR[spot.tier] }}>
                    {spot.tier}
                  </span>
                  <span className="text-[0.78rem] font-bold tracking-normal">{spot.label}</span>
                </div>
              </div>
              {([
                { key: 'WHY IT IS STRONG', content: spot.why, color: '#00ff88' },
                { key: 'HOW TO REACH IT', content: spot.approach, color: '#ffcc00' },
                { key: 'WEAKNESS', content: spot.weakness, color: '#ff5555' },
              ] as { key: string; content: string; color: string }[]).map((section) => (
                <div key={section.key} className="border-t border-black/8 pt-[0.7rem]">
                  <div className="text-xs tracking-normal mb-1 opacity-85" style={{ color: section.color }}>
                    {section.key}
                  </div>
                  <div className="text-xs leading-[1.65] opacity-60">{section.content}</div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <div className="px-6 py-[0.6rem] border-t border-black/8 text-xs tracking-normal opacity-25 flex justify-between">
        <span>S = DOMINANT - A = STRONG - B = SITUATIONAL</span>
        <span>WZPRO META</span>
      </div>
    </div>
  );
}
