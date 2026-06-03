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
    <div className="border border-black/12 rounded mb-12 overflow-hidden font-mono">
      <div className="px-6 py-5 border-b border-black/10 bg-black/2">
        <div className="text-xs tracking-normal opacity-40 mb-1">SQUAD BUILDER</div>
        <div className="text-base font-bold tracking-normal">TEAM COMP ANALYZER</div>
      </div>

      <div className="p-6 grid grid-cols-2 gap-6">
        {/* Player slots */}
        <div>
          <div className="text-xs tracking-normal opacity-40 mb-4">ASSIGN ROLES</div>
          {players.map((role, i) => (
            <div key={`player-${i + 1}-${role ?? 'empty'}`} className="mb-4">
              <div className="text-xs opacity-40 mb-1.5 tracking-normal">PLAYER {i + 1}</div>
              <div className="flex flex-wrap gap-1">
                {ROLES.map(r => {
                  const isActive = role === r.key;
                  return (
                    <button type="button" key={r.key} onClick={() => setRole(i, isActive ? null : r.key)}
                      className="font-mono text-xs tracking-normal cursor-pointer rounded-sm"
                      style={{
                        padding: '3px 8px',
                        border: `1px solid ${isActive ? r.color : 'rgba(0,0,0,0.12)'}`,
                        background: isActive ? `${r.color}18` : 'transparent',
                        color: isActive ? r.color : 'inherit',
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
        <div className="flex flex-col gap-4">
          <div className="p-4 border border-black/10 rounded-sm">
            <div className="text-xs tracking-normal opacity-40 mb-2">COMP SCORE</div>
            <div className="flex items-baseline gap-3 mb-3">
              <span className="text-3xl font-bold" style={{ color: STATUS_COLOR[analysis.status] }}>{analysis.score}</span>
              <span className="text-xs font-bold tracking-normal" style={{ color: STATUS_COLOR[analysis.status] }}>{analysis.status}</span>
            </div>
            <div className="h-1 bg-black/8 rounded-sm">
              <div className="h-full rounded-sm transition-[width] duration-[400ms]"
                style={{ width: `${analysis.score}%`, background: STATUS_COLOR[analysis.status] }}
              />
            </div>
          </div>

          <div className="p-4 border border-black/10 rounded-sm flex-1">
            <div className="text-xs tracking-normal opacity-40 mb-2.5">ANALYSIS</div>
            <div className="flex flex-col gap-2">
              {analysis.notes.map((note) => (
                <div key={note} className="flex gap-1.5 items-start">
                  <span className="text-xs shrink-0 mt-px" style={{ color: STATUS_COLOR[analysis.status] }}>▸</span>
                  <span className="text-xs opacity-70 leading-relaxed">{note}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-black/3 rounded-sm">
            <div className="text-xs tracking-normal opacity-40 mb-2">ROLE LEGEND</div>
            {ROLES.map(r => (
              <div key={r.key} className="flex gap-1.5 mb-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: r.color }} />
                <span className="text-xs font-bold min-w-[50px]" style={{ color: r.color }}>{r.label}</span>
                <span className="text-xs opacity-50">{r.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-6 py-2.5 border-t border-black/8 text-xs tracking-normal opacity-30">
        COMP SCORE IS BASED ON ROLE BALANCE AND COMPETITIVE META SYNERGIES
      </div>
    </div>
  );
}
