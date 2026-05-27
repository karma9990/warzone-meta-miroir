'use client';

import { useState } from 'react';

type MapId = 'rebirth' | 'haven';

interface SpawnPoint {
  id: string;
  label: string;
  x: number; // % from left
  y: number; // % from top
  rotation: {
    path: [number, number][];
    description: string;
    tips: string[];
  };
}

const MAPS: Record<MapId, { label: string; image: string; spawns: SpawnPoint[] }> = {
  rebirth: {
    label: 'Rebirth Island',
    image: '/assets/tools/pro-movement/map-rebirth.jpg',
    spawns: [
      {
        id: 'bioweapons',
        label: 'Bioweapons',
        x: 68, y: 22,
        rotation: {
          path: [[68,22],[58,28],[51,32],[57,40],[62,47],[68,22]],
          description: 'Bioweapons → Industry → Prison → Harbor → back north',
          tips: [
            'Bioweapons rooftop gives full vision over the northeast — clear it before dropping.',
            'Rotate south through Industry to reach Prison fast without crossing open water.',
            'When zone pulls west, push through Chemical Engineer before mid-game — do not delay.',
          ],
        },
      },
      {
        id: 'turbines',
        label: 'Turbines',
        x: 46, y: 28,
        rotation: {
          path: [[46,28],[57,31],[68,22],[62,47],[51,47],[37,47],[46,28]],
          description: 'Turbines → Industry → Bioweapons → Harbor → Prison → Control Center',
          tips: [
            'Turbines is a central rotation hub — control it early and you own mid-island flow.',
            'Push to Bioweapons north immediately if your squad wins the early fight.',
            'Fall back to Control Center when pinched from both Prison and Industry.',
          ],
        },
      },
      {
        id: 'industry',
        label: 'Industry',
        x: 61, y: 31,
        rotation: {
          path: [[57,31],[68,22],[71,33],[62,47],[51,47],[46,28],[57,31]],
          description: 'Industry → Bioweapons → Chemical Engineer → Harbor → Prison → Turbines',
          tips: [
            'Industry sits between three key zones — never hold it static mid-game.',
            'Rotate to Chemical Engineer via the eastern wall to avoid open exposure.',
            'The building roof facing Turbines gives you a first-shot advantage on any rotation.',
          ],
        },
      },
      {
        id: 'chemical',
        label: 'Chemical Engineer',
        x: 71, y: 33,
        rotation: {
          path: [[71,33],[68,22],[62,47],[55,59],[71,33]],
          description: 'Chemical Engineer → Bioweapons → Harbor → Factory → back',
          tips: [
            'Chemical Engineer is exposed on all sides — rotate immediately after landing.',
            'Push Bioweapons north for height advantage, or drop to Harbor for mid-map control.',
            'Do not hold this position past mid-game — zone almost never ends here.',
          ],
        },
      },
      {
        id: 'dock',
        label: 'Dock',
        x: 27, y: 41,
        rotation: {
          path: [[27,41],[37,47],[51,47],[46,28],[27,41]],
          description: 'Dock → Control Center → Prison → Turbines → back west',
          tips: [
            'Dock is an isolated landing — rotate east fast before getting pinched against the water.',
            'Use the building spine to reach Control Center without crossing open ground.',
            'Dock rooftop covers the western approach and can catch rotating Prison squads.',
          ],
        },
      },
      {
        id: 'controlcenter',
        label: 'Control Center',
        x: 37, y: 47,
        rotation: {
          path: [[37,47],[27,41],[36,57],[42,65],[51,47],[37,47]],
          description: 'Control Center → Dock → HQ → Living Quarters → Prison → back',
          tips: [
            'Control Center is the most contested indoor zone — clear top floor before settling.',
            'Rotate to HQ early if your squad holds the north staircase exit.',
            'Living Quarters to the south is a quick fallback when Prison is flooded.',
          ],
        },
      },
      {
        id: 'prison',
        label: 'Prison',
        x: 51, y: 47,
        rotation: {
          path: [[51,47],[46,28],[57,31],[62,47],[51,47]],
          description: 'Prison → Turbines → Industry → Harbor → back',
          tips: [
            'Prison tower is the highest point on the island — take it and don\'t give it up.',
            'Rotate to Turbines via the west corridor to avoid the open courtyard crossing.',
            'When pushed from Harbor, use the inner stairs — the exterior is fully exposed.',
          ],
        },
      },
      {
        id: 'harbor',
        label: 'Harbor',
        x: 62, y: 51,
        rotation: {
          path: [[62,51],[51,47],[57,31],[68,22],[55,59],[62,51]],
          description: 'Harbor → Prison → Industry → Bioweapons → Factory → back',
          tips: [
            'Harbor buildings give cover from Bioweapons and Chemical Engineer simultaneously.',
            'Rotate north to Prison fast — Harbor is a low-ground trap in late circle.',
            'Factory push from Harbor is risky — always pre-clear the shoreline first.',
          ],
        },
      },
      {
        id: 'hq',
        label: 'Headquaters',
        x: 36, y: 57,
        rotation: {
          path: [[36,57],[27,41],[37,47],[51,47],[42,65],[18,65],[36,57]],
          description: 'HQ → Dock → Control Center → Prison → Living Quarters → Stronghold',
          tips: [
            'HQ rooftop is the strongest anchor in the southwest — hold it before rotating north.',
            'Rotate to Control Center through the building line, never across the open courtyard.',
            'When late circle pulls northeast, push from HQ through Prison — not via Stronghold.',
          ],
        },
      },
      {
        id: 'factory',
        label: 'Factory',
        x: 59, y: 59,
        rotation: {
          path: [[55,59],[62,51],[51,47],[42,65],[55,59]],
          description: 'Factory → Harbor → Prison → Living Quarters → back',
          tips: [
            'Factory is the quietest southeast drop — rotate north fast before zone forces you.',
            'The Factory rooftop catches Harbor rotations that go too far south.',
            'Push Living Quarters when pinched from Harbor to reset the engagement angle.',
          ],
        },
      },
      {
        id: 'stronghold',
        label: 'Stronghold',
        x: 18, y: 65,
        rotation: {
          path: [[18,65],[27,41],[36,57],[42,65],[18,65]],
          description: 'Stronghold → Dock → HQ → Living Quarters → back west',
          tips: [
            'Stronghold is the furthest point west — rotate to Dock immediately after landing.',
            'This spawn is high-risk solo but safe for squads that need an uncontested early loot.',
            'Never hold Stronghold past the first circle — it is a dead end in every late-game scenario.',
          ],
        },
      },
      {
        id: 'livingquarters',
        label: 'Living Quarters',
        x: 48, y: 73,
        rotation: {
          path: [[42,65],[36,57],[37,47],[51,47],[55,59],[42,65]],
          description: 'Living Quarters → HQ → Control Center → Prison → Factory → back south',
          tips: [
            'Living Quarters is a contested southern zone — take the rooftop or leave fast.',
            'Rotate to HQ using the building line — the southern field is fully exposed.',
            'Prison is reachable in 20 seconds from here — push it early before squads settle.',
          ],
        },
      },
    ],
  },
  haven: {
    label: 'Haven Hollow',
    image: '/assets/tools/pro-movement/map-haven.jpg',
    spawns: [
      {
        id: 'mansion',
        label: 'Mansion',
        x: 50, y: 21,
        rotation: {
          path: [[53,16],[35,27],[42,40],[62,42],[72,29],[53,16]],
          description: 'Mansion → Pond → Basin → Coal Depot → Research Center → back north',
          tips: [
            'Mansion rooftop is the highest point on the map — control it and call rotations.',
            'Rotate south to Pond before other squads cross Basin — do not let them take height.',
            'When circle pulls southeast, push Research Center via the eastern corridor early.',
          ],
        },
      },
      {
        id: 'pond',
        label: 'Pond',
        x: 35, y: 27,
        rotation: {
          path: [[35,27],[53,16],[42,40],[30,54],[35,27]],
          description: 'Pond → Mansion → Basin → Main Street → back north',
          tips: [
            'Pond rooftop covers Mansion and Train Station approaches — take it first.',
            'Rotate to Basin before Main Street gets flooded by Train Station squads.',
            'If pushed from Mansion, fall east to Basin — do not cross open water.',
          ],
        },
      },
      {
        id: 'research',
        label: 'Research Center',
        x: 75, y: 36,
        rotation: {
          path: [[72,29],[53,16],[62,42],[65,60],[72,29]],
          description: 'Research Center → Mansion → Coal Depot → Lumbermill → back east',
          tips: [
            'Research Center is the most isolated drop — rotate west before mid-game or die isolated.',
            'Coal Depot is your first rotation target — it connects you back to the central flow.',
            'Lumbermill to the south is a viable fallback when Coal Depot is contested.',
          ],
        },
      },
      {
        id: 'trainstation',
        label: 'Train Station',
        x: 21, y: 40,
        rotation: {
          path: [[15,44],[35,27],[42,40],[30,54],[15,44]],
          description: 'Train Station → Pond → Basin → Main Street → back west',
          tips: [
            'Train Station controls the only western entry — hold the platform before rotating east.',
            'Push Pond fast — losing height to a Pond squad means you are pinned against the wall.',
            'When zone pulls east, rotate through Main Street — not south along the water edge.',
          ],
        },
      },
      {
        id: 'basin',
        label: 'Basin',
        x: 42, y: 40,
        rotation: {
          path: [[42,40],[35,27],[53,16],[62,42],[44,63],[30,54],[42,40]],
          description: 'Basin → Pond → Mansion → Coal Depot → Riverboat → Main Street → back',
          tips: [
            'Basin is the center of every rotation — whoever controls it dictates the pace.',
            'Never fight in the open Basin field — use the building edges and push from cover.',
            'Rotate south to Riverboat before final circle if zone pulls southeast.',
          ],
        },
      },
      {
        id: 'coaldepot',
        label: 'Coal Depot',
        x: 65, y: 50,
        rotation: {
          path: [[62,42],[72,29],[53,16],[42,40],[65,60],[62,42]],
          description: 'Coal Depot → Research Center → Mansion → Basin → Lumbermill → back',
          tips: [
            'Coal Depot connects Research Center to the mid-map — hold both levels before rotating.',
            'Rotate to Basin when zone forces central — Coal Depot becomes exposed on two sides.',
            'Lumbermill south is your fallback if Basin squads push east.',
          ],
        },
      },
      {
        id: 'mainstreet',
        label: 'Main Street',
        x: 33, y: 55,
        rotation: {
          path: [[30,54],[15,44],[35,27],[42,40],[44,63],[30,54]],
          description: 'Main Street → Train Station → Pond → Basin → Riverboat → back',
          tips: [
            'Main Street is the highest-traffic zone — rotate through it, never hold it static.',
            'Building parapets cover Train Station and Basin simultaneously — use the upper floor.',
            'Push Riverboat south early if zone pulls toward the water — do not wait for the circle.',
          ],
        },
      },
      {
        id: 'riverboat',
        label: 'Riverboat',
        x: 44, y: 67,
        rotation: {
          path: [[44,63],[30,54],[42,40],[62,42],[65,60],[44,63]],
          description: 'Riverboat → Main Street → Basin → Coal Depot → Lumbermill → back south',
          tips: [
            'Riverboat controls the southern lane — critical for late-circle positioning.',
            'Squads rotating south from Main Street are exposed crossing the open field — pre-aim it.',
            'Use Riverboat as a final-circle staging point — push north only when zone is confirmed.',
          ],
        },
      },
      {
        id: 'lumbermill',
        label: 'Lumbermill',
        x: 64, y: 67,
        rotation: {
          path: [[65,60],[62,42],[72,29],[44,63],[65,60]],
          description: 'Lumbermill → Coal Depot → Research Center → Riverboat → back east',
          tips: [
            'Lumbermill upper level gives long sight lines over Main Street and Riverboat.',
            'Rotate to Coal Depot immediately — Lumbermill alone is too isolated for mid-game.',
            'The northeast corner of Lumbermill is a blind angle from Main Street — use it to reposition.',
          ],
        },
      },
    ],
  },
};

