import { NextRequest, NextResponse } from 'next/server';
import { normalizeEmail, sendPasswordResetEmail, validateEmailAddress } from '@/lib/emailAuth';
import { cooldownIdentifier, rateLimit } from '@/lib/rateLimit';
import { readJsonBody } from '@/lib/security';

export async function POST(req: NextRequest) {
  const globalLimit = await rateLimit(req, 'password-reset-global', 30, 60_000);
  if (globalLimit) return globalLimit;

  const parsed = await readJsonBody<{ email?: unknown }>(req);
  if ('error' in parsed) return parsed.error;

  const email = normalizeEmail(parsed.data.email);
  const validationError = validateEmailAddress(email);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const emailLimit = await cooldownIdentifier('password-reset-email-v2', email, 60_000);
  if (emailLimit) {
    return NextResponse.json(
      { error: 'A reset email was already requested for this address in the last minute. Wait one minute, then try again.' },
      {
        status: 429,
        headers: { 'Retry-After': emailLimit.headers.get('Retry-After') || '60' },
      }
    );
  }

  const { error } = await sendPasswordResetEmail(req, email);
  if (error) {
    return NextResponse.json({ error: 'Unable to send the reset email right now.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
