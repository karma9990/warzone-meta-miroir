import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { NextRequest, NextResponse } from 'next/server';
import { deleteCookie, getJwtSecret, secureCookieOptions } from '@/lib/security';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const SECRET = getJwtSecret();
const USER_TOKEN_USE = 'user-session';

const COOKIE_PREFIX = process.env.NODE_ENV === 'production' ? '__Host-' : '';

export const USER_SESSION_COOKIE = `${COOKIE_PREFIX}wz_user`;
export const OAUTH_STATE_COOKIE = `${COOKIE_PREFIX}wz_oauth_state`;

export type OAuthProvider = 'google' | 'battlenet' | 'apple';
export type SessionProvider = OAuthProvider | 'email';

export type UserSession = {
  sub: string;
  provider: SessionProvider;
  name: string;
  email?: string;
  picture?: string;
  battletag?: string;
};

function displayNameFromEmail(email?: string) {
  return email?.split('@')[0] || 'Operator';
}

async function getSupabaseUserSession(): Promise<UserSession | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser();
  const user = data.user;
  if (error || !user) return null;

  const provider = typeof user.app_metadata?.provider === 'string' ? user.app_metadata.provider : '';
  const sessionProvider = isSessionProvider(provider) ? provider : 'email';
  const name = typeof user.user_metadata?.display_name === 'string'
    ? user.user_metadata.display_name
    : typeof user.user_metadata?.name === 'string'
      ? user.user_metadata.name
      : displayNameFromEmail(user.email);

  return {
    sub: user.id,
    provider: sessionProvider,
    name,
    email: user.email,
    picture: typeof user.user_metadata?.avatar_url === 'string' ? user.user_metadata.avatar_url : undefined,
  };
}

export function isOAuthProvider(value: string): value is OAuthProvider {
  return value === 'google' || value === 'battlenet' || value === 'apple';
}

export function isSessionProvider(value: string): value is SessionProvider {
  return isOAuthProvider(value) || value === 'email';
}

export function getOAuthCredentials(provider: OAuthProvider) {
  if (provider === 'google') {
    return {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    };
  }

  if (provider === 'apple') {
    return {
      clientId: process.env.APPLE_CLIENT_ID,
      clientSecret: undefined,
    };
  }

  return {
    clientId: process.env.BATTLE_NET_CLIENT_ID,
    clientSecret: process.env.BATTLE_NET_CLIENT_SECRET,
  };
}

export function getOAuthBase(provider: OAuthProvider) {
  if (provider === 'google') {
    return {
      authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
      scope: 'openid profile email',
    };
  }

  if (provider === 'apple') {
    return {
      authorizeUrl: 'https://appleid.apple.com/auth/authorize',
      tokenUrl: 'https://appleid.apple.com/auth/token',
      userInfoUrl: '',
      scope: 'name email',
    };
  }

  const base = (process.env.BATTLE_NET_OAUTH_BASE || 'https://oauth.battle.net').replace(/\/$/, '');
  return {
    authorizeUrl: `${base}/authorize`,
    tokenUrl: `${base}/token`,
    userInfoUrl: `${base}/userinfo`,
    scope: process.env.BATTLE_NET_SCOPES || 'openid',
  };
}

function normalizeOrigin(value?: string) {
  if (!value) return undefined;

  try {
    return new URL(value.startsWith('http') ? value : `https://${value}`).origin;
  } catch {
    return undefined;
  }
}

export function getSiteOrigin(req: NextRequest) {
  const configuredOrigin = (
    normalizeOrigin(process.env.SITE_URL) ||
    normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL) ||
    normalizeOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
    normalizeOrigin(process.env.VERCEL_URL)
  );

  if (configuredOrigin) return configuredOrigin;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SITE_URL must be configured in production.');
  }

  return req.nextUrl.origin;
}

export function getRedirectUri(req: NextRequest, provider: OAuthProvider) {
  return `${getSiteOrigin(req)}/api/oauth/${provider}/callback`;
}

export async function createUserSessionToken(user: UserSession) {
  return new SignJWT({ ...user, tokenUse: USER_TOKEN_USE })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer('wzpro-meta')
    .setAudience('wzpro-meta-user')
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(SECRET);
}

export async function getUserSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(USER_SESSION_COOKIE)?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, SECRET, {
        algorithms: ['HS256'],
        issuer: 'wzpro-meta',
        audience: 'wzpro-meta-user',
      });
      if (
        payload.tokenUse === USER_TOKEN_USE &&
        typeof payload.sub === 'string' &&
        typeof payload.provider === 'string' &&
        isSessionProvider(payload.provider) &&
        typeof payload.name === 'string'
      ) {
        return {
          sub: payload.sub,
          provider: payload.provider,
          name: payload.name,
          email: typeof payload.email === 'string' ? payload.email : undefined,
          picture: typeof payload.picture === 'string' ? payload.picture : undefined,
          battletag: typeof payload.battletag === 'string' ? payload.battletag : undefined,
        };
      }
    } catch (error) {
      console.warn('User session verification failed, falling back to Supabase session:', error);
    }
  }

  return getSupabaseUserSession();
}

export async function setUserSessionCookie(res: NextResponse, user: UserSession) {
  const token = await createUserSessionToken(user);
  res.cookies.set(USER_SESSION_COOKIE, token, secureCookieOptions(60 * 60 * 24 * 30));
}

export function clearUserSessionCookie(res: NextResponse) {
  deleteCookie(res, USER_SESSION_COOKIE);
}
