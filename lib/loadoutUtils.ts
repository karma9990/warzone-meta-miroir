import type { Loadout } from './data';

export function calculateMetaScore(loadout: Loadout) {
  const { damage, range, mobility, control } = loadout.stats;
  const roleBonus = loadout.tier === 'S' ? 4 : loadout.tier === 'A' ? 2 : loadout.tier === 'C' ? -4 : 0;
  return Math.max(0, Math.min(100, Math.round(damage * 0.3 + range * 0.25 + mobility * 0.2 + control * 0.25 + roleBonus)));
}

export function getLoadoutSlug(loadout: Loadout) {
  return loadout.weaponId ?? loadout.weapon.toLowerCase().replaceAll(' ', '-').replaceAll('.', '');
}

export function formatMetaDate(date: string) {
  const [y, m, d] = date.split('-');
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).toUpperCase();
}
