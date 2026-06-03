'use client';

import { useEffect } from 'react';
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
  useEffect(() => {
    if (locale === 'en') return;

    let observer: MutationObserver | null = null;
    let cancelled = false;

    import('@/lib/runtimeTranslations').then(({ translateRuntimeText }) => {
      if (cancelled) return;

      const apply = (root: ParentNode = document.body) => {
        translateTextNodes(root, locale, translateRuntimeText);
        translateAttributes(root, locale, translateRuntimeText);
      };

      apply();

      observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of Array.from(mutation.addedNodes)) {
            if (node.nodeType === Node.TEXT_NODE && node.parentNode) {
              translateTextNodes(node.parentNode, locale, translateRuntimeText);
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              apply(node as Element);
            }
          }
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
    });

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [locale]);

  return null;
}
