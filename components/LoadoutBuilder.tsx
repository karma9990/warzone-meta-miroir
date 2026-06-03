'use client';

import { useState } from 'react';

type Role = 'fragger' | 'support' | 'sniper' | 'flex';

interface WeaponConfig {
  name: string;
  category: string;
  roles: Role[];
  attachments: Record<Role, { slot: string; item: string }[]>;
  stats: { ads: number; recoil: number; ttk: number; range: number };
}

const WEAPONS: WeaponConfig[] = [
  {
    name: 'Kogot-7', category: 'SMG', roles: ['fragger', 'flex'],
    attachments: {
      fragger: [
        { slot: 'Muzzle', item: 'Compensator V2' }, { slot: 'Barrel', item: 'Short Sprint' },
        { slot: 'Grip', item: 'Rubberized' }, { slot: 'Stock', item: 'Agility Stock' }, { slot: 'Rear Grip', item: 'Tape-Wrapped' },
      ],
      support: [
        { slot: 'Muzzle', item: 'Suppressor' }, { slot: 'Barrel', item: 'Mid-Length' },
        { slot: 'Grip', item: 'Vertical Grip' }, { slot: 'Stock', item: 'Combat Stock' }, { slot: 'Rear Grip', item: 'Firm Grip' },
      ],
      sniper:  [{ slot: 'Muzzle', item: '—' }, { slot: 'Barrel', item: '—' }, { slot: 'Grip', item: '—' }, { slot: 'Stock', item: '—' }, { slot: 'Rear Grip', item: '—' }],
      flex:    [
        { slot: 'Muzzle', item: 'Flash Hider' }, { slot: 'Barrel', item: 'Short Sprint' },
        { slot: 'Grip', item: 'Rubberized' }, { slot: 'Stock', item: 'Agility Stock' }, { slot: 'Rear Grip', item: 'Firm Grip' },
      ],
    },
    stats: { ads: 94, recoil: 72, ttk: 88, range: 40 },
  },
  {
    name: 'VST', category: 'SMG', roles: ['fragger'],
    attachments: {
      fragger: [
        { slot: 'Muzzle', item: 'Muzzle Brake' }, { slot: 'Barrel', item: 'Sprint Barrel' },
        { slot: 'Grip', item: 'Rubberized' }, { slot: 'Stock', item: 'Light Stock' }, { slot: 'Rear Grip', item: 'Tape-Wrapped' },
      ],
      support: [{ slot: 'Muzzle', item: '—' }, { slot: 'Barrel', item: '—' }, { slot: 'Grip', item: '—' }, { slot: 'Stock', item: '—' }, { slot: 'Rear Grip', item: '—' }],
      sniper:  [{ slot: 'Muzzle', item: '—' }, { slot: 'Barrel', item: '—' }, { slot: 'Grip', item: '—' }, { slot: 'Stock', item: '—' }, { slot: 'Rear Grip', item: '—' }],
      flex:    [
        { slot: 'Muzzle', item: 'Flash Hider' }, { slot: 'Barrel', item: 'Sprint Barrel' },
        { slot: 'Grip', item: 'Rubberized' }, { slot: 'Stock', item: 'Light Stock' }, { slot: 'Rear Grip', item: 'Firm Grip' },
      ],
    },
    stats: { ads: 96, recoil: 65, ttk: 92, range: 35 },
  },
  {
    name: 'DS20 Mirage', category: 'AR', roles: ['support', 'flex'],
    attachments: {
      fragger: [
        { slot: 'Muzzle', item: 'Flash Hider' }, { slot: 'Barrel', item: 'Short Barrel' },
        { slot: 'Grip', item: 'Rubberized' }, { slot: 'Stock', item: 'Light Stock' }, { slot: 'Optic', item: '1.5x' },
      ],
      support: [
        { slot: 'Muzzle', item: 'Suppressor' }, { slot: 'Barrel', item: 'Mid Barrel' },
        { slot: 'Grip', item: 'Vertical Grip' }, { slot: 'Stock', item: 'Combat Stock' }, { slot: 'Optic', item: '2x' },
      ],
      sniper:  [{ slot: 'Muzzle', item: '—' }, { slot: 'Barrel', item: '—' }, { slot: 'Grip', item: '—' }, { slot: 'Stock', item: '—' }, { slot: 'Optic', item: '—' }],
      flex:    [
        { slot: 'Muzzle', item: 'Compensator' }, { slot: 'Barrel', item: 'Mid Barrel' },
        { slot: 'Grip', item: 'Rubberized' }, { slot: 'Stock', item: 'Combat Stock' }, { slot: 'Optic', item: '2x' },
      ],
    },
    stats: { ads: 72, recoil: 80, ttk: 76, range: 85 },
  },
  {
    name: 'M15 MOD 0', category: 'AR', roles: ['sniper', 'support'],
    attachments: {
      fragger: [{ slot: 'Muzzle', item: '—' }, { slot: 'Barrel', item: '—' }, { slot: 'Grip', item: '—' }, { slot: 'Optic', item: '—' }, { slot: 'Stock', item: '—' }],
      support: [
        { slot: 'Muzzle', item: 'Suppressor' }, { slot: 'Barrel', item: 'Long Barrel' },
        { slot: 'Grip', item: 'Angled Grip' }, { slot: 'Optic', item: '2.5x' }, { slot: 'Stock', item: 'Precision Stock' },
      ],
      sniper: [
        { slot: 'Muzzle', item: 'Muzzle Brake' }, { slot: 'Barrel', item: 'Long Barrel' },
        { slot: 'Grip', item: 'Angled Grip' }, { slot: 'Optic', item: '3x' }, { slot: 'Stock', item: 'Precision Stock' },
      ],
      flex: [
        { slot: 'Muzzle', item: 'Flash Hider' }, { slot: 'Barrel', item: 'Mid Barrel' },
        { slot: 'Grip', item: 'Rubberized' }, { slot: 'Optic', item: '2x' }, { slot: 'Stock', item: 'Combat Stock' },
      ],
    },
    stats: { ads: 55, recoil: 88, ttk: 65, range: 95 },
  },
  {
    name: 'MK.78', category: 'LMG', roles: ['support'],
    attachments: {
      fragger: [{ slot: 'Muzzle', item: '—' }, { slot: 'Barrel', item: '—' }, { slot: 'Grip', item: '—' }, { slot: 'Optic', item: '—' }, { slot: 'Stock', item: '—' }],
      support: [
        { slot: 'Muzzle', item: 'Suppressor' }, { slot: 'Barrel', item: 'Long Barrel' },
        { slot: 'Grip', item: 'Bipod' }, { slot: 'Optic', item: '2x' }, { slot: 'Stock', item: 'Heavy Stock' },
      ],
      sniper: [{ slot: 'Muzzle', item: '—' }, { slot: 'Barrel', item: '—' }, { slot: 'Grip', item: '—' }, { slot: 'Optic', item: '—' }, { slot: 'Stock', item: '—' }],
      flex: [
        { slot: 'Muzzle', item: 'Compensator' }, { slot: 'Barrel', item: 'Mid Barrel' },
        { slot: 'Grip', item: 'Vertical Grip' }, { slot: 'Optic', item: '1.5x' }, { slot: 'Stock', item: 'Combat Stock' },
      ],
    },
    stats: { ads: 45, recoil: 85, ttk: 60, range: 90 },
  },
];

