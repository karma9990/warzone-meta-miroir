import { NextRequest, NextResponse } from 'next/server';
import { normalizeEmail, sendEmailAuthLink, validateEmailAddress, validateEmailDomain } from '@/lib/emailAuth';
import { readJsonBody } from '@/lib/security';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, 'email-auth-request', 5, 10 * 60_000);
  if (limited) return limited;

  const parsed = await readJsonBody<{ email?: unknown }>(req);
  if ('error' in parsed) return parsed.error;
  const body = parsed.data;
  const email = normalizeEmail(body.email);
  const validationError = validateEmailAddress(email);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const domainError = await validateEmailDomain(email);
  if (domainError) {
    return NextResponse.json({ error: domainError }, { status: 400 });
  }

  const { error } = await sendEmailAuthLink(req, email);
  if (error) {
    return NextResponse.json({ error: 'Unable to send the sign-in email.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
