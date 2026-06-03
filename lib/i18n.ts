import type { SiteContent } from '@/lib/siteContent';

export const ALL_LOCALES = ['en', 'fr', 'es', 'de', 'it', 'pt', 'nl', 'pl', 'ja'] as const;
export type Locale = typeof ALL_LOCALES[number];

export const SUPPORTED_LOCALES: Locale[] = ['en', 'fr', 'es'];

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'wzpro-locale';
export const LOCALE_HEADER = 'x-wzpro-locale';

export type LanguageOption = {
  locale: Locale;
  label: string;
  nativeLabel: string;
  description: string;
};

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    locale: 'en',
    label: 'English',
    nativeLabel: 'English',
    description: 'Warzone meta tools and loadouts in English.',
  },
  {
    locale: 'fr',
    label: 'French',
    nativeLabel: 'Francais',
    description: 'Outils meta Warzone, classes et guides en francais.',
  },
  {
    locale: 'es',
    label: 'Spanish',
    nativeLabel: 'Espanol',
    description: 'Herramientas meta, clases y guias de Warzone en espanol.',
  },
  {
    locale: 'de',
    label: 'German',
    nativeLabel: 'Deutsch',
    description: 'Warzone Meta-Tools, Loadouts und Guides auf Deutsch.',
  },
  {
    locale: 'it',
    label: 'Italian',
    nativeLabel: 'Italiano',
    description: 'Strumenti meta, loadout e guide Warzone in italiano.',
  },
  {
    locale: 'pt',
    label: 'Portuguese',
    nativeLabel: 'Português',
    description: 'Ferramentas meta, loadouts e guias de Warzone em português.',
  },
  {
    locale: 'nl',
    label: 'Dutch',
    nativeLabel: 'Nederlands',
    description: 'Warzone meta-tools, loadouts en gidsen in het Nederlands.',
  },
  {
    locale: 'pl',
    label: 'Polish',
    nativeLabel: 'Polski',
    description: 'Narzędzia meta, loadouty i poradniki Warzone po polsku.',
  },
  {
    locale: 'ja',
    label: 'Japanese',
    nativeLabel: '日本語',
    description: 'Warzoneのメタ、ロードアウト、攻略ガイドを日本語で表示します。',
  },
];

export function isLocale(value: string | undefined | null): value is Locale {
  return Boolean(value && SUPPORTED_LOCALES.includes(value as Locale));
}

export function normalizeLocale(value: string | undefined | null): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function stripLocale(pathname: string) {
  const [, maybeLocale, ...rest] = pathname.split('/');
  if (!isLocale(maybeLocale)) {
    return { locale: null, pathname };
  }

  const nextPathname = `/${rest.join('/')}`.replace(/\/$/, '') || '/';
  return { locale: maybeLocale, pathname: nextPathname };
}

