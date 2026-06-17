import LocalizedSafariBar from '@/components/LocalizedSafariBar';
import { getRequestLocale } from '@/lib/requestLocale';
import { getSiteControls, type SetupBuild } from '@/lib/siteControls';

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

const frChecklist: Record<string, string> = {
  'Ethernet cable before any software tweak.': 'Cable Ethernet avant tout reglage logiciel.',
  'Stable FPS cap before chasing average FPS.': 'FPS stable plafonne avant de courir apres la moyenne.',
  'Headset EQ that keeps footsteps clear, not bass-heavy.': 'EQ casque qui garde les pas clairs, pas de basses lourdes.',
  'Controller dead zones checked every few weeks.': 'Zones mortes manette verifiees toutes les 2-3 semaines.',
  'One sensitivity profile kept long enough to build muscle memory.': 'Un seul profil de sensibilite garde assez longtemps pour la memoire musculaire.',
  'Router QoS enabled only if it actually improves packet loss.': 'QoS routeur active seulement si ca reduit vraiment la perte de paquets.',
};

const esChecklist: Record<string, string> = {
  'Ethernet cable before any software tweak.': 'Cable Ethernet antes de cualquier ajuste de software.',
  'Stable FPS cap before chasing average FPS.': 'Limite de FPS estable antes de perseguir FPS medios.',
  'Headset EQ that keeps footsteps clear, not bass-heavy.': 'EQ de auriculares que mantiene pasos claros, no graves pesados.',
  'Controller dead zones checked every few weeks.': 'Zonas muertas del mando revisadas cada pocas semanas.',
  'One sensitivity profile kept long enough to build muscle memory.': 'Un solo perfil de sensibilidad mantenido suficiente tiempo para crear memoria muscular.',
  'Router QoS enabled only if it actually improves packet loss.': 'QoS del router activado solo si mejora realmente la perdida de paquetes.',
};

const frBuildLabels: Record<string, string> = {
  'Starter 1080p': 'Demarrage 1080p',
  'Ranked 1440p': 'Classe 1440p',
  'Pro 240 Hz': 'Pro 240 Hz',
  'Console': 'Console',
};

const esBuildLabels: Record<string, string> = {
  'Starter 1080p': 'Inicio 1080p',
  'Ranked 1440p': 'Ranked 1440p',
  'Pro 240 Hz': 'Pro 240 Hz',
  'Console': 'Consola',
};

const frBuildTitles: Record<string, string> = {
  'Clean 120 FPS target': 'Objectif 120 FPS propre',
  'Competitive 165 FPS target': 'Objectif 165 FPS competitif',
  'High FPS sweat setup': 'Setup haute performance',
  'PS5 / Xbox Series setup': 'Setup PS5 / Xbox Series',
};

const esBuildTitles: Record<string, string> = {
  'Clean 120 FPS target': 'Objetivo 120 FPS limpio',
  'Competitive 165 FPS target': 'Objetivo 165 FPS competitivo',
  'High FPS sweat setup': 'Setup de alto rendimiento',
  'PS5 / Xbox Series setup': 'Setup PS5 / Xbox Series',
};

const frBuildNotes: Record<string, string> = {
  'For players who want Warzone smooth without building an expensive station. Aim for low/competitive settings and stable 1% lows.': 'Pour les joueurs qui veulent Warzone fluide sans construire une station couteuse. Visez des reglages bas/competitifs et des 1% lows stables.',
  'The best balance for serious ranked: sharper image than 1080p, high refresh, and enough CPU headroom for busy endgames.': 'Le meilleur equilibre pour le ranked: image plus nette que 1080p, haut rafraichissement, et assez de marge CPU pour les fins de partie chargees.',
  'For players chasing the most responsive feel: consistent frame pacing, low latency, and no stutter.': 'Pour les joueurs qui cherchent la sensation la plus reactive: rythme d images constant, faible latence, et aucun stutter.',
  'A console setup can be very strong if the display and network are right. Focus on 120 Hz support, clean input, and stable connection.': 'Un setup console peut etre tres performant si l ecran et le reseau sont bons. Visez le 120 Hz, une entree propre et une connexion stable.',
};

const esBuildNotes: Record<string, string> = {
  'For players who want Warzone smooth without building an expensive station. Aim for low/competitive settings and stable 1% lows.': 'Para jugadores que quieren Warzone fluido sin montar una estacion cara. Apunta a ajustes bajos/competitivos y 1% lows estables.',
  'The best balance for serious ranked: sharper image than 1080p, high refresh, and enough CPU headroom for busy endgames.': 'El mejor equilibrio para ranked serio: imagen mas nitida que 1080p, alta tasa de refresco y margen de CPU para finales cargados.',
  'For players chasing the most responsive feel: consistent frame pacing, low latency, and no stutter.': 'Para jugadores que buscan la sensacion mas reactiva: frame pacing constante, baja latencia y cero tirones.',
  'A console setup can be very strong if the display and network are right. Focus on 120 Hz support, clean input, and stable connection.': 'Un setup de consola puede ser muy fuerte si la pantalla y la red estan bien. Prioriza 120 Hz, input limpio y conexion estable.',
};

