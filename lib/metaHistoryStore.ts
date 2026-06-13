import fs from 'fs';
import path from 'path';
import { hasUpstash, upstashCommand, warnIfEphemeralWrite } from './upstash';
import type { Loadout, Tier } from './data';
import { calculateMetaScore } from './loadoutUtils';

const HISTORY_FILE = path.join(process.cwd(), 'data', 'meta-history.json');
const HISTORY_KEY = 'wz:meta:history';
const MAX_SNAPSHOTS = 180;

export type WeaponSnapshot = {
  weapon: string;
  tier: Tier;
  score: number;
  category: string;
};

export type MetaSnapshot = {
  date: string;
  weapons: Record<string, WeaponSnapshot>;
};

export type MetaChange = {
  weaponId: string;
  weapon: string;
  fromTier: Tier;
  toTier: Tier;
  direction: 'up' | 'down';
  scoreDelta: number;
};

type MetaHistoryGlobal = typeof globalThis & {
  __wzMetaHistory?: MetaSnapshot[];
};

function todayKey(date = new Date()) {
  return date.toISOString().split('T')[0];
}

function weaponKey(loadout: Loadout) {
  return (loadout.weaponId || loadout.id).toLowerCase();
}

export function buildLiveSnapshot(loadouts: Loadout[], date = new Date()): MetaSnapshot {
  const weapons: Record<string, WeaponSnapshot> = {};
  for (const loadout of loadouts) {
    weapons[weaponKey(loadout)] = {
      weapon: loadout.weapon,
      tier: loadout.tier,
      score: calculateMetaScore(loadout),
      category: loadout.category,
    };
  }
  return { date: todayKey(date), weapons };
}

function readLocalHistory(): MetaSnapshot[] {
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8')) as MetaSnapshot[];
  } catch {
    return [];
  }
}

function writeLocalHistory(history: MetaSnapshot[]) {
  warnIfEphemeralWrite('meta-history');
  fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

export async function getMetaHistory(): Promise<MetaSnapshot[]> {
  if (hasUpstash()) {
    const value = await upstashCommand(['GET', HISTORY_KEY]);
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as MetaSnapshot[];
      } catch {
        return [];
      }
    }
    return [];
  }

  if (process.env.NODE_ENV === 'production') {
    return (globalThis as MetaHistoryGlobal).__wzMetaHistory ?? [];
  }

  return readLocalHistory();
}

async function saveMetaHistory(history: MetaSnapshot[]) {
  const capped = history.slice(-MAX_SNAPSHOTS);
  if (hasUpstash()) {
    await upstashCommand(['SET', HISTORY_KEY, JSON.stringify(capped)]);
    return;
  }

  if (process.env.NODE_ENV === 'production') {
    (globalThis as MetaHistoryGlobal).__wzMetaHistory = capped;
    return;
  }

  writeLocalHistory(capped);
}

function diffSnapshots(previous: MetaSnapshot | undefined, next: MetaSnapshot): MetaChange[] {
  if (!previous) return [];
  const tierRank: Record<Tier, number> = { S: 4, A: 3, B: 2, C: 1 };
  const changes: MetaChange[] = [];

  for (const [weaponId, current] of Object.entries(next.weapons)) {
    const before = previous.weapons[weaponId];
    if (!before || before.tier === current.tier) continue;
    changes.push({
      weaponId,
      weapon: current.weapon,
      fromTier: before.tier,
      toTier: current.tier,
      direction: tierRank[current.tier] > tierRank[before.tier] ? 'up' : 'down',
      scoreDelta: current.score - before.score,
    });
  }

  return changes;
}

/**
 * Record today's meta snapshot. If a snapshot already exists for today it is
 * replaced. Returns the change set relative to the most recent prior snapshot.
 */
export async function recordMetaSnapshot(loadouts: Loadout[]): Promise<{ snapshot: MetaSnapshot; changes: MetaChange[] }> {
  const history = await getMetaHistory();
  const snapshot = buildLiveSnapshot(loadouts);

  const lastIndex = history.length - 1;
  const last = history[lastIndex];
  const priorToToday = last && last.date === snapshot.date ? history[lastIndex - 1] : last;
  const changes = diffSnapshots(priorToToday, snapshot);

  if (last && last.date === snapshot.date) {
    history[lastIndex] = snapshot;
  } else {
    history.push(snapshot);
  }

  await saveMetaHistory(history);
  return { snapshot, changes };
}

/**
 * History guaranteed to contain at least one point: if nothing has been
 * recorded yet, a live (unsaved) snapshot is appended so charts are never empty.
 */
export async function getMetaHistoryWithLive(loadouts: Loadout[]): Promise<MetaSnapshot[]> {
  const history = await getMetaHistory();
  const live = buildLiveSnapshot(loadouts);
  if (history.length === 0) return [live];
  if (history[history.length - 1].date !== live.date) return [...history, live];
  return history;
}
