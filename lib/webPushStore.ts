import fs from 'fs';
import path from 'path';
import { hasUpstash, upstashCommand, warnIfEphemeralWrite } from './upstash';

const PUSH_FILE = path.join(process.cwd(), 'data', 'push-subscriptions.json');
const PUSH_KEY = 'wz:push:subscriptions';

export type PushSubscriptionRecord = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

type PushGlobal = typeof globalThis & {
  __wzPushSubscriptions?: PushSubscriptionRecord[];
};

function isValidSubscription(value: unknown): value is PushSubscriptionRecord {
  if (!value || typeof value !== 'object') return false;
  const sub = value as Partial<PushSubscriptionRecord>;
  return (
    typeof sub.endpoint === 'string' &&
    sub.endpoint.startsWith('https://') &&
    !!sub.keys &&
    typeof sub.keys.p256dh === 'string' &&
    typeof sub.keys.auth === 'string'
  );
}

function readLocal(): PushSubscriptionRecord[] {
  try {
    return JSON.parse(fs.readFileSync(PUSH_FILE, 'utf-8')) as PushSubscriptionRecord[];
  } catch {
    return [];
  }
}

function writeLocal(records: PushSubscriptionRecord[]) {
  warnIfEphemeralWrite('push-subscriptions');
  fs.mkdirSync(path.dirname(PUSH_FILE), { recursive: true });
  fs.writeFileSync(PUSH_FILE, JSON.stringify(records, null, 2));
}

export async function getPushSubscriptions(): Promise<PushSubscriptionRecord[]> {
  if (hasUpstash()) {
    const value = await upstashCommand(['GET', PUSH_KEY]);
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as PushSubscriptionRecord[];
      } catch {
        return [];
      }
    }
    return [];
  }

  if (process.env.NODE_ENV === 'production') {
    return (globalThis as PushGlobal).__wzPushSubscriptions ?? [];
  }

  return readLocal();
}

async function savePushSubscriptions(records: PushSubscriptionRecord[]) {
  if (hasUpstash()) {
    await upstashCommand(['SET', PUSH_KEY, JSON.stringify(records)]);
    return;
  }
  if (process.env.NODE_ENV === 'production') {
    (globalThis as PushGlobal).__wzPushSubscriptions = records;
    return;
  }
  writeLocal(records);
}

export async function addPushSubscription(input: unknown): Promise<{ ok: true } | { error: string }> {
  if (!isValidSubscription(input)) return { error: 'Invalid subscription.' };
  const records = await getPushSubscriptions();
  if (!records.some((record) => record.endpoint === input.endpoint)) {
    records.push({ endpoint: input.endpoint, keys: input.keys });
    await savePushSubscriptions(records);
  }
  return { ok: true };
}

export async function removePushSubscription(endpoint: unknown): Promise<{ ok: true }> {
  if (typeof endpoint !== 'string') return { ok: true };
  const records = await getPushSubscriptions();
  const next = records.filter((record) => record.endpoint !== endpoint);
  if (next.length !== records.length) await savePushSubscriptions(next);
  return { ok: true };
}

export async function removePushEndpoints(endpoints: string[]) {
  if (endpoints.length === 0) return;
  const set = new Set(endpoints);
  const records = await getPushSubscriptions();
  const next = records.filter((record) => !set.has(record.endpoint));
  if (next.length !== records.length) await savePushSubscriptions(next);
}