const frSpecNames: Record<string, string> = {
  'CPU': 'CPU',
  'GPU': 'GPU',
  'RAM': 'RAM',
  'Monitor': 'Ecran',
  'Storage': 'Stockage',
  'Network': 'Reseau',
  'Audio': 'Audio',
  'Input': 'Peripherique',
  'Cooling': 'Refroidissement',
  'Settings': 'Reglages',
  'Console': 'Console',
  'Display': 'Ecran',
  'Cable': 'Cable',
  'Controller': 'Manette',
};

const esSpecNames: Record<string, string> = {
  'CPU': 'CPU',
  'GPU': 'GPU',
  'RAM': 'RAM',
  'Monitor': 'Monitor',
  'Storage': 'Almacenamiento',
  'Network': 'Red',
  'Audio': 'Audio',
  'Input': 'Input',
  'Cooling': 'Refrigeracion',
  'Settings': 'Ajustes',
  'Console': 'Consola',
  'Display': 'Pantalla',
  'Cable': 'Cable',
  'Controller': 'Mando',
};

const frSpecValues: Record<string, string> = {
  'Ryzen 5 5600 / i5-12400F class': 'Ryzen 5 5600 / i5-12400F',
  'RTX 3060 / RX 6600 XT class': 'RTX 3060 / RX 6600 XT',
  '16 GB DDR4, dual channel minimum': '16 Go DDR4, dual channel minimum',
  '1080p 144 Hz': '1080p 144 Hz',
  'NVMe SSD with room for COD updates': 'SSD NVMe avec de la place pour les maj COD',
  'Ethernet, no Wi-Fi if possible': 'Ethernet, pas de Wi-Fi si possible',
  'Ryzen 5 7600 / i5-13600K class': 'Ryzen 5 7600 / i5-13600K',
  'RTX 4070 / RX 7800 XT class': 'RTX 4070 / RX 7800 XT',
  '32 GB DDR5 preferred': '32 Go DDR5 recommande',
  '1440p 165-180 Hz': '1440p 165-180 Hz',
  'Closed-back headset or IEMs with clear mids/highs': 'Casque ferme ou IEMs avec mediums/aigus clairs',
  'Controller with low deadzone or light FPS mouse': 'Manette avec zone morte basse ou souris FPS legere',
  'Ryzen 7 7800X3D / newer X3D class': 'Ryzen 7 7800X3D / X3D recent',
  'RTX 4080 Super / RX 7900 XTX class': 'RTX 4080 Super / RX 7900 XTX',
  '32 GB DDR5 tuned, dual channel': '32 Go DDR5 optimisee, dual channel',
  '1080p or 1440p 240 Hz': '1080p ou 1440p 240 Hz',
  'Strong airflow, stable boost clocks': 'Bon airflow, frequences boost stables',
  'Competitive low, VRAM budget controlled': 'Reglages bas competitifs, VRAM controlee',
  'PS5 / Xbox Series X preferred': 'PS5 / Xbox Series X de preference',
  '1080p or 1440p 120 Hz with low input lag': '1080p ou 1440p 120 Hz avec faible input lag',
  'HDMI 2.1 for compatible displays': 'HDMI 2.1 pour ecrans compatibles',
  'Fresh sticks, checked dead zones': 'Sticks frais, zones mortes verifiees',
  'Stereo headset, avoid muddy bass EQ': 'Casque stereo, eviter les basses boueuses',
  'Ethernet to router': 'Ethernet vers le routeur',
};

const esSpecValues: Record<string, string> = {
  'Ryzen 5 5600 / i5-12400F class': 'Ryzen 5 5600 / i5-12400F',
  'RTX 3060 / RX 6600 XT class': 'RTX 3060 / RX 6600 XT',
  '16 GB DDR4, dual channel minimum': '16 GB DDR4, dual channel minimo',
  '1080p 144 Hz': '1080p 144 Hz',
  'NVMe SSD with room for COD updates': 'SSD NVMe con espacio para actualizaciones COD',
  'Ethernet, no Wi-Fi if possible': 'Ethernet, sin Wi-Fi si es posible',
  'Ryzen 5 7600 / i5-13600K class': 'Ryzen 5 7600 / i5-13600K',
  'RTX 4070 / RX 7800 XT class': 'RTX 4070 / RX 7800 XT',
  '32 GB DDR5 preferred': '32 GB DDR5 recomendado',
  '1440p 165-180 Hz': '1440p 165-180 Hz',
  'Closed-back headset or IEMs with clear mids/highs': 'Auriculares cerrados o IEMs con medios/agudos claros',
  'Controller with low deadzone or light FPS mouse': 'Mando con baja zona muerta o raton FPS ligero',
  'Ryzen 7 7800X3D / newer X3D class': 'Ryzen 7 7800X3D / X3D reciente',
  'RTX 4080 Super / RX 7900 XTX class': 'RTX 4080 Super / RX 7900 XTX',
  '32 GB DDR5 tuned, dual channel': '32 GB DDR5 optimizada, dual channel',
  '1080p or 1440p 240 Hz': '1080p o 1440p 240 Hz',
  'Strong airflow, stable boost clocks': 'Buen airflow, frecuencias boost estables',
  'Competitive low, VRAM budget controlled': 'Ajustes bajos competitivos, VRAM controlada',
  'PS5 / Xbox Series X preferred': 'PS5 / Xbox Series X de preferencia',
  '1080p or 1440p 120 Hz with low input lag': '1080p o 1440p 120 Hz con bajo input lag',
  'HDMI 2.1 for compatible displays': 'HDMI 2.1 para pantallas compatibles',
  'Fresh sticks, checked dead zones': 'Sticks en buen estado, zonas muertas revisadas',
  'Stereo headset, avoid muddy bass EQ': 'Auriculares estereo, evita graves confusos',
  'Ethernet to router': 'Ethernet al router',
};

