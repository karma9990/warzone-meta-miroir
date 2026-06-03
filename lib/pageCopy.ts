import type { Locale } from '@/lib/i18n';

type ModuleCopy = {
  label: string;
  tag: string;
  result: string;
  preview: string;
  lead: string;
};

type ProToolsPageCopy = {
  nav: {
    proTools: string;
    loadouts: string;
    setUp: string;
    esport: string;
    community: string;
    search: string;
    searchPlaceholder: string;
  };
  heroKicker: string;
  heroTitle: string;
  heroLead: string;
  viewTools: string;
  goPro: string;
  modules: string;
  tools: string;
  from: string;
  proof: Array<{ label: string; value: string; body: string }>;
  accessAria: string;
  free: string;
  pro: string;
  freeTitle: string;
  freeBody: string;
  proTitle: string;
  proBody: string;
  compareAccess: string;
  result: string;
  freePreview: string;
  openPreview: string;
  spawnProtocols: string;
  clearance: string;
  accessTiers: string;
  plans: {
    freeTier: string;
    always: string;
    freeDesc: string;
    freeItems: string[];
    subscribe: string;
    priority: string;
    proTier: string;
    month: string;
    proDesc: string;
    proItems: string[];
    getPro: string;
    modularTier: string;
    tool: string;
    modularDesc: string;
    browse: string;
  };
  rail: {
    ariaJump: string;
    ariaToc: string;
    index: string;
    access: string;
    plans: string;
    catalog: string;
  };
  modulesCopy: Record<string, ModuleCopy>;
};

const englishProTools: ProToolsPageCopy = {
  nav: {
    proTools: 'Pro Tools',
    loadouts: 'Loadouts',
    setUp: 'Set-up',
    esport: 'Esport',
    community: 'Community',
    search: 'Search',
    searchPlaceholder: 'Weapon or loadout',
  },
  heroKicker: 'Operator intelligence // blue protocol',
  heroTitle: 'Pro Tools',
  heroLead: 'Short, actionable tools to tune your aim, read the meta, move better and prepare Warzone sessions.',
  viewTools: 'View tools',
  goPro: 'Go Pro',
  modules: 'Modules',
  tools: 'Tools',
  from: 'From',
  proof: [
    { label: 'Fast decision', value: '6 modules', body: 'Aim, meta, movement, spawns, mindset and optimization in one focused path.' },
    { label: 'Free preview', value: 'visible', body: 'Every tool shows the problem, expected result and a useful preview before purchase.' },
    { label: 'Patch ready', value: 'patch-ready', body: 'The structure is built to update advice after meta changes.' },
  ],
  accessAria: 'Free and Pro comparison',
  free: 'Free',
  pro: 'Pro',
  freeTitle: 'Preview and follow',
  freeBody: 'Meta board, public loadouts, weekly digest and every Pro Tool preview before purchase.',
  proTitle: 'Train and decide',
  proBody: 'Full tools, deeper breakdowns, early updates and a cleaner path from patch notes to in-game action.',
  compareAccess: 'Compare access',
  result: 'Result',
  freePreview: 'Free preview',
  openPreview: 'Open preview',
  spawnProtocols: 'Spawn protocols',
  clearance: 'Clearance level',
  accessTiers: 'Access tiers',
  plans: {
    freeTier: 'Tier 00 - Free',
    always: ' / always',
    freeDesc: 'Stay informed. Never miss a meta shift or a patch that changes the game.',
    freeItems: ['Weekly meta newsletter', 'Patch notes digest', 'Resurgence map updates', 'New weapon tier alerts', 'Community tips & tricks'],
    subscribe: 'Subscribe free',
    priority: 'Priority',
    proTier: 'Tier 01 - Pro',
    month: ' / month',
    proDesc: 'Get every Pro Tool before the rest of the lobby. Early access, full intelligence.',
    proItems: ['Everything in Free', 'All 6 Pro Tools - early access', 'Free preview before buying', 'New tools before public release', 'Meta trend analysis', 'Priority spawn & rotation guides', 'Exclusive loadout breakdowns', 'Direct feedback channel'],
    getPro: 'Get Pro access',
    modularTier: 'Tier 02 - Modular',
    tool: ' / tool',
    modularDesc: 'Pick only the tools you need. Pay once, access forever.',
    browse: 'Browse tools',
  },
  rail: {
    ariaJump: 'Jump to module',
    ariaToc: 'Table of contents',
    index: 'Fld index',
    access: 'ACCESS',
    plans: 'PLANS',
    catalog: 'Open tool catalog',
  },
  modulesCopy: {
    'aim-tools': {
      label: 'Aim Tools',
      tag: 'Precision',
      result: 'Stabilize your sensitivity, ADS multiplier and micro-corrections.',
      preview: '10-minute routine, low dead zones and crosshair placement.',
      lead: 'Aim is the most direct expression of skill in Warzone. Without consistent aiming, every other advantage collapses under pressure.',
    },
    'next-meta': {
      label: 'Next Meta',
      tag: 'Intel',
      result: 'Understand which weapons and perks are rising before the lobby copies them.',
      preview: 'Mobile SMGs, sniper-support ARs and equipment shifts.',
      lead: 'Pro players and content creators consistently pick up on meta shifts 1-2 patches ahead of the general player base.',
    },
    'pro-movement': {
      label: 'Pro Movement',
      tag: 'Mechanics',
      result: 'Win fights by controlling space, timing and angles.',
      preview: 'Slide cancel, corner peeks, high ground and clean rotations.',
      lead: 'Movement is the difference between being a target and being a threat. In Warzone, a player who controls space controls every engagement.',
    },
    'how-to-be-a-pro': {
      label: 'How To Be A Pro',
      tag: 'Mindset',
      result: 'Turn sessions into measurable practice instead of blind grinding.',
      preview: 'Session goals, VOD review and mental reset.',
      lead: 'Being a pro is a system: consistent habits, quality time, the right people, and relentless solo improvement.',
    },
    'pro-spawn': {
      label: 'Pro Spawn',
      tag: 'Map Control',
      result: 'Choose spawns that give information, elevation and cleaner rotations.',
      preview: 'HQ roof, Bio Labs, Riverboat and Train Station.',
      lead: 'Knowing where enemies spawn is information. Controlling spawns controls the flow of the match.',
    },
    'pro-opti': {
      label: 'Pro Opti',
      tag: 'Performance',
      result: 'Reduce input lag, stutter, packet loss and muddy audio.',
      preview: 'Stable FPS, Boost High audio, ethernet and Windows settings.',
      lead: 'Your hardware and software environment are the ceiling of your performance.',
    },
  },
};

