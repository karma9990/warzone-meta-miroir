import { NextResponse, type NextRequest } from 'next/server';

const buckets = new Map<string, { count: number; resetAt: number }>();

function hasUpstash() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function upstashPipeline(commands: unknown[][]) {
  const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Rate limit storage request failed.');
  }

  return await res.json() as Array<{ result?: unknown }>;
}

function getClientKey(req: NextRequest, scope: string) {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwarded || req.headers.get('x-real-ip') || 'unknown';
  return `${scope}:${ip}`;
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
