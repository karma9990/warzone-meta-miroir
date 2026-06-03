'use client';

import { useState } from 'react';

const ITEMS = [
  { id: 'loadout', label: 'Loadout Drop', cost: 10000, priority: 1, desc: 'Meta weapons - buy immediately when possible.' },
  { id: 'uav', label: 'UAV', cost: 32000, priority: 2, desc: 'Enemy positions - critical in mid-to-late game.' },
  { id: 'counter_uav', label: 'Counter UAV', cost: 6000, priority: 3, desc: 'Ghost is universal, but Counter UAV removes all radar.' },
  { id: 'grapple', label: 'Grapple', cost: 200, priority: 3, desc: 'Fast vertical mobility - essential for taking high ground.' },
  { id: 'precision', label: 'Precision Airstrike', cost: 2500, priority: 4, desc: 'Good for flushing rooftop campers.' },
  { id: 'cluster', label: 'Cluster Strike', cost: 3000, priority: 4, desc: 'Area denial - useful in final circles.' },
  { id: 'emp', label: 'EMP', cost: 5000, priority: 4, desc: 'Disables enemy equipment - essential in late circles.' },
  { id: 'redeploy', label: 'Redeploy Token', cost: 4000, priority: 1, desc: 'Revive a dead teammate. Buy this before killstreaks.' },
];

const SQUAD_SIZES = [1, 2, 3];
const CIRCLES = [1, 2, 3, 4, 5];

function getPriorities(squad: number, circle: number, cash: number) {
  const recs: { item: typeof ITEMS[0]; canAfford: boolean; reason: string }[] = [];
  const has = (id: string) => recs.some((r) => r.item.id === id);

  if (!has('loadout')) {
    recs.push({
      item: ITEMS[0],
      canAfford: cash >= 10000,
      reason: circle === 1 ? 'First priority every game - meta weapons win fights.' : 'Re-buy if you lost loadout.',
    });
  }

  recs.push({
    item: ITEMS.find((i) => i.id === 'redeploy')!,
    canAfford: cash >= 4000,
    reason: squad >= 2 ? 'Buy before killstreaks if a teammate is dead.' : 'N/A in solo.',
  });

  if (circle >= 2) {
    recs.push({
      item: ITEMS.find((i) => i.id === 'uav')!,
      canAfford: cash >= 32000,
      reason: 'Enemy positions are critical from circle 2 onward.',
    });
  }

  recs.push({
    item: ITEMS.find((i) => i.id === 'grapple')!,
    canAfford: cash >= 200,
    reason: 'Fast vertical mobility - buy whenever possible.',
  });

  if (circle >= 4) {
    recs.push({
      item: ITEMS.find((i) => i.id === 'cluster')!,
      canAfford: cash >= 3000,
      reason: 'Final circle area denial - forces repositioning or death.',
    });
    recs.push({
      item: ITEMS.find((i) => i.id === 'emp')!,
      canAfford: cash >= 5000,
      reason: 'Disables enemy equipment in late circles - priority from C4 onward.',
    });
  }

  return recs.slice(0, 5);
}

export default function EconomyCalculator() {
  const [cash, setCash] = useState(8000);
  const [squad, setSquad] = useState(3);
  const [circle, setCircle] = useState(1);

  const recs = getPriorities(squad, circle, cash);
  const totalCost = recs.filter((r) => r.canAfford).reduce((s, r) => s + r.item.cost, 0);

  return (
    <div className="border border-black/12 rounded mb-12 overflow-hidden font-mono">
      <div className="px-6 py-5 border-b border-black/10 bg-black/2">
        <div className="text-xs tracking-normal opacity-40 mb-1">GAME STRATEGY</div>
        <div className="text-base font-bold tracking-normal">ECONOMY CALCULATOR</div>
      </div>

      <div className="px-6 py-4 border-b border-black/8 grid grid-cols-3 gap-5">
        <div>
          <div className="text-xs tracking-normal opacity-40 mb-2">SQUAD CASH ($)</div>
          <input aria-label="Input" type="number" min={0} max={50000} step={500} value={cash}
            onChange={(e) => setCash(Number(e.target.value))}
            className="w-full font-mono text-sm font-bold px-2 py-1.5 border border-black/15 rounded-sm bg-transparent box-border"
          />
        </div>
        <div>
          <div className="text-xs tracking-normal opacity-40 mb-2">SQUAD SIZE</div>
          <div className="flex gap-1">
            {SQUAD_SIZES.map((s) => (
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
          <div className="text-xs tracking-normal opacity-40 mb-2">CIRCLE</div>
          <div className="flex gap-1">
            {CIRCLES.map((c) => (
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
      </div>

      <div>
        {recs.map((rec, i) => (
          <div key={rec.item.id}
            className="grid grid-cols-[8rem_4rem_1fr] gap-4 items-center px-6"
            style={{
              paddingTop: '0.85rem', paddingBottom: '0.85rem',
              borderBottom: i < recs.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
              background: rec.canAfford ? 'rgba(0,255,136,0.04)' : 'rgba(255,68,85,0.04)',
              opacity: rec.canAfford ? 1 : 0.55,
            }}
          >
            <div>
              <div className="text-xs font-bold">{rec.item.label}</div>
              <div className="text-xs font-bold mt-px" style={{ color: rec.canAfford ? '#00aa60' : '#ff4455' }}>
                {rec.canAfford ? 'AFFORDABLE' : 'NEED MORE CASH'}
              </div>
            </div>
            <span className="text-xs font-bold opacity-70">${rec.item.cost.toLocaleString()}</span>
            <span className="text-xs opacity-60 leading-relaxed">{rec.reason}</span>
          </div>
        ))}
      </div>

      <div className="px-6 py-4 bg-black/2 border-t border-black/8">
        <span className="text-xs opacity-40 tracking-normal">TOTAL SPEND </span>
        <span className="text-sm font-bold">${Math.min(totalCost, cash).toLocaleString()}</span>
      </div>

      <div className="px-6 py-2.5 border-t border-black/8 text-xs tracking-normal opacity-30">
        PRIORITY ORDER ADAPTS TO CIRCLE PHASE, SQUAD SIZE, AND AVAILABLE CASH
      </div>
    </div>
  );
}
