import { createHash } from 'crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { allowEphemeralSecurityFallback, hasUpstash, upstashPipeline } from './upstash';

const CONTACT_COOLDOWN_SECONDS = 10 * 60;
const memoryCooldowns = new Map<string, number>();

const DEFAULT_BLOCKED_WORDS = [
  'asshole',
  'batard',
  'bitch',
  'connard',
  'conasse',
  'encule',
  'fuck',
  'idiot',
  'merde',
  'pute',
  'putain',
  'salope',
  'shit',
];

function clientIp(req: NextRequest) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
}

function cooldownKey(req: NextRequest, identity: string) {
  const fingerprint = identity || clientIp(req);
  return `wz:contact-cooldown:${createHash('sha256').update(fingerprint).digest('hex')}`;
}

function normalizeForModeration(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function blockedWords() {
  const customWords = (process.env.CONTACT_BLOCKED_WORDS || '')
    .split(',')
    .map((word) => normalizeForModeration(word.trim()))
    .filter(Boolean);

  return [...DEFAULT_BLOCKED_WORDS, ...customWords];
}

export function containsBlockedContactLanguage(...parts: string[]) {
  const text = normalizeForModeration(parts.join(' '));
  return blockedWords().some((word) => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|\\W)${escaped}(\\W|$)`, 'i').test(text);
  });
}

export function contactCooldownResponse(retryAfter: number) {
  return NextResponse.json(
    {
      error: 'Please wait before sending another message.',
      retryAfter,
    },
    {
      status: 429,
      headers: { 'Retry-After': String(retryAfter) },
    }
  );
}

export async function reserveContactCooldown(req: NextRequest, identity: string) {
  const key = cooldownKey(req, identity);

  if (hasUpstash()) {
    const result = await upstashPipeline([
      ['SET', key, '1', 'EX', CONTACT_COOLDOWN_SECONDS, 'NX'],
      ['TTL', key],
    ]);
    const didSet = result[0]?.result === 'OK';
    const ttl = typeof result[1]?.result === 'number' ? result[1].result : CONTACT_COOLDOWN_SECONDS;
    return didSet ? { ok: true as const, key } : { ok: false as const, retryAfter: Math.max(1, ttl) };
  }

  if (!allowEphemeralSecurityFallback()) {
    return { ok: false as const, retryAfter: CONTACT_COOLDOWN_SECONDS };
  }

  const now = Date.now();
  const expiresAt = memoryCooldowns.get(key) || 0;
  if (expiresAt > now) {
    return { ok: false as const, retryAfter: Math.ceil((expiresAt - now) / 1000) };
  }

  memoryCooldowns.set(key, now + CONTACT_COOLDOWN_SECONDS * 1000);
  return { ok: true as const, key };
}

export async function releaseContactCooldown(key: string) {
  if (hasUpstash()) {
    await upstashPipeline([['DEL', key]]);
    return;
  }

  memoryCooldowns.delete(key);
}

export { CONTACT_COOLDOWN_SECONDS };
