import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return '/';
  }

  return value;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = safeNextPath(requestUrl.searchParams.get('next'));

  if (code) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(new URL(`${next}?signed_in=1`, request.url));
      }
    }
  }

  return NextResponse.redirect(new URL('/sign-in?error=token', request.url));
}