const overrides: Partial<Record<Locale, Partial<ProToolsPageCopy>>> = {
  fr: {
    nav: { proTools: 'Outils Pro', loadouts: 'Classes', setUp: 'Reglages', esport: 'Esport', community: 'Communaute', search: 'Recherche', searchPlaceholder: 'Arme ou classe' },
    heroKicker: 'Renseignement operateur // protocole bleu',
    heroTitle: 'Outils Pro',
    heroLead: 'Des outils courts et actionnables pour regler ton aim, lire la meta, mieux bouger et preparer tes sessions Warzone.',
    viewTools: 'Voir les outils',
    goPro: 'Passer Pro',
    modules: 'Modules',
    tools: 'Outils',
    from: 'Des',
    result: 'Resultat',
    freePreview: 'Apercu gratuit',
    openPreview: 'Ouvrir l apercu',
    compareAccess: 'Comparer les acces',
    accessTiers: 'Niveaux d acces',
  },
  es: {
    nav: { proTools: 'Herramientas Pro', loadouts: 'Clases', setUp: 'Ajustes', esport: 'Esport', community: 'Comunidad', search: 'Buscar', searchPlaceholder: 'Arma o clase' },
    heroKicker: 'Inteligencia de operador // protocolo azul',
    heroTitle: 'Herramientas Pro',
    heroLead: 'Herramientas cortas y practicas para ajustar tu aim, leer la meta, moverte mejor y preparar tus partidas de Warzone.',
    viewTools: 'Ver herramientas',
    goPro: 'Pasar a Pro',
    modules: 'Modulos',
    tools: 'Herramientas',
    from: 'Desde',
    proof: [
      { label: 'Decision rapida', value: '6 modulos', body: 'Aim, meta, movimiento, spawns, mentalidad y optimizacion en una ruta enfocada.' },
      { label: 'Vista previa gratis', value: 'visible', body: 'Cada herramienta muestra el problema, el resultado esperado y una vista util antes de comprar.' },
      { label: 'Lista para parches', value: 'patch-ready', body: 'La estructura permite actualizar consejos despues de cambios de meta.' },
    ],
    accessAria: 'Comparacion Gratis y Pro',
    free: 'Gratis',
    pro: 'Pro',
    freeTitle: 'Previsualizar y seguir',
    freeBody: 'Panel meta, clases publicas, resumen semanal y vista previa de cada Herramienta Pro antes de comprar.',
    proTitle: 'Entrenar y decidir',
    proBody: 'Herramientas completas, analisis profundos, actualizaciones tempranas y una ruta clara del parche a la partida.',
    compareAccess: 'Comparar acceso',
    result: 'Resultado',
    freePreview: 'Vista previa gratis',
    openPreview: 'Abrir vista previa',
    spawnProtocols: 'Protocolos de spawn',
    clearance: 'Nivel de acceso',
    accessTiers: 'Niveles de acceso',
    plans: {
      freeTier: 'Tier 00 - Gratis',
      always: ' / siempre',
      freeDesc: 'Mantente informado. No pierdas ningun cambio de meta o parche importante.',
      freeItems: ['Newsletter meta semanal', 'Resumen de parches', 'Actualizaciones de mapas Resurgence', 'Alertas de nuevas armas top', 'Consejos de la comunidad'],
      subscribe: 'Suscribirse gratis',
      priority: 'Prioridad',
      proTier: 'Tier 01 - Pro',
      month: ' / mes',
      proDesc: 'Accede a todas las Herramientas Pro antes que el resto del lobby. Acceso temprano e inteligencia completa.',
      proItems: ['Todo lo de Gratis', 'Las 6 Herramientas Pro - acceso temprano', 'Vista previa gratis antes de comprar', 'Nuevas herramientas antes del publico', 'Analisis de tendencias meta', 'Guias prioritarias de spawn y rotacion', 'Desgloses exclusivos de clases', 'Canal directo de feedback'],
      getPro: 'Obtener acceso Pro',
      modularTier: 'Tier 02 - Modular',
      tool: ' / herramienta',
      modularDesc: 'Elige solo las herramientas que necesitas. Paga una vez y accede para siempre.',
      browse: 'Ver herramientas',
    },
    rail: { ariaJump: 'Saltar al modulo', ariaToc: 'Tabla de contenidos', index: 'Indice', access: 'ACCESO', plans: 'PLANES', catalog: 'Abrir catalogo' },
    modulesCopy: {
      'aim-tools': { label: 'Herramientas de Aim', tag: 'Precision', result: 'Estabiliza tu sensibilidad, multiplicador ADS y micro-correcciones.', preview: 'Rutina de 10 minutos, dead zones bajas y posicion del crosshair.', lead: 'El aim es la expresion mas directa de habilidad en Warzone. Sin punteria consistente, todo lo demas se cae bajo presion.' },
      'next-meta': { label: 'Proxima Meta', tag: 'Intel', result: 'Entiende que armas y perks estan subiendo antes de que el lobby las copie.', preview: 'SMGs moviles, ARs de soporte sniper y cambios de equipamiento.', lead: 'Los pros y creadores detectan cambios de meta uno o dos parches antes que la mayoria.' },
      'pro-movement': { label: 'Movimiento Pro', tag: 'Mecanicas', result: 'Gana peleas controlando espacio, timing y angulos.', preview: 'Slide cancel, peeks, high ground y rotaciones limpias.', lead: 'El movimiento marca la diferencia entre ser objetivo y ser amenaza. Quien controla el espacio controla el combate.' },
      'how-to-be-a-pro': { label: 'Como Ser Pro', tag: 'Mentalidad', result: 'Convierte sesiones en practica medible en vez de grindear a ciegas.', preview: 'Objetivos de sesion, revision VOD y reset mental.', lead: 'Ser pro es un sistema: habitos consistentes, tiempo de calidad, buen entorno y mejora individual constante.' },
      'pro-spawn': { label: 'Spawn Pro', tag: 'Control de mapa', result: 'Elige spawns con informacion, altura y rotaciones mas limpias.', preview: 'HQ roof, Bio Labs, Riverboat y Train Station.', lead: 'Saber donde aparecen los enemigos es informacion. Controlar spawns controla el ritmo de la partida.' },
      'pro-opti': { label: 'Opti Pro', tag: 'Rendimiento', result: 'Reduce input lag, stutter, packet loss y audio confuso.', preview: 'FPS estables, Boost High audio, ethernet y ajustes Windows.', lead: 'Tu entorno de hardware y software marca el techo de tu rendimiento.' },
    },
  },
  de: { nav: { proTools: 'Pro Tools', loadouts: 'Loadouts', setUp: 'Setup', esport: 'Esport', community: 'Community', search: 'Suche', searchPlaceholder: 'Waffe oder Loadout' }, heroTitle: 'Pro Tools', viewTools: 'Tools ansehen', goPro: 'Pro werden', result: 'Ergebnis', freePreview: 'Kostenlose Vorschau', openPreview: 'Vorschau oeffnen', compareAccess: 'Zugang vergleichen' },
  it: { nav: { proTools: 'Strumenti Pro', loadouts: 'Loadout', setUp: 'Setup', esport: 'Esport', community: 'Community', search: 'Cerca', searchPlaceholder: 'Arma o loadout' }, heroTitle: 'Strumenti Pro', viewTools: 'Vedi strumenti', goPro: 'Passa a Pro', result: 'Risultato', freePreview: 'Anteprima gratuita', openPreview: 'Apri anteprima', compareAccess: 'Confronta accessi' },
  pt: { nav: { proTools: 'Ferramentas Pro', loadouts: 'Loadouts', setUp: 'Ajustes', esport: 'Esport', community: 'Comunidade', search: 'Buscar', searchPlaceholder: 'Arma ou loadout' }, heroTitle: 'Ferramentas Pro', viewTools: 'Ver ferramentas', goPro: 'Ir Pro', result: 'Resultado', freePreview: 'Previa gratis', openPreview: 'Abrir previa', compareAccess: 'Comparar acesso' },
  nl: { nav: { proTools: 'Pro Tools', loadouts: 'Loadouts', setUp: 'Setup', esport: 'Esport', community: 'Community', search: 'Zoeken', searchPlaceholder: 'Wapen of loadout' }, heroTitle: 'Pro Tools', viewTools: 'Tools bekijken', goPro: 'Ga Pro', result: 'Resultaat', freePreview: 'Gratis preview', openPreview: 'Preview openen', compareAccess: 'Toegang vergelijken' },
  pl: { nav: { proTools: 'Narzędzia Pro', loadouts: 'Loadouty', setUp: 'Ustawienia', esport: 'Esport', community: 'Społeczność', search: 'Szukaj', searchPlaceholder: 'Broń lub loadout' }, heroTitle: 'Narzędzia Pro', viewTools: 'Zobacz narzędzia', goPro: 'Przejdź Pro', result: 'Wynik', freePreview: 'Darmowy podgląd', openPreview: 'Otwórz podgląd', compareAccess: 'Porównaj dostęp' },
  ja: { nav: { proTools: 'プロツール', loadouts: 'ロードアウト', setUp: '設定', esport: 'Esport', community: 'コミュニティ', search: '検索', searchPlaceholder: '武器またはロードアウト' }, heroTitle: 'プロツール', viewTools: 'ツールを見る', goPro: 'Proへ', result: '結果', freePreview: '無料プレビュー', openPreview: 'プレビューを開く', compareAccess: 'アクセス比較' },
};

