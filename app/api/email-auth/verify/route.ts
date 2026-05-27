import { NextRequest, NextResponse } from 'next/server';
import { verifyEmailAuthToken } from '@/lib/emailAuth';
import { getUserByEmail, saveUser } from '@/lib/accountStore';
import { setUserSessionCookie } from '@/lib/userAuth';
import { consumeEmailToken } from '@/lib/tokenReplayStore';
import { rateLimit } from '@/lib/rateLimit';

export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, 'email-auth-verify', 20, 10 * 60_000);
  if (limited) return limited;

  const token = req.nextUrl.searchParams.get('token');
  if (!token || token.length > 4096) {
    return NextResponse.redirect(new URL('/sign-in?error=email_token', req.url));
  }

  const payload = await verifyEmailAuthToken(token);
  if (!payload) {
    return NextResponse.redirect(new URL('/sign-in?error=email_token', req.url));
  }

  if (!await consumeEmailToken(payload.jti)) {
    return NextResponse.redirect(new URL('/sign-in?error=email_token', req.url));
  }

  const account = await getUserByEmail(payload.email);
  if (account && payload.purpose === 'verify-account') {
    account.emailVerifiedAt = new Date().toISOString();
    await saveUser(account);
  }

  const res = NextResponse.redirect(new URL('/?signed_in=1', req.url));
  await setUserSessionCookie(res, {
    sub: account?.id || payload.email,
    provider: 'email',
    name: account?.displayName || payload.email.split('@')[0],
    email: payload.email,
  });

  return res;
}
