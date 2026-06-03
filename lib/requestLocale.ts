import { headers } from 'next/headers';
import { LOCALE_HEADER, normalizeLocale } from '@/lib/i18n';

export async function getRequestLocale() {
  const requestHeaders = await headers();
  return normalizeLocale(requestHeaders.get(LOCALE_HEADER));
}