type GeneratedPack = {
  title: string;
  heroKicker: string;
  heroLead: string;
  viewTools: string;
  goPro: string;
  modules: string;
  tools: string;
  from: string;
  free: string;
  freeTitle: string;
  freeBody: string;
  proTitle: string;
  proBody: string;
  result: string;
  preview: string;
  openPreview: string;
  catalog: string;
  catalogLead: string;
  get: string;
  opening: string;
};

export const GENERATED_PAGE_PACKS: Partial<Record<Locale, GeneratedPack>> = {
  fr: { title: 'Outils Pro', heroKicker: 'Renseignement operateur // protocole bleu', heroLead: 'Des outils courts et actionnables pour regler ton aim, lire la meta, mieux bouger et preparer tes sessions Warzone.', viewTools: 'Voir les outils', goPro: 'Passer Pro', modules: 'Modules', tools: 'Outils', from: 'Des', free: 'Gratuit', freeTitle: 'Apercu et suivi', freeBody: 'Tableau meta, classes publiques, resume hebdo et apercu de chaque outil Pro avant achat.', proTitle: 'S entrainer et decider', proBody: 'Outils complets, analyses plus profondes, mises a jour rapides et chemin clair du patch a l action.', result: 'Resultat', preview: 'Apercu gratuit', openPreview: 'Ouvrir l apercu', catalog: 'ACHETER DES OUTILS INDIVIDUELS', catalogLead: 'Choisis seulement ce dont tu as besoin. Acces mensuel pour chaque outil selectionne.', get: 'OBTENIR', opening: 'OUVERTURE...' },
  de: { title: 'Pro Tools', heroKicker: 'Operator-Intel // blaues Protokoll', heroLead: 'Kurze, praktische Tools, um Aim, Meta-Lesen, Movement und Warzone-Sessions zu verbessern.', viewTools: 'Tools ansehen', goPro: 'Pro werden', modules: 'Module', tools: 'Tools', from: 'Ab', free: 'Kostenlos', freeTitle: 'Vorschau und folgen', freeBody: 'Meta-Board, oeffentliche Loadouts, Wochenuebersicht und jede Pro-Tool-Vorschau vor dem Kauf.', proTitle: 'Trainieren und entscheiden', proBody: 'Vollstaendige Tools, tiefere Analysen, fruehe Updates und ein klarer Weg vom Patch zur Aktion im Spiel.', result: 'Ergebnis', preview: 'Kostenlose Vorschau', openPreview: 'Vorschau oeffnen', catalog: 'EINZELNE TOOLS KAUFEN', catalogLead: 'Waehle nur, was du brauchst. Monatlicher Zugriff pro ausgewaehltem Tool.', get: 'HOLEN', opening: 'OEFFNET...' },
  it: { title: 'Strumenti Pro', heroKicker: 'Intelligence operatore // protocollo blu', heroLead: 'Strumenti brevi e pratici per regolare aim, leggere la meta, muoverti meglio e preparare le sessioni Warzone.', viewTools: 'Vedi strumenti', goPro: 'Passa a Pro', modules: 'Moduli', tools: 'Strumenti', from: 'Da', free: 'Gratis', freeTitle: 'Anteprima e tracking', freeBody: 'Meta board, loadout pubblici, digest settimanale e anteprima di ogni Pro Tool prima dell acquisto.', proTitle: 'Allenati e decidi', proBody: 'Strumenti completi, analisi profonde, update anticipati e percorso chiaro dalla patch al match.', result: 'Risultato', preview: 'Anteprima gratuita', openPreview: 'Apri anteprima', catalog: 'ACQUISTA STRUMENTI SINGOLI', catalogLead: 'Scegli solo cio che ti serve. Accesso mensile per ogni strumento selezionato.', get: 'OTTIENI', opening: 'APERTURA...' },
  pt: { title: 'Ferramentas Pro', heroKicker: 'Inteligencia de operador // protocolo azul', heroLead: 'Ferramentas curtas e praticas para ajustar aim, ler a meta, mover melhor e preparar sessoes Warzone.', viewTools: 'Ver ferramentas', goPro: 'Ir Pro', modules: 'Modulos', tools: 'Ferramentas', from: 'Desde', free: 'Gratis', freeTitle: 'Previa e acompanhamento', freeBody: 'Meta board, loadouts publicos, resumo semanal e previa de cada Pro Tool antes da compra.', proTitle: 'Treinar e decidir', proBody: 'Ferramentas completas, analises profundas, updates antecipados e caminho claro do patch para o jogo.', result: 'Resultado', preview: 'Previa gratis', openPreview: 'Abrir previa', catalog: 'COMPRAR FERRAMENTAS INDIVIDUAIS', catalogLead: 'Escolha apenas o que precisa. Acesso mensal para cada ferramenta selecionada.', get: 'OBTER', opening: 'ABRINDO...' },
  nl: { title: 'Pro Tools', heroKicker: 'Operator intel // blauw protocol', heroLead: 'Korte, praktische tools om aim, meta-inzicht, movement en Warzone-sessies te verbeteren.', viewTools: 'Tools bekijken', goPro: 'Ga Pro', modules: 'Modules', tools: 'Tools', from: 'Vanaf', free: 'Gratis', freeTitle: 'Preview en volgen', freeBody: 'Meta board, publieke loadouts, wekelijkse digest en elke Pro Tool-preview voor aankoop.', proTitle: 'Train en beslis', proBody: 'Volledige tools, diepere analyses, vroege updates en een helder pad van patch notes naar actie.', result: 'Resultaat', preview: 'Gratis preview', openPreview: 'Preview openen', catalog: 'LOSSE TOOLS KOPEN', catalogLead: 'Kies alleen wat je nodig hebt. Maandelijkse toegang per gekozen tool.', get: 'KRIJG', opening: 'OPENEN...' },
  pl: { title: 'Narzedzia Pro', heroKicker: 'Intel operatora // niebieski protokol', heroLead: 'Krotkie, praktyczne narzedzia do aimu, czytania mety, movementu i przygotowania sesji Warzone.', viewTools: 'Zobacz narzedzia', goPro: 'Przejdz Pro', modules: 'Moduly', tools: 'Narzedzia', from: 'Od', free: 'Darmowe', freeTitle: 'Podglad i sledzenie', freeBody: 'Meta board, publiczne loadouty, tygodniowy digest i podglad kazdego Pro Tool przed zakupem.', proTitle: 'Trenuj i decyduj', proBody: 'Pelne narzedzia, glebsze analizy, wczesniejsze aktualizacje i jasna droga od patcha do gry.', result: 'Wynik', preview: 'Darmowy podglad', openPreview: 'Otworz podglad', catalog: 'KUP POJEDYNCZE NARZEDZIA', catalogLead: 'Wybierz tylko to, czego potrzebujesz. Miesieczny dostep dla wybranego narzedzia.', get: 'KUP', opening: 'OTWIERANIE...' },
  ja: { title: 'Pro Tools', heroKicker: 'Operator intel // blue protocol', heroLead: 'Aim, meta, movement, Warzone session wo kaizen suru mijikai tool desu.', viewTools: 'Tool wo miru', goPro: 'Pro e', modules: 'Module', tools: 'Tool', from: 'From', free: 'Free', freeTitle: 'Preview to follow', freeBody: 'Meta board, public loadout, weekly digest, kounyuu mae no Pro Tool preview.', proTitle: 'Train and decide', proBody: 'Full tool, deeper analysis, early update, patch kara game action made no clear path.', result: 'Result', preview: 'Free preview', openPreview: 'Preview wo hiraku', catalog: 'KOJIN TOOL WO KOUNYUU', catalogLead: 'Hitsuyou na tool dake wo erabu. Tool goto ni monthly access.', get: 'GET', opening: 'OPENING...' },
};

