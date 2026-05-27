import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/accountStore';
import { normalizeEmail, sendEmailAuthLink, validateEmailAddress } from '@/lib/emailAuth';
import { setUserSessionCookie } from '@/lib/userAuth';
import { readJsonBody } from '@/lib/security';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, 'email-signin', 8, 10 * 60_000);
  if (limited) return limited;

  const parsed = await readJsonBody<{ email?: unknown; password?: unknown }>(req);
  if ('error' in parsed) return parsed.error;
  const body = parsed.data;
  const email = normalizeEmail(body.email);
  const password = typeof body.password === 'string' ? body.password : '';

  const emailError = validateEmailAddress(email);
  if (emailError) {
    return NextResponse.json({ error: emailError }, { status: 400 });
  }

  const user = await getUserByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  if (!user.emailVerifiedAt) {
    await sendEmailAuthLink(req, email, 'verify-account');
    return NextResponse.json({ error: 'Email not verified. We sent a new verification link.' }, { status: 403 });
  }

  const res = NextResponse.json({ ok: true });
  await setUserSessionCookie(res, {
    sub: user.id,
    provider: 'email',
    name: user.displayName,
    email: user.email,
  });

  return res;
}
