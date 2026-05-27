import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, ADMIN_PASSWORD, createToken } from '@/lib/auth';
import { deleteCookie, readJsonBody, safeCompare, secureCookieOptions } from '@/lib/security';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, 'admin-login', 5, 5 * 60_000);
  if (limited) return limited;

  const parsed = await readJsonBody<{ password?: unknown }>(req);
  if ('error' in parsed) return parsed.error;

  const password = typeof parsed.data.password === 'string' ? parsed.data.password : '';
  if (!safeCompare(password, ADMIN_PASSWORD)) {
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
  }

  const token = await createToken();

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, secureCookieOptions(60 * 60 * 8));

  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  deleteCookie(res, ADMIN_COOKIE);
  return res;
}
