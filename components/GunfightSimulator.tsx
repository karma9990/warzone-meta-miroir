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
    <div className="border border-black/12 rounded mb-12 overflow-hidden font-mono">
      <div className="px-6 py-5 border-b border-black/10 bg-black/2">
        <div className="text-xs tracking-normal opacity-40 mb-1">MECHANICS</div>
        <div className="text-base font-bold tracking-normal">GUNFIGHT SIMULATOR</div>
      </div>

      {/* Scenario selector */}
      <div className="flex border-b border-black/10">
        {(['1v1', '1v2', '1v3'] as Scenario[]).map(s => (
          <button type="button" key={s} onClick={() => setScenario(s)}
            className="font-mono text-xs tracking-normal cursor-pointer bg-transparent"
            style={{
              flex: 1, padding: '0.75rem 0', border: 'none',
              borderBottom: scenario === s ? '2px solid currentColor' : '2px solid transparent',
              color: scenario === s ? 'inherit' : 'rgba(0,0,0,0.35)',
              fontWeight: scenario === s ? 700 : 400,
            }}
          >{s}</button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-0">
        {/* Your setup */}
        <div className="p-5 border-r border-black/8">
          <div className="text-xs tracking-normal opacity-40 mb-3">YOUR SETUP</div>

          <div className="mb-3">
            <div className="text-xs opacity-40 mb-1">WEAPON</div>
            <select aria-label="Select" value={myWeapon} onChange={e => setMyWeapon(e.target.value)}
              className="font-mono text-xs px-1.5 py-1 border border-black/15 rounded-sm bg-transparent w-full cursor-pointer"
            >
              {WEAPONS.map(w => <option key={w.name} value={w.name}>{w.name}</option>)}
            </select>
          </div>

          <div className="mb-3">
            <div className="text-xs opacity-40 mb-1">ARMOR PLATES</div>
            <div className="flex gap-1">
              {([0, 1, 2, 3] as Armor[]).map(a => (
                <button type="button" key={a} onClick={() => setMyArmor(a)}
                  className="font-mono text-xs cursor-pointer rounded-sm bg-transparent"
                  style={{
                    flex: 1, padding: '4px 0',
                    border: `1px solid ${myArmor === a ? 'currentColor' : 'rgba(0,0,0,0.12)'}`,
                    fontWeight: myArmor === a ? 700 : 400,
                    opacity: myArmor === a ? 1 : 0.4,
                  }}
                >{a}</button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs opacity-40 mb-1">YOUR POSITION</div>
            <div className="flex flex-col gap-1">
              {(Object.keys(POSITION_LABEL) as Position[]).map(p => (
                <button type="button" key={p} onClick={() => setMyPosition(p)}
                  className="font-mono text-xs cursor-pointer text-left rounded-sm"
                  style={{
                    padding: '5px 8px',
                    border: `1px solid ${myPosition === p ? 'currentColor' : 'rgba(0,0,0,0.12)'}`,
                    background: myPosition === p ? 'rgba(0,0,0,0.05)' : 'transparent',
                    fontWeight: myPosition === p ? 700 : 400,
                    opacity: myPosition === p ? 1 : 0.45,
                  }}
                >
                  {POSITION_LABEL[p]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Enemies */}
        <div className="p-5">
          <div className="text-xs tracking-normal opacity-40 mb-3">ENEMIES</div>
          {activeEnemies.map((enemy, i) => (
            <div key={`${enemy.position}-${enemy.distance}-${enemy.armor}-${i + 1}`} className="mb-4 rounded-sm"
              style={{
                padding: '0.75rem',
                background: 'rgba(0,0,0,0.03)',
                border: `1px solid ${priority[0] === i ? 'rgba(255,68,85,0.4)' : 'rgba(0,0,0,0.08)'}`,
              }}
            >
              <div className="flex justify-between mb-2 items-center">
                <span className="text-xs font-bold">ENEMY {i + 1}</span>
                {priority[0] === i && <span className="text-xs tracking-normal font-bold" style={{ color: '#ff4455' }}>PRIORITY TARGET</span>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs opacity-40 mb-1">ARMOR</div>
                  <div className="flex gap-1">
                    {([0, 1, 2, 3] as Armor[]).map(a => (
                      <button type="button" key={a} onClick={() => updateEnemy(i, 'armor', a)}
                        className="font-mono text-xs cursor-pointer rounded-sm bg-transparent"
                        style={{
                          flex: 1, padding: '3px 0',
                          border: `1px solid ${enemy.armor === a ? 'currentColor' : 'rgba(0,0,0,0.12)'}`,
                          opacity: enemy.armor === a ? 1 : 0.4,
                        }}
                      >{a}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs opacity-40 mb-1">DIST (m)</div>
                  <input aria-label="Input" type="number" min={1} max={150} value={enemy.distance}
                    onChange={e => updateEnemy(i, 'distance', Number(e.target.value))}
                    className="w-full font-mono text-xs px-1.5 py-[3px] border border-black/15 rounded-sm bg-transparent box-border"
                  />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-xs opacity-40 mb-1">POSITION</div>
                <select aria-label="Select" value={enemy.position}
                  onChange={e => updateEnemy(i, 'position', e.target.value as Position)}
                  className="font-mono text-xs px-1.5 py-[3px] border border-black/15 rounded-sm bg-transparent w-full cursor-pointer"
                >
                  {(Object.keys(POSITION_LABEL) as Position[]).map(p => <option key={p} value={p}>{POSITION_LABEL[p]}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Result */}
      <div className="px-6 py-5 border-t border-black/10 grid grid-cols-[auto_1fr_auto] gap-6 items-center"
        style={{ background: `${winColor}08` }}
      >
        <div className="text-center">
          <div className="text-4xl font-bold leading-none" style={{ color: winColor }}>{winChance}%</div>
          <div className="text-xs font-bold tracking-normal mt-0.5" style={{ color: winColor }}>{winLabel}</div>
        </div>
        <div>
          <div className="text-xs tracking-normal opacity-40 mb-2">TARGET PRIORITY</div>
          {priority.slice(0, numEnemies).map((idx, rank) => (
            <div key={`priority-enemy-${idx + 1}`} className="flex gap-1.5 items-center mb-1">
              <span className="text-xs font-bold min-w-[14px]"
                style={{ color: rank === 0 ? '#ff4455' : rank === 1 ? '#ffcc00' : '#8899aa' }}
              >{rank + 1}.</span>
              <span className="text-xs opacity-70">Enemy {idx + 1} — {POSITION_LABEL[activeEnemies[idx].position]}, {activeEnemies[idx].distance}m, {activeEnemies[idx].armor} plates</span>
            </div>
          ))}
        </div>
        <div className="text-center">
          <div className="text-xs opacity-40 mb-1">YOUR TTK</div>
          <div className="text-base font-bold">{calcTTK(weapon, HP[myArmor])} ms</div>
          <div className="text-xs opacity-40 mt-1">vs {HP[myArmor]} HP</div>
        </div>
      </div>

      <div className="px-6 py-2.5 border-t border-black/8 text-xs tracking-normal opacity-30">
        WIN CHANCE IS AN ESTIMATE — EXECUTION, CROSSHAIR PLACEMENT, AND LUCK ARE NOT MODELED
      </div>
    </div>
  );
}
