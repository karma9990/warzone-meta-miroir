'use client';

import { useState, useEffect, useRef } from 'react';

interface Shot { x: number; y: number; }

const WEAPONS: Record<string, { label: string; shots: Shot[]; counterDesc: string }> = {
  'ds20': {
    label: 'DS20 Mirage',
    shots: [
      { x: 0,    y: -4   }, { x: -0.3, y: -4.5 }, { x: -0.5, y: -5   },
      { x: -0.4, y: -5   }, { x: -0.5, y: -5.5 }, { x: -0.6, y: -5   },
      { x: -0.7, y: -5   }, { x: -0.8, y: -4.5 }, { x: -0.6, y: -4   },
      { x: -0.7, y: -4   }, { x: -0.8, y: -3.5 }, { x: -0.6, y: -3.5 },
      { x: -0.7, y: -3   }, { x: -0.8, y: -3   }, { x: -0.6, y: -2.5 },
      { x: -0.7, y: -2.5 }, { x: -0.8, y: -2   }, { x: -0.6, y: -2   },
      { x: -0.7, y: -2   }, { x: -0.7, y: -1.5 }, { x: -0.8, y: -1.5 },
      { x: -0.7, y: -1   }, { x: -0.8, y: -1   }, { x: -0.7, y: -0.5 },
      { x: -0.8, y: -0.5 },
    ],
    counterDesc: 'The DS20 drifts consistently LEFT with every shot — pull steadily RIGHT to compensate, increasing the correction progressively. Maintain a downward pull in parallel for the vertical climb. Once the left counter is muscle memory, the pattern becomes very manageable.',
  },
  'm15': {
    label: 'M15 MOD 0',
    shots: [
      { x: 0,    y: -5   }, { x: -0.8, y: -5.5 }, { x: 0.8,  y: -5   },
      { x: -0.8, y: -5   }, { x: 0.9,  y: -4.5 }, { x: -0.9, y: -4.5 },
      { x: 0.9,  y: -4   }, { x: -1.0, y: -4   }, { x: 1.0,  y: -4   },
      { x: -1.0, y: -3.5 }, { x: 1.0,  y: -3.5 }, { x: -1.0, y: -3.5 },
      { x: 1.1,  y: -3   }, { x: -1.1, y: -3   }, { x: 1.1,  y: -2.5 },
      { x: -1.1, y: -2.5 }, { x: 1.0,  y: -2   }, { x: -1.0, y: -2   },
      { x: 1.0,  y: -2   }, { x: -1.0, y: -1.5 }, { x: 1.0,  y: -1.5 },
      { x: -0.9, y: -1.5 }, { x: 0.9,  y: -1   }, { x: -0.9, y: -1   },
      { x: 0.8,  y: -0.5 }, { x: -0.8, y: -0.5 }, { x: 0.8,  y: 0    },
      { x: -0.7, y: 0    }, { x: 0.7,  y: 0.5  }, { x: -0.7, y: 0.5  },
    ],
    counterDesc: 'The M15 alternates LEFT-RIGHT with every shot — absorb each oscillation with a quick counter-movement in the opposite direction. Keep a constant downward pull throughout for the vertical climb. Rhythm is critical: the zigzag is mechanical and repeatable once internalized.',
  },
  'mk78': {
    label: 'MK.78',
    shots: [
      { x: 0,   y: -3  }, { x: 0,   y: -3.5 }, { x: 0,   y: -4  },
      { x: 0.1, y: -4  }, { x: 0.1, y: -4.5 }, { x: 0,   y: -4.5 },
      { x: 0,   y: -5  }, { x: -0.1, y: -5  }, { x: -0.1, y: -5.5 },
      { x: -0.2, y: -5.5 }, { x: -0.2, y: -5 }, { x: -0.3, y: -5  },
      { x: -0.3, y: -4.5 }, { x: -0.4, y: -4.5 }, { x: -0.4, y: -4  },
      { x: -0.5, y: -4  }, { x: -0.5, y: -3.5 }, { x: -0.5, y: -3.5 },
      { x: -0.6, y: -3  }, { x: -0.6, y: -3  },
    ],
    counterDesc: 'The MK.78 has a slow, tight vertical pull — fire in controlled bursts of 5–7 rounds, reset, then fire again. A minimal DOWN correction suffices. Full-auto at range wastes ammunition — burst discipline wins.',
  },
};

const SCALE = 18;
const W = 260;
const H = 320;
const ORIGIN_X = W / 2;
const ORIGIN_Y = H - 40;

