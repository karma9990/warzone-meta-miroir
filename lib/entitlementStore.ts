import fs from 'fs';
import path from 'path';
import { hasUpstash, upstashCommand, upstashPipeline } from './upstash';
import type { ProToolId } from '@/lib/toolAccess';

const ENTITLEMENTS_FILE = path.join(process.cwd(), 'data', 'entitlements.json');
const ENTITLEMENT_KEY_PREFIX = 'wz:entitlements:';
const ENTITLEMENT_TOOLS_KEY_PREFIX = 'wz:entitlements:tools:';
const CLAIM_KEY_PREFIX = 'wz:claimed-token:';

export type EntitlementRecord = {
  userId: string;
  email?: string;
  pro: boolean;
  tools: ProToolId[];
  updatedAt: string;
};

function readLocalEntitlements(): EntitlementRecord[] {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Local entitlement storage is disabled in production. Configure Upstash Redis.');
  }

  try {
    return JSON.parse(fs.readFileSync(ENTITLEMENTS_FILE, 'utf-8')) as EntitlementRecord[];
  } catch {
    return [];
  }
}

function writeLocalEntitlements(records: EntitlementRecord[]) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Local entitlement storage is disabled in production. Configure Upstash Redis.');
  }

  fs.writeFileSync(ENTITLEMENTS_FILE, JSON.stringify(records, null, 2));
}

export async function getEntitlements(userId: string): Promise<EntitlementRecord | null> {
  if (hasUpstash()) {
    const result = await upstashPipeline([
      ['HGETALL', `${ENTITLEMENT_KEY_PREFIX}${userId}`],
      ['SMEMBERS', `${ENTITLEMENT_TOOLS_KEY_PREFIX}${userId}`],
      ['GET', `${ENTITLEMENT_KEY_PREFIX}${userId}`],
    ]);
    const hash = result[0]?.result;
    const tools = Array.isArray(result[1]?.result)
      ? result[1].result.filter((tool): tool is ProToolId => typeof tool === 'string')
      : [];

    if (Array.isArray(hash) && hash.length) {
      const fields = Object.fromEntries(
        hash.reduce<Array<[string, string]>>((pairs, value, index, values) => {
          if (index % 2 === 0 && typeof value === 'string' && typeof values[index + 1] === 'string') {
            pairs.push([value, values[index + 1] as string]);
          }
          return pairs;
        }, [])
      );
      return {
        userId,
        email: fields.email || undefined,
        pro: fields.pro === '1',
        tools,
        updatedAt: fields.updatedAt || '',
      };
    }

    const legacyValue = result[2]?.result;
    return typeof legacyValue === 'string' ? JSON.parse(legacyValue) as EntitlementRecord : null;
  }

  return readLocalEntitlements().find((record) => record.userId === userId) || null;
}

export async function grantEntitlement(input: {
  userId: string;
  email?: string;
  pro?: boolean;
  toolId?: ProToolId;
}) {
  const existing = await getEntitlements(input.userId);
  const tools = new Set(existing?.tools || []);
  if (input.toolId) tools.add(input.toolId);

  const record: EntitlementRecord = {
    userId: input.userId,
    email: input.email || existing?.email,
    pro: Boolean(existing?.pro || input.pro),
    tools: Array.from(tools),
    updatedAt: new Date().toISOString(),
  };

  if (hasUpstash()) {
    const commands: unknown[][] = [
      ['HSET', `${ENTITLEMENT_KEY_PREFIX}${record.userId}`, 'updatedAt', record.updatedAt, 'pro', record.pro ? '1' : '0'],
    ];
    if (record.email) {
      commands.push(['HSET', `${ENTITLEMENT_KEY_PREFIX}${record.userId}`, 'email', record.email]);
    }
    if (record.tools.length) {
      commands.push(['SADD', `${ENTITLEMENT_TOOLS_KEY_PREFIX}${record.userId}`, ...record.tools]);
    }
    await upstashPipeline(commands);
    return record;
  }

  const records = readLocalEntitlements();
  const index = records.findIndex((entry) => entry.userId === record.userId);
  if (index >= 0) {
    records[index] = record;
  } else {
    records.push(record);
  }
  writeLocalEntitlements(records);
  return record;
}

export async function hasToolAccess(userId: string, toolId: ProToolId, email?: string) {
  const entitlements = await getEntitlements(userId);
  if (entitlements?.pro || entitlements?.tools.includes(toolId)) return true;

  if (email && email !== userId) {
    const emailEntitlements = await getEntitlements(email.toLowerCase());
    return Boolean(emailEntitlements?.pro || emailEntitlements?.tools.includes(toolId));
  }

  return false;
}

function readLocalClaimIds(): string[] {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Local claim token storage is disabled in production. Configure Upstash Redis.');
  }

  try {
    const file = path.join(process.cwd(), 'data', 'claimed-tokens.json');
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as string[];
  } catch {
    return [];
  }
}

function writeLocalClaimIds(ids: string[]) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Local claim token storage is disabled in production. Configure Upstash Redis.');
  }

  const file = path.join(process.cwd(), 'data', 'claimed-tokens.json');
  fs.writeFileSync(file, JSON.stringify(ids, null, 2));
}

export async function consumeClaimToken(jti: string) {
  if (!jti) return false;

  if (hasUpstash()) {
    const key = `${CLAIM_KEY_PREFIX}${jti}`;
    return await upstashCommand(['SET', key, '1', 'EX', 60 * 60 * 24 * 370, 'NX']) === 'OK';
  }

  const ids = readLocalClaimIds();
  if (ids.includes(jti)) return false;
  ids.push(jti);
  writeLocalClaimIds(ids);
  return true;
}
