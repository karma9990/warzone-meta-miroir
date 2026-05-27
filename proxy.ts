import { NextResponse, type NextRequest } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';
import { createSupabaseProxyClient } from '@/lib/supabase/server';

const FALLBACK_ADMIN_PATH = '/admin-db96cdfd2904159b';

function normalizeAdminPath(value: string | undefined) {
  const path = value?.trim() || FALLBACK_ADMIN_PATH;
  return path.startsWith('/') ? path : `/${path}`;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const adminPath = normalizeAdminPath(process.env.ADMIN_ACCESS_PATH);

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return new NextResponse('Not Found', { status: 404 });
  }

  if (pathname === adminPath || pathname.startsWith(`${adminPath}/`)) {
    const limited = await rateLimit(request, 'admin-access', 30, 10 * 60_000);
    if (limited) return limited;

    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = pathname.replace(adminPath, '/admin');
    const response = NextResponse.rewrite(rewriteUrl);
    const supabase = createSupabaseProxyClient(request, response);
    if (supabase) await supabase.auth.getUser();
    return response;
  }

  const response = NextResponse.next();
  const supabase = createSupabaseProxyClient(request, response);
  if (supabase) await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
