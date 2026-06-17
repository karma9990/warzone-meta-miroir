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

const COUNTRY_TO_LOCALE: Record<string, Locale> = {
  FR: 'fr', BE: 'fr', LU: 'fr', MC: 'fr', CH: 'fr',
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es', VE: 'es', EC: 'es',
  GT: 'es', BO: 'es', DO: 'es', HN: 'es', PY: 'es', SV: 'es', NI: 'es', CR: 'es',
  PA: 'es', UY: 'es', CU: 'es', GQ: 'es',
};

export function detectVisitorLocale(
  country: string | undefined | null,
  acceptLanguage: string | undefined | null,
): Locale | null {
  const byCountry = country ? COUNTRY_TO_LOCALE[country.toUpperCase()] : undefined;
  if (byCountry) return byCountry;

  for (const part of (acceptLanguage ?? '').split(',')) {
    const lang = part.split(';')[0].trim().slice(0, 2).toLowerCase();
    if (isLocale(lang)) return lang;
  }
  return null;
}

export function stripLocale(pathname: string) {
  const suffixMatch = pathname.match(/([?#].*)$/);
  const suffix = suffixMatch?.[1] ?? '';
  const cleanPathname = suffix ? pathname.slice(0, -suffix.length) : pathname;
  const [, maybeLocale, ...rest] = cleanPathname.split('/');
  if (!isLocale(maybeLocale)) {
    return { locale: null, pathname };
  }

  const nextPathname = `/${rest.join('/')}`.replace(/\/$/, '') || '/';
  return { locale: maybeLocale, pathname: `${nextPathname}${suffix}` };
}

export function withLocalePath(pathname: string, locale: Locale) {
  if (/^(https?:|mailto:|tel:|#)/.test(pathname)) return pathname;
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const { pathname: cleanPathname } = stripLocale(normalized);
  const suffixMatch = cleanPathname.match(/([?#].*)$/);
  const suffix = suffixMatch?.[1] ?? '';
  const pathOnly = suffix ? cleanPathname.slice(0, -suffix.length) : cleanPathname;
  if (pathOnly === '/') return `/${locale}${suffix}`;
  return `/${locale}${pathOnly}${suffix}`;
}

const TERM_COPY: Partial<Record<Locale, Record<string, string>>> = {
  fr: {
    All: 'Tous',
    'Long-Range': 'Longue portee',
    'Close-Range': 'Courte portee',
    'Sniper Support': 'Support sniper',
    'One-shot Sniper': 'Sniper one-shot',
    'Mid-Range': 'Moyenne portee',
    'Hard-Hitting AR': 'AR puissant',
    Resurgence: 'Resurgence',
    Ranked: 'Classe',
    'Battle Royale': 'Battle Royale',
    Solo: 'Solo',
    'Assault Rifle': 'Fusil d assaut',
    SMG: 'SMG',
    LMG: 'LMG',
    Sniper: 'Sniper',
    'Sniper Rifle': 'Fusil sniper',
    'Marksman Rifle': 'Fusil tactique',
    'Mid-Range SMG': 'SMG moyenne portee',
    'Burst Rifle': 'Fusil rafale',
    Damage: 'Degats',
    Range: 'Portee',
    Mobility: 'Mobilite',
    Control: 'Controle',
    Scavenger: 'Pillard',
    Sprinter: 'Sprinter',
    Hunter: 'Chasseur',
    Muzzle: 'Bouche',
    Barrel: 'Canon',
    Stock: 'Crosse',
    Optic: 'Viseur',
    Magazine: 'Chargeur',
    Underbarrel: 'Accessoire canon',
    Laser: 'Laser',
    Ammunition: 'Munitions',
    'Rear Grip': 'Poignee arriere',
    Duo: 'Duo',
    Trio: 'Trio',
    Squads: 'Escouades',
    Beginner: 'Debutant',
    Casual: 'Detente',
    'High skill': 'Haut niveau',
    'one-shot': 'one-shot',
    'long range': 'longue portee',
    'high skill': 'haut niveau',
    'low recoil': 'recul faible',
    anchor: 'ancrage',
    'beginner friendly': 'facile debutant',
    'sniper support': 'support sniper',
    balanced: 'equilibre',
    'fast ADS': 'visee rapide',
    'Aggressive Sniper': 'sniper agressif',
    'aggressive sniper': 'sniper agressif',
    quickscope: 'quickscope',
    'support needed': 'support requis',
    'mobile AR': 'AR mobile',
    'controller friendly': 'manette friendly',
    movement: 'mouvement',
    'close range': 'courte portee',
    'high risk': 'risque eleve',
    'easy recoil': 'recul facile',
    'mid range': 'moyenne portee',
    'high damage': 'gros degats',
    'high recoil': 'gros recul',
    slow: 'lent',
    stable: 'stable',
    entry: 'entry',
    forgiving: 'tolerant',
    'off meta': 'hors meta',
    burst: 'rafale',
    'accuracy check': 'precision requise',
  },
  es: {
    All: 'Todos',
    'Long-Range': 'Largo alcance',
    'Close-Range': 'Corta distancia',
    'Sniper Support': 'Apoyo sniper',
    'One-shot Sniper': 'Sniper one-shot',
    'Mid-Range': 'Medio alcance',
    'Hard-Hitting AR': 'AR de alto dano',
    Resurgence: 'Resurgence',
    Ranked: 'Ranked',
    'Battle Royale': 'Battle Royale',
    Solo: 'Solo',
    'Assault Rifle': 'Rifle de asalto',
    SMG: 'SMG',
    LMG: 'LMG',
    Sniper: 'Sniper',
    'Sniper Rifle': 'Rifle sniper',
    'Marksman Rifle': 'Rifle tactico',
    'Mid-Range SMG': 'SMG medio alcance',
    'Burst Rifle': 'Rifle de rafaga',
    Damage: 'Dano',
    Range: 'Alcance',
    Mobility: 'Movilidad',
    Control: 'Control',
    Scavenger: 'Carronero',
    Sprinter: 'Sprinter',
    Hunter: 'Cazador',
    Muzzle: 'Bocacha',
    Barrel: 'Canon',
    Stock: 'Culata',
    Optic: 'Mira',
    Magazine: 'Cargador',
    Underbarrel: 'Acople',
    Laser: 'Laser',
    Ammunition: 'Municion',
    'Rear Grip': 'Empunadura trasera',
    Duo: 'Duo',
    Trio: 'Trio',
    Squads: 'Escuadras',
    Beginner: 'Principiante',
    Casual: 'Informal',
    'High skill': 'Alto nivel',
    'one-shot': 'one-shot',
    'long range': 'largo alcance',
    'high skill': 'alto nivel',
    'low recoil': 'poco retroceso',
    anchor: 'ancla',
    'beginner friendly': 'facil para principiantes',
    'sniper support': 'apoyo sniper',
    balanced: 'equilibrado',
    'fast ADS': 'ADS rapido',
    'Aggressive Sniper': 'sniper agresivo',
    'aggressive sniper': 'sniper agresivo',
    quickscope: 'quickscope',
    'support needed': 'necesita apoyo',
    'mobile AR': 'AR movil',
    'controller friendly': 'buena con mando',
    movement: 'movimiento',
    'close range': 'corta distancia',
    'high risk': 'alto riesgo',
    'easy recoil': 'retroceso facil',
    'mid range': 'medio alcance',
    'high damage': 'alto dano',
    'high recoil': 'alto retroceso',
    slow: 'lento',
    stable: 'estable',
    entry: 'entrada',
    forgiving: 'perdonador',
    'off meta': 'fuera de meta',
    burst: 'rafaga',
    'accuracy check': 'precision requerida',
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

export function localizeLoadoutText(text: string | undefined, locale: Locale, playstyle?: string) {
  if (!text) return '';
  if (locale === 'en') return text;

  const role = playstyle ? translateTerm(playstyle, locale).toLowerCase() : '';
  const lower = text.toLowerCase();

  if (lower.startsWith('chosen to support this ') && lower.includes("weapon's handling profile")) {
    if (locale === 'fr') return `Choisi pour soutenir ce role ${role || 'precis'} sans casser la maniabilite de l'arme.`;
    if (locale === 'es') return `Elegido para apoyar este rol ${role || 'preciso'} sin romper el manejo del arma.`;
  }

  const copy: Partial<Record<Locale, Record<string, string>>> = {
    fr: {
      'Deletes exposed players at range': 'Supprime les joueurs exposes a distance',
      'Pairs well with fast SMGs': 'Se combine bien avec des SMG rapides',
      'Very strong for roof control': 'Tres fort pour controler les toits',
      'Slow ADS': 'Visee lente',
      'Punished hard in close quarters': 'Tres puni en combat rapproche',
      'Needs confident positioning': 'Demande un placement solide',
      'Snipers remain valuable because ranked endgames still reward first knock pressure.': 'Les snipers restent utiles car les fins de partie classees recompensent toujours la pression du premier knock.',
      'Curated from practical range, handling and current competitive sniper usage patterns.': 'Selectionne selon la portee pratique, la maniabilite et les usages sniper competitifs actuels.',
      'Best used by disciplined players who hold power positions and rotate early.': 'A utiliser par des joueurs disciplines qui gardent les positions fortes et tournent tot.',
      'Very forgiving recoil': 'Recul tres tolerant',
      'Reliable past 60m': 'Fiable au-dela de 60 m',
      'Good magazine size': 'Bonne taille de chargeur',
      'Not explosive close range': 'Pas explosif en courte portee',
      'Heavier than sniper-support ARs': 'Plus lourd que les AR support sniper',
      'A stability pick that wins through accuracy instead of raw theoretical TTK.': 'Un choix stable qui gagne par la precision plutot que par le TTK theorique brut.',
      'Modeled after common low-recoil long-range AR priorities.': 'Modele selon les priorites habituelles des AR longue portee a faible recul.',
      'Use this if you want a long-range AR that does not fight your aim.': 'Choisis-le si tu veux un AR longue portee qui ne lutte pas contre ton aim.',
      'Comfortable from 15m to 55m': 'Confortable de 15 m a 55 m',
      'Works with sniper or LMG pairings': 'Fonctionne avec un sniper ou une LMG',
      'Good handling': 'Bonne maniabilite',
      'Outgunned by SMGs point blank': 'Perd face aux SMG a bout portant',
      'Not a true beam past 75m': 'Pas un vrai laser au-dela de 75 m',
      'Sniper-support builds are back because teams are splitting long and close pressure more often.': 'Les classes support sniper reviennent car les equipes se partagent plus souvent la pression longue et courte portee.',
      'Curated from sniper-support range needs and mobility tradeoffs.': 'Selectionne selon les besoins de portee support sniper et les compromis de mobilite.',
      'The cleanest do-everything support rifle on the board right now.': 'Le fusil support le plus propre et polyvalent du moment.',
      'Fast for a sniper': 'Rapide pour un sniper',
      'Good for rooftop repeeks': 'Bon pour repeek les toits',
      'Strong solo pick potential': 'Fort potentiel en solo',
      'Less stable than Strider 300': 'Moins stable que le Strider 300',
      'Needs precision under pressure': 'Demande de la precision sous pression',
      'Aggressive sniping remains viable in Resurgence because fast resets matter more than absolute stability.': 'Le sniper agressif reste viable en Resurgence car les resets rapides comptent plus que la stabilite absolue.',
      'Built around practical ADS and rotation pressure.': 'Construit autour d une visee pratique et de la pression en rotation.',
      'A sniper for players who refuse to sit still.': 'Un sniper pour les joueurs qui refusent de rester immobiles.',
      'Fast handling': 'Maniabilite rapide',
      'Good strafe feel': 'Bon feeling en strafe',
      'Flexible with snipers': 'Flexible avec les snipers',
      'Damage drops off at true long range': 'Les degats chutent en vraie longue portee',
      'Needs attachments to feel stable': 'A besoin d accessoires pour etre stable',
      'Mobile ARs are a strong answer to players who do not want SMG-only sniper support.': 'Les AR mobiles sont une bonne reponse pour les joueurs qui ne veulent pas un support sniper uniquement SMG.',
      'Curated from handling-first support rifle roles.': 'Selectionne pour les roles de fusil support axes sur la maniabilite.',
      'A comfort pick for fast AR players who still want range insurance.': 'Un choix confort pour les joueurs AR rapides qui veulent garder une securite a distance.',
      'Excellent movement': 'Excellent mouvement',
      'Fast sprint-to-fire': 'Sprint-to-fire rapide',
      'Great for breaking cameras': 'Excellent pour casser les cameras',
      'Falls off quickly': 'Perd vite en efficacite',
      'Less forgiving than Carbon 57': 'Moins tolerant que le Carbon 57',
      'Fast SMGs still win stairwell fights, but they demand cleaner positioning.': 'Les SMG rapides gagnent encore les fights d escaliers, mais demandent un meilleur placement.',
      'Curated from movement-SMG priorities.': 'Selectionne selon les priorites des SMG de mouvement.',
      'Not the safest SMG, but extremely dangerous in the hands of an entry player.': 'Pas le SMG le plus safe, mais extremement dangereux dans les mains d un entry.',
      'Predictable recoil': 'Recul previsible',
      'Simple to learn': 'Simple a apprendre',
      'Good casual ranked pick': 'Bon choix ranked casual',
      'No standout stat': 'Aucune stat dominante',
      'Loses to elite meta in equal fights': 'Perd face a la meta elite a fight egal',
      'A stable B-tier option when the top meta gets nerfed.': 'Une option B-tier stable quand la top meta se fait nerf.',
      'Curated as a safe fallback rifle.': 'Selectionne comme fusil fallback fiable.',
      'A practical rifle for players who value comfort over spreadsheet wins.': 'Un fusil pratique pour les joueurs qui preferent le confort aux victoires sur tableau de stats.',
      'Heavy damage per bullet': 'Gros degats par balle',
      'Strong if shots are clean': 'Fort si tes balles sont propres',
      'Punishes re-peeks': 'Punit les re-peeks',
      'Demanding recoil': 'Recul exigeant',
      'Slow handling': 'Maniabilite lente',
      'High-damage rifles are playable, but comfort meta still favors lower recoil.': 'Les fusils a gros degats sont jouables, mais la meta confort favorise encore le faible recul.',
      'Curated from high-damage AR tradeoffs.': 'Selectionne selon les compromis des AR a gros degats.',
      'Use it if you trust your recoil control more than your opponent trusts theirs.': 'Joue-le si tu fais plus confiance a ton controle du recul qu a celui de ton adversaire.',
      'Great bullet velocity': 'Tres bonne vitesse de balle',
      'Stable sight picture': 'Visee tres stable',
      'Good for overwatch': 'Bon pour couvrir l equipe',
      'Very slow': 'Tres lent',
      'Hard to use on small maps': 'Difficile a jouer sur petites maps',
      'A stable long sniper, but currently less flexible than Strider 300.': 'Un sniper longue portee stable, mais moins flexible que le Strider 300 actuellement.',
      'Curated from overwatch sniper needs.': 'Selectionne selon les besoins de couverture sniper.',
      'Useful for disciplined squads that rotate before the zone forces them.': 'Utile pour les squads disciplines qui tournent avant que la zone les force.',
      'Good magazine for an SMG': 'Bon chargeur pour un SMG',
      'Forgiving recoil': 'Recul tolerant',
      'Comfortable in buildings': 'Confortable dans les batiments',
      'Average TTK outside close range': 'TTK moyen hors courte portee',
      'Worse mobility than Razor 9mm': 'Moins mobile que le Razor 9mm',
      'Comfort SMGs stay relevant for teams that fight indoors constantly.': 'Les SMG confort restent pertinents pour les equipes qui fight constamment en interieur.',
      'Curated from entry-SMG practical needs.': 'Selectionne selon les besoins pratiques d un SMG entry.',
      'A safer alternative when the Razor 9mm feels too wild.': 'Une alternative plus safe quand le Razor 9mm semble trop nerveux.',
      'Very easy to control': 'Tres facile a controler',
      'Good for returning players': 'Bon pour les joueurs qui reprennent',
      'Works as a support weapon': 'Fonctionne comme arme de support',
      'Weak close TTK': 'TTK faible en courte portee',
      'Not tournament-ready': 'Pas pret pour tournoi',
      'Fun and controllable, but underpowered against current top SMGs.': 'Fun et controlable, mais trop faible face aux meilleurs SMG actuels.',
      'Curated as a comfort/off-meta option.': 'Selectionne comme option confort hors meta.',
      'A nostalgia pick that still works if you value control over pure speed.': 'Un choix nostalgie qui fonctionne encore si tu privilegies le controle a la vitesse pure.',
      'Strong if every burst lands': 'Fort si chaque rafale touche',
      'Good ammo economy': 'Bonne economie de munitions',
      'Fun skill expression': 'Expression de skill amusante',
      'Missed burst is fatal': 'Une rafale ratee peut etre fatale',
      'Weak under pressure': 'Faible sous pression',
      'Burst rifles need perfect timing to compete with full-auto comfort picks.': 'Les fusils rafale demandent un timing parfait pour rivaliser avec les armes auto confort.',
      'Curated from burst weapon risk/reward.': 'Selectionne selon le risque/recompense des armes rafale.',
      'A specialist weapon. Strong in theory, brutal when you miss.': 'Une arme de specialiste. Forte en theorie, brutale si tu rates.',
      'Stable enough to stay on target under pressure.': 'Assez stable pour rester sur la cible sous pression.',
      'Works best when fights are taken inside its intended range.': 'Fonctionne mieux quand les fights restent dans sa portee ideale.',
      'Fast enough for aggressive resets and repositioning.': 'Assez rapide pour reset et se replacer agressivement.',
      'Reliable for structured squad roles and held angles.': 'Fiable pour les roles de squad structures et les angles tenus.',
      'High damage profile rewards clean tracking.': 'Son profil a gros degats recompense le tracking propre.',
      'Needs practice because recoil is less forgiving.': 'Demande de l entrainement car le recul pardonne moins.',
      'Ranked from current practical stat balance, recoil comfort, handling and squad-role value.': 'Classe selon l equilibre pratique des stats, le confort du recul, la maniabilite et la valeur en squad.',
      'Comfortable, practical build for repeatable fights.': 'Classe confortable et pratique pour des fights repetables.',
      'Falls off quickly outside close-range fights.': 'Perd vite en efficacite hors des fights courte portee.',
      'Still needs patch checks after weapon tuning.': 'A reverifier apres les ajustements d armes.',
      'Can be punished if forced into close quarters.': 'Peut etre puni si tu es force en courte portee.',
      'No dedicated patch note yet. This build is ranked from practical stat balance, handling and role fit.': 'Pas encore de note de patch dediee. Cette classe est classee selon les stats pratiques, la maniabilite et son role.',
      'WZPRO Meta is an independent fan site. Re-check major balance updates before ranked sessions.': 'WZPRO Meta est un site fan independant. Reverifie les gros equilibrages avant tes sessions classees.',
      'WZPRO Meta uses curated practical estimates for public-facing guidance until live telemetry is connected.': 'WZPRO Meta utilise des estimations pratiques verifiees avant la connexion de donnees live.',
    },
    es: {
      'Heavy damage per bullet': 'Alto dano por bala',
      'Strong if shots are clean': 'Fuerte si conectas bien los disparos',
      'Punishes re-peeks': 'Castiga los re-peeks',
      'Demanding recoil': 'Retroceso exigente',
      'Slow handling': 'Manejo lento',
      'High-damage rifles are playable, but comfort meta still favors lower recoil.': 'Los rifles de alto dano son jugables, pero la meta comoda aun favorece menos retroceso.',
      'Curated from high-damage AR tradeoffs.': 'Seleccionado por los compromisos de AR de alto dano.',
      'Use it if you trust your recoil control more than your opponent trusts theirs.': 'Usalo si confias mas en tu control de retroceso que tu rival en el suyo.',
      'Stable enough to stay on target under pressure.': 'Suficientemente estable para seguir el objetivo bajo presion.',
      'Works best when fights are taken inside its intended range.': 'Funciona mejor cuando peleas dentro de su alcance ideal.',
      'Fast enough for aggressive resets and repositioning.': 'Bastante rapida para reposicionarte y resetear agresivo.',
      'Reliable for structured squad roles and held angles.': 'Fiable para roles de squad estructurados y angulos mantenidos.',
      'High damage profile rewards clean tracking.': 'Su perfil de alto dano recompensa el tracking limpio.',
      'Needs practice because recoil is less forgiving.': 'Requiere practica porque el retroceso perdona menos.',
      'Ranked from current practical stat balance, recoil comfort, handling and squad-role value.': 'Clasificada por balance practico de stats, comodidad de retroceso, manejo y valor de rol en squad.',
      'Comfortable, practical build for repeatable fights.': 'Clase comoda y practica para peleas repetibles.',
      'Falls off quickly outside close-range fights.': 'Pierde rapido fuera de peleas a corta distancia.',
      'Still needs patch checks after weapon tuning.': 'Hay que revisarla tras ajustes de armas.',
      'Can be punished if forced into close quarters.': 'Puede sufrir si te fuerzan a corta distancia.',
    },
  };

  const translated = copy[locale]?.[text];
  if (translated) return translated;

  const looksLikeEnglishSentence = /[A-Za-z]{3,}/.test(text) && /[.!?]$/.test(text.trim());
  if (looksLikeEnglishSentence) {
    if (locale === 'fr') return `Ajuste recommande pour ce role ${role || 'meta'}, avec un bon equilibre entre fiabilite, maniabilite et fights repetables.`;
    if (locale === 'es') return `Ajuste recomendado para este rol ${role || 'meta'}, con buen equilibrio entre fiabilidad, manejo y peleas repetibles.`;
  }

  const looksLikeEnglishFragment = /[A-Za-z]{3,}/.test(text) && /\s/.test(text);
  if (looksLikeEnglishFragment) {
    if (locale === 'fr') return `Point cle pour ce role ${role || 'meta'}.`;
    if (locale === 'es') return `Punto clave para este rol ${role || 'meta'}.`;
  }

  return text;
}

export function localizeLoadoutNote(weapon: string, playstyle: string, note: string | undefined, locale: Locale) {
  const mappedNote = localizeLoadoutText(note, locale, playstyle);
  if (note && mappedNote !== note) return mappedNote;

  const generatedEnglishNote = note?.startsWith('A practical ') && note.includes('repeatable fights');
  const handWrittenEnglishNote = Boolean(note && (
    note.startsWith('A practical ') ||
    note.startsWith('A safer alternative ') ||
    note.includes(' feels ') ||
    note.includes(' players who ')
  ));
  if (locale === 'en' && note) return note;
  if (note && !generatedEnglishNote && !handWrittenEnglishNote) return note;

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
  scoreNote: string;
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
    scoreNote: 'Scores calculated with WZPRO Meta proprietary tools.',
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
    setUp: 'Set-up',
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
    scoreNote: 'Scores calcules avec les outils internes WZPRO Meta.',
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
    setUp: 'Set-up',
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
    scoreNote: 'Puntuaciones calculadas con herramientas internas de WZPRO Meta.',
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
    setUp: 'Set-up',
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
    scoreNote: 'Scores calculated with WZPRO Meta proprietary tools.',
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
    setUp: 'Set-up',
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
    scoreNote: 'Scores calculated with WZPRO Meta proprietary tools.',
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
    setUp: 'Set-up',
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
    scoreNote: 'Scores calculated with WZPRO Meta proprietary tools.',
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
    setUp: 'Set-up',
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
    scoreNote: 'Scores calculated with WZPRO Meta proprietary tools.',
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
    setUp: 'Set-up',
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
    scoreNote: 'Scores calculated with WZPRO Meta proprietary tools.',
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
    setUp: 'Set-up',
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
    scoreNote: 'Scores calculated with WZPRO Meta proprietary tools.',
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
      titleMiddle: 'PRO',
      titleBottom: 'META',
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
      titleMiddle: 'PRO',
      titleBottom: 'META',
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
      titleMiddle: 'PRO',
      titleBottom: 'META',
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
      titleMiddle: 'PRO',
      titleBottom: 'META',
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
      titleMiddle: 'PRO',
      titleBottom: 'META',
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
      titleMiddle: 'PRO',
      titleBottom: 'META',
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
      titleMiddle: 'PRO',
      titleBottom: 'META',
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
      titleMiddle: 'PRO',
      titleBottom: 'META',
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
