import type { Metadata } from 'next';
import FunZone from '@/components/FunZone';
import LocalizedSafariBar from '@/components/LocalizedSafariBar';
import { getLoadouts } from '@/lib/data';
import { getRequestLocale } from '@/lib/requestLocale';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Createur - Fun tools | WZPRO Meta',
  description: 'Fun tools for streamers and content creators: random troll loadout generator, recoil comparator and the weekly cursed class vote.',
};

type CopyLocale = 'en' | 'fr' | 'es';

const COPY: Record<CopyLocale, { tag: string; title: string; lead: string }> = {
  en: {
    tag: 'FUN ZONE',
    title: 'CREATOR',
    lead: 'Fun tools for your streams and videos: random troll build, recoil comparator and the weekly cursed class your chat can vote on.',
  },
  fr: {
    tag: 'FUN ZONE',
    title: 'CREATEUR',
    lead: 'Les outils fun pour tes lives et tes videos : build troll aleatoire, comparateur de recul et la classe maudite de la semaine a faire voter par ton chat.',
  },
  es: {
    tag: 'FUN ZONE',
    title: 'CREADOR',
    lead: 'Herramientas fun para tus directos y videos: build troll aleatorio, comparador de retroceso y la clase maldita semanal que tu chat puede votar.',
  },
};

export default async function CreateurPage() {
  const [locale, loadouts] = await Promise.all([getRequestLocale(), getLoadouts()]);
  const lang = (locale === 'fr' || locale === 'es' ? locale : 'en') as CopyLocale;
  const copy = COPY[lang];

  return (
    <>
      <LocalizedSafariBar
        active="createur"
        readout={['CREATOR // FUN TOOLS', 'STATUS: LIVE', 'TRACKING: ACTIVE']}
      />

      <main className="news-main">
        <header className="news-hero">
          <div className="pt-header-tag">{copy.tag}</div>
          <h1>{copy.title}</h1>
          <p>{copy.lead}</p>
        </header>

        <FunZone loadouts={loadouts} locale={locale} />
      </main>
    </>
  );
}
