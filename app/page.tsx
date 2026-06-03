import type { Metadata } from 'next';
import LanguageSelector from '@/components/LanguageSelector';
import { LANDING_COPY } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'WZPRO Meta - Choose your language',
  description: 'Choose your language before opening the Warzone meta loadout database and pro tools.',
};

export default function LanguageLandingPage() {
  return (
    <main className="language-landing">
      <section className="language-hero" aria-labelledby="language-title">
        <div className="language-kicker">{LANDING_COPY.eyebrow}</div>
        <h1 id="language-title">{LANDING_COPY.title}</h1>
        <p>{LANDING_COPY.description}</p>
        <LanguageSelector />
        <em>{LANDING_COPY.note}</em>
      </section>
    </main>
  );
}
