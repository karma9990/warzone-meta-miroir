import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_HEADER, detectVisitorLocale, isLocale, stripLocale } from '@/lib/i18n';
import { rateLimit } from '@/lib/rateLimit';
import { createSupabaseProxyClient } from '@/lib/supabase/server';

const FALLBACK_ADMIN_PATH = process.env.NODE_ENV === 'production' ? '/admin-disabled' : '/admin-local';

function normalizeAdminPath(value: string | undefined) {
  const path = value?.trim() || FALLBACK_ADMIN_PATH;
  return path.startsWith('/') ? path : `/${path}`;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const adminPath = normalizeAdminPath(process.env.ADMIN_ACCESS_PATH);
  const { locale: localeFromPath, pathname: pathnameWithoutLocale } = stripLocale(pathname);
  const effectivePathname = localeFromPath ? pathnameWithoutLocale : pathname;
  const rawCookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  const cookieLocale = isLocale(rawCookieLocale) ? rawCookieLocale : null;
  const detectedLocale = !localeFromPath && !cookieLocale && effectivePathname === '/free-preview'
    ? detectVisitorLocale(
        request.headers.get('x-vercel-ip-country'),
        request.headers.get('accept-language'),
      )
    : null;
  const activeLocale = localeFromPath ?? cookieLocale ?? detectedLocale ?? DEFAULT_LOCALE;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(LOCALE_HEADER, activeLocale);

  function withLocale(response: NextResponse) {
    response.cookies.set(LOCALE_COOKIE, activeLocale, {
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  }

  if (detectedLocale) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = `/${detectedLocale}${effectivePathname}`;
    return withLocale(NextResponse.redirect(redirectUrl));
  }

  if (pathname === '/' && request.nextUrl.searchParams.has('code')) {
    const callbackUrl = request.nextUrl.clone();
    callbackUrl.pathname = '/auth/callback';
    callbackUrl.searchParams.set('next', '/reset-password');
    return withLocale(NextResponse.redirect(callbackUrl));
  }

  if (effectivePathname === '/admin' || effectivePathname.startsWith('/admin/')) {
    return new NextResponse('Not Found', { status: 404 });
  }

  if (effectivePathname === adminPath || effectivePathname.startsWith(`${adminPath}/`)) {
    const limited = await rateLimit(request, 'admin-access', 30, 10 * 60_000);
    if (limited) return limited;

    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = effectivePathname.replace(adminPath, '/admin');
    const response = NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } });
    const supabase = createSupabaseProxyClient(request, response);
    if (supabase) await supabase.auth.getUser();
    return withLocale(response);
  }

  if (localeFromPath) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = pathnameWithoutLocale === '/' ? '/home' : pathnameWithoutLocale;
    return withLocale(NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } }));
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  const supabase = createSupabaseProxyClient(request, response);
  if (supabase) await supabase.auth.getUser();
  return withLocale(response);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
