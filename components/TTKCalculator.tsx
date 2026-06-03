'use client';

import { useState } from 'react';
import { WEAPON_CATALOG } from '@/lib/weaponData';

interface Weapon {
  name: string;
  category: string;
  damage: number;
  rpm: number;
  ranges: { dist: number; damage: number }[];
}

const WEAPONS: Weapon[] = [
  { ...WEAPON_CATALOG.find(w => w.name === 'Kogot-7')!,    damage: 28, rpm: 800,  ranges: [{ dist: 0, damage: 28 }, { dist: 15, damage: 22 }, { dist: 30, damage: 17 }] },
  { ...WEAPON_CATALOG.find(w => w.name === 'VST')!,         damage: 32, rpm: 720,  ranges: [{ dist: 0, damage: 32 }, { dist: 12, damage: 25 }, { dist: 25, damage: 19 }] },
  { ...WEAPON_CATALOG.find(w => w.name === 'Carbon 57')!,   damage: 27, rpm: 750,  ranges: [{ dist: 0, damage: 27 }, { dist: 18, damage: 21 }, { dist: 35, damage: 16 }] },
  { ...WEAPON_CATALOG.find(w => w.name === 'DS20 Mirage')!, damage: 33, rpm: 600,  ranges: [{ dist: 0, damage: 33 }, { dist: 30, damage: 30 }, { dist: 60, damage: 26 }] },
  { ...WEAPON_CATALOG.find(w => w.name === 'Voyak KT-3')!,  damage: 35, rpm: 560,  ranges: [{ dist: 0, damage: 35 }, { dist: 30, damage: 32 }, { dist: 60, damage: 28 }] },
  { ...WEAPON_CATALOG.find(w => w.name === 'M15 MOD 0')!,   damage: 56, rpm: 280,  ranges: [{ dist: 0, damage: 56 }, { dist: 40, damage: 50 }, { dist: 80, damage: 44 }] },
  { ...WEAPON_CATALOG.find(w => w.name === 'MK.78')!,       damage: 38, rpm: 480,  ranges: [{ dist: 0, damage: 38 }, { dist: 50, damage: 35 }, { dist: 100, damage: 31 }] },
  { ...WEAPON_CATALOG.find(w => w.name === 'Dravec 45')!,   damage: 26, rpm: 780,  ranges: [{ dist: 0, damage: 26 }, { dist: 14, damage: 20 }, { dist: 28, damage: 15 }] },
];

const HP_OPTIONS = [
  { label: '0 plates — 100 HP',  hp: 100 },
  { label: '1 plate  — 150 HP',  hp: 150 },
  { label: '2 plates — 200 HP',  hp: 200 },
  { label: '3 plates — 250 HP',  hp: 250 },
];

const DIST_OPTIONS = [0, 15, 30, 60];

function calcTTK(weapon: Weapon, hp: number, dist: number): { ttk: number; stk: number; dmg: number } {
  const rangeEntry = [...weapon.ranges].reverse().find(r => dist >= r.dist) ?? weapon.ranges[0];
  const dmg = rangeEntry.damage;
  const stk = Math.ceil(hp / dmg);
  const ttk = Math.round(((stk - 1) / (weapon.rpm / 60)) * 1000);
  return { ttk, stk, dmg };
}

function getTTKColor(ttk: number): string {
  if (ttk < 300) return '#00ff88';
  if (ttk < 500) return '#ffcc00';
  return '#ff4455';
}

export default function TTKCalculator() {
  const [weaponA, setWeaponA] = useState(WEAPONS[0].name);
  const [weaponB, setWeaponB] = useState(WEAPONS[3].name);
  const [hp, setHp] = useState(250);
  const [dist, setDist] = useState(0);

  const wA = WEAPONS.find(w => w.name === weaponA)!;
  const wB = WEAPONS.find(w => w.name === weaponB)!;
  const rA = calcTTK(wA, hp, dist);
  const rB = calcTTK(wB, hp, dist);

  const maxTTK = Math.max(rA.ttk, rB.ttk, 1);

  return (
    <div className="border border-black/12 rounded mb-12 overflow-hidden font-mono">
      <div className="px-6 py-5 border-b border-black/10 bg-black/2">
        <div className="text-xs tracking-normal opacity-40 mb-1">WEAPON ANALYSIS</div>
        <div className="text-base font-bold tracking-normal">TTK CALCULATOR</div>
      </div>

      {/* Controls */}
      <div className="px-6 py-4 border-b border-black/8 grid grid-cols-4 gap-4 flex-wrap">
        {[
          { label: 'WEAPON A', value: weaponA, set: setWeaponA },
          { label: 'WEAPON B', value: weaponB, set: setWeaponB },
        ].map(({ label, value, set }) => (
          <div key={label}>
            <div className="text-xs tracking-normal opacity-40 mb-1.5">{label}</div>
            <select
              value={value}
              onChange={e => set(e.target.value)}
              className="font-mono text-xs px-1.5 py-1 border border-black/15 rounded-sm bg-transparent w-full cursor-pointer"
            >
              {WEAPONS.map(w => <option key={w.name} value={w.name}>{w.name} ({w.category})</option>)}
            </select>
          </div>
        ))}
        <div>
          <div className="text-xs tracking-normal opacity-40 mb-1.5">ARMOR</div>
          <select
            value={hp}
            onChange={e => setHp(Number(e.target.value))}
            className="font-mono text-xs px-1.5 py-1 border border-black/15 rounded-sm bg-transparent w-full cursor-pointer"
          >
            {HP_OPTIONS.map(o => <option key={o.hp} value={o.hp}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <div className="text-xs tracking-normal opacity-40 mb-1.5">DISTANCE (m)</div>
          <select
            value={dist}
            onChange={e => setDist(Number(e.target.value))}
            className="font-mono text-xs px-1.5 py-1 border border-black/15 rounded-sm bg-transparent w-full cursor-pointer"
          >
            {DIST_OPTIONS.map(d => <option key={d} value={d}>{d}m</option>)}
          </select>
        </div>
      </div>

      {/* Results */}
      <div className="p-6 grid grid-cols-2 gap-6">
        {[{ w: wA, r: rA }, { w: wB, r: rB }].map(({ w, r }) => (
          <div key={w.name} className="p-5 border border-black/10 rounded-sm">
            <div className="text-xs tracking-normal opacity-40 mb-1">{w.category}</div>
            <div className="text-sm font-bold tracking-normal mb-4">{w.name}</div>

            <div className="mb-4">
              <div className="flex justify-between mb-1.5">
                <span className="text-xs opacity-50">TTK</span>
                <span className="text-sm font-bold" style={{ color: getTTKColor(r.ttk) }}>{r.ttk} ms</span>
              </div>
              <div className="h-1 bg-black/8 rounded-sm overflow-hidden">
                <div className="h-full rounded-sm" style={{ width: `${(r.ttk / maxTTK) * 100}%`, background: getTTKColor(r.ttk), transition: 'width 0.3s' }} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'SHOTS', value: r.stk },
                { label: 'DMG/SHOT', value: `${r.dmg}` },
                { label: 'RPM', value: w.rpm },
              ].map(({ label, value }) => (
                <div key={label} className="text-center p-2 bg-black/3 rounded-sm">
                  <div className="text-xs font-bold">{value}</div>
                  <div className="text-xs tracking-normal opacity-40">{label}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="px-6 py-2.5 border-t border-black/8 text-xs tracking-normal opacity-30">
        TTK = TIME TO KILL — ASSUMES ALL SHOTS HIT BODY / NO HEADSHOT MULTIPLIER
      </div>
    </div>
  );
}
