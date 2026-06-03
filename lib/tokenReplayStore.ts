import fs from 'fs';
import path from 'path';
import { hasUpstash, upstashCommand } from './upstash';

const EMAIL_TOKEN_FILE = path.join(process.cwd(), 'data', 'used-email-tokens.json');
const EMAIL_TOKEN_KEY_PREFIX = 'wz:used-email-token:';

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
    return await upstashCommand(['SET', key, '1', 'EX', 60 * 20, 'NX']) === 'OK';
  }

  const ids = readLocalIds();
  if (ids.includes(jti)) return false;
  ids.push(jti);
  writeLocalIds(ids);
  return true;
}
