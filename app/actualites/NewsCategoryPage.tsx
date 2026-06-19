import { headers } from 'next/headers';
import Link from 'next/link';
import LocalizedSafariBar from '@/components/LocalizedSafariBar';
import { withLocalePath } from '@/lib/i18n';
import { getNewsContent } from '@/lib/newsContent';
import { getRequestLocale } from '@/lib/requestLocale';
import { SITE_URL } from '@/lib/siteConfig';

export type NewsCategorySlug = 'patch-notes' | 'meta' | 'esport' | 'evenements';

type Locale = 'en' | 'fr' | 'es';

type Category = {
  slug: NewsCategorySlug;
  label: Record<Locale, string>;
  description: Record<Locale, string>;
};

export const NEWS_CATEGORIES: Category[] = [
  {
    slug: 'patch-notes',
    label: { en: 'Patch Notes', fr: 'Patch Notes', es: 'Notas del parche' },
    description: {
      en: 'Weapon balance changes, nerfs, buffs and gameplay updates.',
      fr: 'Changements d equilibrage des armes, nerfs, buffs et mises a jour gameplay.',
      es: 'Cambios de balance de armas, nerfs, buffs y actualizaciones de gameplay.',
    },
  },
  {
    slug: 'meta',
    label: { en: 'Meta', fr: 'Meta', es: 'Meta' },
    description: {
      en: 'Meta shifts, tier movements and new dominant builds.',
      fr: 'Evolutions de la meta, mouvements de tiers et nouveaux builds dominants.',
      es: 'Cambios de meta, movimientos de tiers y nuevos builds dominantes.',
    },
  },
  {
    slug: 'esport',
    label: { en: 'Esport', fr: 'Esport', es: 'Esport' },
    description: {
      en: 'Tournaments, qualifiers, results and competitive circuit news.',
      fr: 'Tournois, qualifiers, resultats et actus du circuit competitif.',
      es: 'Torneos, clasificatorios, resultados y noticias del circuito competitivo.',
    },
  },
  {
    slug: 'evenements',
    label: { en: 'Events', fr: 'Evenements', es: 'Eventos' },
    description: {
      en: 'In-game events, new seasons, maps and limited modes.',
      fr: 'Events in-game, nouvelles saisons, maps et modes limites.',
      es: 'Eventos in-game, nuevas temporadas, mapas y modos limitados.',
    },
  },
];

const EMPTY_STATE: Record<Locale, string> = {
  en: 'No news for this category yet. Articles are generated automatically after each patch.',
  fr: 'Pas encore d actualite dans cette categorie. Les articles sont generes automatiquement apres chaque patch.',
  es: 'Todavia no hay noticias en esta categoria. Los articulos se generan automaticamente tras cada parche.',
};

const SOURCE_LABEL: Record<Locale, string> = {
  en: 'Source',
  fr: 'Source',
  es: 'Fuente',
};

const UPDATED_LABEL: Record<Locale, string> = {
  en: 'Updated',
  fr: 'Mis a jour',
  es: 'Actualizado',
};

const HIDDEN_BALANCE_COPY: Record<Locale, { title: string; eyebrow: string; note: string; emptyTitle: string; emptyBody: string }> = {
  en: {
    title: 'Secret buffs and nerfs',
    eyebrow: 'LLM scan / unofficial signals',
    note: 'These are WZPRO hypotheses generated from the official patch text. Verify them in-game before changing a ranked class.',
    emptyTitle: 'Daily scan pending',
    emptyBody: 'The LLM will scan JGOD, Sym.gg, TrueGameData, ModernWarzone and Raven once per day. Signals will appear here after the next cron run.',
  },
  fr: {
    title: 'Buffs et nerfs secrets',
    eyebrow: 'Scan LLM / signaux non officiels',
    note: 'Ce sont des hypotheses WZPRO generees depuis le texte officiel du patch. Verifie-les en jeu avant de changer une classe ranked.',
    emptyTitle: 'Scan quotidien en attente',
    emptyBody: 'Le LLM scanne JGOD, Sym.gg, TrueGameData, ModernWarzone et Raven une fois par jour. Les signaux apparaitront ici apres le prochain cron.',
  },
  es: {
    title: 'Buffs y nerfs secretos',
    eyebrow: 'Escaneo LLM / senales no oficiales',
    note: 'Son hipotesis WZPRO generadas desde el texto oficial del parche. Verificalas en partida antes de cambiar una clase ranked.',
    emptyTitle: 'Escaneo diario pendiente',
    emptyBody: 'El LLM escanea JGOD, Sym.gg, TrueGameData, ModernWarzone y Raven una vez al dia. Las senales apareceran aqui tras el proximo cron.',
  },
};

const RECENT_CHANGES_COPY: Record<Locale, { title: string; eyebrow: string; empty: string }> = {
  en: {
    title: 'Recent changes',
    eyebrow: 'Patch impact',
    empty: 'No recent change is published yet. The next patch sync will fill this section.',
  },
  fr: {
    title: 'Changements recents',
    eyebrow: 'Impact patch',
    empty: 'Aucun changement recent publie pour le moment. Le prochain sync patch remplira cette section.',
  },
  es: {
    title: 'Cambios recientes',
    eyebrow: 'Impacto del parche',
    empty: 'Todavia no hay cambios recientes publicados. La proxima sincronizacion del parche llenara esta seccion.',
  },
};

