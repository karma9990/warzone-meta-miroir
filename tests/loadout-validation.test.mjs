import test from 'node:test';
import assert from 'node:assert/strict';

const { buildLoadoutFromInput } = await import('../lib/data.ts');

test('loadout validation rejects empty weapons', () => {
  const result = buildLoadoutFromInput({ weapon: '   ' });
  assert.equal(result.error, 'Weapon is required.');
});

test('loadout validation clamps stats and filters empty attachments', () => {
  const result = buildLoadoutFromInput({
    weapon: 'Test AR',
    tier: 'Z',
    attachments: [
      { slot: 'Muzzle', name: 'Compensator' },
      { slot: '', name: 'Ignored' },
    ],
    stats: { damage: 250, range: -12, mobility: 50.4, control: 'bad' },
  });

  assert.equal(result.error, undefined);
  assert.equal(result.loadout.tier, 'B');
  assert.deepEqual(result.loadout.attachments, [{ slot: 'Muzzle', name: 'Compensator' }]);
  assert.deepEqual(result.loadout.stats, {
    damage: 100,
    range: 0,
    mobility: 50,
    control: 50,
  });
});

test('admin loadout updates preserve existing values when fields are omitted', () => {
  const existing = {
    id: 'loadout-1',
    weapon: 'Existing SMG',
    weaponId: 'existing-smg',
    category: 'SMG',
    tier: 'A',
    playstyle: 'Close-Range',
    attachments: [{ slot: 'Barrel', name: 'Short Barrel' }],
    stats: { damage: 65, range: 40, mobility: 90, control: 70 },
    notes: 'Keep this note.',
    updatedAt: '2026-05-01',
  };

  const result = buildLoadoutFromInput({ tier: 'S', stats: { damage: 88 } }, existing);

  assert.equal(result.error, undefined);
  assert.equal(result.loadout.weapon, existing.weapon);
  assert.equal(result.loadout.tier, 'S');
  assert.deepEqual(result.loadout.attachments, existing.attachments);
  assert.deepEqual(result.loadout.stats, {
    damage: 88,
    range: 40,
    mobility: 90,
    control: 70,
  });
});
