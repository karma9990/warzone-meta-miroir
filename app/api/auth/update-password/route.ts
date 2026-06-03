import { NextRequest, NextResponse } from 'next/server';
import { normalizeEmail, verifyEmailAuthToken } from '@/lib/emailAuth';
import { getUserByEmail, saveUser } from '@/lib/accountStore';
import { getOAuthUserByEmail } from '@/lib/oauthAccountStore';
import { rateLimit } from '@/lib/rateLimit';
import { readJsonBody } from '@/lib/security';
import { consumeEmailToken } from '@/lib/tokenReplayStore';
import { getUserSession } from '@/lib/userAuth';
import bcrypt from 'bcryptjs';

function usernameFromEmail(email: string) {
  return email.split('@')[0]?.replace(/[^a-z0-9_]/gi, '').toLowerCase().slice(0, 24) || 'operator';
}

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, 'password-update', 12, 10 * 60_000);
  if (limited) return limited;

  const parsed = await readJsonBody<{ token?: unknown; password?: unknown }>(req);
  if ('error' in parsed) return parsed.error;

  const token = typeof parsed.data.token === 'string' ? parsed.data.token : '';
  const password = typeof parsed.data.password === 'string' ? parsed.data.password : '';

  if (password.length < 8) {
    return NextResponse.json({ error: 'Use at least 8 characters for the new password.' }, { status: 400 });
  }

  const payload = await verifyEmailAuthToken(token);
  if (!payload || payload.purpose !== 'password-reset') {
    return NextResponse.json({ error: 'This reset link is invalid or expired. Request a new password reset email.' }, { status: 401 });
  }

  const email = normalizeEmail(payload.email);
  const existingEmailAccount = await getUserByEmail(email);
  const oauthAccount = existingEmailAccount ? null : await getOAuthUserByEmail(email);
  const currentSession = existingEmailAccount || oauthAccount ? null : await getUserSession();
  const currentOAuthSession = currentSession?.provider && currentSession.provider !== 'email' ? currentSession : null;
  const linkedAccountId = oauthAccount?.id || currentOAuthSession?.sub || email;
  const linkedDisplayName = oauthAccount?.name || currentOAuthSession?.name || usernameFromEmail(email);
  const linkedCreatedAt = oauthAccount?.createdAt || new Date().toISOString();
  const account = existingEmailAccount || {
    id: linkedAccountId,
    email,
    username: usernameFromEmail(email),
    displayName: linkedDisplayName,
    passwordHash: '',
    createdAt: linkedCreatedAt,
    emailVerifiedAt: new Date().toISOString(),
  };

  if (!await consumeEmailToken(payload.jti)) {
    return NextResponse.json({ error: 'This reset link has already been used. Request a new password reset email.' }, { status: 401 });
  }

  account.passwordHash = await bcrypt.hash(password, 12);
  account.emailVerifiedAt ||= new Date().toISOString();
  await saveUser(account);

  return NextResponse.json({ ok: true });
}
