import type { Metadata } from 'next';
import Image from 'next/image';
import LocalizedSafariBar from '@/components/LocalizedSafariBar';
import ProClassWeaponSlot from '@/components/ProClassWeaponSlot';
import { getProClassesContent } from '@/lib/proClasses';
import { getRequestLocale } from '@/lib/requestLocale';

export const metadata: Metadata = {
  title: 'Pro Classes - Warzone | WZPRO Meta',
  description: 'Classes used by Warzone pro players: exact builds, attachments and settings from the competitive scene.',
};

type Locale = 'en' | 'fr' | 'es';

const COPY: Record<Locale, { tag: string; title: string; lead: string; empty: string }> = {
  en: {
    tag: 'PRO INTELLIGENCE',
    title: 'PRO CLASSES',
    lead: 'The exact classes used by Warzone pro players: builds, attachments and tunings straight from the competitive scene.',
    empty: 'Pro classes are coming soon. Check back after the next update.',
  },
  fr: {
    tag: 'RENSEIGNEMENT PRO',
    title: 'CLASSES PRO',
    lead: 'Les classes exactes utilisees par les joueurs pro Warzone : builds, accessoires et reglages venus directement de la scene competitive.',
    empty: 'Les classes pro arrivent bientot. Reviens apres la prochaine mise a jour.',
  },
  es: {
    tag: 'INTELIGENCIA PRO',
    title: 'CLASES PRO',
    lead: 'Las clases exactas que usan los jugadores pro de Warzone: builds, accesorios y ajustes directos de la escena competitiva.',
    empty: 'Las clases pro llegan pronto. Vuelve despues de la proxima actualizacion.',
  },
};

