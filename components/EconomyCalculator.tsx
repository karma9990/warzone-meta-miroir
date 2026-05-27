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
    <div style={{ border: '1px solid rgba(0,0,0,0.12)', borderRadius: '4px', marginBottom: '3rem', overflow: 'hidden', fontFamily: 'monospace' }}>
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.1)', background: 'rgba(0,0,0,0.02)' }}>
        <div style={{ fontSize: '0.55rem', letterSpacing: '0.2em', opacity: 0.4, marginBottom: '0.3rem' }}>GAME STRATEGY</div>
        <div style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.08em' }}>ECONOMY CALCULATOR</div>
      </div>

      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem' }}>
        <div>
          <div style={{ fontSize: '0.45rem', letterSpacing: '0.15em', opacity: 0.4, marginBottom: '0.5rem' }}>SQUAD CASH ($)</div>
          <input
            type="number" min={0} max={50000} step={500} value={cash}
            onChange={(e) => setCash(Number(e.target.value))}
            style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 700, padding: '6px 8px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '2px', background: 'transparent', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <div style={{ fontSize: '0.45rem', letterSpacing: '0.15em', opacity: 0.4, marginBottom: '0.5rem' }}>SQUAD SIZE</div>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            {SQUAD_SIZES.map((s) => (
              <button key={s} onClick={() => setSquad(s)} style={{
                flex: 1, padding: '5px 0', border: `1px solid ${squad === s ? 'currentColor' : 'rgba(0,0,0,0.12)'}`,
                borderRadius: '2px', background: 'transparent', fontSize: '0.6rem', fontWeight: squad === s ? 700 : 400,
                cursor: 'pointer', fontFamily: 'monospace', opacity: squad === s ? 1 : 0.4,
              }}>{s}v</button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.45rem', letterSpacing: '0.15em', opacity: 0.4, marginBottom: '0.5rem' }}>CIRCLE</div>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            {CIRCLES.map((c) => (
              <button key={c} onClick={() => setCircle(c)} style={{
                flex: 1, padding: '5px 0', border: `1px solid ${circle === c ? 'currentColor' : 'rgba(0,0,0,0.12)'}`,
                borderRadius: '2px', background: 'transparent', fontSize: '0.6rem', fontWeight: circle === c ? 700 : 400,
                cursor: 'pointer', fontFamily: 'monospace', opacity: circle === c ? 1 : 0.4,
              }}>C{c}</button>
            ))}
          </div>
        </div>
      </div>

      <div>
        {recs.map((rec, i) => (
          <div key={rec.item.id} style={{
            display: 'grid', gridTemplateColumns: '8rem 4rem 1fr', gap: '1rem', alignItems: 'center',
            padding: '0.85rem 1.5rem', borderBottom: i < recs.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
            background: rec.canAfford ? 'rgba(0,255,136,0.04)' : 'rgba(255,68,85,0.04)',
            opacity: rec.canAfford ? 1 : 0.55,
          }}>
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700 }}>{rec.item.label}</div>
              <div style={{ fontSize: '0.5rem', fontWeight: 700, color: rec.canAfford ? '#00aa60' : '#ff4455', marginTop: '1px' }}>
                {rec.canAfford ? 'AFFORDABLE' : 'NEED MORE CASH'}
              </div>
            </div>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, opacity: 0.7 }}>${rec.item.cost.toLocaleString()}</span>
            <span style={{ fontSize: '0.57rem', opacity: 0.6, lineHeight: 1.55 }}>{rec.reason}</span>
          </div>
        ))}
      </div>

      <div style={{ padding: '1rem 1.5rem', background: 'rgba(0,0,0,0.02)', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
        <span style={{ fontSize: '0.5rem', opacity: 0.4, letterSpacing: '0.1em' }}>TOTAL SPEND </span>
        <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>${Math.min(totalCost, cash).toLocaleString()}</span>
      </div>

      <div style={{ padding: '0.6rem 1.5rem', borderTop: '1px solid rgba(0,0,0,0.08)', fontSize: '0.5rem', letterSpacing: '0.12em', opacity: 0.3 }}>
        PRIORITY ORDER ADAPTS TO CIRCLE PHASE, SQUAD SIZE, AND AVAILABLE CASH
      </div>
    </div>
  );
}