export default function RecoilVisualizer() {
  const [weaponId, setWeaponId] = useState('ds20');
  const [visibleShots, setVisibleShots] = useState(0);
  const [running, setRunning] = useState(false);
  const rafRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const weapon = WEAPONS[weaponId];

  useEffect(() => {
    return () => { if (rafRef.current) clearTimeout(rafRef.current); };
  }, []);

  function startAnimation() {
    setVisibleShots(0);
    setRunning(true);
    let i = 0;
    function step() {
      i++;
      setVisibleShots(i);
      if (i < weapon.shots.length) {
        rafRef.current = setTimeout(step, 80);
      } else {
        setRunning(false);
      }
    }
    rafRef.current = setTimeout(step, 80);
  }

  function reset() {
    if (rafRef.current) clearTimeout(rafRef.current);
    setVisibleShots(0);
    setRunning(false);
  }

  function changeWeapon(id: string) {
    reset();
    setWeaponId(id);
  }

  // Build cumulative positions
  const positions: { cx: number; cy: number }[] = [];
  let cx = ORIGIN_X;
  let cy = ORIGIN_Y;
  for (const s of weapon.shots) {
    cx += s.x * SCALE * 0.5;
    cy += s.y * SCALE * 0.5;
    positions.push({ cx, cy });
  }

  return (
    <div style={{ border: '1px solid rgba(0,0,0,0.15)', background: 'rgba(0,0,0,0.02)', marginBottom: '3rem' }}>
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
        <span style={{ fontFamily: 'monospace', fontSize: '0.55rem', letterSpacing: '0.2em', opacity: 0.4 }}>EXCLUSIVE TOOL</span>
        <h2 style={{ fontFamily: 'monospace', fontSize: '0.95rem', letterSpacing: '0.1em', margin: '0.25rem 0 0' }}>RECOIL PATTERN VISUALIZER</h2>
      </div>

      <div style={{ padding: '1.5rem' }}>
        <p style={{ fontFamily: 'monospace', fontSize: '0.55rem', letterSpacing: '0.18em', opacity: 0.35, margin: '0 0 0.5rem' }}>SELECT WEAPON</p>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {Object.entries(WEAPONS).map(([id, w]) => (
            <button
              key={id}
              onClick={() => changeWeapon(id)}
              style={{
                fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.08em',
                padding: '0.55rem 1rem',
                border: `1px solid ${weaponId === id ? 'blue' : 'rgba(0,0,0,0.15)'}`,
                background: weaponId === id ? 'blue' : 'transparent',
                color: weaponId === id ? 'white' : 'inherit',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {w.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ flex: '0 0 auto' }}>
            <p style={{ fontFamily: 'monospace', fontSize: '0.55rem', letterSpacing: '0.18em', opacity: 0.35, margin: '0 0 0.5rem' }}>BULLET IMPACT MAP</p>
            <svg width={W} height={H} style={{ display: 'block', background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {/* Crosshair origin */}
              <line x1={ORIGIN_X - 10} y1={ORIGIN_Y} x2={ORIGIN_X + 10} y2={ORIGIN_Y} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
              <line x1={ORIGIN_X} y1={ORIGIN_Y - 10} x2={ORIGIN_X} y2={ORIGIN_Y + 10} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />

              {/* Path line */}
              {positions.slice(0, visibleShots).map((pos, i) => {
                if (i === 0) return null;
                const prev = positions[i - 1];
                return <line key={i} x1={prev.cx} y1={prev.cy} x2={pos.cx} y2={pos.cy} stroke="rgba(0,100,255,0.4)" strokeWidth={1} />;
              })}

              {/* Shot dots */}
              {positions.slice(0, visibleShots).map((pos, i) => (
                <circle
                  key={i}
                  cx={pos.cx}
                  cy={pos.cy}
                  r={i === visibleShots - 1 ? 4 : 2.5}
                  fill={i === visibleShots - 1 ? '#ff4444' : `rgba(255,${Math.max(0, 200 - i * 6)},${Math.max(0, 100 - i * 4)},${Math.max(0.3, 1 - i * 0.03)})`}
                />
              ))}

              {/* Shot number label */}
              {visibleShots > 0 && (
                <text x={8} y={16} fill="rgba(255,255,255,0.3)" fontSize={9} fontFamily="monospace">
                  {visibleShots}/{weapon.shots.length} rounds
                </text>
              )}
            </svg>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button
                onClick={startAnimation}
                disabled={running}
                style={{
                  flex: 1, fontFamily: 'monospace', fontSize: '0.62rem', letterSpacing: '0.1em',
                  padding: '0.6rem', background: running ? 'rgba(0,0,0,0.1)' : 'blue',
                  color: running ? 'inherit' : 'white', border: 'none',
                  cursor: running ? 'not-allowed' : 'pointer', opacity: running ? 0.4 : 1,
                }}
              >
                {running ? 'FIRING…' : visibleShots > 0 ? 'REPLAY' : 'FIRE'}
              </button>
              {visibleShots > 0 && !running && (
                <button
                  onClick={reset}
                  style={{
                    fontFamily: 'monospace', fontSize: '0.62rem', letterSpacing: '0.1em',
                    padding: '0.6rem 1rem', background: 'transparent',
                    border: '1px solid rgba(0,0,0,0.15)', cursor: 'pointer',
                  }}
                >
                  RESET
                </button>
              )}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: '180px' }}>
            <p style={{ fontFamily: 'monospace', fontSize: '0.55rem', letterSpacing: '0.18em', opacity: 0.35, margin: '0 0 0.75rem' }}>COUNTER-PULL GUIDE</p>
            <p style={{ fontFamily: 'monospace', fontSize: '0.72rem', lineHeight: 1.85, opacity: 0.65, margin: '0 0 1.25rem' }}>
              {weapon.counterDesc}
            </p>

            <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '0.75rem' }}>
              <p style={{ fontFamily: 'monospace', fontSize: '0.55rem', letterSpacing: '0.18em', opacity: 0.35, margin: '0 0 0.4rem' }}>HOW TO READ</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {[
                  { color: 'rgba(255,200,100,1)', label: 'First shots — less recoil' },
                  { color: '#ff4444', label: 'Last shot fired' },
                  { color: 'rgba(0,100,255,0.6)', label: 'Bullet path trajectory' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                    <span style={{ fontFamily: 'monospace', fontSize: '0.62rem', opacity: 0.5 }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
