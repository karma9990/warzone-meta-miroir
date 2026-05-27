import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  OAUTH_STATE_COOKIE,
  getOAuthBase,
  getOAuthCredentials,
  getRedirectUri,
  isOAuthProvider,
} from '@/lib/userAuth';
import { rateLimit } from '@/lib/rateLimit';
import { secureCookieOptions } from '@/lib/security';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const limited = await rateLimit(req, 'oauth-start', 20, 10 * 60_000);
  if (limited) return limited;

  const { provider: providerParam } = await params;
  if (!isOAuthProvider(providerParam)) {
    return NextResponse.redirect(new URL('/sign-in?error=provider', req.url));
  }

  const provider = providerParam;
  const credentials = getOAuthCredentials(provider);
  if (!credentials.clientId || (provider !== 'apple' && !credentials.clientSecret)) {
    return NextResponse.redirect(new URL(`/sign-in?error=${provider}_config`, req.url));
  }

  const oauth = getOAuthBase(provider);
  const intent = req.nextUrl.searchParams.get('intent') === 'signup' ? 'signup' : 'signin';
  const state = `${provider}.${intent}.${randomBytes(24).toString('hex')}`;
  const authorizeUrl = new URL(oauth.authorizeUrl);
  authorizeUrl.searchParams.set('client_id', credentials.clientId);
  authorizeUrl.searchParams.set('redirect_uri', getRedirectUri(req, provider));
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('state', state);

  if (oauth.scope) {
    authorizeUrl.searchParams.set('scope', oauth.scope);
  }

  if (provider === 'google') {
    authorizeUrl.searchParams.set('prompt', 'select_account');
  }

  if (provider === 'apple') {
    authorizeUrl.searchParams.set('response_type', 'code id_token');
    authorizeUrl.searchParams.set('response_mode', 'form_post');
  }

  const res = NextResponse.redirect(authorizeUrl);
  res.cookies.set(OAUTH_STATE_COOKIE, state, {
    ...secureCookieOptions(60 * 10),
    sameSite: provider === 'apple' ? 'none' : 'lax',
  });

  return res;
}
