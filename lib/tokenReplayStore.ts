import fs from 'fs';
import path from 'path';

const EMAIL_TOKEN_FILE = path.join(process.cwd(), 'data', 'used-email-tokens.json');
const EMAIL_TOKEN_KEY_PREFIX = 'wz:used-email-token:';

function hasUpstash() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function upstash(command: unknown[]) {
  const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([command]),
  });

  if (!res.ok) {
    throw new Error('Token replay storage request failed.');
  }

  const data = await res.json() as Array<{ result: unknown }>;
  return data[0]?.result;
}

function readLocalIds() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Local token replay storage is disabled in production. Configure Upstash Redis.');
  }

  try {
    return JSON.parse(fs.readFileSync(EMAIL_TOKEN_FILE, 'utf-8')) as string[];
  } catch {
    return [];
  }
}

function writeLocalIds(ids: string[]) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Local token replay storage is disabled in production. Configure Upstash Redis.');
  }

  fs.writeFileSync(EMAIL_TOKEN_FILE, JSON.stringify(ids, null, 2));
}

export async function consumeEmailToken(jti: string) {
  if (!jti) return false;

  if (hasUpstash()) {
    const key = `${EMAIL_TOKEN_KEY_PREFIX}${jti}`;
    return await upstash(['SET', key, '1', 'EX', 60 * 20, 'NX']) === 'OK';
  }

  const ids = readLocalIds();
  if (ids.includes(jti)) return false;
  ids.push(jti);
  writeLocalIds(ids);
  return true;
}
