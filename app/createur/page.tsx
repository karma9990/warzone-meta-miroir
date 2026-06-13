import type { Metadata } from 'next';
import Link from 'next/link';
import FunZone from '@/components/FunZone';
import LocalizedSafariBar from '@/components/LocalizedSafariBar';
import { getLoadouts } from '@/lib/data';
import { getRequestLocale } from '@/lib/requestLocale';
import { withLocalePath } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Createur - Fun tools | WZPRO Meta',
  description: 'Fun tools for streamers and content creators: random troll loadout generator, recoil comparator and the weekly cursed class vote.',
};

type CopyLocale = 'en' | 'fr' | 'es';

const COPY: Record<CopyLocale, { tag: string; title: string; lead: string; hubTitle: string }> = {
  en: {
    tag: 'FUN ZONE',
    title: 'CREATOR',
    lead: 'Fun tools for your streams and videos: random troll build, recoil comparator and the weekly cursed class your chat can vote on.',
    hubTitle: 'CREATOR TOOLKIT',
  },
  fr: {
    tag: 'FUN ZONE',
    title: 'CREATEUR',
    lead: 'Les outils fun pour tes lives et tes videos : build troll aleatoire, comparateur de recul et la classe maudite de la semaine a faire voter par ton chat.',
    hubTitle: 'BOITE A OUTILS CREATEUR',
  },
  es: {
    tag: 'FUN ZONE',
    title: 'CREADOR',
    lead: 'Herramientas fun para tus directos y videos: build troll aleatorio, comparador de retroceso y la clase maldita semanal que tu chat puede votar.',
    hubTitle: 'KIT DEL CREADOR',
  },
};

const HUB_CARDS: Record<CopyLocale, { href: string; label: string; title: string; desc: string }[]> = {
  en: [
    { href: '/quiz', label: 'QUIZ', title: 'Find your loadout', desc: 'Answer 5 questions, get the meta build matched to your playstyle. Great on-stream segment.' },
    { href: '/meta-trends', label: 'TRENDS', title: 'Meta trends', desc: 'Track how weapon tiers and meta scores move over time. Enable buff/nerf push alerts.' },
    { href: '/builds', label: 'BUILDS', title: 'Community builds', desc: 'Share your loadout, vote on the best and climb the community leaderboard.' },
  ],
  fr: [
    { href: '/quiz', label: 'QUIZ', title: 'Trouve ta classe', desc: 'Reponds a 5 questions, recois la classe meta adaptee a ton style. Parfait en live.' },
    { href: '/meta-trends', label: 'TENDANCES', title: 'Tendances meta', desc: 'Suis l evolution des tiers et scores meta dans le temps. Active les alertes push buff/nerf.' },
    { href: '/builds', label: 'BUILDS', title: 'Builds communaute', desc: 'Partage ta classe, vote pour les meilleures et grimpe dans le classement.' },
  ],
  es: [
    { href: '/quiz', label: 'QUIZ', title: 'Encuentra tu clase', desc: 'Responde 5 preguntas y recibe la clase meta para tu estilo. Ideal en directo.' },
    { href: '/meta-trends', label: 'TENDENCIAS', title: 'Tendencias meta', desc: 'Sigue como cambian los tiers y scores meta. Activa alertas push de buff/nerf.' },
    { href: '/builds', label: 'BUILDS', title: 'Builds comunidad', desc: 'Comparte tu clase, vota las mejores y sube en la clasificacion.' },
  ],
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

        <section className="creator-hub" aria-label={copy.hubTitle}>
          <span className="creator-hub-title">{copy.hubTitle}</span>
          <div className="creator-hub-grid">
            {HUB_CARDS[lang].map((card) => (
              <Link key={card.href} className="creator-hub-card" href={withLocalePath(card.href, locale)}>
                <span className="creator-hub-label">{card.label}</span>
                <strong>{card.title}</strong>
                <p>{card.desc}</p>
                <span className="creator-hub-arrow" aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        </section>

        <FunZone loadouts={loadouts} locale={locale} />
      </main>

      <style>{`
        .creator-hub { max-width: 1100px; margin: 2rem auto 0; padding: 0 1.5rem; }
        .creator-hub-title { display: block; color: #163cff; font-size: 0.7rem; font-weight: 900; letter-spacing: 0.16em; text-transform: uppercase; margin-bottom: 0.9rem; font-family: var(--font-mono, monospace); }
        .creator-hub-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.9rem; }
        .creator-hub-card { position: relative; display: grid; gap: 0.45rem; align-content: start; border: 1px solid rgba(22,60,255,0.28); background: var(--theme-panel, rgba(239,238,232,0.82)); padding: 1.2rem 1.25rem 2.4rem; text-decoration: none; color: var(--tm-ink, #10100e); font-family: var(--font-mono, monospace); transition: border-color 0.15s ease, transform 0.15s ease; }
        .creator-hub-card:hover { border-color: #163cff; transform: translateY(-2px); }
        .creator-hub-label { color: #163cff; font-size: 0.62rem; font-weight: 900; letter-spacing: 0.16em; text-transform: uppercase; }
        .creator-hub-card strong { font-size: 1.15rem; letter-spacing: 0.02em; text-transform: uppercase; line-height: 1.05; }
        .creator-hub-card p { margin: 0; font-size: 0.8rem; line-height: 1.5; color: rgba(16,16,14,0.62); }
        .creator-hub-arrow { position: absolute; right: 1.1rem; bottom: 1rem; color: #163cff; font-size: 1.1rem; font-weight: 900; }
        @media (max-width: 820px) { .creator-hub-grid { grid-template-columns: 1fr; } }
        :root[data-theme="dark"] .creator-hub-card p { color: rgba(255,255,255,0.62); }
      `}</style>
    </>
  );
}