export function withLocalePath(pathname: string, locale: Locale) {
  if (/^(https?:|mailto:|tel:|#)/.test(pathname)) return pathname;
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const { pathname: cleanPathname } = stripLocale(normalized);
  if (cleanPathname === '/') return `/${locale}`;
  return `/${locale}${cleanPathname}`;
}

const TERM_COPY: Partial<Record<Locale, Record<string, string>>> = {
  fr: {
    All: 'Tous',
    'Long-Range': 'Longue portee',
    'Close-Range': 'Courte portee',
    'Sniper Support': 'Support sniper',
    'One-shot Sniper': 'Sniper one-shot',
    'Mid-Range': 'Moyenne portee',
    Resurgence: 'Resurgence',
    Ranked: 'Classe',
    'Battle Royale': 'Battle Royale',
    Solo: 'Solo',
    'Assault Rifle': 'Fusil d assaut',
    SMG: 'SMG',
    LMG: 'LMG',
    Sniper: 'Sniper',
    Damage: 'Degats',
    Range: 'Portee',
    Mobility: 'Mobilite',
    Control: 'Controle',
    Scavenger: 'Pillard',
    Sprinter: 'Sprinter',
    Hunter: 'Chasseur',
  },
  es: {
    All: 'Todos',
    'Long-Range': 'Largo alcance',
    'Close-Range': 'Corta distancia',
    'Sniper Support': 'Apoyo sniper',
    'One-shot Sniper': 'Sniper one-shot',
    'Mid-Range': 'Medio alcance',
    Resurgence: 'Resurgence',
    Ranked: 'Ranked',
    'Battle Royale': 'Battle Royale',
    Solo: 'Solo',
    'Assault Rifle': 'Rifle de asalto',
    SMG: 'SMG',
    LMG: 'LMG',
    Sniper: 'Sniper',
    Damage: 'Dano',
    Range: 'Alcance',
    Mobility: 'Movilidad',
    Control: 'Control',
    Scavenger: 'Carronero',
    Sprinter: 'Sprinter',
    Hunter: 'Cazador',
  },
  de: {
    All: 'Alle',
    'Long-Range': 'Langdistanz',
    'Close-Range': 'Nahdistanz',
    'Sniper Support': 'Sniper Support',
    'One-shot Sniper': 'One-shot Sniper',
    'Mid-Range': 'Mitteldistanz',
    Ranked: 'Ranked',
    'Assault Rifle': 'Sturmgewehr',
    Damage: 'Schaden',
    Range: 'Reichweite',
    Mobility: 'Mobilitaet',
    Control: 'Kontrolle',
    Scavenger: 'Plünderer',
    Sprinter: 'Sprinter',
    Hunter: 'Jäger',
  },
  it: {
    All: 'Tutti',
    'Long-Range': 'Lunga distanza',
    'Close-Range': 'Corta distanza',
    'Mid-Range': 'Media distanza',
    'Assault Rifle': 'Fucile d assalto',
    Damage: 'Danno',
    Range: 'Portata',
    Mobility: 'Mobilita',
    Control: 'Controllo',
    Scavenger: 'Sciacallo',
    Sprinter: 'Sprinter',
    Hunter: 'Cacciatore',
  },
  pt: {
    All: 'Todos',
    'Long-Range': 'Longa distancia',
    'Close-Range': 'Curta distancia',
    'Mid-Range': 'Media distancia',
    'Assault Rifle': 'Fuzil de assalto',
    Damage: 'Dano',
    Range: 'Alcance',
    Mobility: 'Mobilidade',
    Control: 'Controle',
    Scavenger: 'Saqueador',
    Sprinter: 'Sprinter',
    Hunter: 'Caçador',
  },
  nl: {
    All: 'Alles',
    'Long-Range': 'Lange afstand',
    'Close-Range': 'Korte afstand',
    'Mid-Range': 'Middellange afstand',
    'Assault Rifle': 'Aanvalsgeweer',
    Damage: 'Schade',
    Range: 'Bereik',
    Mobility: 'Mobiliteit',
    Control: 'Controle',
    Scavenger: 'Plunderaar',
    Sprinter: 'Sprinter',
    Hunter: 'Jager',
  },
  pl: {
    All: 'Wszystko',
    'Long-Range': 'Dlugi dystans',
    'Close-Range': 'Krotki dystans',
    'Mid-Range': 'Sredni dystans',
    'Assault Rifle': 'Karabin szturmowy',
    Damage: 'Obrazenia',
    Range: 'Zasieg',
    Mobility: 'Mobilnosc',
    Control: 'Kontrola',
    Scavenger: 'Zbieracz',
    Sprinter: 'Sprinter',
    Hunter: 'Łowca',
  },
  ja: {
    All: 'すべて',
    'Long-Range': 'ロングレンジ',
    'Close-Range': '近距離',
    'Sniper Support': 'スナイパーサポート',
    'One-shot Sniper': 'ワンショットスナイパー',
    'Mid-Range': '中距離',
    Resurgence: 'リサージェンス',
    Ranked: 'ランク',
    'Battle Royale': 'バトルロイヤル',
    Solo: 'ソロ',
    'Assault Rifle': 'アサルトライフル',
    SMG: 'SMG',
    LMG: 'LMG',
    Sniper: 'スナイパー',
    Damage: 'ダメージ',
    Range: '射程',
    Mobility: '機動性',
    Control: '制御',
    Scavenger: 'スカベンジャー',
    Sprinter: 'スプリンター',
    Hunter: 'ハンター',
  },
};

export function translateTerm(term: string, locale: Locale) {
  return TERM_COPY[locale]?.[term] ?? term;
}

export function localizeLoadoutNote(weapon: string, playstyle: string, note: string | undefined, locale: Locale) {
  const generatedEnglishNote = note?.startsWith('A practical ') && note.includes('repeatable fights');
  if (locale === 'en' && note) return note;
  if (note && !generatedEnglishNote) return note;

  const role = translateTerm(playstyle, locale).toLowerCase();
  if (locale === 'fr') return `${weapon} est une classe ${role} pratique, pensee pour la fiabilite et les fights repetables.`;
  if (locale === 'es') return `${weapon} es una clase ${role} practica, centrada en fiabilidad y peleas repetibles.`;
  if (locale === 'de') return `${weapon} ist ein praktischer ${role}-Build mit Fokus auf Zuverlässigkeit und wiederholbare Fights.`;
  if (locale === 'it') return `${weapon} è un build ${role} pratico, pensato per affidabilità e fight ripetibili.`;
  if (locale === 'pt') return `${weapon} é uma build ${role} prática, focada em confiabilidade e lutas repetíveis.`;
  if (locale === 'nl') return `${weapon} is een praktische ${role}-build, gericht op betrouwbaarheid en herhaalbare fights.`;
  if (locale === 'pl') return `${weapon} to praktyczny build ${role}, skupiony na pewności i powtarzalnych walkach.`;
  if (locale === 'ja') return `${weapon}は${role}向けの実用ビルドで、安定性と再現しやすい戦闘を重視しています。`;
  return note || `${weapon} is a practical ${playstyle.toLowerCase()} build focused on role fit and repeatable fights.`;
}

export type HomeUiCopy = {
  ariaQuickActions: string;
  proTools: string;
  loadouts: string;
  setUp: string;
  esport: string;
  community: string;
  search: string;
  searchPlaceholder: string;
  players: string;
  privateStats: string;
  noFavoriteWeapon: string;
  noPublicPlayer: string;
  matches: string;
  updated: string;
  updatePending: string;
  publicPlayers: string;
  recommendedDuos: string;
  trustPatchChecked: string;
  trustPatchActive: string;
  trustScore: string;
  trustShareable: string;
  currentLongRange: string;
  closeMeta: string;
  dailyDuo: string;
  buildYourDuo: string;
  dailyDuoText: string;
  role: string;
  mode: string;
  savedBuilds: string;
  liveBoard: string;
  intro: string;
  viewFullRanking: string;
  compareTwoWeapons: string;
  duo: string;
  recommendedPerks: string;
  rankingFromFilters: string;
  topWeapons: string;
  noWeaponFound: string;
  tryAnotherSearch: string;
  dataLab: string;
  compare: string;
  ttkClose: string;
  ttkMid: string;
  ads: string;
  velocity: string;
  damage: string;
  range: string;
  mobility: string;
  control: string;
};

export const HOME_UI_COPY: Partial<Record<Locale, HomeUiCopy>> & { en: HomeUiCopy } = {
  en: {
    ariaQuickActions: 'Quick actions',
    proTools: 'Pro Tools',
    loadouts: 'Loadouts',
    setUp: 'Set-up',
    esport: 'Esport',
    community: 'Community',
    search: 'Search',
    searchPlaceholder: 'Weapon, player, attachment',
    players: 'Players',
    privateStats: 'Private or empty stats',
    noFavoriteWeapon: 'No favorite weapon yet',
    noPublicPlayer: 'No public player found for this search.',
    matches: 'MATCHES',
    updated: 'UPDATED',
    updatePending: 'UPDATE PENDING',
    publicPlayers: 'PUBLIC PLAYERS',
    recommendedDuos: 'recommended duos',
    trustPatchChecked: 'Patch checked',
    trustPatchActive: 'Patch check active',
    trustScore: 'Meta + handling + control score',
    trustShareable: 'Shareable builds',
    currentLongRange: 'Current long range',
    closeMeta: 'Close meta',
    dailyDuo: 'Daily duo',
    buildYourDuo: 'Build your duo',
    dailyDuoText: 'Use filters and the comparison lab to lock a reliable pair before your session.',
    role: 'Role',
    mode: 'Mode',
    savedBuilds: 'Saved builds',
    liveBoard: 'Live board - last updated',
    intro: 'Rankings combine weapon stats, practical range, handling, recoil control and Resurgence pace. Re-check after major balance patches: a meta can move faster than raw stat sheets.',
    viewFullRanking: 'View full ranking',
    compareTwoWeapons: 'Compare two weapons',
    duo: 'Duo',
    recommendedPerks: 'Recommended perks',
    rankingFromFilters: 'Ranking from current filters',
    topWeapons: 'Top weapons',
    noWeaponFound: 'No weapon found',
    tryAnotherSearch: 'Try another search',
    dataLab: 'Data lab',
    compare: 'Compare',
    ttkClose: 'TTK close',
    ttkMid: 'TTK mid',
    ads: 'ADS',
    velocity: 'Velocity',
    damage: 'Damage',
    range: 'Range',
    mobility: 'Mobility',
    control: 'Control',
  },
  fr: {
    ariaQuickActions: 'Actions rapides',
    proTools: 'Outils Pro',
    loadouts: 'Classes',
    setUp: 'Reglages',
    esport: 'Esport',
    community: 'Communaute',
    search: 'Recherche',
    searchPlaceholder: 'Arme, joueur, accessoire',
    players: 'Joueurs',
    privateStats: 'Stats privees ou vides',
    noFavoriteWeapon: 'Aucune arme favorite',
    noPublicPlayer: 'Aucun joueur public trouve pour cette recherche.',
    matches: 'RESULTATS',
    updated: 'MIS A JOUR',
    updatePending: 'MAJ EN ATTENTE',
    publicPlayers: 'JOUEURS PUBLICS',
    recommendedDuos: 'duos recommandes',
    trustPatchChecked: 'Patch verifie',
    trustPatchActive: 'Verification du patch active',
    trustScore: 'Score meta + maniabilite + controle',
    trustShareable: 'Classes partageables',
    currentLongRange: 'Longue portee actuelle',
    closeMeta: 'Meta courte portee',
    dailyDuo: 'Duo du jour',
    buildYourDuo: 'Cree ton duo',
    dailyDuoText: 'Utilise les filtres et le comparateur pour verrouiller une paire fiable avant ta session.',
    role: 'Role',
    mode: 'Mode',
    savedBuilds: 'Classes enregistrees',
    liveBoard: 'Tableau live - derniere mise a jour',
    intro: 'Les classements combinent stats d arme, portee pratique, maniabilite, controle du recul et rythme Resurgence. Reverifie apres les gros patchs: une meta peut bouger plus vite que les fiches de stats.',
    viewFullRanking: 'Voir le classement complet',
    compareTwoWeapons: 'Comparer deux armes',
    duo: 'Duo',
    recommendedPerks: 'Atouts recommandes',
    rankingFromFilters: 'Classement avec les filtres actuels',
    topWeapons: 'Top armes',
    noWeaponFound: 'Aucune arme trouvee',
    tryAnotherSearch: 'Essaie une autre recherche',
    dataLab: 'Lab donnees',
    compare: 'Comparer',
    ttkClose: 'TTK proche',
    ttkMid: 'TTK moyen',
    ads: 'Visee',
    velocity: 'Vitesse balle',
    damage: 'Degats',
    range: 'Portee',
    mobility: 'Mobilite',
    control: 'Controle',
  },
  es: {
    ariaQuickActions: 'Acciones rapidas',
    proTools: 'Herramientas Pro',
    loadouts: 'Clases',
    setUp: 'Ajustes',
    esport: 'Esport',
    community: 'Comunidad',
    search: 'Buscar',
    searchPlaceholder: 'Arma, jugador, accesorio',
    players: 'Jugadores',
    privateStats: 'Estadisticas privadas o vacias',
    noFavoriteWeapon: 'Sin arma favorita',
    noPublicPlayer: 'No se encontro ningun jugador publico.',
    matches: 'RESULTADOS',
    updated: 'ACTUALIZADO',
    updatePending: 'ACTUALIZACION PENDIENTE',
    publicPlayers: 'JUGADORES PUBLICOS',
    recommendedDuos: 'duos recomendados',
    trustPatchChecked: 'Parche verificado',
    trustPatchActive: 'Revision de parche activa',
    trustScore: 'Puntuacion meta + manejo + control',
    trustShareable: 'Clases compartibles',
    currentLongRange: 'Largo alcance actual',
    closeMeta: 'Meta corta distancia',
    dailyDuo: 'Duo del dia',
    buildYourDuo: 'Crea tu duo',
    dailyDuoText: 'Usa filtros y el comparador para fijar una pareja fiable antes de jugar.',
    role: 'Rol',
    mode: 'Modo',
    savedBuilds: 'Clases guardadas',
    liveBoard: 'Panel en vivo - ultima actualizacion',
    intro: 'Los rankings combinan estadisticas del arma, alcance practico, manejo, control de retroceso y ritmo Resurgence. Revisa tras parches grandes: la meta puede cambiar mas rapido que las hojas de datos.',
    viewFullRanking: 'Ver ranking completo',
    compareTwoWeapons: 'Comparar dos armas',
    duo: 'Duo',
    recommendedPerks: 'Ventajas recomendadas',
    rankingFromFilters: 'Clasificacion con filtros actuales',
    topWeapons: 'Top armas',
    noWeaponFound: 'No se encontro arma',
    tryAnotherSearch: 'Prueba otra busqueda',
    dataLab: 'Lab de datos',
    compare: 'Comparar',
    ttkClose: 'TTK cerca',
    ttkMid: 'TTK medio',
    ads: 'ADS',
    velocity: 'Velocidad bala',
    damage: 'Dano',
    range: 'Alcance',
    mobility: 'Movilidad',
    control: 'Control',
  },
  de: {
    ariaQuickActions: 'Schnellaktionen',
    proTools: 'Pro Tools',
    loadouts: 'Loadouts',
    setUp: 'Setup',
    esport: 'Esport',
    community: 'Community',
    search: 'Suche',
    searchPlaceholder: 'Waffe, Spieler, Aufsatz',
    players: 'Spieler',
    privateStats: 'Private oder leere Stats',
    noFavoriteWeapon: 'Noch keine Lieblingswaffe',
    noPublicPlayer: 'Kein öffentlicher Spieler gefunden.',
    matches: 'TREFFER',
    updated: 'AKTUALISIERT',
    updatePending: 'UPDATE AUSSTEHEND',
    publicPlayers: 'ÖFFENTLICHE SPIELER',
    recommendedDuos: 'empfohlene Duos',
    trustPatchChecked: 'Patch geprüft',
    trustPatchActive: 'Patch-Prüfung aktiv',
    trustScore: 'Meta + Handling + Kontrolle',
    trustShareable: 'Teilbare Builds',
    currentLongRange: 'Aktuelle Long Range',
    closeMeta: 'Close Meta',
    dailyDuo: 'Duo des Tages',
    buildYourDuo: 'Duo bauen',
    dailyDuoText: 'Nutze Filter und Vergleich, um vor der Session ein zuverlässiges Paar zu wählen.',
    role: 'Rolle',
    mode: 'Modus',
    savedBuilds: 'Gespeicherte Builds',
    liveBoard: 'Live-Board - zuletzt aktualisiert',
    intro: 'Rankings kombinieren Waffenwerte, praktische Reichweite, Handling, Rückstoßkontrolle und Resurgence-Tempo.',
    viewFullRanking: 'Vollständiges Ranking',
    compareTwoWeapons: 'Zwei Waffen vergleichen',
    duo: 'Duo',
    recommendedPerks: 'Empfohlene Perks',
    rankingFromFilters: 'Ranking nach aktuellen Filtern',
    topWeapons: 'Top-Waffen',
    noWeaponFound: 'Keine Waffe gefunden',
    tryAnotherSearch: 'Andere Suche versuchen',
    dataLab: 'Datenlabor',
    compare: 'Vergleichen',
    ttkClose: 'TTK nah',
    ttkMid: 'TTK mittel',
    ads: 'ADS',
    velocity: 'Kugelgeschwindigkeit',
    damage: 'Schaden',
    range: 'Reichweite',
    mobility: 'Mobilität',
    control: 'Kontrolle',
  },
  it: {
    ariaQuickActions: 'Azioni rapide',
    proTools: 'Strumenti Pro',
    loadouts: 'Loadout',
    setUp: 'Setup',
    esport: 'Esport',
    community: 'Community',
    search: 'Cerca',
    searchPlaceholder: 'Arma, giocatore, accessorio',
    players: 'Giocatori',
    privateStats: 'Statistiche private o vuote',
    noFavoriteWeapon: 'Nessuna arma preferita',
    noPublicPlayer: 'Nessun giocatore pubblico trovato.',
    matches: 'RISULTATI',
    updated: 'AGGIORNATO',
    updatePending: 'AGGIORNAMENTO IN ATTESA',
    publicPlayers: 'GIOCATORI PUBBLICI',
    recommendedDuos: 'duo consigliati',
    trustPatchChecked: 'Patch verificata',
    trustPatchActive: 'Controllo patch attivo',
    trustScore: 'Meta + maneggevolezza + controllo',
    trustShareable: 'Build condivisibili',
    currentLongRange: 'Lunga distanza attuale',
    closeMeta: 'Meta ravvicinata',
    dailyDuo: 'Duo del giorno',
    buildYourDuo: 'Crea il tuo duo',
    dailyDuoText: 'Usa filtri e comparatore per scegliere una coppia affidabile prima della sessione.',
    role: 'Ruolo',
    mode: 'Modalità',
    savedBuilds: 'Build salvate',
    liveBoard: 'Tabella live - ultimo aggiornamento',
    intro: 'I ranking combinano statistiche arma, portata pratica, maneggevolezza, controllo rinculo e ritmo Resurgence.',
    viewFullRanking: 'Vedi ranking completo',
    compareTwoWeapons: 'Confronta due armi',
    duo: 'Duo',
    recommendedPerks: 'Perk consigliati',
    rankingFromFilters: 'Ranking dai filtri attuali',
    topWeapons: 'Armi migliori',
    noWeaponFound: 'Nessuna arma trovata',
    tryAnotherSearch: 'Prova un altra ricerca',
    dataLab: 'Lab dati',
    compare: 'Confronta',
    ttkClose: 'TTK vicino',
    ttkMid: 'TTK medio',
    ads: 'ADS',
    velocity: 'Velocità proiettile',
    damage: 'Danno',
    range: 'Portata',
    mobility: 'Mobilità',
    control: 'Controllo',
  },
  pt: {
    ariaQuickActions: 'Ações rápidas',
    proTools: 'Ferramentas Pro',
    loadouts: 'Loadouts',
    setUp: 'Setup',
    esport: 'Esport',
    community: 'Comunidade',
    search: 'Buscar',
    searchPlaceholder: 'Arma, jogador, acessório',
    players: 'Jogadores',
    privateStats: 'Stats privadas ou vazias',
    noFavoriteWeapon: 'Nenhuma arma favorita',
    noPublicPlayer: 'Nenhum jogador público encontrado.',
    matches: 'RESULTADOS',
    updated: 'ATUALIZADO',
    updatePending: 'ATUALIZAÇÃO PENDENTE',
    publicPlayers: 'JOGADORES PÚBLICOS',
    recommendedDuos: 'duos recomendados',
    trustPatchChecked: 'Patch verificado',
    trustPatchActive: 'Verificação de patch ativa',
    trustScore: 'Meta + manejo + controle',
    trustShareable: 'Builds compartilháveis',
    currentLongRange: 'Longa distância atual',
    closeMeta: 'Meta curta distância',
    dailyDuo: 'Duo do dia',
    buildYourDuo: 'Monte seu duo',
    dailyDuoText: 'Use filtros e o comparador para escolher uma dupla confiável antes da sessão.',
    role: 'Função',
    mode: 'Modo',
    savedBuilds: 'Builds salvas',
    liveBoard: 'Painel ao vivo - última atualização',
    intro: 'Os rankings combinam stats da arma, alcance prático, manejo, controle de recuo e ritmo Resurgence.',
    viewFullRanking: 'Ver ranking completo',
    compareTwoWeapons: 'Comparar duas armas',
    duo: 'Duo',
    recommendedPerks: 'Perks recomendados',
    rankingFromFilters: 'Ranking dos filtros atuais',
    topWeapons: 'Top armas',
    noWeaponFound: 'Nenhuma arma encontrada',
    tryAnotherSearch: 'Tente outra busca',
    dataLab: 'Lab de dados',
    compare: 'Comparar',
    ttkClose: 'TTK perto',
    ttkMid: 'TTK médio',
    ads: 'ADS',
    velocity: 'Velocidade da bala',
    damage: 'Dano',
    range: 'Alcance',
    mobility: 'Mobilidade',
    control: 'Controle',
  },
  nl: {
    ariaQuickActions: 'Snelle acties',
    proTools: 'Pro Tools',
    loadouts: 'Loadouts',
    setUp: 'Setup',
    esport: 'Esport',
    community: 'Community',
    search: 'Zoeken',
    searchPlaceholder: 'Wapen, speler, attachment',
    players: 'Spelers',
    privateStats: 'Private of lege stats',
    noFavoriteWeapon: 'Nog geen favoriet wapen',
    noPublicPlayer: 'Geen publieke speler gevonden.',
    matches: 'RESULTATEN',
    updated: 'BIJGEWERKT',
    updatePending: 'UPDATE IN AFWACHTING',
    publicPlayers: 'PUBLIEKE SPELERS',
    recommendedDuos: 'aanbevolen duo’s',
    trustPatchChecked: 'Patch gecontroleerd',
    trustPatchActive: 'Patchcontrole actief',
    trustScore: 'Meta + handling + controle',
    trustShareable: 'Deelbare builds',
    currentLongRange: 'Huidige long range',
    closeMeta: 'Close meta',
    dailyDuo: 'Duo van de dag',
    buildYourDuo: 'Bouw je duo',
    dailyDuoText: 'Gebruik filters en vergelijking om voor je sessie een betrouwbaar paar te kiezen.',
    role: 'Rol',
    mode: 'Modus',
    savedBuilds: 'Opgeslagen builds',
    liveBoard: 'Live board - laatst bijgewerkt',
    intro: 'Rankings combineren wapenstats, praktische range, handling, recoilcontrole en Resurgence-tempo.',
    viewFullRanking: 'Volledig ranking bekijken',
    compareTwoWeapons: 'Twee wapens vergelijken',
    duo: 'Duo',
    recommendedPerks: 'Aanbevolen perks',
    rankingFromFilters: 'Ranking met huidige filters',
    topWeapons: 'Topwapens',
    noWeaponFound: 'Geen wapen gevonden',
    tryAnotherSearch: 'Probeer een andere zoekopdracht',
    dataLab: 'Datalab',
    compare: 'Vergelijken',
    ttkClose: 'TTK dichtbij',
    ttkMid: 'TTK midden',
    ads: 'ADS',
    velocity: 'Kogelsnelheid',
    damage: 'Schade',
    range: 'Bereik',
    mobility: 'Mobiliteit',
    control: 'Controle',
  },
  pl: {
    ariaQuickActions: 'Szybkie akcje',
    proTools: 'Narzędzia Pro',
    loadouts: 'Loadouty',
    setUp: 'Setup',
    esport: 'Esport',
    community: 'Społeczność',
    search: 'Szukaj',
    searchPlaceholder: 'Broń, gracz, dodatek',
    players: 'Gracze',
    privateStats: 'Prywatne lub puste statystyki',
    noFavoriteWeapon: 'Brak ulubionej broni',
    noPublicPlayer: 'Nie znaleziono publicznego gracza.',
    matches: 'WYNIKI',
    updated: 'ZAKTUALIZOWANO',
    updatePending: 'AKTUALIZACJA OCZEKUJE',
    publicPlayers: 'PUBLICZNI GRACZE',
    recommendedDuos: 'polecane duety',
    trustPatchChecked: 'Patch sprawdzony',
    trustPatchActive: 'Sprawdzanie patcha aktywne',
    trustScore: 'Meta + obsługa + kontrola',
    trustShareable: 'Buildy do udostępniania',
    currentLongRange: 'Aktualny długi dystans',
    closeMeta: 'Meta krótki dystans',
    dailyDuo: 'Duet dnia',
    buildYourDuo: 'Zbuduj duet',
    dailyDuoText: 'Użyj filtrów i porównania, aby wybrać pewną parę przed sesją.',
    role: 'Rola',
    mode: 'Tryb',
    savedBuilds: 'Zapisane buildy',
    liveBoard: 'Tablica live - ostatnia aktualizacja',
    intro: 'Rankingi łączą statystyki broni, praktyczny zasięg, obsługę, kontrolę odrzutu i tempo Resurgence.',
    viewFullRanking: 'Pełny ranking',
    compareTwoWeapons: 'Porównaj dwie bronie',
    duo: 'Duet',
    recommendedPerks: 'Polecane perki',
    rankingFromFilters: 'Ranking z aktualnych filtrów',
    topWeapons: 'Top bronie',
    noWeaponFound: 'Nie znaleziono broni',
    tryAnotherSearch: 'Spróbuj innego wyszukiwania',
    dataLab: 'Laboratorium danych',
    compare: 'Porównaj',
    ttkClose: 'TTK blisko',
    ttkMid: 'TTK średnio',
    ads: 'ADS',
    velocity: 'Prędkość pocisku',
    damage: 'Obrażenia',
    range: 'Zasięg',
    mobility: 'Mobilność',
    control: 'Kontrola',
  },
  ja: {
    ariaQuickActions: 'クイック操作',
    proTools: 'プロツール',
    loadouts: 'ロードアウト',
    setUp: 'セットアップ',
    esport: 'eスポーツ',
    community: 'コミュニティ',
    search: '検索',
    searchPlaceholder: '武器、プレイヤー、アタッチメント',
    players: 'プレイヤー',
    privateStats: '非公開または空の統計',
    noFavoriteWeapon: 'お気に入り武器なし',
    noPublicPlayer: '公開プレイヤーが見つかりません。',
    matches: '件',
    updated: '更新',
    updatePending: '更新待ち',
    publicPlayers: '公開プレイヤー',
    recommendedDuos: 'おすすめデュオ',
    trustPatchChecked: 'パッチ確認済み',
    trustPatchActive: 'パッチ確認中',
    trustScore: 'メタ + 操作性 + 制御',
    trustShareable: '共有可能なビルド',
    currentLongRange: '現在のロングレンジ',
    closeMeta: '近距離メタ',
    dailyDuo: '今日のデュオ',
    buildYourDuo: 'デュオを作成',
    dailyDuoText: 'フィルターと比較ラボで、試合前に安定した組み合わせを選びます。',
    role: '役割',
    mode: 'モード',
    savedBuilds: '保存済みビルド',
    liveBoard: 'ライブボード - 最終更新',
    intro: 'ランキングは武器性能、実用射程、操作性、反動制御、Resurgenceのテンポを合わせて評価します。',
    viewFullRanking: '全ランキングを見る',
    compareTwoWeapons: '2つの武器を比較',
    duo: 'デュオ',
    recommendedPerks: 'おすすめパーク',
    rankingFromFilters: '現在のフィルターのランキング',
    topWeapons: 'トップ武器',
    noWeaponFound: '武器が見つかりません',
    tryAnotherSearch: '別の検索を試してください',
    dataLab: 'データラボ',
    compare: '比較',
    ttkClose: '近距離TTK',
    ttkMid: '中距離TTK',
    ads: 'ADS',
    velocity: '弾速',
    damage: 'ダメージ',
    range: '射程',
    mobility: '機動性',
    control: '制御',
  },
};

export function getHomeUiCopy(locale: Locale): HomeUiCopy {
  return HOME_UI_COPY[locale] ?? HOME_UI_COPY.en;
}

const LOCALIZED_SITE_CONTENT: Partial<Record<Locale, Partial<SiteContent>>> = {
  fr: {
    home: {
      metaLeft: 'WZ_META / FONDERIE_GD',
      metaCenter: 'TYPO / TACTICAL MONO',
      metaRight: 'AO-17 VERDANSK NORD',
      titleTop: 'WARZONE',
      titleMiddle: 'META',
      titleBottom: 'SYSTEME',
      eyebrow: '[ META LIVE ]',
      description: 'Trouve les meilleures classes Warzone, compare les armes meta et regle ton setup avant meme le chargement du lobby.',
      primaryCta: 'Voir les classes',
      secondaryCta: 'Ouvrir les outils Pro',
    },
    updatedAt: '2026-06-01',
  },
  es: {
    home: {
      metaLeft: 'WZ_META / FUNDICION_GD',
      metaCenter: 'TIPO / TACTICAL MONO',
      metaRight: 'AO-17 VERDANSK NORTE',
      titleTop: 'WARZONE',
      titleMiddle: 'META',
      titleBottom: 'SISTEMA',
      eyebrow: '[ META LIVE ]',
      description: 'Encuentra las mejores clases de Warzone, compara armas meta y ajusta tu setup antes de que cargue el lobby.',
      primaryCta: 'Ver clases',
      secondaryCta: 'Abrir herramientas Pro',
    },
    updatedAt: '2026-06-01',
  },
  de: {
    home: {
      metaLeft: 'WZ_META / GD_FOUNDRY',
      metaCenter: 'SCHRIFT / TACTICAL MONO',
      metaRight: 'AO-17 VERDANSK NORD',
      titleTop: 'WARZONE',
      titleMiddle: 'META',
      titleBottom: 'SYSTEM',
      eyebrow: '[ META LIVE ]',
      description: 'Finde die besten Warzone-Loadouts, vergleiche Meta-Waffen und optimiere dein Setup vor der Lobby.',
      primaryCta: 'Loadouts ansehen',
      secondaryCta: 'Pro Tools öffnen',
    },
    updatedAt: '2026-06-01',
  },
  it: {
    home: {
      metaLeft: 'WZ_META / GD_FOUNDRY',
      metaCenter: 'TIPO / TACTICAL MONO',
      metaRight: 'AO-17 VERDANSK NORD',
      titleTop: 'WARZONE',
      titleMiddle: 'META',
      titleBottom: 'SISTEMA',
      eyebrow: '[ META LIVE ]',
      description: 'Trova i migliori loadout Warzone, confronta le armi meta e ottimizza il setup prima della lobby.',
      primaryCta: 'Vedi loadout',
      secondaryCta: 'Apri strumenti Pro',
    },
    updatedAt: '2026-06-01',
  },
  pt: {
    home: {
      metaLeft: 'WZ_META / GD_FOUNDRY',
      metaCenter: 'TIPO / TACTICAL MONO',
      metaRight: 'AO-17 VERDANSK NORTE',
      titleTop: 'WARZONE',
      titleMiddle: 'META',
      titleBottom: 'SISTEMA',
      eyebrow: '[ META LIVE ]',
      description: 'Encontre os melhores loadouts de Warzone, compare armas meta e ajuste seu setup antes do lobby.',
      primaryCta: 'Ver loadouts',
      secondaryCta: 'Abrir ferramentas Pro',
    },
    updatedAt: '2026-06-01',
  },
  nl: {
    home: {
      metaLeft: 'WZ_META / GD_FOUNDRY',
      metaCenter: 'TYPEFACE / TACTICAL MONO',
      metaRight: 'AO-17 VERDANSK NOORD',
      titleTop: 'WARZONE',
      titleMiddle: 'META',
      titleBottom: 'SYSTEEM',
      eyebrow: '[ META LIVE ]',
      description: 'Vind de beste Warzone-loadouts, vergelijk meta-wapens en stel je setup af voordat de lobby laadt.',
      primaryCta: 'Loadouts bekijken',
      secondaryCta: 'Pro Tools openen',
    },
    updatedAt: '2026-06-01',
  },
  pl: {
    home: {
      metaLeft: 'WZ_META / GD_FOUNDRY',
      metaCenter: 'KRÓJ / TACTICAL MONO',
      metaRight: 'AO-17 VERDANSK PÓŁNOC',
      titleTop: 'WARZONE',
      titleMiddle: 'META',
      titleBottom: 'SYSTEM',
      eyebrow: '[ META LIVE ]',
      description: 'Znajdź najlepsze loadouty Warzone, porównuj bronie meta i dopracuj setup przed lobby.',
      primaryCta: 'Zobacz loadouty',
      secondaryCta: 'Otwórz narzędzia Pro',
    },
    updatedAt: '2026-06-01',
  },
  ja: {
    home: {
      metaLeft: 'WZ_META / GD_FOUNDRY',
      metaCenter: 'TYPEFACE / TACTICAL MONO',
      metaRight: 'AO-17 VERDANSK NORTH',
      titleTop: 'WARZONE',
      titleMiddle: 'META',
      titleBottom: 'SYSTEM',
      eyebrow: '[ メタ LIVE ]',
      description: '最強のWarzoneロードアウトを探し、メタ武器を比較し、ロビー前にセットアップを調整できます。',
      primaryCta: 'ロードアウトを見る',
      secondaryCta: 'プロツールを開く',
    },
    updatedAt: '2026-06-01',
  },
};

export function localizeSiteContent(content: SiteContent, locale: Locale): SiteContent {
  const localized = LOCALIZED_SITE_CONTENT[locale];
  if (!localized) return content;

  return {
    ...content,
    ...localized,
    home: {
      ...content.home,
      ...localized.home,
    },
    proAccess: {
      ...content.proAccess,
      ...localized.proAccess,
    },
    freePreview: {
      ...content.freePreview,
      ...localized.freePreview,
    },
    community: {
      ...content.community,
      ...localized.community,
    },
  };
}

export const LANDING_COPY = {
  eyebrow: 'WZPRO Meta',
  title: 'Choose your language',
  description: 'Pick a language once. The site opens with translated navigation, home content and localized URLs.',
  continueLabel: 'Continue',
  note: 'You can change language later from any localized URL.',
};
