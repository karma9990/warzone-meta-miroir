'use client';

import { useState } from 'react';

type Armor = 0 | 1 | 2 | 3;
type Position = 'high_ground' | 'cover' | 'open' | 'moving';
type Scenario = '1v1' | '1v2' | '1v3';

interface Enemy { armor: Armor; position: Position; distance: number }

const HP: Record<Armor, number> = { 0: 100, 1: 150, 2: 200, 3: 250 };
const POSITION_LABEL: Record<Position, string> = {
  high_ground: 'High ground', cover: 'In cover', open: 'Open / exposed', moving: 'Moving / sliding',
};
const POSITION_MULT: Record<Position, number> = {
  high_ground: 0.7, cover: 0.75, open: 1.0, moving: 1.2,
};

const WEAPONS = [
  { name: 'Kogot-7',     damage: 28, rpm: 800,  stk250: 9,  adsMs: 148 },
  { name: 'VST',         damage: 32, rpm: 720,  stk250: 8,  adsMs: 155 },
  { name: 'Carbon 57',   damage: 27, rpm: 750,  stk250: 10, adsMs: 151 },
  { name: 'DS20 Mirage', damage: 33, rpm: 600,  stk250: 8,  adsMs: 185 },
  { name: 'Voyak KT-3',  damage: 35, rpm: 560,  stk250: 8,  adsMs: 192 },
  { name: 'M15 MOD 0',   damage: 56, rpm: 280,  stk250: 5,  adsMs: 220 },
  { name: 'MK.78',       damage: 38, rpm: 480,  stk250: 7,  adsMs: 260 },
];

function calcTTK(weapon: typeof WEAPONS[0], hp: number): number {
  const stk = Math.ceil(hp / weapon.damage);
  return Math.round(((stk - 1) / (weapon.rpm / 60)) * 1000);
}

function getWinChance(myWeapon: typeof WEAPONS[0], enemies: Enemy[], myArmor: Armor, myPosition: Position): number {
  let score = HP[myArmor] * POSITION_MULT[myPosition] * 0.4;

  for (const enemy of enemies) {
    const enemyHP = HP[enemy.armor] * POSITION_MULT[enemy.position];
    const myTTK = calcTTK(myWeapon, enemyHP);
    const distPenalty = enemy.distance > 30 ? Math.min(30, (enemy.distance - 30) / 2) : 0;
    const posAdv = myPosition === 'high_ground' ? 15 : myPosition === 'cover' ? 8 : 0;
    const enemyPosDisadv = enemy.position === 'open' ? 20 : enemy.position === 'moving' ? -10 : 0;
    score = score - (myTTK / 10) - distPenalty + posAdv + enemyPosDisadv;
  }

  if (enemies.length >= 2) score -= 20;
  if (enemies.length >= 3) score -= 25;

  return Math.max(5, Math.min(95, Math.round(score)));
}

function getPriorityOrder(enemies: Enemy[]): number[] {
  const scored = enemies.map((e, i) => ({
    i,
    score: (e.position === 'open' ? 30 : e.position === 'moving' ? 20 : 10) + HP[e.armor] * -0.05 + e.distance * -0.3,
  }));
  return scored.sort((a, b) => b.score - a.score).map(s => s.i);
}

