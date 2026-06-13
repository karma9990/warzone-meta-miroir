import { NextRequest, NextResponse } from 'next/server';
import { normalizeEmail, validateEmailAddress, validateEmailDomain } from '@/lib/emailAuth';
import { rateLimit, rateLimitIdentifier } from '@/lib/rateLimit';
import { readJsonBody } from '@/lib/security';
import { unwatchWeapon, watchWeapon } from '@/lib/weaponWatchStore';

export const dynamic = 'force-dynamic';

type WatchBody = { email?: unknown; weaponId?: unknown };

async function resolve(req: NextRequest) {
  const parsed = await readJsonBody<WatchBody>(req);
  if ('error' in parsed) return { error: parsed.error };

  const email = normalizeEmail(parsed.data.email);
  const emailError = validateEmailAddress(email) || await validateEmailDomain(email);
  if (emailError) {
    return { error: NextResponse.json({ error: emailError }, { status: 400 }) };
  }

  const weaponId = typeof parsed.data.weaponId === 'string' ? parsed.data.weaponId : '';
  if (!weaponId) {
    return { error: NextResponse.json({ error: 'Weapon is required.' }, { status: 400 }) };
  }

  return { email, weaponId };
}

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, 'weapon-watch', 12, 10 * 60_000);
  if (limited) return limited;

  const resolved = await resolve(req);
  if ('error' in resolved) return resolved.error;

  const emailLimit = await rateLimitIdentifier('weapon-watch-email', resolved.email, 20, 60 * 60_000);
  if (emailLimit) return emailLimit;

  const result = await watchWeapon(resolved.email, resolved.weaponId);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({ ok: true, watching: true });
}

export async function DELETE(req: NextRequest) {
  const limited = await rateLimit(req, 'weapon-watch', 12, 10 * 60_000);
  if (limited) return limited;

  const resolved = await resolve(req);
  if ('error' in resolved) return resolved.error;

  await unwatchWeapon(resolved.email, resolved.weaponId);
  return NextResponse.json({ ok: true, watching: false });
}
