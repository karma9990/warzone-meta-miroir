import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_HEADER, detectVisitorLocale, isLocale, stripLocale } from '@/lib/i18n';
import { rateLimit } from '@/lib/rateLimit';
import { createSupabaseProxyClient } from '@/lib/supabase/server';

const FALLBACK_ADMIN_PATH = process.env.NODE_ENV === 'production' ? '/admin-disabled' : '/admin-local';

function createNonce() {
  return Buffer.from(crypto.randomUUID()).toString('base64');
}

function buildCspHeader(nonce: string) {
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    return `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      img-src 'self' blob: data: https:;
      font-src 'self' data: https://fonts.gstatic.com;
      connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:* https://api.polar.sh https://sandbox-api.polar.sh;
      frame-src 'self' https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com https://youtube-nocookie.com;
      object-src 'none';
      base-uri 'self';
      form-action 'self' https://*.polar.sh https://polar.sh;
      frame-ancestors 'none';
    `.replace(/\s{2,}/g, ' ').trim();
  }

  return `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
    style-src 'self' 'nonce-${nonce}' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' blob: data: https:;
    font-src 'self' data: https://fonts.gstatic.com;
    connect-src 'self' https://api.polar.sh https://sandbox-api.polar.sh;
    frame-src 'self' https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com https://youtube-nocookie.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self' https://*.polar.sh https://polar.sh;
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();
}

function normalizeAdminPath(value: string | undefined) {
  const path = value?.trim() || FALLBACK_ADMIN_PATH;
  return path.startsWith('/') ? path : `/${path}`;
}

export async function proxy(request: NextRequest) {
  const nonce = createNonce();
  const cspHeader = buildCspHeader(nonce);
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
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', cspHeader);
  requestHeaders.set(LOCALE_HEADER, activeLocale);

  function withSecurity(response: NextResponse) {
    response.headers.set('Content-Security-Policy', cspHeader);
    return response;
  }

  function withLocale(response: NextResponse) {
    response.cookies.set(LOCALE_COOKIE, activeLocale, {
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
    });
    return withSecurity(response);
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
    return withSecurity(new NextResponse('Not Found', { status: 404 }));
  }

  if (effectivePathname === adminPath || effectivePathname.startsWith(`${adminPath}/`)) {
    const limited = await rateLimit(request, 'admin-access', 30, 10 * 60_000);
    if (limited) return withSecurity(limited);

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
  matcher: ['/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|.*\\..*).*)'],
};
