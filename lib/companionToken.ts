import { createHmac, timingSafeEqual } from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import { getJwtSecret } from '@/lib/security';
import type { UserSession } from '@/lib/userAuth';

const SECRET = getJwtSecret();
const COMPANION_TOKEN_USE = 'companion-ingest';
const COMPACT_PREFIX = 'wzc_';
const COMPANION_TOKEN_TTL_DAYS = 30;
const COMPACT_TOKEN_TTL_SECONDS = COMPANION_TOKEN_TTL_DAYS * 24 * 60 * 60;

export type CompanionSession = {
  sub: string;
  email?: string;
  name: string;
  deviceId?: string;
};

function base64Url(input: Buffer | string) {
  return Buffer.from(input)
    .toString('base64url');
}

function signCompactPayload(payload: string) {
  return createHmac('sha256', Buffer.from(SECRET))
    .update(payload)
    .digest()
    .subarray(0, 18)
    .toString('base64url');
}

export async function createCompanionToken(user: UserSession) {
  const payload = base64Url(JSON.stringify({
    s: user.sub,
    x: Math.floor(Date.now() / 1000) + COMPACT_TOKEN_TTL_SECONDS,
  }));
  return `${COMPACT_PREFIX}${payload}.${signCompactPayload(payload)}`;
}

export async function createCompanionDeviceToken(input: { userId: string; deviceId: string }) {
  const payload = base64Url(JSON.stringify({
    s: input.userId,
    d: input.deviceId,
    x: Math.floor(Date.now() / 1000) + COMPACT_TOKEN_TTL_SECONDS,
  }));
  return `${COMPACT_PREFIX}${payload}.${signCompactPayload(payload)}`;
}

async function createLegacyCompanionToken(user: UserSession) {
  return new SignJWT({
    sub: user.sub,
    email: user.email,
    name: user.name,
    tokenUse: COMPANION_TOKEN_USE,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer('wzpro-meta')
    .setAudience('wzpro-meta-companion')
    .setIssuedAt()
    .setExpirationTime(`${COMPANION_TOKEN_TTL_DAYS}d`)
    .sign(SECRET);
}

function verifyCompactCompanionToken(token: string): CompanionSession | null {
  if (!token.startsWith(COMPACT_PREFIX)) return null;
  const compact = token.slice(COMPACT_PREFIX.length);
  const [payload, signature] = compact.split('.');
  if (!payload || !signature) return null;

  const expected = signCompactPayload(payload);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      s?: unknown;
      x?: unknown;
    };
    if (typeof decoded.s !== 'string' || typeof decoded.x !== 'number') return null;
    if (decoded.x < Math.floor(Date.now() / 1000)) return null;
    return {
      sub: decoded.s,
      name: 'WZPRO Player',
      deviceId: typeof (decoded as { d?: unknown }).d === 'string' ? (decoded as { d: string }).d : undefined,
    };
  } catch {
    return null;
  }
}

export async function verifyCompanionToken(token: string): Promise<CompanionSession | null> {
  const compact = verifyCompactCompanionToken(token);
  if (compact) return compact;

  try {
    const { payload } = await jwtVerify(token, SECRET, {
      algorithms: ['HS256'],
      issuer: 'wzpro-meta',
      audience: 'wzpro-meta-companion',
    });

    if (
      payload.tokenUse === COMPANION_TOKEN_USE &&
      typeof payload.sub === 'string' &&
      typeof payload.name === 'string'
    ) {
      return {
        sub: payload.sub,
        email: typeof payload.email === 'string' ? payload.email : undefined,
        name: payload.name,
      };
    }
  } catch {
    return null;
  }

  return null;
}

export { createLegacyCompanionToken };