export default function RotationTool() {
  const [activeMap, setActiveMap] = useState<MapId>('rebirth');
  const [activeSpawn, setActiveSpawn] = useState<string | null>(null);

  const map = MAPS[activeMap];
  const spawn = activeSpawn ? map.spawns.find(s => s.id === activeSpawn) ?? null : null;

  const pathD = spawn
    ? spawn.rotation.path
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`)
        .join(' ') + ' Z'
    : '';

  return (
    <div style={{ border: '1px solid rgba(0,0,0,0.12)', borderRadius: '4px', marginBottom: '3rem', overflow: 'hidden', fontFamily: 'monospace' }}>

      {/* Header */}
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.1)', background: 'rgba(0,0,0,0.02)' }}>
        <div style={{ fontSize: '0.55rem', letterSpacing: '0.2em', opacity: 0.4, marginBottom: '0.3rem' }}>INTERACTIVE ROTATION PLANNER</div>
        <div style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.08em' }}>SPAWN ROTATION TOOL</div>
      </div>

      {/* Map selector */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
        {(Object.entries(MAPS) as [MapId, typeof MAPS[MapId]][]).map(([id, m]) => (
          <button
            key={id}
            onClick={() => { setActiveMap(id); setActiveSpawn(null); }}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              borderBottom: activeMap === id ? '2px solid currentColor' : '2px solid transparent',
              background: 'transparent',
              color: activeMap === id ? 'inherit' : 'rgba(0,0,0,0.35)',
              fontSize: '0.6rem',
              letterSpacing: '0.15em',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontWeight: activeMap === id ? 700 : 400,
            }}
          >
            {m.label.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Map + spawns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', alignItems: 'start' }}>

        {/* Map visual */}
        <div style={{ position: 'relative', borderRight: '1px solid rgba(0,0,0,0.08)', background: '#111', overflow: 'hidden' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={map.image}
            alt={map.label}
            style={{ width: '100%', height: 'auto', display: 'block', opacity: 0.85 }}
          />

          {/* SVG overlay */}
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          >
            {/* Rotation path */}
            {spawn && (
              <>
                <path
                  d={pathD}
                  fill="none"
                  stroke="rgba(0,255,136,0.6)"
                  strokeWidth="0.6"
                  strokeDasharray="2 1"
                />
                <path
                  d={pathD}
                  fill="rgba(0,255,136,0.08)"
                  stroke="none"
                />
                {spawn.rotation.path.map((p, i) => i > 0 && i < spawn.rotation.path.length - 1 && (
                  <circle key={i} cx={p[0]} cy={p[1]} r="0.7" fill="rgba(0,255,136,0.6)" />
                ))}
              </>
            )}

            {/* Spawn points */}
            {map.spawns.map(s => {
              const isActive = s.id === activeSpawn;
              return (
                <g key={s.id} style={{ cursor: 'pointer' }} onClick={() => setActiveSpawn(isActive ? null : s.id)}>
                  <circle cx={s.x} cy={s.y} r="4" fill="transparent" />
                  <circle
                    cx={s.x} cy={s.y} r={isActive ? 2.5 : 1.8}
                    fill={isActive ? '#00ff88' : 'rgba(0,255,136,0.0)'}
                    stroke={isActive ? '#00ff88' : 'rgba(0,255,136,0.9)'}
                    strokeWidth="0.5"
                  />
                  {isActive && (
                    <circle cx={s.x} cy={s.y} r="4" fill="none" stroke="#00ff88" strokeWidth="0.4" opacity="0.5" />
                  )}
                </g>
              );
            })}
          </svg>

          {/* No selection hint */}
          {!activeSpawn && (
            <div style={{
              position: 'absolute',
              bottom: '1rem',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '0.5rem',
              letterSpacing: '0.12em',
              color: 'rgba(255,255,255,0.5)',
              background: 'rgba(0,0,0,0.5)',
              padding: '4px 10px',
              borderRadius: '2px',
              whiteSpace: 'nowrap',
            }}>
              SELECT A SPAWN POINT
            </div>
          )}
        </div>

        {/* Rotation details */}
        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {!spawn ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.55rem', letterSpacing: '0.12em', opacity: 0.4, marginBottom: '0.5rem' }}>SPAWN POINTS</div>
              {map.spawns.map(s => (
                <button
                  key={s.id}
                  onClick={() => setActiveSpawn(s.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    background: 'transparent',
                    border: '1px solid rgba(0,0,0,0.1)',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    fontSize: '0.65rem',
                    letterSpacing: '0.06em',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'all 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#00ff88')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)')}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(0,255,136,0.6)', flexShrink: 0 }} />
                  {s.label}
                </button>
              ))}
            </div>
          ) : (
            <>
              <div>
                <button
                  onClick={() => setActiveSpawn(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.5rem', letterSpacing: '0.12em', opacity: 0.4, padding: 0, marginBottom: '0.75rem' }}
                >
                  ← ALL SPAWNS
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00ff88', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.06em' }}>{spawn.label}</span>
                </div>
                <div style={{ fontSize: '0.58rem', opacity: 0.55, lineHeight: 1.6 }}>{spawn.rotation.description}</div>
              </div>

              <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '0.75rem' }}>
                <div style={{ fontSize: '0.5rem', letterSpacing: '0.12em', opacity: 0.4, marginBottom: '0.6rem' }}>PRO TIPS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {spawn.rotation.tips.map((tip, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <span style={{ color: '#00ff88', fontSize: '0.55rem', marginTop: '1px', flexShrink: 0 }}>▸</span>
                      <span style={{ fontSize: '0.58rem', lineHeight: 1.65, opacity: 0.7 }}>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '0.6rem 1.5rem', borderTop: '1px solid rgba(0,0,0,0.08)', fontSize: '0.5rem', letterSpacing: '0.12em', opacity: 0.3, display: 'flex', justifyContent: 'space-between' }}>
        <span>ROTATION PATHS ARE RECOMMENDATIONS — ADAPT TO CIRCLE AND ENEMY POSITIONS</span>
        <span>WZPRO-META</span>
      </div>
    </div>
  );
}