const ROLES: { key: Role; label: string; desc: string }[] = [
  { key: 'fragger',  label: 'FRAGGER',  desc: 'Max ADS & close-range TTK' },
  { key: 'support',  label: 'SUPPORT',  desc: 'Range + suppression' },
  { key: 'sniper',   label: 'SNIPER',   desc: 'Long-range precision' },
  { key: 'flex',     label: 'FLEX',     desc: 'Balanced all-range' },
];

function StatBar({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? '#00ff88' : value >= 60 ? '#ffcc00' : '#ff4455';
  return (
    <div className="mb-[0.6rem]">
      <div className="flex justify-between mb-[0.2rem]">
        <span className="text-xs tracking-normal opacity-50">{label}</span>
        <span className="text-xs font-bold" style={{ color }}>{value}</span>
      </div>
      <div className="h-[3px] bg-black/8 rounded-xs">
        <div className="h-full rounded-xs transition-[width] duration-300" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

export default function LoadoutBuilder() {
  const [role, setRole] = useState<Role>('fragger');
  const [primary, setPrimary] = useState('Kogot-7');
  const [secondary, setSecondary] = useState('DS20 Mirage');

  const primW = WEAPONS.find(w => w.name === primary)!;
  const secW = WEAPONS.find(w => w.name === secondary)!;

  return (
    <div className="border border-black/12 rounded mb-12 overflow-hidden font-mono">
      <div className="px-6 py-5 border-b border-black/10 bg-black/2">
        <div className="text-xs tracking-normal opacity-40 mb-1">WEAPON ANALYSIS</div>
        <div className="text-base font-bold tracking-normal">LOADOUT BUILDER</div>
      </div>

      {/* Role selector */}
      <div className="flex border-b border-black/10">
        {ROLES.map(r => (
          <button type="button" key={r.key} onClick={() => setRole(r.key)}
            className="font-mono text-xs tracking-normal cursor-pointer bg-transparent border-none"
            style={{
              flex: 1, padding: '0.75rem 0.5rem',
              borderBottom: role === r.key ? '2px solid currentColor' : '2px solid transparent',
              color: role === r.key ? 'inherit' : 'rgba(0,0,0,0.35)',
              fontWeight: role === r.key ? 700 : 400,
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="px-6 py-3 border-b border-black/8 text-xs opacity-50">
        {ROLES.find(r => r.key === role)?.desc}
      </div>

      {/* Weapon pickers */}
      <div className="px-6 py-4 border-b border-black/8 grid grid-cols-2 gap-4">
        {[
          { label: 'PRIMARY', value: primary, set: setPrimary },
          { label: 'SECONDARY', value: secondary, set: setSecondary },
        ].map(({ label, value, set }) => (
          <div key={label}>
            <div className="text-xs tracking-normal opacity-40 mb-1.5">{label}</div>
            <select value={value} onChange={e => set(e.target.value)}
              className="font-mono text-xs px-1.5 py-1 border border-black/15 rounded-sm bg-transparent w-full cursor-pointer"
            >
              {WEAPONS.map(w => <option key={w.name} value={w.name}>{w.name} ({w.category})</option>)}
            </select>
          </div>
        ))}
      </div>

      {/* Loadout cards */}
      <div className="p-6 grid grid-cols-2 gap-6">
        {[{ w: primW, slot: 'PRIMARY' }, { w: secW, slot: 'SECONDARY' }].map(({ w, slot }) => (
          <div key={slot} className="border border-black/10 rounded-sm p-5">
            <div className="text-xs tracking-normal opacity-40 mb-1">{slot} — {w.category}</div>
            <div className="text-sm font-bold mb-4">{w.name}</div>

            <div className="mb-4">
              <div className="text-xs tracking-normal opacity-40 mb-2">ATTACHMENTS</div>
              {w.attachments[role].map((a) => (
                <div key={`${w.name}-${role}-${a.slot}-${a.item}`} className="flex justify-between py-[3px] border-b border-black/5">
                  <span className="text-xs opacity-45">{a.slot}</span>
                  <span className="text-xs font-semibold">{a.item}</span>
                </div>
              ))}
            </div>

            <div>
              <div className="text-xs tracking-normal opacity-40 mb-2">STATS</div>
              <StatBar label="ADS SPEED" value={w.stats.ads} />
              <StatBar label="RECOIL CTRL" value={w.stats.recoil} />
              <StatBar label="TTK SCORE" value={w.stats.ttk} />
              <StatBar label="RANGE" value={w.stats.range} />
            </div>
          </div>
        ))}
      </div>

      <div className="px-6 py-2.5 border-t border-black/8 text-xs tracking-normal opacity-30">
        ATTACHMENTS ARE ROLE-OPTIMIZED RECOMMENDATIONS — ADAPT TO YOUR PLAYSTYLE
      </div>
    </div>
  );
}
