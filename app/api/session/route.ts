import { NextResponse, type NextRequest } from 'next/server';
import { clearUserSessionCookie, getUserSession } from '@/lib/userAuth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sameOriginGuard } from '@/lib/security';

export async function GET() {
  const user = await getUserSession();
  return NextResponse.json({ user });
}

export async function DELETE(req: NextRequest) {
  const csrfError = sameOriginGuard(req);
  if (csrfError) return csrfError;

  const supabase = await createSupabaseServerClient();
  if (supabase) {
    await supabase.auth.signOut();
  }

  const res = NextResponse.json({ ok: true });
  clearUserSessionCookie(res);
  return res;
}