export default function GunfightSimulator() {
  const [scenario, setScenario] = useState<Scenario>('1v2');
  const [myWeapon, setMyWeapon] = useState('Kogot-7');
  const [myArmor, setMyArmor] = useState<Armor>(3);
  const [myPosition, setMyPosition] = useState<Position>('cover');
  const [enemies, setEnemies] = useState<Enemy[]>([
    { armor: 3, position: 'cover', distance: 15 },
    { armor: 2, position: 'open', distance: 20 },
    { armor: 3, position: 'high_ground', distance: 10 },
  ]);

  const numEnemies = scenario === '1v1' ? 1 : scenario === '1v2' ? 2 : 3;
  const activeEnemies = enemies.slice(0, numEnemies);
  const weapon = WEAPONS.find(w => w.name === myWeapon)!;
  const winChance = getWinChance(weapon, activeEnemies, myArmor, myPosition);
  const priority = getPriorityOrder(activeEnemies);

  const updateEnemy = (i: number, key: keyof Enemy, val: Enemy[keyof Enemy]) => {
    setEnemies(prev => prev.map((e, idx) => idx === i ? { ...e, [key]: val } : e));
  };

  const winColor = winChance >= 65 ? '#00ff88' : winChance >= 40 ? '#ffcc00' : '#ff4455';
  const winLabel = winChance >= 65 ? 'FAVORABLE' : winChance >= 40 ? 'CONTESTED' : 'AVOID';

  return (
    <div style={{ border: '1px solid rgba(0,0,0,0.12)', borderRadius: '4px', marginBottom: '3rem', overflow: 'hidden', fontFamily: 'monospace' }}>
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.1)', background: 'rgba(0,0,0,0.02)' }}>
        <div style={{ fontSize: '0.55rem', letterSpacing: '0.2em', opacity: 0.4, marginBottom: '0.3rem' }}>MECHANICS</div>
        <div style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.08em' }}>GUNFIGHT SIMULATOR</div>
      </div>

      {/* Scenario selector */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
        {(['1v1', '1v2', '1v3'] as Scenario[]).map(s => (
          <button key={s} onClick={() => setScenario(s)} style={{
            flex: 1, padding: '0.75rem 0', border: 'none',
            borderBottom: scenario === s ? '2px solid currentColor' : '2px solid transparent',
            background: 'transparent', fontSize: '0.65rem', letterSpacing: '0.12em',
            color: scenario === s ? 'inherit' : 'rgba(0,0,0,0.35)',
            cursor: 'pointer', fontFamily: 'monospace', fontWeight: scenario === s ? 700 : 400,
          }}>{s}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
        {/* Your setup */}
        <div style={{ padding: '1.25rem', borderRight: '1px solid rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '0.5rem', letterSpacing: '0.15em', opacity: 0.4, marginBottom: '0.75rem' }}>YOUR SETUP</div>

          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.45rem', opacity: 0.4, marginBottom: '0.3rem' }}>WEAPON</div>
            <select value={myWeapon} onChange={e => setMyWeapon(e.target.value)} style={{ fontFamily: 'monospace', fontSize: '0.6rem', padding: '4px 6px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '2px', background: 'transparent', width: '100%', cursor: 'pointer' }}>
              {WEAPONS.map(w => <option key={w.name} value={w.name}>{w.name}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.45rem', opacity: 0.4, marginBottom: '0.3rem' }}>ARMOR PLATES</div>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              {([0, 1, 2, 3] as Armor[]).map(a => (
                <button key={a} onClick={() => setMyArmor(a)} style={{ flex: 1, padding: '4px 0', border: `1px solid ${myArmor === a ? 'currentColor' : 'rgba(0,0,0,0.12)'}`, borderRadius: '2px', background: 'transparent', fontSize: '0.6rem', cursor: 'pointer', fontFamily: 'monospace', fontWeight: myArmor === a ? 700 : 400, opacity: myArmor === a ? 1 : 0.4 }}>{a}</button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.45rem', opacity: 0.4, marginBottom: '0.3rem' }}>YOUR POSITION</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {(Object.keys(POSITION_LABEL) as Position[]).map(p => (
                <button key={p} onClick={() => setMyPosition(p)} style={{ padding: '5px 8px', border: `1px solid ${myPosition === p ? 'currentColor' : 'rgba(0,0,0,0.12)'}`, borderRadius: '2px', background: myPosition === p ? 'rgba(0,0,0,0.05)' : 'transparent', fontSize: '0.58rem', cursor: 'pointer', fontFamily: 'monospace', textAlign: 'left', fontWeight: myPosition === p ? 700 : 400, opacity: myPosition === p ? 1 : 0.45 }}>
                  {POSITION_LABEL[p]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Enemies */}
        <div style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.5rem', letterSpacing: '0.15em', opacity: 0.4, marginBottom: '0.75rem' }}>ENEMIES</div>
          {activeEnemies.map((enemy, i) => (
            <div key={i} style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(0,0,0,0.03)', borderRadius: '3px', border: `1px solid ${priority[0] === i ? 'rgba(255,68,85,0.4)' : 'rgba(0,0,0,0.08)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.6rem', fontWeight: 700 }}>ENEMY {i + 1}</span>
                {priority[0] === i && <span style={{ fontSize: '0.45rem', color: '#ff4455', letterSpacing: '0.1em', fontWeight: 700 }}>PRIORITY TARGET</span>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.4rem', opacity: 0.4, marginBottom: '0.25rem' }}>ARMOR</div>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {([0, 1, 2, 3] as Armor[]).map(a => (
                      <button key={a} onClick={() => updateEnemy(i, 'armor', a)} style={{ flex: 1, padding: '3px 0', border: `1px solid ${enemy.armor === a ? 'currentColor' : 'rgba(0,0,0,0.12)'}`, borderRadius: '2px', background: 'transparent', fontSize: '0.5rem', cursor: 'pointer', fontFamily: 'monospace', opacity: enemy.armor === a ? 1 : 0.4 }}>{a}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.4rem', opacity: 0.4, marginBottom: '0.25rem' }}>DIST (m)</div>
                  <input type="number" min={1} max={150} value={enemy.distance} onChange={e => updateEnemy(i, 'distance', Number(e.target.value))} style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.6rem', padding: '3px 6px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '2px', background: 'transparent', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ fontSize: '0.4rem', opacity: 0.4, marginBottom: '0.25rem' }}>POSITION</div>
                <select value={enemy.position} onChange={e => updateEnemy(i, 'position', e.target.value as Position)} style={{ fontFamily: 'monospace', fontSize: '0.55rem', padding: '3px 6px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '2px', background: 'transparent', width: '100%', cursor: 'pointer' }}>
                  {(Object.keys(POSITION_LABEL) as Position[]).map(p => <option key={p} value={p}>{POSITION_LABEL[p]}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Result */}
      <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid rgba(0,0,0,0.1)', background: `${winColor}08`, display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '1.5rem', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: winColor, lineHeight: 1 }}>{winChance}%</div>
          <div style={{ fontSize: '0.55rem', fontWeight: 700, color: winColor, letterSpacing: '0.12em', marginTop: '2px' }}>{winLabel}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.5rem', letterSpacing: '0.12em', opacity: 0.4, marginBottom: '0.5rem' }}>TARGET PRIORITY</div>
          {priority.slice(0, numEnemies).map((idx, rank) => (
            <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.55rem', color: rank === 0 ? '#ff4455' : rank === 1 ? '#ffcc00' : '#8899aa', fontWeight: 700, minWidth: '14px' }}>{rank + 1}.</span>
              <span style={{ fontSize: '0.57rem', opacity: 0.7 }}>Enemy {idx + 1} — {POSITION_LABEL[activeEnemies[idx].position]}, {activeEnemies[idx].distance}m, {activeEnemies[idx].armor} plates</span>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.45rem', opacity: 0.4, marginBottom: '0.25rem' }}>YOUR TTK</div>
          <div style={{ fontSize: '1rem', fontWeight: 700 }}>{calcTTK(weapon, HP[myArmor])} ms</div>
          <div style={{ fontSize: '0.45rem', opacity: 0.4, marginTop: '0.25rem' }}>vs {HP[myArmor]} HP</div>
        </div>
      </div>

      <div style={{ padding: '0.6rem 1.5rem', borderTop: '1px solid rgba(0,0,0,0.08)', fontSize: '0.5rem', letterSpacing: '0.12em', opacity: 0.3 }}>
        WIN CHANCE IS AN ESTIMATE — EXECUTION, CROSSHAIR PLACEMENT, AND LUCK ARE NOT MODELED
      </div>
    </div>
  );
}
