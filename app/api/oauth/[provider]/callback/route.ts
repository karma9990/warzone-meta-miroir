import { createRemoteJWKSet, importPKCS8, jwtVerify, SignJWT } from 'jose';
import { NextRequest, NextResponse } from 'next/server';
import { sendOAuthWelcomeEmail } from '@/lib/emailAuth';
import { recordOAuthSignIn } from '@/lib/oauthAccountStore';
import {
  OAUTH_STATE_COOKIE,
  type OAuthProvider,
  type UserSession,
  getOAuthBase,
  getOAuthCredentials,
  getRedirectUri,
  isOAuthProvider,
  setUserSessionCookie,
} from '@/lib/userAuth';
import { rateLimit } from '@/lib/rateLimit';

type TokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleProfile = {
  sub: string;
  name?: string;
  email?: string;
  email_verified?: boolean;
  picture?: string;
};

type BattleNetProfile = {
  id?: number | string;
  sub?: string;
  battletag?: string;
};

type AppleProfile = {
  sub: string;
  email?: string;
};

type ApplePostedUser = {
  name?: {
    firstName?: string;
    lastName?: string;
  };
  email?: string;
};

function signInError(req: NextRequest, error: string) {
  return NextResponse.redirect(new URL(`/sign-in?error=${encodeURIComponent(error)}`, req.url));
}

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return '/';
  }

  return value;
}

function appendSignedIn(path: string) {
  return `${path}${path.includes('?') ? '&' : '?'}signed_in=1`;
}

function decodeNextPath(encoded: string | undefined) {
  if (!encoded) return '/';

  try {
    return safeNextPath(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    return '/';
  }
}

async function exchangeCode(
  req: NextRequest,
  provider: OAuthProvider,
  code: string
): Promise<TokenResponse> {
  const credentials = getOAuthCredentials(provider);
  const oauth = getOAuthBase(provider);
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: getRedirectUri(req, provider),
  });

  const headers: HeadersInit = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  if (provider === 'google') {
    body.set('client_id', credentials.clientId || '');
    body.set('client_secret', credentials.clientSecret || '');
  } else if (provider === 'apple') {
    body.set('client_id', credentials.clientId || '');
    body.set('client_secret', await createAppleClientSecret());
  } else {
    headers.Authorization = `Basic ${Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64')}`;
  }

  const tokenRes = await fetch(oauth.tokenUrl, {
    method: 'POST',
    headers,
    body,
    cache: 'no-store',
  });

  return tokenRes.json();
}

async function createAppleClientSecret() {
  const clientId = process.env.APPLE_CLIENT_ID;
  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const privateKey = process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientId || !teamId || !keyId || !privateKey) {
    throw new Error('apple_config');
  }

  const key = await importPKCS8(privateKey, 'ES256');
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId)
    .setSubject(clientId)
    .setAudience('https://appleid.apple.com')
    .setIssuedAt()
    .setExpirationTime('180d')
    .sign(key);
}

async function getAppleProfile(idToken: string, postedUser?: string | null): Promise<UserSession> {
  const JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: 'https://appleid.apple.com',
    audience: process.env.APPLE_CLIENT_ID,
  });

  if (typeof payload.sub !== 'string') {
    throw new Error('profile');
  }

  let parsedUser: ApplePostedUser | null = null;
  if (postedUser) {
    try {
      parsedUser = JSON.parse(postedUser) as ApplePostedUser;
    } catch {
      parsedUser = null;
    }
  }

  const appleProfile: AppleProfile = {
    sub: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : undefined,
  };
  const name = [parsedUser?.name?.firstName, parsedUser?.name?.lastName].filter(Boolean).join(' ');

  return {
    sub: appleProfile.sub,
    provider: 'apple',
    name: name || appleProfile.email || 'Apple user',
    email: appleProfile.email,
  };
}

async function getProfile(provider: OAuthProvider, accessToken: string): Promise<UserSession> {
  const oauth = getOAuthBase(provider);
  const profileRes = await fetch(oauth.userInfoUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  });

  if (!profileRes.ok) {
    throw new Error('profile');
  }

  if (provider === 'google') {
    const profile = await profileRes.json() as GoogleProfile;
    if (!profile.email || profile.email_verified !== true) {
      throw new Error('google_email_unverified');
    }

    return {
      sub: profile.sub,
      provider,
      name: profile.name || profile.email || 'Google user',
      email: profile.email,
      picture: profile.picture,
    };
  }

  const profile = await profileRes.json() as BattleNetProfile;
  const id = String(profile.sub || profile.id || '');
  const battletag = profile.battletag || 'Battle.net user';
  return {
    sub: id,
    provider,
    name: battletag,
    battletag,
  };
}

async function handleCallback(
  req: NextRequest,
  providerParam: string,
  form?: FormData
) {
  if (!isOAuthProvider(providerParam)) {
    return signInError(req, 'provider');
  }

  const provider = providerParam;
  const state = form?.get('state')?.toString() || req.nextUrl.searchParams.get('state');
  const code = form?.get('code')?.toString() || req.nextUrl.searchParams.get('code');
  const idToken = form?.get('id_token')?.toString() || req.nextUrl.searchParams.get('id_token');
  const postedUser = form?.get('user')?.toString() || null;
  const savedState = req.cookies.get(OAUTH_STATE_COOKIE)?.value;

  if (
    !code ||
    code.length > 2048 ||
    !state ||
    state.length > 256 ||
    !savedState ||
    state !== savedState ||
    !state.startsWith(`${provider}.`)
  ) {
    return signInError(req, 'state');
  }
  const stateParts = state.split('.');
  const intent = stateParts[1] === 'signup' ? 'signup' : 'signin';
  const nextPath = decodeNextPath(stateParts[2]);

  let token: TokenResponse;
  try {
    token = await exchangeCode(req, provider, code);
  } catch (error) {
    return signInError(req, error instanceof Error ? error.message : 'token');
  }
  if (!token.access_token) {
    return signInError(req, token.error || token.error_description || 'token');
  }

  try {
    const user = provider === 'apple' && idToken
      ? await getAppleProfile(idToken, postedUser)
      : await getProfile(provider, token.access_token);
    const { isNew, sessionUser } = await recordOAuthSignIn(user);
    if ((isNew || intent === 'signup') && sessionUser.email) {
      try {
        const { error } = await sendOAuthWelcomeEmail(req, sessionUser) || {};
        if (error) {
          console.warn('OAuth welcome email failed.');
        }
      } catch {
        console.warn('OAuth welcome email failed.');
      }
    }
    const res = NextResponse.redirect(new URL(appendSignedIn(nextPath), req.url));
    res.cookies.delete(OAUTH_STATE_COOKIE);
    await setUserSessionCookie(res, sessionUser);
    return res;
  } catch (error) {
    return signInError(req, error instanceof Error ? error.message : 'profile');
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const limited = await rateLimit(req, 'oauth-callback', 30, 10 * 60_000);
  if (limited) return limited;

  const { provider } = await params;
  return handleCallback(req, provider);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const limited = await rateLimit(req, 'oauth-callback', 30, 10 * 60_000);
  if (limited) return limited;

  const { provider } = await params;
  return handleCallback(req, provider, await req.formData());
}