export default async function NewsCategoryPage({ slug }: { slug: NewsCategorySlug }) {
  const [locale, news, requestHeaders] = await Promise.all([getRequestLocale(), getNewsContent(), headers()]);
  const nonce = requestHeaders.get('x-nonce') ?? undefined;
  const category = NEWS_CATEGORIES.find((entry) => entry.slug === slug)!;
  const lang = (locale === 'fr' || locale === 'es' ? locale : 'en') as Locale;
  const items = news.categories[slug].items;
  const showHiddenBalance = slug === 'patch-notes';
  const hiddenBalanceItems = slug === 'patch-notes' ? news.hiddenBalance.items : [];
  const recentChanges = slug === 'patch-notes'
    ? [
      ...items.slice(0, 4).map((item) => ({ title: item.title, body: item.body, tone: 'patch' as const })),
      ...hiddenBalanceItems.slice(0, Math.max(0, 4 - items.length)).map((item) => ({ title: item.title, body: item.body, tone: item.tone })),
    ].slice(0, 4)
    : [];
  const updatedLabel = news.updatedAt ? new Date(news.updatedAt).toLocaleDateString(lang === 'en' ? 'en-GB' : lang === 'es' ? 'es-ES' : 'fr-FR') : '';
  const articleJsonLd = items.length ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: category.label[lang],
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'NewsArticle',
        headline: item.title,
        description: item.body,
        dateModified: news.updatedAt || undefined,
        mainEntityOfPage: `${SITE_URL}${withLocalePath(`/actualites/${slug}`, locale)}#news-${index + 1}`,
        publisher: {
          '@type': 'Organization',
          name: 'WZPRO Meta',
          url: SITE_URL,
        },
      },
    })),
  } : null;

  return (
    <>
      {articleJsonLd ? (
        <script
          nonce={nonce}
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
        />
      ) : null}
      <div className="pt-technical-backdrop" aria-hidden="true" />

      <LocalizedSafariBar
        active="actualites"
        readout={['NEWS // WARZONE', `CATEGORY: ${category.label.en.toUpperCase()}`, 'STATUS: LIVE']}
      />

      <main className="news-main">
        <p className="news-back">
          <Link href={withLocalePath('/actualites', locale)}>
            {lang === 'fr' ? '<- Retour aux actualites' : lang === 'es' ? '<- Volver a las noticias' : '<- Back to news'}
          </Link>
        </p>
        <header className="news-hero">
          <div className="pt-header-tag">{lang === 'fr' ? 'ACTUALITES' : lang === 'es' ? 'NOTICIAS' : 'NEWS'}</div>
          <h1>{category.label[lang]}</h1>
          {updatedLabel && (
            <p>
              {UPDATED_LABEL[lang]}: {updatedLabel}
              {news.sourceUrl && (
                <>
                  {' - '}
                  <a href={news.sourceUrl} target="_blank" rel="noreferrer">{SOURCE_LABEL[lang]}: {news.sourceTitle || 'Call of Duty'}</a>
                </>
              )}
            </p>
          )}
        </header>

        <section aria-label={category.label[lang]}>
          {showHiddenBalance && (
            <aside className="recent-changes-panel" aria-labelledby="recent-changes-title">
              <div>
                <span>{RECENT_CHANGES_COPY[lang].eyebrow}</span>
                <h2 id="recent-changes-title">{RECENT_CHANGES_COPY[lang].title}</h2>
              </div>
              <div className="recent-changes-grid">
                {recentChanges.length > 0
                  ? recentChanges.map((item) => (
                    <article key={`${item.tone}-${item.title}`} data-tone={item.tone}>
                      <small>{item.tone.toUpperCase()}</small>
                      <strong>{item.title}</strong>
                      <p>{item.body}</p>
                    </article>
                  ))
                  : (
                    <article data-tone="watch">
                      <small>WATCH</small>
                      <strong>{RECENT_CHANGES_COPY[lang].title}</strong>
                      <p>{RECENT_CHANGES_COPY[lang].empty}</p>
                    </article>
                  )}
              </div>
            </aside>
          )}
          {showHiddenBalance && (
            <aside className="hidden-balance-panel" aria-labelledby="hidden-balance-title">
              <div>
                <span>{HIDDEN_BALANCE_COPY[lang].eyebrow}</span>
                <h2 id="hidden-balance-title">{HIDDEN_BALANCE_COPY[lang].title}</h2>
                <p>{HIDDEN_BALANCE_COPY[lang].note}</p>
              </div>
              <div className="hidden-balance-grid">
                {hiddenBalanceItems.length > 0
                  ? hiddenBalanceItems.map((item) => (
                    <article key={item.title} data-tone={item.tone}>
                      <small>{item.tone.toUpperCase()}</small>
                      <strong>{item.title}</strong>
                      <p>{item.body}</p>
                    </article>
                  ))
                  : (
                    <article data-tone="watch">
                      <small>WATCH</small>
                      <strong>{HIDDEN_BALANCE_COPY[lang].emptyTitle}</strong>
                      <p>{HIDDEN_BALANCE_COPY[lang].emptyBody}</p>
                    </article>
                  )}
              </div>
            </aside>
          )}
          {items.length ? (
            <div className="news-grid">
              {items.map((item, index) => (
                <article key={item.title} id={`news-${index + 1}`}>
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
          ) : (
            <p>{EMPTY_STATE[lang]}</p>
          )}
        </section>
      </main>
    </>
  );
}
