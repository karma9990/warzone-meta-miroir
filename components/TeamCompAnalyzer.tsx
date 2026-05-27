'use client';

import { useState } from 'react';

type Role = 'fragger' | 'support' | 'sniper' | 'igl' | 'flex';

const ROLES: { key: Role; label: string; color: string; desc: string }[] = [
  { key: 'fragger',  label: 'FRAGGER',  color: '#ff4455', desc: 'Entry kills, aggressive pushes' },
  { key: 'support',  label: 'SUPPORT',  color: '#00ccff', desc: 'Revives, armor share, utility' },
  { key: 'sniper',   label: 'SNIPER',   desc: 'Long-range picks, zone control', color: '#cc88ff' },
  { key: 'igl',      label: 'IGL',      color: '#ffcc00', desc: 'Rotations, comms, strategy' },
  { key: 'flex',     label: 'FLEX',     color: '#8899aa', desc: 'Adapts to what the team needs' },
];

interface Analysis {
  score: number;
  status: 'OPTIMAL' | 'VIABLE' | 'WEAK';
  notes: string[];
}

function analyzeComp(roles: (Role | null)[]): Analysis {
  const filled = roles.filter(Boolean) as Role[];
  if (filled.length === 0) return { score: 0, status: 'WEAK', notes: ['Assign roles to all players.'] };

  const has = (r: Role) => filled.includes(r);
  const count = (r: Role) => filled.filter(x => x === r).length;
  const notes: string[] = [];
  let score = 50;

  if (has('fragger')) { score += 15; } else { notes.push('No fragger — squad will struggle to initiate fights.'); score -= 10; }
  if (has('support')) { score += 10; } else { notes.push('No support — sustain and revives will be unreliable.'); score -= 5; }
  if (has('igl'))    { score += 15; notes.push('IGL present — rotations and strategy will be coordinated.'); }
  else               { notes.push('No IGL — assign rotation calls to one player or comp will be reactive.'); score -= 10; }

  if (count('fragger') >= 3) { notes.push('Full fragger squad — no one will hold position or call rotations.'); score -= 15; }
  if (count('support') >= 2) { notes.push('Two supports — offensive pressure will be low for a trio.'); score -= 10; }
  if (has('sniper') && has('fragger') && has('support')) { score += 10; notes.push('Fragger + Sniper + Support is the strongest 3-role base.'); }
  if (has('igl') && has('fragger')) { score += 5; }

  score = Math.max(0, Math.min(100, score));
  const status = score >= 75 ? 'OPTIMAL' : score >= 50 ? 'VIABLE' : 'WEAK';
  return { score, status, notes };
}

const STATUS_COLOR: Record<string, string> = { OPTIMAL: '#00ff88', VIABLE: '#ffcc00', WEAK: '#ff4455' };

export default function TeamCompAnalyzer() {
  const [players, setPlayers] = useState<(Role | null)[]>([null, null, null]);

  const setRole = (i: number, role: Role | null) => {
    setPlayers(prev => prev.map((r, idx) => idx === i ? role : r));
  };

  const analysis = analyzeComp(players);

  return (
    <div style={{ border: '1px solid rgba(0,0,0,0.12)', borderRadius: '4px', marginBottom: '3rem', overflow: 'hidden', fontFamily: 'monospace' }}>
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.1)', background: 'rgba(0,0,0,0.02)' }}>
        <div style={{ fontSize: '0.55rem', letterSpacing: '0.2em', opacity: 0.4, marginBottom: '0.3rem' }}>SQUAD BUILDER</div>
        <div style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.08em' }}>TEAM COMP ANALYZER</div>
      </div>

      <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Player slots */}
        <div>
          <div style={{ fontSize: '0.45rem', letterSpacing: '0.15em', opacity: 0.4, marginBottom: '1rem' }}>ASSIGN ROLES</div>
          {players.map((role, i) => (
            <div key={i} style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.5rem', opacity: 0.4, marginBottom: '0.4rem', letterSpacing: '0.1em' }}>PLAYER {i + 1}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {ROLES.map(r => {
                  const isActive = role === r.key;
                  return (
                    <button
                      key={r.key}
                      onClick={() => setRole(i, isActive ? null : r.key)}
                      style={{
                        padding: '3px 8px',
                        border: `1px solid ${isActive ? r.color : 'rgba(0,0,0,0.12)'}`,
                        borderRadius: '2px',
                        background: isActive ? `${r.color}18` : 'transparent',
                        color: isActive ? r.color : 'inherit',
                        fontSize: '0.5rem',
                        letterSpacing: '0.08em',
                        cursor: 'pointer',
                        fontFamily: 'monospace',
                        fontWeight: isActive ? 700 : 400,
                      }}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Analysis */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ padding: '1rem', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '3px' }}>
            <div style={{ fontSize: '0.45rem', letterSpacing: '0.15em', opacity: 0.4, marginBottom: '0.5rem' }}>COMP SCORE</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '2rem', fontWeight: 700, color: STATUS_COLOR[analysis.status] }}>{analysis.score}</span>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: STATUS_COLOR[analysis.status], letterSpacing: '0.1em' }}>{analysis.status}</span>
            </div>
            <div style={{ height: '4px', background: 'rgba(0,0,0,0.08)', borderRadius: '2px' }}>
              <div style={{ height: '100%', width: `${analysis.score}%`, background: STATUS_COLOR[analysis.status], transition: 'width 0.4s' }} />
            </div>
          </div>

          <div style={{ padding: '1rem', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '3px', flex: 1 }}>
            <div style={{ fontSize: '0.45rem', letterSpacing: '0.15em', opacity: 0.4, marginBottom: '0.6rem' }}>ANALYSIS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {analysis.notes.map((note, i) => (
                <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                  <span style={{ color: STATUS_COLOR[analysis.status], fontSize: '0.55rem', flexShrink: 0, marginTop: '1px' }}>▸</span>
                  <span style={{ fontSize: '0.57rem', opacity: 0.7, lineHeight: 1.55 }}>{note}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.03)', borderRadius: '3px' }}>
            <div style={{ fontSize: '0.45rem', letterSpacing: '0.15em', opacity: 0.4, marginBottom: '0.5rem' }}>ROLE LEGEND</div>
            {ROLES.map(r => (
              <div key={r.key} style={{ display: 'flex', gap: '6px', marginBottom: '0.25rem', alignItems: 'center' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.5rem', fontWeight: 700, color: r.color, minWidth: '50px' }}>{r.label}</span>
                <span style={{ fontSize: '0.5rem', opacity: 0.5 }}>{r.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: '0.6rem 1.5rem', borderTop: '1px solid rgba(0,0,0,0.08)', fontSize: '0.5rem', letterSpacing: '0.12em', opacity: 0.3 }}>
        COMP SCORE IS BASED ON ROLE BALANCE AND COMPETITIVE META SYNERGIES
      </div>
    </div>
  );
}
