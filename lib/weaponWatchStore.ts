import fs from 'fs';
import path from 'path';
import { hasUpstash, upstashCommand, upstashPipeline, warnIfEphemeralWrite } from './upstash';

const WATCH_FILE = path.join(process.cwd(), 'data', 'weapon-watches.json');
const WEAPON_KEY = (weaponId: string) => `wz:watch:w:${weaponId}`;
const EMAIL_KEY = (email: string) => `wz:watch:e:${email}`;

type WatchMap = Record<string, string[]>; // weaponId -> emails

type WatchGlobal = typeof globalThis & {
  __wzWeaponWatches?: WatchMap;
};

function normalizeWeaponId(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 80);
}

function readLocal(): WatchMap {
  try {
    return JSON.parse(fs.readFileSync(WATCH_FILE, 'utf-8')) as WatchMap;
  } catch {
    return {};
  }
}

function writeLocal(map: WatchMap) {
  warnIfEphemeralWrite('weapon-watches');
  fs.mkdirSync(path.dirname(WATCH_FILE), { recursive: true });
  fs.writeFileSync(WATCH_FILE, JSON.stringify(map, null, 2));
}

function getLocalMap(): WatchMap {
  if (process.env.NODE_ENV === 'production') {
    const current = (globalThis as WatchGlobal).__wzWeaponWatches;
    if (current) return current;
    const seed = {};
    (globalThis as WatchGlobal).__wzWeaponWatches = seed;
    return seed;
  }
  return readLocal();
}

function persistLocalMap(map: WatchMap) {
  if (process.env.NODE_ENV === 'production') {
    (globalThis as WatchGlobal).__wzWeaponWatches = map;
    return;
  }
  writeLocal(map);
}

export async function watchWeapon(email: string, weaponIdRaw: string): Promise<{ ok: true } | { error: string }> {
  const weaponId = normalizeWeaponId(weaponIdRaw);
  if (!weaponId) return { error: 'Invalid weapon.' };

  if (hasUpstash()) {
    await upstashPipeline([
      ['SADD', WEAPON_KEY(weaponId), email],
      ['SADD', EMAIL_KEY(email), weaponId],
    ]);
    return { ok: true };
  }

  const map = getLocalMap();
  const list = map[weaponId] ?? [];
  if (!list.includes(email)) list.push(email);
  map[weaponId] = list;
  persistLocalMap(map);
  return { ok: true };
}

export async function unwatchWeapon(email: string, weaponIdRaw: string): Promise<{ ok: true }> {
  const weaponId = normalizeWeaponId(weaponIdRaw);

  if (hasUpstash()) {
    await upstashPipeline([
      ['SREM', WEAPON_KEY(weaponId), email],
      ['SREM', EMAIL_KEY(email), weaponId],
    ]);
    return { ok: true };
  }

  const map = getLocalMap();
  if (map[weaponId]) {
    map[weaponId] = map[weaponId].filter((entry) => entry !== email);
    if (map[weaponId].length === 0) delete map[weaponId];
    persistLocalMap(map);
  }
  return { ok: true };
}

export async function getWeaponWatchers(weaponIdRaw: string): Promise<string[]> {
  const weaponId = normalizeWeaponId(weaponIdRaw);
  if (!weaponId) return [];

  if (hasUpstash()) {
    const value = await upstashCommand(['SMEMBERS', WEAPON_KEY(weaponId)]);
    return Array.isArray(value) ? (value as string[]) : [];
  }

  return getLocalMap()[weaponId] ?? [];
}
