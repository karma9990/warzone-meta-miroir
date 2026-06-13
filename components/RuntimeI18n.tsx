'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { stripLocale, withLocalePath, type Locale } from '@/lib/i18n';

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'TEXTAREA', 'SELECT']);

function translateTextNodes(root: ParentNode, locale: Locale, translateRuntimeText: (value: string, locale: Locale) => string) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || SKIP_TAGS.has(parent.tagName) || parent.closest('[data-no-translate], .notranslate')) {
        return NodeFilter.FILTER_REJECT;
      }
      if (!node.nodeValue?.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);

  for (const node of nodes) {
    const original = node.nodeValue ?? '';
    const translated = translateRuntimeText(original, locale);
    if (translated !== original) node.nodeValue = translated;
  }
}

function translateAttributes(root: ParentNode, locale: Locale, translateRuntimeText: (value: string, locale: Locale) => string) {
  const elements = root instanceof Element ? [root, ...Array.from(root.querySelectorAll('*'))] : Array.from(root.querySelectorAll('*'));

  for (const element of elements) {
    if (element.closest('[data-no-translate], .notranslate')) continue;

    for (const attr of ['placeholder', 'aria-label', 'title']) {
      const value = element.getAttribute(attr);
      if (value?.trim()) element.setAttribute(attr, translateRuntimeText(value, locale));
    }

    if (element instanceof HTMLAnchorElement) {
      const href = element.getAttribute('href');
      if (href?.startsWith('/') && !href.startsWith('/api') && !href.startsWith('/_next')) {
        element.setAttribute('href', withLocalePath(stripLocale(href).pathname, locale));
      }
    }
  }
}

export default function RuntimeI18n({ locale }: { locale: Locale }) {
  const pathname = usePathname();

  useEffect(() => {
    if (locale === 'en') return;

    let cancelled = false;
    const cleanupTasks: Array<() => void> = [];

    import('@/lib/runtimeTranslations').then(({ translateRuntimeText }) => {
      if (cancelled) return;

      const apply = (root: ParentNode = document.body) => {
        translateTextNodes(root, locale, translateRuntimeText);
        translateAttributes(root, locale, translateRuntimeText);
      };

      apply();

      const frame = window.requestAnimationFrame(() => apply());
      cleanupTasks.push(() => window.cancelAnimationFrame(frame));

      const timeout = window.setTimeout(() => apply(), 350);
      cleanupTasks.push(() => window.clearTimeout(timeout));
    });

    return () => {
      cancelled = true;
      cleanupTasks.forEach((cleanup) => cleanup());
    };
  }, [locale, pathname]);

  return null;
}
