export interface WeaponIdentity {
  name: string;
  id: string;
  category: string;
  color: string;
}

export const WEAPON_CATALOG: WeaponIdentity[] = [
  { name: 'Kogot-7',     id: 'kogot-7',     category: 'SMG',  color: '#00ccff' },
  { name: 'VST',         id: 'vst',         category: 'SMG',  color: '#00aaee' },
  { name: 'Carbon 57',   id: 'carbon-57',   category: 'SMG',  color: '#0088cc' },
  { name: 'DS20 Mirage', id: 'ds20-mirage', category: 'AR',   color: '#00ff88' },
  { name: 'Voyak KT-3',  id: 'voyak-kt-3',  category: 'AR',   color: '#00cc66' },
  { name: 'M15 MOD 0',   id: 'm15-mod-0',   category: 'AR',   color: '#ffcc00' },
  { name: 'MK.78',       id: 'mk-78',       category: 'LMG',  color: '#ff6600' },
  { name: 'Dravec 45',   id: 'dravec-45',   category: 'SMG',  color: '#8888ff' },
  { name: 'Strider 300', id: 'strider-300', category: 'Sniper Rifle', color: '#cc88ff' },
  { name: 'MXR-17',      id: 'mxr-17',      category: 'Assault Rifle', color: '#00ff88' },
  { name: 'EGRT-17',     id: 'egrt-17',     category: 'Assault Rifle', color: '#00cc66' },
  { name: 'Hawker HX',   id: 'hawker-hx',   category: 'Sniper Rifle', color: '#aa66ff' },
  { name: 'Peacekeeper Mk1', id: 'peacekeeper-mk1', category: 'Assault Rifle', color: '#88ff88' },
  { name: 'Razor 9mm',   id: 'razor-9mm',   category: 'SMG',   color: '#44aaff' },
  { name: 'MPC-25',      id: 'mpc-25',      category: 'SMG',  color: '#00ccff' },
  { name: 'Sturmwolf 45', id: 'sturmwolf-45', category: 'SMG', color: '#00aaee' },
  { name: 'Sokol 545',   id: 'sokol-545',   category: 'LMG',  color: '#ff6600' },
  { name: 'XM325',       id: 'xm325',       category: 'LMG',  color: '#ff8800' },
  { name: 'Kilo 141',    id: 'kilo-141',    category: 'AR',   color: '#00ff88' },
  { name: 'CR-56 AMAX',  id: 'cr-56-amax',  category: 'AR',   color: '#00cc66' },
  { name: 'LC10',        id: 'lc10',        category: 'SMG',  color: '#44ccff' },
  { name: 'HDR',         id: 'hdr',         category: 'Sniper Rifle', color: '#cc88ff' },
  { name: 'AK-27',       id: 'ak-27',       category: 'AR',   color: '#ff4444' },
  { name: 'VS Recon',    id: 'vs-recon',    category: 'Sniper Rifle', color: '#bb66ff' },
  { name: 'MK35 ISR',    id: 'mk35-isr',    category: 'AR',   color: '#88cc44' },
  { name: 'M8A1',        id: 'm8a1',        category: 'Marksman Rifle', color: '#ffaa00' },
];

export const CATEGORY_COLORS: Record<string, string> = {
  SMG:  '#00ccff',
  AR:   '#00ff88',
  LMG:  '#ff6600',
  'Sniper Rifle': '#cc88ff',
  'Assault Rifle': '#00ff88',
  'Marksman Rifle': '#ffaa00',
  Shotgun: '#ff4455',
};

export function getWeapon(name: string) {
  return WEAPON_CATALOG.find(w => w.name === name);
}

export function getWeaponById(id: string) {
  return WEAPON_CATALOG.find(w => w.id === id);
}