function generatedCopy(locale: Locale): Partial<ProToolsPageCopy> {
  const pack = GENERATED_PAGE_PACKS[locale];
  if (!pack) return {};
  const modulesCopy = Object.fromEntries(
    Object.entries(englishProTools.modulesCopy).map(([id, module]) => [
      id,
      {
        ...module,
        result: pack.heroLead,
        preview: pack.catalogLead,
        lead: pack.heroLead,
      },
    ])
  ) as Record<string, ModuleCopy>;

  return {
    heroKicker: pack.heroKicker,
    heroTitle: pack.title,
    heroLead: pack.heroLead,
    viewTools: pack.viewTools,
    goPro: pack.goPro,
    modules: pack.modules,
    tools: pack.tools,
    from: pack.from,
    free: pack.free,
    freeTitle: pack.freeTitle,
    freeBody: pack.freeBody,
    proTitle: pack.proTitle,
    proBody: pack.proBody,
    result: pack.result,
    freePreview: pack.preview,
    openPreview: pack.openPreview,
    plans: {
      ...englishProTools.plans,
      freeTier: `Tier 00 - ${pack.free}`,
      freeDesc: pack.freeBody,
      subscribe: pack.free,
      proDesc: pack.proBody,
      getPro: pack.goPro,
      modularDesc: pack.catalogLead,
      browse: pack.viewTools,
    },
    modulesCopy,
  };
}

function mergeCopy(locale: Locale): ProToolsPageCopy {
  const localeOverride = overrides[locale];
  const generated = generatedCopy(locale);
  if (!localeOverride && !Object.keys(generated).length) return englishProTools;

  return {
    ...englishProTools,
    ...generated,
    ...localeOverride,
    nav: { ...englishProTools.nav, ...generated.nav, ...localeOverride?.nav },
    plans: { ...englishProTools.plans, ...generated.plans, ...localeOverride?.plans },
    rail: { ...englishProTools.rail, ...generated.rail, ...localeOverride?.rail },
    modulesCopy: { ...englishProTools.modulesCopy, ...generated.modulesCopy, ...localeOverride?.modulesCopy },
  };
}

export function getProToolsPageCopy(locale: Locale) {
  return mergeCopy(locale);
}
