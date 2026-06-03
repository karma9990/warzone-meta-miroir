'use client';

import { useState } from 'react';
import { WEAPON_CATALOG } from '@/lib/weaponData';

const WEAPONS = WEAPON_CATALOG.filter(w =>
  ['Kogot-7', 'VST', 'Carbon 57', 'DS20 Mirage', 'Voyak KT-3', 'M15 MOD 0', 'MK.78', 'Dravec 45'].includes(w.name)
).map(w => ({
  ...w,
  ranges: ({
    'Kogot-7':     [{ dist: 0, dmg: 28 }, { dist: 15, dmg: 22 }, { dist: 30, dmg: 17 }, { dist: 60, dmg: 12 }],
    'VST':         [{ dist: 0, dmg: 32 }, { dist: 12, dmg: 25 }, { dist: 25, dmg: 19 }, { dist: 60, dmg: 13 }],
    'Carbon 57':   [{ dist: 0, dmg: 27 }, { dist: 18, dmg: 21 }, { dist: 35, dmg: 16 }, { dist: 60, dmg: 11 }],
    'DS20 Mirage': [{ dist: 0, dmg: 33 }, { dist: 30, dmg: 30 }, { dist: 60, dmg: 26 }, { dist: 100, dmg: 22 }],
    'Voyak KT-3':  [{ dist: 0, dmg: 35 }, { dist: 30, dmg: 32 }, { dist: 60, dmg: 28 }, { dist: 100, dmg: 24 }],
    'M15 MOD 0':   [{ dist: 0, dmg: 56 }, { dist: 40, dmg: 50 }, { dist: 80, dmg: 44 }, { dist: 100, dmg: 40 }],
    'MK.78':       [{ dist: 0, dmg: 38 }, { dist: 50, dmg: 35 }, { dist: 100, dmg: 31 }, { dist: 150, dmg: 27 }],
    'Dravec 45':   [{ dist: 0, dmg: 26 }, { dist: 14, dmg: 20 }, { dist: 28, dmg: 15 }, { dist: 60, dmg: 10 }],
  }[w.name]!),
}));

const DIST_LABELS = [0, 15, 30, 60, 100];

function getDamageAt(weapon: typeof WEAPONS[0], dist: number): number {
  const sorted = [...weapon.ranges].sort((a, b) => b.dist - a.dist);
  const entry = sorted.find(r => dist >= r.dist) ?? weapon.ranges[0];
  return entry.dmg;
}

export default function DamageChart() {
  const [selected, setSelected] = useState<string[]>(['Kogot-7', 'DS20 Mirage']);
  const [activeRange, setActiveRange] = useState(30);

  const toggle = (name: string) => {
    setSelected(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : prev.length < 4 ? [...prev, name] : prev
    );
  };

  const selectedWeapons = WEAPONS.filter(w => selected.includes(w.name));
  const maxDmg = 60;

  return (
    <div className="border border-black/12 rounded mb-12 overflow-hidden font-mono">
      <div className="px-6 py-5 border-b border-black/10 bg-black/2">
        <div className="text-xs tracking-normal opacity-40 mb-1">WEAPON ANALYSIS</div>
        <div className="text-base font-bold tracking-normal">DAMAGE CHART</div>
      </div>

      {/* Weapon selector */}
      <div className="px-6 py-4 border-b border-black/8">
        <div className="text-xs tracking-normal opacity-40 mb-2.5">SELECT WEAPONS (MAX 4)</div>
        <div className="flex flex-wrap gap-1">
          {WEAPONS.map(w => {
            const isOn = selected.includes(w.name);
            return (
              <button type="button"
                key={w.name}
                onClick={() => toggle(w.name)}
                className="font-mono text-xs tracking-normal cursor-pointer px-1.5 py-[3px] rounded-sm transition-all"
                style={{
                  border: `1px solid ${isOn ? w.color : 'rgba(0,0,0,0.12)'}`,
                  background: isOn ? `${w.color}18` : 'transparent',
                  color: isOn ? w.color : 'inherit',
                  opacity: !isOn && selected.length >= 4 ? 0.35 : 1,
                }}
              >
                {w.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Range selector */}
      <div className="px-6 py-3 border-b border-black/8 flex gap-2 items-center">
        <span className="text-xs tracking-normal opacity-40 mr-2">RANGE</span>
        {DIST_LABELS.map(d => (
          <button type="button"
            key={d}
            onClick={() => setActiveRange(d)}
            className="font-mono text-xs tracking-normal cursor-pointer px-1.5 py-[2px] rounded-sm bg-transparent"
            style={{
              border: `1px solid ${activeRange === d ? 'currentColor' : 'rgba(0,0,0,0.12)'}`,
              fontWeight: activeRange === d ? 700 : 400,
              opacity: activeRange === d ? 1 : 0.5,
            }}
          >
            {d}m
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="p-6">
        {selectedWeapons.length === 0 && (
          <div className="text-center opacity-35 text-xs py-8">SELECT AT LEAST ONE WEAPON</div>
        )}
        {selectedWeapons.map(w => {
          const dmg = getDamageAt(w, activeRange);
          const pct = (dmg / maxDmg) * 100;
          return (
            <div key={w.name} className="mb-[1.1rem]">
              <div className="flex justify-between mb-1 items-center">
                <div className="flex gap-2 items-center">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: w.color }} />
                  <span className="text-xs font-semibold">{w.name}</span>
                  <span className="text-xs opacity-40 tracking-normal">{w.category}</span>
                </div>
                <span className="text-xs font-bold" style={{ color: w.color }}>{dmg} DMG</span>
              </div>
              <div className="h-1.5 bg-black/7 rounded-sm overflow-hidden">
                <div className="h-full rounded-sm" style={{ width: `${pct}%`, background: w.color, transition: 'width 0.3s' }} />
              </div>
              <div className="flex justify-between mt-0.5">
                {DIST_LABELS.slice(0, 4).map(d => (
                  <span key={d} className="text-xs opacity-30">{d}m: {getDamageAt(w, d)}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-6 py-2.5 border-t border-black/8 text-xs tracking-normal opacity-30">
        DAMAGE VALUES BASED ON BODY SHOTS — HEADSHOT MULTIPLIER NOT INCLUDED
      </div>
    </div>
  );
}
