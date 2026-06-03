import { NextRequest, NextResponse } from 'next/server';
import { normalizeEmail, validateEmailAddress } from '@/lib/emailAuth';
import { rateLimit } from '@/lib/rateLimit';
import { readJsonBody } from '@/lib/security';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, 'supabase-email-signin', 8, 10 * 60_000);
  if (limited) return limited;

  const parsed = await readJsonBody<{ email?: unknown; password?: unknown }>(req);
  if ('error' in parsed) return parsed.error;

  const email = normalizeEmail(parsed.data.email);
  const password = typeof parsed.data.password === 'string' ? parsed.data.password : '';
  const emailError = validateEmailAddress(email);

  if (emailError) {
    return NextResponse.json({ error: emailError }, { status: 400 });
  }

  if (!password) {
    return NextResponse.json({ error: 'Enter your password.' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Email sign-in is not configured yet.' }, { status: 500 });
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
