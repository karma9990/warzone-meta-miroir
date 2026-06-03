import LocalizedSafariBar from '@/components/LocalizedSafariBar';
import { getRequestLocale } from '@/lib/requestLocale';
import { getSiteControls } from '@/lib/siteControls';

export const metadata = {
  title: 'Set-up - WZPRO Meta',
  description: 'Gaming setup tiers for Warzone players: PC, console, monitor, network, and settings targets.',
};

const affiliateBacklog = [
  'ExitLag',
  'Razer',
  'Logitech G',
  'SteelSeries',
  'KontrolFreek',
  'Secretlab',
  'Herman Miller Gaming',
  'Green Man Gaming',
  'Fanatical',
  'CDKeys',
];

void affiliateBacklog;

export default async function SetUpPage() {
  const [locale, { setup }] = await Promise.all([getRequestLocale(), getSiteControls()]);
  const copy = {
    kicker: locale === 'es' ? 'SETUP DE OPERADOR' : locale === 'fr' ? 'SETUP OPERATEUR' : 'OPERATOR SETUP',
    title: locale === 'es' ? 'AJUSTES' : locale === 'fr' ? 'REGLAGES' : 'SET-UP',
    lead: locale === 'es'
      ? 'Configuraciones gaming para que Warzone funcione bien: FPS estables, audio claro, bajo input lag y red limpia antes de comprar accesorios caros.'
      : locale === 'fr'
        ? 'Configurations gaming pour faire tourner Warzone correctement: FPS stables, audio lisible, faible input lag et reseau propre avant les accessoires chers.'
        : 'Gaming setups that make Warzone run well: stable FPS, readable audio, low input lag, and a clean network before chasing expensive accessories.',
    baseline: locale === 'es' ? 'BASE PRIMERO' : locale === 'fr' ? 'BASE D ABORD' : 'BASELINE FIRST',
    before: locale === 'es' ? 'Antes de comprar nada' : locale === 'fr' ? 'Avant d acheter quoi que ce soit' : 'Before buying anything',
  };

  return (
    <>
      <div className="pt-technical-backdrop" aria-hidden="true" />

      <LocalizedSafariBar
        active="set-up"
        searchPlaceholder={locale === 'es' ? 'Equipo, software, ajustes' : locale === 'fr' ? 'Materiel, logiciel, reglages' : 'Gear, software, setup'}
        readout={['SETUP // WARZONE', 'GEAR: CURATED', 'OPTI: PRACTICAL']}
      />

      <main className="setup-main">
        <header className="setup-hero">
          <div className="pt-header-tag">{copy.kicker}</div>
          <h1>{copy.title}</h1>
          <p>
            {copy.lead}
          </p>
        </header>

        <section className="setup-checklist" aria-label="Setup baseline">
          <div>
            <span>{copy.baseline}</span>
            <h2>{copy.before}</h2>
          </div>
          <ul>
            {setup.checklist.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>

        <section className="setup-grid" aria-label="Warzone gaming setup tiers">
          {setup.builds.map((build) => (
            <article className="setup-card" key={build.id}>
              <span>{build.label}</span>
              <h2>{build.title}</h2>
              <p>{build.note}</p>
              <div className="setup-spec-list">
                {build.specs.map((spec) => (
                  <a
                    className="setup-spec-row"
                    href={spec.amazonUrl}
                    key={`${build.id}-${spec.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <strong>{spec.name}</strong>
                    <small>{spec.value}</small>
                  </a>
                ))}
              </div>
            </article>
          ))}
        </section>
      </main>
    </>
  );
}
