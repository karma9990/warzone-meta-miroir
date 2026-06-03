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
    <div className="border border-black/12 rounded mb-12 overflow-hidden font-mono">
      <div className="px-6 py-5 border-b border-black/10 bg-black/2">
        <div className="text-xs tracking-normal opacity-40 mb-1">GAME STRATEGY</div>
        <div className="text-base font-bold tracking-normal">CONTRACT PRIORITY GUIDE</div>
      </div>

      {/* Inputs */}
      <div className="px-6 py-4 border-b border-black/8 grid grid-cols-3 gap-5">
        <div>
          <div className="text-xs tracking-normal opacity-40 mb-2">SQUAD SIZE</div>
          <div className="flex gap-1">
            {SQUAD_SIZES.map(s => (
              <button type="button" key={s} onClick={() => setSquad(s)}
                className="font-mono text-xs cursor-pointer rounded-sm bg-transparent"
                style={{
                  flex: 1, padding: '5px 0',
                  border: `1px solid ${squad === s ? 'currentColor' : 'rgba(0,0,0,0.12)'}`,
                  fontWeight: squad === s ? 700 : 400,
                  opacity: squad === s ? 1 : 0.4,
                }}
              >{s}v</button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs tracking-normal opacity-40 mb-2">CIRCLE #</div>
          <div className="flex gap-1">
            {CIRCLES.map(c => (
              <button type="button" key={c} onClick={() => setCircle(c)}
                className="font-mono text-xs cursor-pointer rounded-sm bg-transparent"
                style={{
                  flex: 1, padding: '5px 0',
                  border: `1px solid ${circle === c ? 'currentColor' : 'rgba(0,0,0,0.12)'}`,
                  fontWeight: circle === c ? 700 : 400,
                  opacity: circle === c ? 1 : 0.4,
                }}
              >C{c}</button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs tracking-normal opacity-40 mb-2">PLAYERS ALIVE</div>
          <select value={players} onChange={e => setPlayers(Number(e.target.value))}
            className="font-mono text-xs px-1.5 py-1 border border-black/15 rounded-sm bg-transparent w-full cursor-pointer"
          >
            {PLAYER_COUNTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </div>

      {/* Recommendations */}
      <div>
        {recs.map((rec, i) => {
          const cfg = PRIORITY_CONFIG[rec.priority];
          return (
            <div key={rec.name}
              className="grid grid-cols-[8rem_5rem_1fr] gap-4 items-center px-6"
              style={{
                paddingTop: '0.9rem', paddingBottom: '0.9rem',
                borderBottom: i < recs.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                background: cfg.bg,
              }}
            >
              <span className="text-xs font-bold tracking-normal">{rec.name}</span>
              <span className="text-xs font-bold tracking-normal" style={{ color: cfg.color }}>{rec.priority}</span>
              <span className="text-xs opacity-60 leading-relaxed">{rec.reason}</span>
            </div>
          );
        })}
      </div>

      <div className="px-6 py-2.5 border-t border-black/8 text-xs tracking-normal opacity-30">
        PRIORITY ADAPTS TO SQUAD SIZE, CIRCLE PHASE, AND LOBBY PRESSURE
      </div>
    </div>
  );
}
