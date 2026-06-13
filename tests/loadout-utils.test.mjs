import test from 'node:test';
import assert from 'node:assert/strict';

const { calculateMetaScore, getLoadoutSlug } = await import('../lib/loadoutUtils.ts');

const baseStats = { damage: 80, range: 80, mobility: 80, control: 80 };

test('calculateMetaScore applies the tier bonus and clamps to 0-100', () => {
  // Base weighted score for all-80 stats is exactly 80.
  assert.equal(calculateMetaScore({ tier: 'B', stats: baseStats }), 80);
  assert.equal(calculateMetaScore({ tier: 'S', stats: baseStats }), 84);
  assert.equal(calculateMetaScore({ tier: 'A', stats: baseStats }), 82);
  assert.equal(calculateMetaScore({ tier: 'C', stats: baseStats }), 76);
});

test('calculateMetaScore never exceeds 100 or drops below 0', () => {
  const max = calculateMetaScore({ tier: 'S', stats: { damage: 100, range: 100, mobility: 100, control: 100 } });
  const min = calculateMetaScore({ tier: 'C', stats: { damage: 0, range: 0, mobility: 0, control: 0 } });
  assert.equal(max, 100);
  assert.equal(min, 0);
});

test('getLoadoutSlug prefers the explicit weaponId', () => {
  assert.equal(getLoadoutSlug({ weaponId: 'mxr-17', weapon: 'MXR-17' }), 'mxr-17');
});

test('getLoadoutSlug derives a slug from the weapon name when no id is set', () => {
  assert.equal(getLoadoutSlug({ weapon: 'Hawker HX' }), 'hawker-hx');
  assert.equal(getLoadoutSlug({ weapon: 'M8A1' }), 'm8a1');
  assert.equal(getLoadoutSlug({ weapon: 'Strider 3.0' }), 'strider-30');
});