function t(text: string, map: Record<string, string>): string {
  return map[text] ?? text;
}

function translateBuild(build: SetupBuild, locale: 'en' | 'fr' | 'es'): SetupBuild {
  if (locale === 'en') return build;
  const labelMap = locale === 'fr' ? frBuildLabels : esBuildLabels;
  const titleMap = locale === 'fr' ? frBuildTitles : esBuildTitles;
  const noteMap = locale === 'fr' ? frBuildNotes : esBuildNotes;
  const nameMap = locale === 'fr' ? frSpecNames : esSpecNames;
  const valueMap = locale === 'fr' ? frSpecValues : esSpecValues;

  return {
    ...build,
    label: t(build.label, labelMap),
    title: t(build.title, titleMap),
    note: t(build.note, noteMap),
    specs: build.specs.map((spec) => ({
      ...spec,
      name: t(spec.name, nameMap),
      value: t(spec.value, valueMap),
    })),
  };
}

export default async function SetUpPage() {
  const [locale, { setup }] = await Promise.all([getRequestLocale(), getSiteControls()]);
  const isFr = locale === 'fr';
  const isEs = locale === 'es';

  const translationLocale = isFr ? 'fr' : isEs ? 'es' : 'en';
  const checklistMap = isFr ? frChecklist : isEs ? esChecklist : null;
  const builds = setup.builds.map((b) => translateBuild(b, translationLocale));

  const copy = {
    kicker: isEs ? 'SETUP DE OPERADOR' : isFr ? 'SETUP OPERATEUR' : 'OPERATOR SETUP',
    title: 'SET-UP',
    lead: isEs
      ? 'Configuraciones gaming para que Warzone funcione bien: FPS estables, audio claro, bajo input lag y red limpia antes de comprar accesorios caros.'
      : isFr
        ? 'Configurations gaming pour faire tourner Warzone correctement: FPS stables, audio lisible, faible input lag et reseau propre avant les accessoires chers.'
        : 'Gaming setups that make Warzone run well: stable FPS, readable audio, low input lag, and a clean network before chasing expensive accessories.',
    baseline: isEs ? 'BASE PRIMERO' : isFr ? 'BASE D ABORD' : 'BASELINE FIRST',
    before: isEs ? 'Antes de comprar nada' : isFr ? 'Avant d acheter quoi que ce soit' : 'Before buying anything',
  };

  const readout = isFr
    ? ['SETUP // WARZONE', 'MATERIEL: VERIFIE', 'OPTI: PRATIQUE']
    : isEs
      ? ['SETUP // WARZONE', 'EQUIPO: CURADO', 'OPTI: PRACTICO']
      : ['SETUP // WARZONE', 'GEAR: CURATED', 'OPTI: PRACTICAL'];

  return (
    <>
      <div className="pt-technical-backdrop" aria-hidden="true" />

      <LocalizedSafariBar
        active="set-up"
        searchPlaceholder={isEs ? 'Equipo, software, ajustes' : isFr ? 'Materiel, logiciel, setup' : 'Gear, software, setup'}
        readout={readout}
      />

      <main className="setup-main">
        <header className="setup-hero">
          <div className="pt-header-tag">{copy.kicker}</div>
          <h1>{copy.title}</h1>
          <p>
            {copy.lead}
          </p>
        </header>

        <section className="setup-checklist" aria-label={isEs ? 'Base del setup' : isFr ? 'Base de setup' : 'Setup baseline'}>
          <div>
            <span>{copy.baseline}</span>
            <h2>{copy.before}</h2>
          </div>
          <ul>
            {setup.checklist.map((item) => (
              <li key={item}>{checklistMap ? t(item, checklistMap) : item}</li>
            ))}
          </ul>
        </section>

        <section className="setup-grid" aria-label={isEs ? 'Niveles de setup gaming Warzone' : isFr ? 'Niveaux de setup gaming Warzone' : 'Warzone gaming setup tiers'}>
          {builds.map((build) => (
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
