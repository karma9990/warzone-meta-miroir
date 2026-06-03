import { NextResponse, type NextRequest } from 'next/server';
import { hasUpstash, upstashPipeline } from './upstash';

const buckets = new Map<string, { count: number; resetAt: number }>();
const cooldowns = new Map<string, number>();

function getClientKey(req: NextRequest, scope: string) {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwarded || req.headers.get('x-real-ip') || 'unknown';
  return `${scope}:${ip}`;
}

function normalizeIdentifier(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9@._:-]/g, '_').slice(0, 180) || 'unknown';
}

function tooManyRequests(retryAfter?: number) {
  return NextResponse.json(
    { error: 'Too many requests.' },
    {
      status: 429,
      headers: retryAfter ? { 'Retry-After': String(retryAfter) } : undefined,
    }
  );
}

function memoryRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  current.count += 1;
  if (current.count > limit) {
    return tooManyRequests(Math.ceil((current.resetAt - now) / 1000));
  }

  return null;
}

export async function rateLimit(req: NextRequest, scope: string, limit = 8, windowMs = 60_000) {
  const key = getClientKey(req, scope);
  return rateLimitKey(key, limit, windowMs);
}

export async function rateLimitIdentifier(scope: string, identifier: string, limit = 8, windowMs = 60_000) {
  const key = `${scope}:${normalizeIdentifier(identifier)}`;
  return rateLimitKey(key, limit, windowMs);
}

export async function cooldownIdentifier(scope: string, identifier: string, windowMs = 60_000) {
  const key = `${scope}:${normalizeIdentifier(identifier)}`;
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));

  if (hasUpstash()) {
    try {
      const result = await upstashPipeline([
        ['SET', key, '1', 'EX', windowSeconds, 'NX'],
        ['TTL', key],
      ]);
      if (result[0]?.result === 'OK') return null;

      const ttl = Number(result[1]?.result ?? windowSeconds);
      return tooManyRequests(Math.max(1, ttl > 0 ? ttl : windowSeconds));
    } catch (error) {
      console.warn('Cooldown store unavailable, falling back to memory.', error);
    }
  }

  const now = Date.now();
  const resetAt = cooldowns.get(key) || 0;
  if (resetAt > now) {
    return tooManyRequests(Math.ceil((resetAt - now) / 1000));
  }

  cooldowns.set(key, now + windowMs);
  return null;
}

async function rateLimitKey(key: string, limit: number, windowMs: number) {
  if (hasUpstash()) {
    try {
      const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
      const result = await upstashPipeline([
        ['INCR', key],
        ['EXPIRE', key, windowSeconds, 'NX'],
        ['TTL', key],
      ]);
      const count = Number(result[0]?.result ?? 0);
      const ttl = Number(result[2]?.result ?? windowSeconds);

      if (count > limit) {
        return tooManyRequests(Math.max(1, ttl));
      }

      return null;
    } catch (error) {
      console.warn('Rate limit store unavailable, falling back to memory.', error);
    }
  }

  return memoryRateLimit(key, limit, windowMs);
}
