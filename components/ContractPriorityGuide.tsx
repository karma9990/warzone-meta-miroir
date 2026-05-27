'use client';

import { useState } from 'react';

const SQUAD_SIZES = [1, 2, 3, 4];
const CIRCLES = [1, 2, 3, 4, 5];
const PLAYER_COUNTS = [
  { label: '60+ players', value: 60 },
  { label: '40–59 players', value: 40 },
  { label: '20–39 players', value: 20 },
  { label: 'Under 20', value: 10 },
];

interface ContractRec {
  name: string;
  priority: 'HIGH' | 'MED' | 'LOW' | 'SKIP';
  reason: string;
}

function getRecommendations(squad: number, circle: number, players: number): ContractRec[] {
  const late = circle >= 4;
  const earlyPlayers = players >= 40;
  const smallSquad = squad <= 2;

  return [
    {
      name: 'Recon',
      priority: late ? 'SKIP' : earlyPlayers ? 'HIGH' : 'MED',
      reason: late
        ? 'Too risky — exposes position mid-zone collapse.'
        : earlyPlayers
        ? 'Reveals next circle early — gives massive rotation advantage in chaotic lobbies.'
        : 'Circle info is less critical with few squads remaining — only run if safe.',
    },
    {
      name: 'Bounty',
      priority: smallSquad ? 'LOW' : late ? 'LOW' : 'MED',
      reason: smallSquad
        ? 'Avoid with small squads — enemy squad will actively hunt you, giving them the advantage.'
        : late
        ? 'Late-game bounties bring attention when positioning matters more than kills.'
        : 'Solid cash injection if the target is close — abandon if they are in a fortified position.',
    },
    {
      name: 'Most Wanted',
      priority: late ? 'HIGH' : 'MED',
      reason: late
        ? 'Best value contract in final circles — guarantees a redeploy on death for one player, which can win the game.'
        : 'Good risk-reward in mid-game. Run only if your squad can hold a defensive position while the timer counts.',
    },
    {
      name: 'Supply Run',
      priority: circle <= 2 ? 'HIGH' : 'MED',
      reason: circle <= 2
        ? 'Best early loot injection — completes fast and sets up your squad financially for the mid-game.'
        : 'Still useful mid-game for cash and killstreaks. Skip if circle is already moving.',
    },
    {
      name: 'Scavenger',
      priority: earlyPlayers && circle <= 2 ? 'MED' : 'LOW',
      reason: earlyPlayers && circle <= 2
        ? 'Efficient early-game loot path — chains well with Supply Run in the same area.'
        : 'Low value once most caches are looted. Only run if you are on a planned loot path.',
    },
  ];
}

const PRIORITY_CONFIG: Record<string, { color: string; bg: string }> = {
  HIGH: { color: '#00ff88', bg: 'rgba(0,255,136,0.08)' },
  MED:  { color: '#ffcc00', bg: 'rgba(255,204,0,0.08)' },
  LOW:  { color: '#8899aa', bg: 'rgba(136,153,170,0.06)' },
  SKIP: { color: '#ff4455', bg: 'rgba(255,68,85,0.06)' },
};

export default function ContractPriorityGuide() {
  const [squad, setSquad] = useState(4);
  const [circle, setCircle] = useState(1);
  const [players, setPlayers] = useState(60);

  const recs = getRecommendations(squad, circle, players);

  return (
    <div style={{ border: '1px solid rgba(0,0,0,0.12)', borderRadius: '4px', marginBottom: '3rem', overflow: 'hidden', fontFamily: 'monospace' }}>
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.1)', background: 'rgba(0,0,0,0.02)' }}>
        <div style={{ fontSize: '0.55rem', letterSpacing: '0.2em', opacity: 0.4, marginBottom: '0.3rem' }}>GAME STRATEGY</div>
        <div style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.08em' }}>CONTRACT PRIORITY GUIDE</div>
      </div>

      {/* Inputs */}
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem' }}>
        <div>
          <div style={{ fontSize: '0.45rem', letterSpacing: '0.15em', opacity: 0.4, marginBottom: '0.5rem' }}>SQUAD SIZE</div>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            {SQUAD_SIZES.map(s => (
              <button key={s} onClick={() => setSquad(s)} style={{
                flex: 1, padding: '5px 0', border: `1px solid ${squad === s ? 'currentColor' : 'rgba(0,0,0,0.12)'}`,
                borderRadius: '2px', background: 'transparent', fontSize: '0.6rem', fontWeight: squad === s ? 700 : 400,
                cursor: 'pointer', fontFamily: 'monospace', opacity: squad === s ? 1 : 0.4,
              }}>{s}v</button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.45rem', letterSpacing: '0.15em', opacity: 0.4, marginBottom: '0.5rem' }}>CIRCLE #</div>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            {CIRCLES.map(c => (
              <button key={c} onClick={() => setCircle(c)} style={{
                flex: 1, padding: '5px 0', border: `1px solid ${circle === c ? 'currentColor' : 'rgba(0,0,0,0.12)'}`,
                borderRadius: '2px', background: 'transparent', fontSize: '0.6rem', fontWeight: circle === c ? 700 : 400,
                cursor: 'pointer', fontFamily: 'monospace', opacity: circle === c ? 1 : 0.4,
              }}>C{c}</button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.45rem', letterSpacing: '0.15em', opacity: 0.4, marginBottom: '0.5rem' }}>PLAYERS ALIVE</div>
          <select value={players} onChange={e => setPlayers(Number(e.target.value))} style={{
            fontFamily: 'monospace', fontSize: '0.6rem', padding: '4px 6px',
            border: '1px solid rgba(0,0,0,0.15)', borderRadius: '2px', background: 'transparent', width: '100%', cursor: 'pointer',
          }}>
            {PLAYER_COUNTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </div>

      {/* Recommendations */}
      <div>
        {recs.map((rec, i) => {
          const cfg = PRIORITY_CONFIG[rec.priority];
          return (
            <div key={rec.name} style={{
              display: 'grid', gridTemplateColumns: '8rem 5rem 1fr', gap: '1rem', alignItems: 'center',
              padding: '0.9rem 1.5rem', borderBottom: i < recs.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
              background: cfg.bg,
            }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.04em' }}>{rec.name}</span>
              <span style={{ fontSize: '0.6rem', fontWeight: 700, color: cfg.color, letterSpacing: '0.1em' }}>{rec.priority}</span>
              <span style={{ fontSize: '0.58rem', opacity: 0.6, lineHeight: 1.55 }}>{rec.reason}</span>
            </div>
          );
        })}
      </div>

      <div style={{ padding: '0.6rem 1.5rem', borderTop: '1px solid rgba(0,0,0,0.08)', fontSize: '0.5rem', letterSpacing: '0.12em', opacity: 0.3 }}>
        PRIORITY ADAPTS TO SQUAD SIZE, CIRCLE PHASE, AND LOBBY PRESSURE
      </div>
    </div>
  );
}
