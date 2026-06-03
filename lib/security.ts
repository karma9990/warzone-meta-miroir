import { timingSafeEqual, randomBytes } from 'crypto';
import { NextResponse, type NextRequest } from 'next/server';

function requireEnvVar(name: string, devFallback?: string): string {
  const value = process.env[name];
  if (value) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${name} must be configured in production.`);
  }
  if (devFallback !== undefined) return devFallback;
  throw new Error(`${name} must be configured.`);
}

let devJwtSecret: string | null = null;
function getDevJwtSecret() {
  if (!devJwtSecret) {
    devJwtSecret = randomBytes(32).toString('hex');
    console.warn('WARNING: JWT_SECRET not set. Using ephemeral random secret. Session will not persist across restarts.');
  }
  return devJwtSecret;
}

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  return new TextEncoder().encode(secret ?? getDevJwtSecret());
}

export function getAdminPassword() {
  return requireEnvVar('ADMIN_PASSWORD', '');
}

export function safeCompare(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function readJsonBody<T = Record<string, unknown>>(
  req: NextRequest,
  maxBytes = 16_384
): Promise<{ data: T } | { error: NextResponse }> {
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return { error: NextResponse.json({ error: 'Unsupported content type.' }, { status: 415 }) };
  }

  const contentLength = Number(req.headers.get('content-length') || '0');
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return { error: NextResponse.json({ error: 'Request body is too large.' }, { status: 413 }) };
  }

  const body = await req.text();
  if (Buffer.byteLength(body, 'utf8') > maxBytes) {
    return { error: NextResponse.json({ error: 'Request body is too large.' }, { status: 413 }) };
  }

  try {
    return { data: JSON.parse(body) as T };
  } catch {
    return { error: NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }) };
  }
}

export function secureCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge,
    path: '/',
  };
}

export function deleteCookie(res: NextResponse, name: string) {
  res.cookies.set(name, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
}
