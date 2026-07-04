import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import LocalizedSafariBar from '@/components/LocalizedSafariBar';
import { withLocalePath } from '@/lib/i18n';
import { jsonLdHtml } from '@/lib/jsonLd';
import { getRequestLocale } from '@/lib/requestLocale';
import { SITE_URL } from '@/lib/siteConfig';
import { NEWS_CATEGORIES } from './NewsCategoryPage';

export const metadata: Metadata = {
  title: 'Actualites - Warzone News | WZPRO Meta',
  description: 'Warzone news: patch notes, meta shifts, esport and in-game events.',
};

const COPY = {
  en: { tag: 'NEWS', title: 'NEWS', lead: 'Pick a category: patch notes, meta, esport or in-game events.' },
  fr: { tag: 'ACTUALITES', title: 'ACTUALITES', lead: 'Choisis une categorie : patch notes, meta, esport ou events in-game.' },
  es: { tag: 'NOTICIAS', title: 'NOTICIAS', lead: 'Elige una categoria: notas del parche, meta, esport o eventos in-game.' },
} as const;

export default async function ActualitesIndexPage() {
  const [locale, requestHeaders] = await Promise.all([getRequestLocale(), headers()]);
  const nonce = requestHeaders.get('x-nonce') ?? undefined;
  const lang = locale === 'fr' || locale === 'es' ? locale : 'en';
  const copy = COPY[lang];
  const href = (pathname: string) => withLocalePath(pathname, locale);
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Warzone news categories',
    itemListElement: NEWS_CATEGORIES.map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: entry.label[lang],
      url: `${SITE_URL}${withLocalePath(`/actualites/${entry.slug}`, locale)}`,
    })),
  };

  return (
    <>
      <script
        nonce={nonce}
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(itemListJsonLd) }}
      />
      <div className="pt-technical-backdrop" aria-hidden="true" />

      <LocalizedSafariBar
        active="actualites"
        readout={['NEWS // WARZONE', 'STATUS: LIVE', 'TRACKING: ACTIVE']}
      />

      <main className="news-main">
        <header className="news-hero">
          <div className="pt-header-tag">{copy.tag}</div>
          <h1>{copy.title}</h1>
          <p>{copy.lead}</p>
        </header>

        <nav className="news-grid" aria-label={copy.tag}>
          {NEWS_CATEGORIES.map((entry) => (
            <Link key={entry.slug} href={href(`/actualites/${entry.slug}`)}>
              <strong>{entry.label[lang]}</strong>
              <p>{entry.description[lang]}</p>
            </Link>
          ))}
        </nav>
      </main>
    </>
  );
}
