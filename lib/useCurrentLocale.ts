'use client';

import { useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { DEFAULT_LOCALE, LOCALE_COOKIE, normalizeLocale, stripLocale, type Locale } from '@/lib/i18n';

function readCookieLocale() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function subscribe(callback: () => void) {
  window.addEventListener('popstate', callback);
  window.addEventListener('wzpro:locale', callback);
  return () => {
    window.removeEventListener('popstate', callback);
    window.removeEventListener('wzpro:locale', callback);
  };
}

function getBrowserLocale() {
  return normalizeLocale(document.documentElement.lang || readCookieLocale());
}

export function useCurrentLocale(): Locale {
  const pathname = usePathname();
  const browserLocale = useSyncExternalStore(subscribe, getBrowserLocale, () => DEFAULT_LOCALE);
  return normalizeLocale(stripLocale(pathname).locale ?? browserLocale);
}
