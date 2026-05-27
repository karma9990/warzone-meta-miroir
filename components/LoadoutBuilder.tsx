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
    <div style={{ marginBottom: '0.6rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
        <span style={{ fontSize: '0.5rem', letterSpacing: '0.1em', opacity: 0.5 }}>{label}</span>
        <span style={{ fontSize: '0.5rem', fontWeight: 700, color }}>{value}</span>
      </div>
      <div style={{ height: '3px', background: 'rgba(0,0,0,0.08)', borderRadius: '1px' }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, transition: 'width 0.3s' }} />
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
    <div style={{ border: '1px solid rgba(0,0,0,0.12)', borderRadius: '4px', marginBottom: '3rem', overflow: 'hidden', fontFamily: 'monospace' }}>
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.1)', background: 'rgba(0,0,0,0.02)' }}>
        <div style={{ fontSize: '0.55rem', letterSpacing: '0.2em', opacity: 0.4, marginBottom: '0.3rem' }}>WEAPON ANALYSIS</div>
        <div style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.08em' }}>LOADOUT BUILDER</div>
      </div>

      {/* Role selector */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
        {ROLES.map(r => (
          <button
            key={r.key}
            onClick={() => setRole(r.key)}
            style={{
              flex: 1, padding: '0.75rem 0.5rem',
              border: 'none', borderBottom: role === r.key ? '2px solid currentColor' : '2px solid transparent',
              background: 'transparent', cursor: 'pointer', fontFamily: 'monospace',
              fontSize: '0.55rem', letterSpacing: '0.1em',
              color: role === r.key ? 'inherit' : 'rgba(0,0,0,0.35)',
              fontWeight: role === r.key ? 700 : 400,
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.08)', fontSize: '0.58rem', opacity: 0.5 }}>
        {ROLES.find(r => r.key === role)?.desc}
      </div>

      {/* Weapon pickers */}
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {[
          { label: 'PRIMARY', value: primary, set: setPrimary },
          { label: 'SECONDARY', value: secondary, set: setSecondary },
        ].map(({ label, value, set }) => (
          <div key={label}>
            <div style={{ fontSize: '0.45rem', letterSpacing: '0.15em', opacity: 0.4, marginBottom: '0.35rem' }}>{label}</div>
            <select
              value={value}
              onChange={e => set(e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: '0.6rem', padding: '4px 6px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '2px', background: 'transparent', width: '100%', cursor: 'pointer' }}
            >
              {WEAPONS.map(w => <option key={w.name} value={w.name}>{w.name} ({w.category})</option>)}
            </select>
          </div>
        ))}
      </div>

      {/* Loadout cards */}
      <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {[{ w: primW, slot: 'PRIMARY' }, { w: secW, slot: 'SECONDARY' }].map(({ w, slot }) => (
          <div key={slot} style={{ border: '1px solid rgba(0,0,0,0.1)', borderRadius: '3px', padding: '1.25rem' }}>
            <div style={{ fontSize: '0.45rem', letterSpacing: '0.15em', opacity: 0.4, marginBottom: '0.25rem' }}>{slot} — {w.category}</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '1rem' }}>{w.name}</div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.45rem', letterSpacing: '0.15em', opacity: 0.4, marginBottom: '0.5rem' }}>ATTACHMENTS</div>
              {w.attachments[role].map((a, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                  <span style={{ fontSize: '0.52rem', opacity: 0.45 }}>{a.slot}</span>
                  <span style={{ fontSize: '0.55rem', fontWeight: 600 }}>{a.item}</span>
                </div>
              ))}
            </div>

            <div>
              <div style={{ fontSize: '0.45rem', letterSpacing: '0.15em', opacity: 0.4, marginBottom: '0.5rem' }}>STATS</div>
              <StatBar label="ADS SPEED" value={w.stats.ads} />
              <StatBar label="RECOIL CTRL" value={w.stats.recoil} />
              <StatBar label="TTK SCORE" value={w.stats.ttk} />
              <StatBar label="RANGE" value={w.stats.range} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '0.6rem 1.5rem', borderTop: '1px solid rgba(0,0,0,0.08)', fontSize: '0.5rem', letterSpacing: '0.12em', opacity: 0.3 }}>
        ATTACHMENTS ARE ROLE-OPTIMIZED RECOMMENDATIONS — ADAPT TO YOUR PLAYSTYLE
      </div>
    </div>
  );
}
