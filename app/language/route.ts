import { NextResponse, type NextRequest } from 'next/server';
import { normalizeLocale, withLocalePath } from '@/lib/i18n';

export function GET(request: NextRequest) {
  const locale = normalizeLocale(request.nextUrl.searchParams.get('lang'));
  return NextResponse.redirect(new URL(withLocalePath('/', locale), request.url));
}
