import type { Metadata } from 'next';
import LocalizedSafariBar from '@/components/LocalizedSafariBar';
import MetaTrendChart from '@/components/MetaTrendChart';
import PushOptIn from '@/components/PushOptIn';
import { getLoadouts } from '@/lib/data';
import { getMetaHistoryWithLive } from '@/lib/metaHistoryStore';
import { getRequestLocale } from '@/lib/requestLocale';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Warzone Meta Trends | WZPRO Meta',
  description: 'Track how Warzone weapon tiers and meta scores move over time. Enable alerts when a weapon is buffed or nerfed.',
  alternates: { canonical: '/meta-trends' },
};

const COPY = {
  en: { eyebrow: 'WZPRO // TRENDS', title: 'META TRENDS', intro: 'How weapon tiers and meta scores shift over time, recorded daily.' },
  fr: { eyebrow: 'WZPRO // TENDANCES', title: 'TENDANCES META', intro: 'Comment les tiers et scores meta evoluent dans le temps, enregistres chaque jour.' },
  es: { eyebrow: 'WZPRO // TENDENCIAS', title: 'TENDENCIAS META', intro: 'Como cambian los tiers y scores meta con el tiempo, registrado a diario.' },
};

export default async function MetaTrendsPage() {
  const [locale, loadouts] = await Promise.all([getRequestLocale(), getLoadouts()]);
  const history = await getMetaHistoryWithLive(loadouts);
  const lang = locale === 'fr' ? 'fr' : locale === 'es' ? 'es' : 'en';
  const t = COPY[lang];

  return (
    <>
      <LocalizedSafariBar active="loadouts" />
      <main className="trends-page">
        <header>
          <span>{t.eyebrow}</span>
          <h1>{t.title}</h1>
          <p>{t.intro}</p>
        </header>
        <PushOptIn locale={locale} />
        <MetaTrendChart history={history} locale={locale} />
      </main>

      <style>{`
        .trends-page { max-width: 820px; margin: 0 auto; padding: 4.5rem 1.5rem 6rem; font-family: var(--font-mono, monospace); color: var(--tm-ink, #10100e); }
        .trends-page header span { color: #163cff; font-size: 0.7rem; font-weight: 900; letter-spacing: 0.18em; text-transform: uppercase; }
        .trends-page header h1 { margin: 0.4rem 0 0; font-size: clamp(2rem, 7vw, 3.4rem); letter-spacing: 0.04em; line-height: 0.95; }
        .trends-page header p { margin: 0.8rem 0 0; max-width: 56ch; color: rgba(16,16,14,0.6); line-height: 1.6; }
        :root[data-theme="dark"] .trends-page header p { color: rgba(255,255,255,0.6); }
      `}</style>
    </>
  );
}
