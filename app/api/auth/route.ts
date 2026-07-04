import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, ADMIN_PASSWORD, createToken } from '@/lib/auth';
import { deleteCookie, readJsonBody, safeCompare, secureCookieOptions, sameOriginGuard } from '@/lib/security';
import { isTotpEnabled, verifyTotp } from '@/lib/totp';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, 'admin-login', 5, 5 * 60_000);
  if (limited) return limited;

  const parsed = await readJsonBody<{ password?: unknown; totp?: unknown }>(req);
  if ('error' in parsed) return parsed.error;

  const password = typeof parsed.data.password === 'string' ? parsed.data.password : '';
  const passwordOk = safeCompare(password, ADMIN_PASSWORD);

  // Second factor (opt-in): only enforced when ADMIN_TOTP_SECRET is configured.
  const totp = typeof parsed.data.totp === 'string' ? parsed.data.totp : '';
  const totpOk = !isTotpEnabled() || verifyTotp(totp, process.env.ADMIN_TOTP_SECRET || '');

  if (!passwordOk || !totpOk) {
    return NextResponse.json(
      { error: 'Invalid credentials.', totpRequired: isTotpEnabled() },
      { status: 401 }
    );
  }

  const token = await createToken();

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, secureCookieOptions(60 * 60 * 8));

  return res;
}

export async function DELETE(req: NextRequest) {
  const csrfError = sameOriginGuard(req);
  if (csrfError) return csrfError;

  const res = NextResponse.json({ ok: true });
  deleteCookie(res, ADMIN_COOKIE);
  return res;
}