export default async function ProClassePage() {
  const [locale, proClassesContent] = await Promise.all([getRequestLocale(), getProClassesContent()]);
  const lang = (locale === 'fr' || locale === 'es' ? locale : 'en') as Locale;
  const copy = COPY[lang];
  const proClasses = proClassesContent.classes;
  const updatedLabel = proClassesContent.updatedAt
    ? new Date(proClassesContent.updatedAt).toLocaleDateString(lang === 'fr' ? 'fr-FR' : lang === 'es' ? 'es-ES' : 'en-GB')
    : '';

  return (
    <>
      <div className="pt-technical-backdrop" aria-hidden="true" />

      <LocalizedSafariBar
        active="pro-classe"
        readout={['PRO CLASSES // WARZONE', 'STATUS: LIVE', 'TRACKING: ACTIVE']}
      />

      <main className="news-main">
        <header className="news-hero">
          <div className="pt-header-tag">{copy.tag}</div>
          <h1>{copy.title}</h1>
          <p>{copy.lead}</p>
          {updatedLabel && (
            <p>
              {lang === 'fr' ? 'Mis a jour' : lang === 'es' ? 'Actualizado' : 'Updated'}: {updatedLabel}
              {proClassesContent.sourceUrl && (
                <>
                  {' - '}
                  <a href={proClassesContent.sourceUrl} target="_blank" rel="noreferrer">
                    {proClassesContent.sourceTitle || 'Patch notes'}
                  </a>
                </>
              )}
            </p>
          )}
        </header>

        <section className="pro-classes-grid" aria-label={copy.title}>
          {proClasses.map((card, index) => (
            <article className="pro-class-card" key={index}>
              <div className="pro-class-card-rank">{String(index + 1).padStart(2, '0')}</div>
              <div className="pro-class-card-pro">
                <div className="pro-class-card-avatar">
                  {card.photo ? (
                    <Image src={card.photo} alt={card.name || `Pro ${index + 1}`} width={140} height={140} sizes="140px" />
                  ) : (
                    <span>PHOTO</span>
                  )}
                </div>
                <strong>{card.name || `Pro #${index + 1}`}</strong>
                <small>{card.team || '—'}</small>
              </div>
              <div className="pro-class-card-loadout">
                <ProClassWeaponSlot weapon={card.weapon1} index={1} />
                <ProClassWeaponSlot weapon={card.weapon2} index={2} />
                <div className="pro-class-card-slot">
                  <span>{card.utility1 || 'UTILITAIRE 1'}</span>
                </div>
                <div className="pro-class-card-slot">
                  <span>{card.utility2 || 'UTILITAIRE 2'}</span>
                </div>
                <div className="pro-class-card-slot">
                  <span>{card.perk1 || 'PERK 1'}</span>
                </div>
                <div className="pro-class-card-slot">
                  <span>{card.perk2 || 'PERK 2'}</span>
                </div>
                <div className="pro-class-card-slot">
                  <span>{card.perk3 || 'PERK 3'}</span>
                </div>
              </div>
            </article>
          ))}
        </section>
      </main>

      <style>{`
        .pro-classes-grid {
          display: flex;
          flex-direction: column;
          gap: 3rem;
        }

        .pro-class-card {
          background: var(--theme-panel, rgba(239, 238, 232, 0.82));
          border: 1px solid var(--tm-line);
          padding: 2rem;
          display: grid;
          grid-template-columns: 60px 180px 1fr;
          gap: 2rem;
          align-items: start;
          transition: background 0.2s ease;
        }

        .pro-class-card:hover {
          background: var(--theme-panel-strong, rgba(239, 238, 232, 0.92));
        }

        .pro-class-card-rank {
          font-family: var(--font-mono, monospace);
          font-size: 1.5rem;
          font-weight: 900;
          letter-spacing: 0.06em;
          color: var(--tm-blue, #163cff);
        }

        .pro-class-card-pro {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .pro-class-card-avatar {
          width: 140px;
          height: 140px;
          border: 2px solid var(--tm-blue, #163cff);
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(16, 16, 14, 0.05);
          overflow: hidden;
        }

        .pro-class-card-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .pro-class-card-avatar span {
          font-family: var(--font-mono, monospace);
          font-size: 0.5rem;
          letter-spacing: 0.2em;
          color: var(--tm-muted);
          text-transform: uppercase;
        }

        .pro-class-card-pro strong {
          font-family: var(--font-mono, monospace);
          font-size: 0.85rem;
          font-weight: 900;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--tm-ink);
          text-align: center;
        }

        .pro-class-card-pro small {
          font-family: var(--font-mono, monospace);
          font-size: 0.6rem;
          color: var(--tm-muted);
          text-align: center;
        }

        .pro-class-card-loadout {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.5rem;
          align-content: start;
        }

        .pro-class-card-slot {
          border: 1px dashed var(--tm-line);
          padding: 1rem 0.5rem;
          min-height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(16, 16, 14, 0.03);
        }

        .pro-class-card-slot:nth-child(1),
        .pro-class-card-slot:nth-child(2) {
          min-height: 160px;
        }

        .pro-class-card-weapon {
          position: relative;
          flex-direction: column;
          gap: 0.35rem;
          padding: 0.75rem 0.5rem;
          cursor: pointer;
          transition: border-color 0.15s ease;
        }

        .pro-class-card-weapon:hover {
          border-color: var(--tm-blue);
        }

        .pro-class-card-toggle {
          font-size: 0.5rem;
          color: var(--tm-blue);
          position: absolute;
          top: 0.35rem;
          right: 0.45rem;
        }

        .pro-class-card-weapon.is-open {
          border-color: var(--tm-blue);
          border-style: solid;
          min-height: auto;
          padding-bottom: 0.5rem;
        }

        .pro-class-card-weapon-name {
          font-family: var(--font-mono, monospace);
          font-size: 0.6rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          color: var(--tm-ink);
          text-transform: uppercase;
          text-align: center;
          line-height: 1.2;
        }

        .pro-class-card-attachments {
          width: 100%;
          padding: 0.5rem;
          background: rgba(16, 16, 14, 0.06);
          border: 1px solid var(--tm-line);
        }

        .pro-class-card-attachments span {
          font-family: var(--font-mono, monospace);
          font-size: 0.52rem;
          line-height: 1.6;
          color: var(--tm-muted);
          letter-spacing: 0.04em;
          text-transform: none;
          word-break: break-word;
        }

        .pro-class-card-slot img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .pro-class-card-slot span {
          font-family: var(--font-mono, monospace);
          font-size: 0.5rem;
          letter-spacing: 0.14em;
          color: var(--tm-muted);
          text-transform: uppercase;
          text-align: center;
        }

        @media (max-width: 900px) {
          .pro-class-card {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
          .pro-class-card-pro {
            flex-direction: row;
            gap: 1rem;
          }
          .pro-class-card-pro strong,
          .pro-class-card-pro small {
            text-align: left;
          }
          .pro-class-card-loadout {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
    </>
  );
}
