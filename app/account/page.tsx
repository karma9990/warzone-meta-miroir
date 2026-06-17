import Link from 'next/link';
import { redirect } from 'next/navigation';
import AccountActions from '@/components/AccountActions';
import AccountLoadoutPrefs from '@/components/AccountLoadoutPrefs';
import AccountProfileForm from '@/components/AccountProfileForm';
import CompanionDeviceList from '@/components/CompanionDeviceList';
import CompanionFeatureTabs from '@/components/CompanionFeatureTabs';
import ManageSubscriptionButton from '@/components/ManageSubscriptionButton';
import StatsTracker from '@/components/StatsTracker';
import { listCompanionDevices } from '@/lib/companionDeviceStore';
import { getLoadouts } from '@/lib/data';
import { getStatsSummary } from '@/lib/statsSummary';
import { buildCoachReport } from '@/lib/coachReport';
import { calculateMetaScore } from '@/lib/loadoutUtils';
import { getEntitlements, type EntitlementRecord } from '@/lib/entitlementStore';
import { emptyProfile, getProfile } from '@/lib/profileStore';
import { PRO_TOOL_IDS, type ProToolId } from '@/lib/toolAccess';
import { getUserSession } from '@/lib/userAuth';
import { withLocalePath } from '@/lib/i18n';
import { getRequestLocale } from '@/lib/requestLocale';

export const dynamic = 'force-dynamic';

const TOOL_LABELS: Record<ProToolId, { name: string; tag: string; desc: string; nameFr: string; tagFr: string; descFr: string }> = {
  'aim-tools': {
    name: 'Aim Tools', tag: 'PRECISION',
    desc: 'Sensitivity, ADS, dead zone, recoil and aim training utilities.',
    nameFr: 'Outils de visee', tagFr: 'PRECISION',
    descFr: 'Sensibilite, ADS, zone morte, recul et exercices de visee.',
  },
  'next-meta': {
    name: 'Next Meta', tag: 'INTEL',
    desc: 'Meta shift notes, perk reads and equipment direction.',
    nameFr: 'Prochaine Meta', tagFr: 'RENSEIGNEMENT',
    descFr: 'Notes de changement meta, lectures d atouts et direction d equipement.',
  },
  'pro-movement': {
    name: 'Pro Movement', tag: 'MECHANICS',
    desc: 'Slide cancel, peeking, rotation timing and high ground control.',
    nameFr: 'Mouvement Pro', tagFr: 'MECANIQUE',
    descFr: 'Slide cancel, peek, timing de rotation et controle des hauteurs.',
  },
  'how-to-be-a-pro': {
    name: 'How To Be A Pro', tag: 'MINDSET',
    desc: 'Training structure, VOD review, habits and performance tracking.',
    nameFr: 'Comment Devenir Pro', tagFr: 'MENTAL',
    descFr: 'Structure d entrainement, review VOD, habitudes et suivi de performance.',
  },
  'pro-spawn': {
    name: 'Pro Spawn', tag: 'MAP CONTROL',
    desc: 'Spawn control, hot drop plans and resurgence map routes.',
    nameFr: 'Spawn Pro', tagFr: 'CONTROLE CARTE',
    descFr: 'Controle des spawns, plans de drop et routes de carte Resurgence.',
  },
  'pro-opti': {
    name: 'Pro Opti', tag: 'PERFORMANCE',
    desc: 'PC, Windows, graphics, audio, network and latency optimisation.',
    nameFr: 'Opti Pro', tagFr: 'PERFORMANCE',
    descFr: 'Optimisation PC, Windows, graphismes, audio, reseau et latence.',
  },
};

const copy = {
  en: {
    back: 'WZPRO Meta',
    kicker: 'ACCOUNT ACCESS',
    title: 'YOUR ACCOUNT',
    sub: 'Manage your profile, purchased Pro tools and performance tracker from one place.',
    profile: 'PROFILE',
    email: 'Email',
    noEmail: 'No email provided',
    provider: 'Provider',
    access: 'Access',
    fullPro: 'Full Pro subscription',
    toolUnlocked: 'tool(s) unlocked',
    freeAccount: 'Free account',
    lastUpdate: 'Last update',
    noPurchase: 'No purchase recorded yet',
    purchases: 'PURCHASES',
    everyTool: 'Every Pro tool is available while the subscription is active.',
    monthlyTools: 'Your purchased monthly tools are available from this account.',
    noPaidTools: 'No paid Pro tool is linked to this account yet.',
    browseTools: 'Browse tools',
    profileStrength: 'Profile strength',
    publicActive: 'Public profile active',
    publicPrivate: 'Public profile private',
    mainLoadout: 'Main loadout',
    notSelected: 'Not selected',
    chooseOne: 'Choose one from the loadout section.',
    publicCard: 'Public card',
    noPseudo: 'No pseudo',
    viewProfile: 'View public profile',
    setUpProfile: 'Set up profile',
    security: 'SECURITY',
    accountSecurity: 'Account security',
    securityDesc: 'Keep sign-in and password recovery simple from one place.',
    loginEmail: 'Login email',
    noEmailAttached: 'No email attached',
    password: 'Password',
    resetByEmail: 'Reset by email',
    changePassword: 'Change password',
    billing: 'BILLING',
    accessHistory: 'Access history',
    billingDesc: 'Current account entitlements linked to your user ID and email.',
    status: 'Status',
    individualTools: 'Individual tools',
    unlockedTools: 'Unlocked tools',
    noToolsLinked: 'No paid tools linked yet',
    companionPremium: 'Companion Premium',
    manageSubscription: 'Manage subscription',
    manageSubLoading: 'Opening portal...',
    manageSubNone: 'No billing account found for this user. Manage or cancel here:',
    manageSubError: 'Billing portal temporarily unavailable. Manage or cancel here:',
    manageSubLink: 'Cancellation page',
    formKicker: 'FORM',
    formTitle: 'Your recent form',
    formDesc: 'Based on the games imported by WZPRO Companion (last 20).',
    formGames: 'games',
    formWinRate: 'Win rate',
    formTop10: 'Top 10',
    formAvgKills: 'Avg kills',
    formAvgDamage: 'Avg damage',
    formMainPrefix: 'Your main weapon: ',
    formMetaNow: 'Try the current meta: ',
    formNoMain: 'Pick a main loadout to compare it with the current meta.',
    formUpsell: 'Get a weekly coaching report with Premium',
    formEmpty: 'Connect WZPRO Companion and play a game to see your form here.',
    coachKicker: 'COACH',
    coachTitle: 'Weekly coach report',
    coachDesc: 'Trends and targeted advice from your imported games (Pro).',
    coachKdTrend: 'K/D trend',
    coachGamesAnalyzed: 'Games analyzed',
    coachLast20: 'Last 20 imported',
    coachAdvice: 'Advice',
    coachEmpty: 'Import a few games with WZPRO Companion to generate your coach report.',
    coachLocked: 'The weekly coach report is a Pro feature: trends, weak points and targeted advice.',
    coachUnlock: 'Unlock with Pro',
    coachUp: 'Improving',
    coachDown: 'Dropping',
    coachFlat: 'Stable',
    coachLowKd: 'Win more 1v1s: pre-aim head level and lower your sensitivity.',
    coachKdDown: 'Your K/D is dropping - review recent deaths and play more deliberately.',
    coachLowWin: 'Rotate earlier, before the zone closes, to reach more finishes.',
    coachDamageNoFinish: 'Lots of damage without finishing - push angles, avoid open ground.',
    coachEarlyDeath: 'You die early too often - play the opening safer and reposition.',
    coachImproving: 'Your K/D is trending up - keep the same routine and pace.',
    coachConsistent: 'Solid and consistent - set one new goal per session to keep progressing.',
    loadouts: 'LOADOUTS',
    favAndNotes: 'Favorites and private notes',
    favDesc: 'Favorite builds for quick access and keep account-synced notes only you can see.',
    library: 'LIBRARY',
    yourProTools: 'Your Pro Tools',
    activeAccount: 'Active on this account',
    locked: 'Locked',
    openTool: 'Open tool',
    unlock: 'Unlock',
    tracker: 'TRACKER',
    perfLog: 'Performance Log',
    perfDesc: 'Saved to your account, with a local browser copy as fallback.',
    openShare: 'Open share card',
    setPseudo: 'Set pseudo to share',
    companionKicker: 'WZPRO COMPANION',
    companionTitle: 'Optional auto capture',
    companionDesc: 'Run the tool on your PC during Warzone. It waits for the game to be open and active, captures only the game window, detects end-game screens, reads stats with OCR and sends them to this profile.',
    companionDownload: 'Download WZPRO Companion (.zip)',
    companionPrivacy: 'Connection opens the browser with a temporary code. No private key is displayed.',
    companionFreeTitle: 'Free tracker',
    companionFreeDesc: 'Launch WZPRO Companion while you play. It reads end-game stats locally, then sends the match summary to this profile.',
    companionHighlights: 'Highlights Pro',
    companionHighlightsDesc: 'Planned paid add-on inside the same .exe: rolling recording buffer, kill/death clips only, and an automatic best-of after each game.',
    companionBase: 'Free tracker',
    companionPro: 'Paid option',
    companionCheckout: 'Pay premium option',
    companionCheckoutLoading: 'Opening checkout...',
    companionCheckoutError: 'Payment is unavailable right now.',
    companionDevices: 'Connected devices',
    googleOAuth: 'Google OAuth',
    bnOAuth: 'Battle.net OAuth',
    appleOAuth: 'Apple OAuth',
    emailAccount: 'Email account',
    emailLogin: 'Email password login',
    oauthLogin: 'OAuth login',
  },
  fr: {
    back: 'WZPRO Meta',
    kicker: 'ACCES COMPTE',
    title: 'VOTRE COMPTE',
    sub: 'Gerer votre profil, vos outils Pro achetes et votre suivi de performance depuis un seul endroit.',
    profile: 'PROFIL',
    email: 'Email',
    noEmail: 'Aucun email fourni',
    provider: 'Fournisseur',
    access: 'Acces',
    fullPro: 'Abonnement Pro complet',
    toolUnlocked: 'outil(s) debloque(s)',
    freeAccount: 'Compte gratuit',
    lastUpdate: 'Derniere mise a jour',
    noPurchase: 'Aucun achat enregistre',
    purchases: 'ACHATS',
    everyTool: 'Tous les outils Pro sont disponibles tant que l abonnement est actif.',
    monthlyTools: 'Vos outils mensuels achetes sont disponibles depuis ce compte.',
    noPaidTools: 'Aucun outil Pro payant n est lie a ce compte.',
    browseTools: 'Explorer les outils',
    profileStrength: 'Force du profil',
    publicActive: 'Profil public actif',
    publicPrivate: 'Profil public prive',
    mainLoadout: 'Classe principale',
    notSelected: 'Non selectionne',
    chooseOne: 'Choisissez-en une dans la section classes.',
    publicCard: 'Carte publique',
    noPseudo: 'Pas de pseudo',
    viewProfile: 'Voir le profil public',
    setUpProfile: 'Configurer le profil',
    security: 'SECURITE',
    accountSecurity: 'Securite du compte',
    securityDesc: 'Gardez la connexion et la recuperation de mot de passe simples depuis un seul endroit.',
    loginEmail: 'Email de connexion',
    noEmailAttached: 'Aucun email attache',
    password: 'Mot de passe',
    resetByEmail: 'Reinitialiser par email',
    changePassword: 'Changer le mot de passe',
    billing: 'FACTURATION',
    accessHistory: 'Historique d acces',
    billingDesc: 'Droits actuels du compte lies a votre ID utilisateur et email.',
    status: 'Statut',
    individualTools: 'Outils individuels',
    unlockedTools: 'Outils debloques',
    noToolsLinked: 'Aucun outil payant lie',
    companionPremium: 'Companion Premium',
    manageSubscription: 'Gerer mon abonnement',
    manageSubLoading: 'Ouverture du portail...',
    manageSubNone: 'Aucun compte de facturation trouve pour cet utilisateur. Gere ou annule ici :',
    manageSubError: 'Portail de facturation temporairement indisponible. Gere ou annule ici :',
    manageSubLink: 'Page d annulation',
    formKicker: 'FORME',
    formTitle: 'Ta forme recente',
    formDesc: 'Basee sur les parties importees par WZPRO Companion (20 dernieres).',
    formGames: 'parties',
    formWinRate: 'Taux de victoire',
    formTop10: 'Top 10',
    formAvgKills: 'Kills moyens',
    formAvgDamage: 'Degats moyens',
    formMainPrefix: 'Ton arme principale : ',
    formMetaNow: 'Teste la meta du moment : ',
    formNoMain: 'Choisis une classe principale pour la comparer a la meta du moment.',
    formUpsell: 'Recois un rapport coach hebdo avec Premium',
    formEmpty: 'Connecte WZPRO Companion et joue une partie pour voir ta forme ici.',
    coachKicker: 'COACH',
    coachTitle: 'Rapport coach hebdo',
    coachDesc: 'Tendances et conseils cibles depuis tes parties importees (Pro).',
    coachKdTrend: 'Tendance K/D',
    coachGamesAnalyzed: 'Parties analysees',
    coachLast20: '20 dernieres importees',
    coachAdvice: 'Conseils',
    coachEmpty: 'Importe quelques parties avec WZPRO Companion pour generer ton rapport coach.',
    coachLocked: 'Le rapport coach hebdo est une fonction Pro : tendances, points faibles et conseils cibles.',
    coachUnlock: 'Debloquer avec Pro',
    coachUp: 'En progres',
    coachDown: 'En baisse',
    coachFlat: 'Stable',
    coachLowKd: 'Gagne plus de 1v1 : pre-aim hauteur de tete et baisse ta sensibilite.',
    coachKdDown: 'Ton K/D baisse - revois tes morts recentes et joue plus posement.',
    coachLowWin: 'Rote plus tot, avant la fermeture de zone, pour aller plus loin.',
    coachDamageNoFinish: 'Beaucoup de degats sans finir - joue les angles, evite le decouvert.',
    coachEarlyDeath: 'Tu meurs trop tot - joue le debut plus safe et repositionne-toi.',
    coachImproving: 'Ton K/D remonte - garde la meme routine et le meme rythme.',
    coachConsistent: 'Solide et regulier - fixe un nouvel objectif par session pour progresser.',
    loadouts: 'CLASSES',
    favAndNotes: 'Favoris et notes privees',
    favDesc: 'Builds favoris pour un acces rapide et notes synchronisees visibles uniquement par vous.',
    library: 'BIBLIOTHEQUE',
    yourProTools: 'Vos Outils Pro',
    activeAccount: 'Actif sur ce compte',
    locked: 'Verrouille',
    openTool: 'Ouvrir l outil',
    unlock: 'Debloquer',
    tracker: 'SUIVI',
    perfLog: 'Journal de performance',
    perfDesc: 'Sauvegarde sur votre compte, avec une copie locale en secours.',
    openShare: 'Ouvrir la carte de partage',
    setPseudo: 'Definir un pseudo pour partager',
    companionKicker: 'WZPRO COMPANION',
    companionTitle: 'Capture auto volontaire',
    companionDesc: 'Lance l outil sur ton PC pendant Warzone. Il attend que le jeu soit ouvert et actif, capture uniquement la fenetre du jeu, detecte les ecrans de fin de game, lit les stats par OCR et les envoie sur ce profil.',
    companionDownload: 'Telecharger WZPRO Companion (.zip)',
    companionPrivacy: 'La connexion se fait dans le navigateur avec un code temporaire. Aucune cle privee n est affichee.',
    companionFreeTitle: 'Tracker gratuit',
    companionFreeDesc: 'Lance WZPRO Companion pendant tes sessions. Il lit les stats de fin de game en local, puis envoie le resume du match sur ce profil.',
    companionHighlights: 'Temps forts Pro',
    companionHighlightsDesc: 'Module payant prevu dans le meme .exe: tampon d enregistrement, clips seulement sur elimination/mort, puis recap automatique des meilleurs moments a la fin de chaque partie.',
    companionBase: 'Tracker gratuit',
    companionPro: 'Option payante',
    companionCheckout: 'Payer l option premium',
    companionCheckoutLoading: 'Ouverture du paiement...',
    companionCheckoutError: 'Le paiement est indisponible pour le moment.',
    companionDevices: 'Appareils connectes',
    googleOAuth: 'Google OAuth',
    bnOAuth: 'Battle.net OAuth',
    appleOAuth: 'Apple OAuth',
    emailAccount: 'Compte email',
    emailLogin: 'Connexion par mot de passe email',
    oauthLogin: 'Connexion OAuth',
  },
  es: {
    back: 'WZPRO Meta',
    kicker: 'ACCESO A LA CUENTA',
    title: 'TU CUENTA',
    sub: 'Gestiona tu perfil, herramientas Pro compradas y seguimiento de rendimiento desde un solo lugar.',
    profile: 'PERFIL',
    email: 'Email',
    noEmail: 'No se proporciono email',
    provider: 'Proveedor',
    access: 'Acceso',
    fullPro: 'Suscripcion Pro completa',
    toolUnlocked: 'herramienta(s) desbloqueada(s)',
    freeAccount: 'Cuenta gratuita',
    lastUpdate: 'Ultima actualizacion',
    noPurchase: 'Sin compras registradas',
    purchases: 'COMPRAS',
    everyTool: 'Todas las herramientas Pro estan disponibles mientras la suscripcion este activa.',
    monthlyTools: 'Tus herramientas mensuales compradas estan disponibles desde esta cuenta.',
    noPaidTools: 'Ninguna herramienta Pro de pago esta vinculada a esta cuenta.',
    browseTools: 'Explorar herramientas',
    profileStrength: 'Fortaleza del perfil',
    publicActive: 'Perfil publico activo',
    publicPrivate: 'Perfil publico privado',
    mainLoadout: 'Loadout principal',
    notSelected: 'No seleccionado',
    chooseOne: 'Elige uno en la seccion de loadouts.',
    publicCard: 'Tarjeta publica',
    noPseudo: 'Sin pseudo',
    viewProfile: 'Ver perfil publico',
    setUpProfile: 'Configurar perfil',
    security: 'SEGURIDAD',
    accountSecurity: 'Seguridad de la cuenta',
    securityDesc: 'Manten el inicio de sesion y la recuperacion de contrasena simples desde un solo lugar.',
    loginEmail: 'Email de inicio de sesion',
    noEmailAttached: 'Sin email vinculado',
    password: 'Contrasena',
    resetByEmail: 'Restablecer por email',
    changePassword: 'Cambiar contrasena',
    billing: 'FACTURACION',
    accessHistory: 'Historial de acceso',
    billingDesc: 'Derechos actuales de la cuenta vinculados a tu ID de usuario y email.',
    status: 'Estado',
    individualTools: 'Herramientas individuales',
    unlockedTools: 'Herramientas desbloqueadas',
    noToolsLinked: 'Sin herramientas de pago vinculadas',
    companionPremium: 'Companion Premium',
    manageSubscription: 'Gestionar suscripcion',
    manageSubLoading: 'Abriendo portal...',
    manageSubNone: 'No se encontro cuenta de facturacion para este usuario. Gestiona o cancela aqui:',
    manageSubError: 'Portal de facturacion no disponible temporalmente. Gestiona o cancela aqui:',
    manageSubLink: 'Pagina de cancelacion',
    formKicker: 'FORMA',
    formTitle: 'Tu forma reciente',
    formDesc: 'Basado en las partidas importadas por WZPRO Companion (ultimas 20).',
    formGames: 'partidas',
    formWinRate: 'Tasa de victoria',
    formTop10: 'Top 10',
    formAvgKills: 'Bajas medias',
    formAvgDamage: 'Dano medio',
    formMainPrefix: 'Tu arma principal: ',
    formMetaNow: 'Prueba la meta actual: ',
    formNoMain: 'Elige una clase principal para compararla con la meta actual.',
    formUpsell: 'Recibe un informe de coach semanal con Premium',
    formEmpty: 'Conecta WZPRO Companion y juega una partida para ver tu forma aqui.',
    coachKicker: 'COACH',
    coachTitle: 'Informe de coach semanal',
    coachDesc: 'Tendencias y consejos desde tus partidas importadas (Pro).',
    coachKdTrend: 'Tendencia K/D',
    coachGamesAnalyzed: 'Partidas analizadas',
    coachLast20: 'Ultimas 20 importadas',
    coachAdvice: 'Consejos',
    coachEmpty: 'Importa algunas partidas con WZPRO Companion para generar tu informe de coach.',
    coachLocked: 'El informe de coach semanal es una funcion Pro: tendencias, puntos debiles y consejos.',
    coachUnlock: 'Desbloquear con Pro',
    coachUp: 'Mejorando',
    coachDown: 'Bajando',
    coachFlat: 'Estable',
    coachLowKd: 'Gana mas 1v1: pre-apunta a la altura de la cabeza y baja la sensibilidad.',
    coachKdDown: 'Tu K/D baja - revisa tus muertes recientes y juega mas tranquilo.',
    coachLowWin: 'Rota antes del cierre de zona para llegar mas lejos.',
    coachDamageNoFinish: 'Mucho dano sin rematar - juega los angulos, evita el campo abierto.',
    coachEarlyDeath: 'Mueres demasiado pronto - juega el inicio mas seguro y reposiciona.',
    coachImproving: 'Tu K/D sube - manten la misma rutina y ritmo.',
    coachConsistent: 'Solido y constante - fija un objetivo nuevo por sesion para seguir mejorando.',
    loadouts: 'LOADOUTS',
    favAndNotes: 'Favoritos y notas privadas',
    favDesc: 'Builds favoritos para acceso rapido y notas sincronizadas visibles solo para ti.',
    library: 'BIBLIOTECA',
    yourProTools: 'Tus Herramientas Pro',
    activeAccount: 'Activo en esta cuenta',
    locked: 'Bloqueado',
    openTool: 'Abrir herramienta',
    unlock: 'Desbloquear',
    tracker: 'SEGUIMIENTO',
    perfLog: 'Registro de rendimiento',
    perfDesc: 'Guardado en tu cuenta, con una copia local como respaldo.',
    openShare: 'Abrir tarjeta de compartir',
    setPseudo: 'Define un pseudo para compartir',
    companionKicker: 'WZPRO COMPANION',
    companionTitle: 'Captura automatica opcional',
    companionDesc: 'Ejecuta la herramienta en tu PC durante Warzone. Espera a que el juego este abierto y activo, captura solo la ventana del juego, detecta pantallas de fin de partida, lee las stats por OCR y las envia a este perfil.',
    companionDownload: 'Descargar WZPRO Companion (.zip)',
    companionPrivacy: 'La conexion se hace en el navegador con un codigo temporal. No se muestra ninguna clave privada.',
    companionFreeTitle: 'Tracker gratis',
    companionFreeDesc: 'Abre WZPRO Companion durante tus sesiones. Lee las stats de final de partida localmente y envia el resumen del match a este perfil.',
    companionHighlights: 'Highlights Pro',
    companionHighlightsDesc: 'Add-on de pago previsto en el mismo .exe: buffer de grabacion, clips solo en kills/muertes y best-of automatico al final de cada partida.',
    companionBase: 'Tracker gratis',
    companionPro: 'Opcion de pago',
    companionCheckout: 'Pagar opcion premium',
    companionCheckoutLoading: 'Abriendo pago...',
    companionCheckoutError: 'El pago no esta disponible ahora.',
    companionDevices: 'Dispositivos conectados',
    googleOAuth: 'Google OAuth',
    bnOAuth: 'Battle.net OAuth',
    appleOAuth: 'Apple OAuth',
    emailAccount: 'Cuenta de email',
    emailLogin: 'Inicio de sesion con contrasena de email',
    oauthLogin: 'Inicio de sesion OAuth',
  },
};

function mergeEntitlements(records: Array<EntitlementRecord | null>) {
  const tools = new Set<ProToolId>();
  let pro = false;
  let companion = false;
  let updatedAt = '';

  for (const record of records) {
    if (!record) continue;
    if (record.pro) pro = true;
    if (record.companion) companion = true;
    for (const tool of record.tools) tools.add(tool);
    if (record.updatedAt > updatedAt) updatedAt = record.updatedAt;
  }

  return {
    pro,
    companion,
    tools: Array.from(tools),
    updatedAt,
  };
}

function formatDate(value: string, locale: string) {
  if (!value) return '';
  return new Intl.DateTimeFormat(locale === 'fr' ? 'fr' : 'en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function getProviderLabel(provider: string | undefined, t: typeof copy.en) {
  switch (provider) {
    case 'google': return t.googleOAuth;
    case 'battlenet': return t.bnOAuth;
    case 'apple': return t.appleOAuth;
    default: return t.emailAccount;
  }
}

function getProviderLoginLabel(provider: string | undefined, t: typeof copy.en) {
  if (provider === 'email') return t.emailLogin;
  if (provider) return `${provider} ${t.oauthLogin}`;
  return t.emailLogin;
}

export default async function AccountPage() {
  const locale = await getRequestLocale();
  const href = (path: string) => withLocalePath(path, locale);
  const user = await getUserSession();
  if (!user) redirect(href('/sign-in?next=/account'));

  const t = (copy as Record<string, typeof copy.en>)[locale] || copy.en;

  const userEntitlements = await getEntitlements(user.sub);
  const emailEntitlements = user.email ? await getEntitlements(user.email.toLowerCase()) : null;
  const profile = await getProfile(user.sub) || emptyProfile({
    userId: user.sub,
    email: user.email,
    name: user.name,
    picture: user.picture,
  });
  const entitlements = mergeEntitlements([userEntitlements, emailEntitlements]);
  const loadouts = await getLoadouts();
  const unlockedTools = entitlements.pro ? [...PRO_TOOL_IDS] : entitlements.tools;
  const unlockedCount = unlockedTools.length;
  const profileSteps = [
    Boolean(profile.pseudo),
    Boolean(profile.profilePicture),
    Boolean(profile.profileBanner),
    Boolean(profile.description),
    Boolean(profile.favoriteLoadouts.length || profile.featuredLoadoutId),
    Boolean(profile.statsEntries.length),
    Boolean(profile.privacy.publicProfile),
  ];
  const profileCompletion = Math.round((profileSteps.filter(Boolean).length / profileSteps.length) * 100);
  const mainLoadout = loadouts.find((loadout) => loadout.id === profile.featuredLoadoutId)
    || loadouts.find((loadout) => profile.favoriteLoadouts.includes(loadout.id));
  const companionDevices = (await listCompanionDevices(user.sub)).filter((device) => !device.revoked);

  // Free personal dashboard: recent form from imported games + main weapon vs current meta.
  const formStats = getStatsSummary(profile.statsEntries);
  const hasForm = formStats.games > 0;
  const topMetaLoadout = loadouts
    .slice()
    .sort((a, b) => calculateMetaScore(b) - calculateMetaScore(a))[0] || null;
  const form = {
    kd: formStats.kd.toFixed(2),
    games: formStats.games,
    winRate: Math.round(formStats.winRate),
    topTenRate: Math.round(formStats.topTenRate),
    kills: formStats.kills.toFixed(1),
    damage: Math.round(formStats.damage),
  };
  const formInsight = mainLoadout
    ? `${t.formMainPrefix}${mainLoadout.weapon} — Tier ${mainLoadout.tier}.`
      + (topMetaLoadout && mainLoadout.tier !== 'S'
        ? ` ${t.formMetaNow}${topMetaLoadout.weapon} (Tier ${topMetaLoadout.tier}).`
        : '')
    : t.formNoMain;

  // Premium weekly coach report (Pro subscription). Free/companion users see a locked teaser.
  const coach = buildCoachReport(profile.statsEntries);
  const coachTipLabels: Record<string, string> = {
    lowKd: t.coachLowKd,
    kdDown: t.coachKdDown,
    lowWin: t.coachLowWin,
    damageNoFinish: t.coachDamageNoFinish,
    earlyDeath: t.coachEarlyDeath,
    improving: t.coachImproving,
    consistent: t.coachConsistent,
  };
  const coachTrendLabel = coach.kdTrend === 'up' ? `▲ ${t.coachUp}` : coach.kdTrend === 'down' ? `▼ ${t.coachDown}` : `→ ${t.coachFlat}`;

  const purchaseDate = entitlements.updatedAt ? formatDate(entitlements.updatedAt, locale) : t.noPurchase;
  const planLabel = entitlements.pro
    ? t.fullPro
    : entitlements.companion
      ? t.companionPremium
      : unlockedCount > 0
        ? `${unlockedCount} ${t.toolUnlocked}`
        : t.freeAccount;
  const billingPlanLabel = entitlements.pro
    ? t.fullPro
    : entitlements.companion
      ? t.companionPremium
      : unlockedCount > 0
        ? t.individualTools
        : t.freeAccount;
  const hasSubscription = entitlements.pro || entitlements.companion;

  return (
    <>
      <main className="account-main">
        <div className="account-back">
          <Link href={href('/')}>{t.back}</Link>
        </div>

        <header className="account-header">
          <div>
            <p className="account-kicker">{t.kicker}</p>
            <h1>{t.title}</h1>
            <p className="account-sub">{t.sub}</p>
          </div>
          <AccountActions />
        </header>

        <section className="account-grid">
          <article className="account-panel account-profile">
            <span className="account-panel-tag">{t.profile}</span>
            <h2>{user.name}</h2>
            <dl>
              <div>
                <dt>{t.email}</dt>
                <dd>{user.email || t.noEmail}</dd>
              </div>
              <div>
                <dt>{t.provider}</dt>
                <dd>{getProviderLabel(user.provider, t)}</dd>
              </div>
              <div>
                <dt>{t.access}</dt>
                <dd>{planLabel}</dd>
              </div>
              <div>
                <dt>{t.lastUpdate}</dt>
                <dd>{purchaseDate}</dd>
              </div>
            </dl>
          </article>

          <article className="account-panel account-summary">
            <span className="account-panel-tag">{t.purchases}</span>
            <strong>{unlockedCount}/6</strong>
            <p>
              {entitlements.pro
                ? t.everyTool
                : unlockedCount > 0
                  ? t.monthlyTools
                  : t.noPaidTools}
            </p>
            <Link href={href('/tools-individual')}>{t.browseTools}</Link>
          </article>
        </section>

        <section className="account-dashboard">
          <article>
            <span>{t.profileStrength}</span>
            <strong>{profileCompletion}%</strong>
            <p>{profile.privacy.publicProfile ? t.publicActive : t.publicPrivate}</p>
            <i style={{ ['--account-progress' as string]: `${profileCompletion}%` }} />
          </article>
          <article>
            <span>{t.mainLoadout}</span>
            <strong>{mainLoadout?.weapon || t.notSelected}</strong>
            <p>{mainLoadout ? `${mainLoadout.category} / Tier ${mainLoadout.tier}` : t.chooseOne}</p>
          </article>
          <article>
            <span>{t.publicCard}</span>
            <strong>{profile.pseudo || t.noPseudo}</strong>
            {profile.pseudo && profile.privacy.publicProfile ? (
              <Link href={href(`/profile/${profile.pseudo}`)}>{t.viewProfile}</Link>
            ) : (
              <Link href={`${href('/account')}#public-profile-settings`}>{t.setUpProfile}</Link>
            )}
          </article>
        </section>

        <section className="account-section">
          <div className="account-section-head">
            <span>{t.formKicker}</span>
            <h2>{t.formTitle}</h2>
            <p>{t.formDesc}</p>
          </div>
          {hasForm ? (
            <>
              <div className="account-dashboard account-dashboard--form">
                <article>
                  <span>K/D</span>
                  <strong>{form.kd}</strong>
                  <p>{form.games} {t.formGames}</p>
                </article>
                <article>
                  <span>{t.formWinRate}</span>
                  <strong>{form.winRate}%</strong>
                  <p>{t.formTop10}: {form.topTenRate}%</p>
                </article>
                <article>
                  <span>{t.formAvgKills}</span>
                  <strong>{form.kills}</strong>
                  <p>{t.formAvgDamage}: {form.damage}</p>
                </article>
              </div>
              <div className="account-form-insight">
                <p>{formInsight}</p>
                {!entitlements.pro ? (
                  <Link href={href('/pro-access')}>{t.formUpsell}</Link>
                ) : null}
              </div>
            </>
          ) : (
            <div className="account-form-empty">
              <p>{t.formEmpty}</p>
              <a href="/api/companion/download" download>{t.companionDownload}</a>
            </div>
          )}
        </section>

        <section className="account-section">
          <div className="account-section-head">
            <span>{t.coachKicker}</span>
            <h2>{t.coachTitle}</h2>
            <p>{t.coachDesc}</p>
          </div>
          {entitlements.pro ? (
            coach.hasData ? (
              <>
                <div className="account-dashboard account-dashboard--form">
                  <article>
                    <span>{t.coachKdTrend}</span>
                    <strong>{coach.kd.toFixed(2)}</strong>
                    <p>{coachTrendLabel}</p>
                  </article>
                  <article>
                    <span>{t.formWinRate}</span>
                    <strong>{coach.winRate}%</strong>
                    <p>{t.formTop10}: {coach.topTenRate}%</p>
                  </article>
                  <article>
                    <span>{t.coachGamesAnalyzed}</span>
                    <strong>{coach.games}</strong>
                    <p>{t.coachLast20}</p>
                  </article>
                </div>
                <div className="account-coach-tips">
                  <span>{t.coachAdvice}</span>
                  <ul>
                    {coach.tips.map((code) => (
                      <li key={code}>{coachTipLabels[code] ?? code}</li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <div className="account-form-empty">
                <p>{t.coachEmpty}</p>
                <a href="/api/companion/download" download>{t.companionDownload}</a>
              </div>
            )
          ) : (
            <div className="account-coach-locked">
              <p>{t.coachLocked}</p>
              <Link href={href('/pro-access')}>{t.coachUnlock}</Link>
            </div>
          )}
        </section>

        <section className="account-section">
          <div className="account-section-head">
            <span>{t.security}</span>
            <h2>{t.accountSecurity}</h2>
            <p>{t.securityDesc}</p>
          </div>
          <div className="account-security-grid">
            <article>
              <span>{t.loginEmail}</span>
              <strong>{user.email || t.noEmailAttached}</strong>
              <small>{getProviderLoginLabel(user.provider, t)}</small>
            </article>
            <article>
              <span>{t.password}</span>
              <strong>{t.resetByEmail}</strong>
              <Link href={href('/forgot-password')}>{t.changePassword}</Link>
            </article>
          </div>
        </section>

        <section className="account-section">
          <div className="account-section-head">
            <span>{t.billing}</span>
            <h2>{t.accessHistory}</h2>
            <p>{t.billingDesc}</p>
          </div>
          <div className="account-history">
            <article>
              <span>{t.status}</span>
              <strong>{billingPlanLabel}</strong>
              <small>{purchaseDate}</small>
            </article>
            <article>
              <span>{t.unlockedTools}</span>
              <strong>{unlockedCount}/6</strong>
              <small>{unlockedTools.length ? unlockedTools.map((toolId) => locale === 'fr' ? TOOL_LABELS[toolId].nameFr : TOOL_LABELS[toolId].name).join(', ') : t.noToolsLinked}</small>
            </article>
          </div>
          {hasSubscription ? (
            <ManageSubscriptionButton
              className="account-manage-sub"
              fallbackHref={href('/cancellation')}
              labels={{
                manage: t.manageSubscription,
                loading: t.manageSubLoading,
                none: t.manageSubNone,
                error: t.manageSubError,
                linkLabel: t.manageSubLink,
              }}
            />
          ) : null}
        </section>

        <section className="account-section" id="public-profile-settings">
          <AccountProfileForm profile={profile} />
        </section>

        <section className="account-section">
          <div className="account-section-head">
            <span>{t.loadouts}</span>
            <h2>{t.favAndNotes}</h2>
            <p>{t.favDesc}</p>
          </div>
          <AccountLoadoutPrefs
            loadouts={loadouts}
            initialFeaturedLoadoutId={profile.featuredLoadoutId}
            initialFavorites={profile.favoriteLoadouts}
            initialNotes={profile.loadoutNotes}
            locale={locale}
          />
        </section>

        <section className="account-section">
          <div className="account-section-head">
            <span>{t.library}</span>
            <h2>{t.yourProTools}</h2>
          </div>
          <div className="account-tools">
            {PRO_TOOL_IDS.map((toolId) => {
              const tool = TOOL_LABELS[toolId];
              const unlocked = entitlements.pro || entitlements.tools.includes(toolId);
              const name = locale === 'fr' ? tool.nameFr : tool.name;
              const tag = locale === 'fr' ? tool.tagFr : tool.tag;
              const desc = locale === 'fr' ? tool.descFr : tool.desc;
              return (
                <article key={toolId} className={`account-tool ${unlocked ? 'is-unlocked' : 'is-locked'}`}>
                  <div>
                    <span>{tag}</span>
                    <h3>{name}</h3>
                    <p>{desc}</p>
                    <small>{unlocked ? t.activeAccount : t.locked}</small>
                  </div>
                  {unlocked ? (
                    <Link href={href(`/tools/${toolId}`)}>{t.openTool}</Link>
                  ) : (
                    <Link href={href('/tools-individual')}>{t.unlock}</Link>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className="account-section">
          <div className="account-section-head">
            <span>{t.tracker}</span>
            <h2>{t.perfLog}</h2>
            <p>{t.perfDesc}</p>
            {profile.pseudo && profile.privacy.publicProfile && profile.privacy.stats ? (
              <Link className="account-share-stats" href={href(`/profile/${profile.pseudo}/stats`)}>
                {t.openShare}
              </Link>
            ) : (
              <Link className="account-share-stats account-share-stats--setup" href={`${href('/account')}#public-profile-settings`}>
                {t.setPseudo}
              </Link>
            )}
          </div>
          <StatsTracker initialEntries={profile.statsEntries} syncToAccount initialActivisionId={profile.activisionId} locale={locale} />
          <aside className="account-companion-panel">
            <span>{t.companionKicker}</span>
            <h3>{t.companionTitle}</h3>
            <p>{t.companionDesc}</p>
            <CompanionFeatureTabs
              freeLabel={t.companionBase}
              freeTitle={t.companionFreeTitle}
              freeDescription={t.companionFreeDesc}
              proLabel={t.companionPro}
              proTitle={t.companionHighlights}
              proDescription={t.companionHighlightsDesc}
              proCheckoutEmail={user.email || ''}
              proCheckoutLabel={t.companionCheckout}
              proCheckoutLoadingLabel={t.companionCheckoutLoading}
              proCheckoutError={t.companionCheckoutError}
            />
            <a className="account-companion-download" href="/api/companion/download" download>
              {t.companionDownload}
            </a>
            <small>{t.companionPrivacy}</small>
            <div className="account-companion-device-block">
              <strong>{t.companionDevices}</strong>
              <CompanionDeviceList initialDevices={companionDevices} />
            </div>
          </aside>
        </section>
      </main>

      <style>{`
        .account-main {
          max-width: 980px;
          margin: 0 auto;
          padding: 4rem 2rem 6rem;
        }

        .account-back a,
        .account-kicker,
        .account-panel-tag,
        .account-section-head span,
        .account-tool span {
          font-family: var(--font-mono, monospace);
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .account-back a {
          color: inherit;
          font-size: 0.65rem;
          opacity: 0.45;
          text-decoration: none;
        }

        .account-header {
          display: flex;
          justify-content: space-between;
          gap: 1.5rem;
          align-items: end;
          border-bottom: 1px solid rgba(0,0,0,0.14);
          padding: 3rem 0 2rem;
          margin-bottom: 2rem;
        }

        .account-kicker,
        .account-panel-tag,
        .account-section-head span,
        .account-tool span {
          color: blue;
          font-size: 0.6rem;
          margin: 0 0 0.45rem;
        }

        .account-header h1 {
          font-family: var(--font-mono, monospace);
          font-size: clamp(2.1rem, 6vw, 4rem);
          letter-spacing: 0.1em;
          line-height: 0.95;
          margin: 0 0 1rem;
        }

        .account-sub,
        .account-summary p,
        .account-tool p,
        .account-section-head p {
          font-family: var(--font-mono, monospace);
          font-size: 0.78rem;
          line-height: 1.7;
          opacity: 0.62;
          margin: 0;
        }

        .account-share-stats {
          display: inline-grid;
          min-height: 40px;
          place-items: center;
          margin-top: 0.75rem;
          padding: 0 0.85rem;
          border: 1px solid rgba(22,60,255,0.28);
          background: #163cff;
          color: #fff;
          font-family: var(--font-mono, monospace);
          font-size: 0.68rem;
          font-weight: 950;
          text-decoration: none;
          text-transform: uppercase;
        }

        .account-share-stats--setup {
          background: transparent;
          color: #163cff;
        }

        .account-companion-panel {
          display: grid;
          gap: 0.65rem;
          margin-top: 1rem;
          padding: 1rem;
          border: 1px solid rgba(22,60,255,0.35);
          background: rgba(22,60,255,0.04);
          font-family: var(--font-mono, monospace);
        }

        .account-companion-panel span {
          color: #163cff;
          font-size: 0.6rem;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .account-companion-panel h3 {
          margin: 0;
          font-size: 1rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .account-companion-panel p,
        .account-companion-panel small {
          margin: 0;
          color: rgba(0,0,0,0.62);
          font-size: 0.72rem;
          line-height: 1.6;
        }

        .account-companion-tabs {
          display: grid;
          gap: 0.65rem;
        }

        .account-companion-feature-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .account-companion-feature-row button {
          display: inline-flex;
          align-items: center;
          min-height: 30px;
          border: 1px solid rgba(22,60,255,0.34);
          background: transparent;
          color: #163cff;
          cursor: pointer;
          font-family: var(--font-mono, monospace);
          font-size: 0.62rem;
          font-weight: 950;
          padding: 0 0.65rem;
          text-transform: uppercase;
        }

        .account-companion-feature-row button.is-active {
          background: #163cff;
          color: #fff;
        }

        .account-companion-highlight {
          display: grid;
          gap: 0.35rem;
          border: 1px solid rgba(0,0,0,0.14);
          background: rgba(16,16,14,0.045);
          padding: 0.8rem;
        }

        .account-companion-highlight b {
          color: #10100e;
          font-size: 0.78rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .account-companion-checkout {
          display: inline-grid;
          width: fit-content;
          min-height: 36px;
          place-items: center;
          border: 1px solid rgba(22,60,255,0.45);
          background: #163cff;
          color: #fff;
          cursor: pointer;
          font-family: var(--font-mono, monospace);
          font-size: 0.62rem;
          font-weight: 950;
          letter-spacing: 0.1em;
          margin-top: 0.35rem;
          padding: 0 0.85rem;
          text-transform: uppercase;
        }

        .account-companion-checkout:disabled {
          cursor: default;
          opacity: 0.58;
        }

        .account-companion-highlight .is-error {
          color: #ff6644;
        }

        .account-companion-download {
          display: inline-grid;
          place-items: center;
          min-height: 44px;
          padding: 0 1rem;
          background: #163cff;
          border: 1px solid rgba(22,60,255,0.45);
          color: #fff;
          font-family: var(--font-mono, monospace);
          font-size: 0.68rem;
          font-weight: 900;
          letter-spacing: 0.1em;
          text-decoration: none;
          text-transform: uppercase;
        }

        .account-companion-download:hover {
          background: #0f2bcc;
        }

        .account-companion-panel code {
          display: block;
          overflow-x: auto;
          padding: 0.75rem;
          border: 1px solid rgba(0,0,0,0.14);
          background: rgba(0,0,0,0.05);
          color: #163cff;
          font-size: 0.68rem;
          line-height: 1.5;
          white-space: nowrap;
        }

        .account-companion-device-block {
          display: grid;
          gap: 0.4rem;
          padding: 0.75rem;
          border: 1px solid rgba(22,60,255,0.32);
          background: rgba(22,60,255,0.07);
        }

        .account-companion-device-block > strong {
          color: #163cff;
          font-size: 0.62rem;
          font-weight: 950;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .account-companion-devices {
          display: grid;
          gap: 0.5rem;
        }

        .account-companion-devices p {
          margin: 0;
        }

        .account-companion-devices article {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          border: 1px solid rgba(0,0,0,0.12);
          background: rgba(255,255,255,0.3);
          padding: 0.65rem;
        }

        .account-companion-devices article div {
          display: grid;
          gap: 0.25rem;
        }

        .account-companion-devices article strong {
          color: inherit;
          font-size: 0.74rem;
          text-transform: uppercase;
        }

        .account-companion-devices article small {
          color: rgba(0,0,0,0.52);
          font-size: 0.66rem;
        }

        .account-companion-devices button {
          min-height: 34px;
          border: 1px solid rgba(22,60,255,0.45);
          background: transparent;
          color: #163cff;
          cursor: pointer;
          font-family: var(--font-mono, monospace);
          font-size: 0.62rem;
          font-weight: 950;
          letter-spacing: 0.1em;
          padding: 0 0.85rem;
          text-transform: uppercase;
        }

        .account-companion-devices button:disabled {
          cursor: default;
          opacity: 0.55;
        }

        .account-action {
          min-height: 42px;
          padding: 0 1rem;
          border: 1px solid rgba(0,0,0,0.18);
          background: rgba(0,0,0,0.06);
          color: inherit;
          cursor: pointer;
          font-family: var(--font-mono, monospace);
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .account-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.4fr) minmax(260px, 0.6fr);
          gap: 1px;
          border: 1px solid rgba(0,0,0,0.12);
          background: rgba(0,0,0,0.12);
          margin-bottom: 3rem;
        }

        .account-panel {
          background: rgba(240,240,235,0.74);
          padding: 1.5rem;
        }

        .account-profile h2 {
          font-family: var(--font-mono, monospace);
          font-size: 1.25rem;
          letter-spacing: 0.08em;
          margin: 0 0 1.25rem;
        }

        .account-profile dl {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1px;
          background: rgba(0,0,0,0.1);
          border: 1px solid rgba(0,0,0,0.1);
          margin: 0;
        }

        .account-profile div {
          background: rgba(250,247,239,0.68);
          padding: 0.85rem;
          min-width: 0;
        }

        .account-profile dt {
          font-family: var(--font-mono, monospace);
          font-size: 0.52rem;
          letter-spacing: 0.14em;
          opacity: 0.42;
          text-transform: uppercase;
          margin-bottom: 0.35rem;
        }

        .account-profile dd {
          font-family: var(--font-mono, monospace);
          font-size: 0.72rem;
          margin: 0;
          overflow-wrap: anywhere;
        }

        .account-summary {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .account-summary strong {
          color: blue;
          font-family: var(--font-mono, monospace);
          font-size: 3rem;
          line-height: 1;
        }

        .account-summary a,
        .account-tool a,
        .account-dashboard a,
        .account-security-grid a {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          padding: 0 1rem;
          background: blue;
          color: white;
          font-family: var(--font-mono, monospace);
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-decoration: none;
          text-transform: uppercase;
        }

        .account-dashboard {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1px;
          border: 1px solid rgba(0,0,0,0.12);
          background: rgba(0,0,0,0.12);
          margin-bottom: 3rem;
          font-family: var(--font-mono, monospace);
        }

        .account-dashboard article {
          display: grid;
          gap: 0.65rem;
          align-content: start;
          min-height: 150px;
          background: rgba(240,240,235,0.74);
          padding: 1rem;
        }

        .account-dashboard span,
        .account-security-grid span {
          color: blue;
          font-size: 0.62rem;
          font-weight: 950;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .account-dashboard strong,
        .account-security-grid strong {
          overflow-wrap: anywhere;
          font-size: 1.25rem;
          text-transform: uppercase;
        }

        .account-dashboard p,
        .account-security-grid small,
        .account-tool small {
          margin: 0;
          color: rgba(16,16,14,0.5);
          font-size: 0.68rem;
          line-height: 1.5;
        }

        .account-dashboard i {
          display: block;
          height: 6px;
          background: linear-gradient(90deg, blue var(--account-progress), rgba(16,16,14,0.12) var(--account-progress));
        }

        .account-security-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1px;
          border: 1px solid rgba(0,0,0,0.12);
          background: rgba(0,0,0,0.12);
          font-family: var(--font-mono, monospace);
        }

        .account-security-grid article {
          display: grid;
          gap: 0.55rem;
          background: rgba(240,240,235,0.74);
          padding: 1rem;
        }

        .account-section {
          margin-top: 3rem;
        }

        .account-profile-form {
          display: grid;
          gap: 2.5rem;
          font-family: var(--font-mono, monospace);
        }

        .account-edit-block {
          display: grid;
          gap: 1rem;
        }

        .account-edit-head {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: end;
        }

        .account-edit-head h2 {
          margin: 0;
          font-size: 1.55rem;
          font-weight: 400;
          letter-spacing: 0;
        }

        .account-edit-head p,
        .account-profile-actions p {
          margin: 0;
          color: rgba(16,16,14,0.48);
          font-size: 0.68rem;
          font-style: italic;
          line-height: 1.5;
        }

        .account-general-grid {
          display: grid;
          grid-template-columns: 120px minmax(0, 1fr) minmax(0, 1fr);
          gap: 0.75rem;
          align-items: end;
        }

        .account-avatar-card {
          grid-row: span 2;
          display: grid;
          min-height: 120px;
          place-items: center;
          align-content: center;
          gap: 0.45rem;
          border: 1px solid rgba(22,60,255,0.4);
          background: rgba(22,60,255,0.04);
          color: var(--tm-ink, #10100e);
          text-align: center;
          overflow: hidden;
        }

        .account-avatar-card i {
          width: 54px;
          height: 54px;
          border-radius: 999px;
          background-position: center;
          background-size: cover;
        }

        .account-avatar-card span {
          display: grid;
          width: 54px;
          height: 54px;
          place-items: center;
          border-radius: 999px;
          background: rgba(16,16,14,0.12);
          color: blue;
          font-size: 0.82rem;
          font-weight: 950;
        }

        .account-avatar-card strong {
          max-width: 100%;
          padding: 0 0.35rem;
          font-size: 0.66rem;
          overflow-wrap: anywhere;
        }

        .account-banner-preview {
          display: grid;
          min-height: 170px;
          align-content: end;
          border: 1px solid rgba(0,0,0,0.12);
          background:
            linear-gradient(135deg, rgba(22,60,255,0.94), rgba(16,16,14,0.88));
          background-position: center;
          background-size: cover;
          color: #fff;
          padding: 1rem;
        }

        .account-banner-preview span {
          font-size: clamp(1.8rem, 5vw, 3.4rem);
          font-weight: 950;
          line-height: 0.95;
          text-transform: uppercase;
        }

        .account-two-col {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.75rem;
        }

        .account-privacy-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.75rem;
        }

        .account-privacy-grid {
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        }

        .account-public-switch {
          min-height: 42px;
          border: 1px solid rgba(0,0,0,0.14);
          background: rgba(16,16,14,0.055);
          color: rgba(16,16,14,0.72);
          cursor: pointer;
          font-family: var(--font-mono, monospace);
          font-size: 0.68rem;
          font-weight: 900;
          padding: 0 1rem;
          text-transform: uppercase;
        }

        .account-public-switch.is-public {
          border-color: rgba(22,60,255,0.45);
          background: rgba(22,60,255,0.1);
          color: #163cff;
        }

        .account-public-switch.is-private {
          border-color: rgba(195,38,38,0.34);
          background: rgba(195,38,38,0.08);
          color: #a12222;
        }

        .account-profile-form label {
          display: grid;
          gap: 0.35rem;
          color: rgba(16,16,14,0.52);
          font-size: 0.67rem;
          font-weight: 900;
          text-transform: uppercase;
        }

        .account-profile-form input,
        .account-profile-form select,
        .account-profile-form textarea {
          width: 100%;
          min-height: 42px;
          border: 1px solid rgba(0,0,0,0.12);
          border-radius: 0;
          background: rgba(16,16,14,0.055);
          color: inherit;
          font: inherit;
          font-size: 0.72rem;
          padding: 0 0.7rem;
        }

        .account-profile-form input[type="range"] {
          min-height: 28px;
          padding: 0;
          accent-color: blue;
        }

        .account-toggle {
          min-height: 44px;
          display: flex !important;
          grid-template-columns: auto 1fr;
          align-items: center;
          gap: 0.6rem !important;
          border: 1px solid rgba(0,0,0,0.12);
          background: rgba(16,16,14,0.035);
          padding: 0 0.75rem;
        }

        .account-toggle input {
          width: 16px;
          min-height: 16px;
          accent-color: blue;
        }

        .account-profile-form textarea {
          min-height: 110px;
          padding-top: 0.75rem;
          resize: vertical;
        }

        .account-profile-actions {
          display: flex;
          gap: 1rem;
          align-items: center;
          justify-content: space-between;
        }

        .account-profile-action-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .account-profile-actions button {
          min-height: 42px;
          border: 0;
          background: blue;
          color: white;
          cursor: pointer;
          font: inherit;
          font-size: 0.68rem;
          font-weight: 900;
          padding: 0 1.15rem;
          text-transform: uppercase;
        }

        .account-profile-actions .account-public-switch {
          border: 1px solid rgba(22,60,255,0.45);
          background: transparent;
          color: #163cff;
        }

        .account-profile-actions .account-public-switch.is-private {
          border-color: rgba(195,38,38,0.34);
          color: #a12222;
        }

        .account-profile-actions button:disabled {
          opacity: 0.62;
          cursor: not-allowed;
        }

        .account-profile-actions p.is-error {
          color: #c32626;
        }

        .account-loadout-prefs {
          display: grid;
          gap: 1rem;
          font-family: var(--font-mono, monospace);
        }

        .account-history {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1px;
          border: 1px solid rgba(0,0,0,0.12);
          background: rgba(0,0,0,0.12);
          font-family: var(--font-mono, monospace);
        }

        .account-manage-sub {
          margin-top: 1rem;
          display: grid;
          gap: 0.5rem;
          font-family: var(--font-mono, monospace);
        }

        .account-manage-sub button {
          justify-self: start;
          padding: 0.7rem 1.2rem;
          border: none;
          background: #163cff;
          color: #fff;
          font: inherit;
          font-size: 0.66rem;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          transition: opacity 0.15s;
        }

        .account-manage-sub button:hover:not(:disabled) { opacity: 0.82; }
        .account-manage-sub button:disabled { opacity: 0.45; cursor: not-allowed; }

        .account-manage-sub small {
          color: inherit;
          opacity: 0.66;
          font-size: 0.66rem;
          line-height: 1.5;
        }

        .account-manage-sub small a {
          color: #163cff;
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .account-dashboard--form {
          margin-bottom: 0;
        }

        .account-form-insight {
          margin-top: 1px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          padding: 1.1rem;
          border: 1px solid rgba(0,0,0,0.12);
          background: rgba(240,240,235,0.74);
          font-family: var(--font-mono, monospace);
        }

        .account-form-insight p {
          margin: 0;
          font-size: 0.74rem;
          line-height: 1.5;
          flex: 1;
          min-width: 220px;
        }

        .account-form-insight a {
          color: #fff;
          background: #163cff;
          padding: 0.6rem 1rem;
          font-size: 0.62rem;
          font-weight: 900;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          text-decoration: none;
          white-space: nowrap;
        }

        .account-form-empty {
          display: grid;
          gap: 0.7rem;
          justify-items: start;
          padding: 1.1rem;
          border: 1px solid rgba(0,0,0,0.12);
          background: rgba(240,240,235,0.74);
          font-family: var(--font-mono, monospace);
        }

        .account-form-empty p {
          margin: 0;
          font-size: 0.74rem;
          line-height: 1.5;
          opacity: 0.8;
        }

        .account-form-empty a {
          color: #fff;
          background: #163cff;
          padding: 0.6rem 1rem;
          font-size: 0.62rem;
          font-weight: 900;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          text-decoration: none;
        }

        .account-coach-tips {
          margin-top: 1px;
          display: grid;
          gap: 0.6rem;
          padding: 1.1rem;
          border: 1px solid rgba(0,0,0,0.12);
          background: rgba(240,240,235,0.74);
          font-family: var(--font-mono, monospace);
        }

        .account-coach-tips > span {
          color: #163cff;
          font-size: 0.62rem;
          font-weight: 950;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .account-coach-tips ul {
          margin: 0;
          padding-left: 1.1rem;
          display: grid;
          gap: 0.4rem;
        }

        .account-coach-tips li {
          font-size: 0.74rem;
          line-height: 1.5;
        }

        .account-coach-locked {
          display: grid;
          gap: 0.7rem;
          justify-items: start;
          padding: 1.1rem;
          border: 1px solid rgba(0,0,0,0.12);
          background: rgba(240,240,235,0.74);
          font-family: var(--font-mono, monospace);
        }

        .account-coach-locked p {
          margin: 0;
          font-size: 0.74rem;
          line-height: 1.5;
          opacity: 0.8;
        }

        .account-coach-locked a {
          color: #fff;
          background: #163cff;
          padding: 0.6rem 1rem;
          font-size: 0.62rem;
          font-weight: 900;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          text-decoration: none;
        }

        .account-history article {
          display: grid;
          gap: 0.5rem;
          background: rgba(240,240,235,0.74);
          padding: 1.1rem;
        }

        .account-history span {
          color: blue;
          font-size: 0.62rem;
          font-weight: 950;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .account-history strong {
          font-size: 1rem;
          text-transform: uppercase;
        }

        .account-history small {
          color: rgba(16,16,14,0.5);
          font-size: 0.7rem;
          line-height: 1.55;
        }

        .account-favorites {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          min-height: 42px;
          align-items: center;
        }

        .account-favorites a {
          display: inline-flex;
          gap: 0.5rem;
          align-items: center;
          border: 1px solid rgba(22,60,255,0.24);
          color: inherit;
          padding: 0.5rem 0.7rem;
          text-decoration: none;
        }

        .account-favorites span {
          color: blue;
          font-weight: 950;
        }

        .account-favorites p,
        .account-loadout-status {
          margin: 0;
          color: rgba(16,16,14,0.48);
          font-size: 0.72rem;
        }

        .account-loadout-featured {
          display: grid;
          grid-template-columns: minmax(220px, 0.8fr) minmax(0, 1.2fr);
          gap: 1rem;
          border: 1px solid rgba(0,0,0,0.12);
          background: rgba(240,240,235,0.74);
          padding: 1rem;
        }

        .account-loadout-featured-head {
          display: grid;
          gap: 0.8rem;
          align-content: space-between;
        }

        .account-loadout-featured-head div {
          display: grid;
          gap: 0.35rem;
        }

        .account-loadout-featured-head span {
          color: blue;
          font-size: 0.62rem;
          font-weight: 950;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .account-loadout-featured button,
        .account-loadout-picker button {
          width: fit-content;
          border: 1px solid blue;
          background: transparent;
          color: blue;
          cursor: pointer;
          font: inherit;
          font-size: 0.62rem;
          font-weight: 900;
          padding: 0.35rem 0.55rem;
          text-transform: uppercase;
        }

        .account-loadout-featured a {
          color: inherit;
          font-size: 1.05rem;
          font-weight: 950;
          text-decoration: none;
          text-transform: uppercase;
        }

        .account-loadout-featured small,
        .account-loadout-picker small {
          color: rgba(16,16,14,0.48);
          font-size: 0.66rem;
        }

        .account-loadout-featured textarea {
          min-height: 86px;
          border: 1px solid rgba(0,0,0,0.12);
          background: rgba(16,16,14,0.045);
          color: inherit;
          font: inherit;
          font-size: 0.72rem;
          padding: 0.75rem;
          resize: vertical;
        }

        .account-loadout-picker {
          border: 1px solid rgba(0,0,0,0.12);
          background: rgba(240,240,235,0.54);
        }

        .account-loadout-picker summary {
          cursor: pointer;
          color: blue;
          font-size: 0.68rem;
          font-weight: 950;
          letter-spacing: 0.14em;
          list-style-position: inside;
          padding: 0.85rem 1rem;
          text-transform: uppercase;
        }

        .account-loadout-picker div {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1px;
          border-top: 1px solid rgba(0,0,0,0.12);
          background: rgba(0,0,0,0.12);
        }

        .account-loadout-picker button {
          width: 100%;
          display: grid;
          gap: 0.25rem;
          justify-items: start;
          border: 0;
          background: rgba(240,240,235,0.78);
          color: inherit;
          padding: 0.85rem;
          text-align: left;
        }

        .account-loadout-picker button strong {
          color: var(--tm-ink, #10100e);
          font-size: 0.76rem;
        }

        .account-profile-form input[type="file"] {
          padding: 0.72rem 0.7rem;
        }

        .account-profile-form input::file-selector-button {
          border: 0;
          background: blue;
          color: white;
          cursor: pointer;
          font: inherit;
          font-size: 0.62rem;
          font-weight: 900;
          margin-right: 0.75rem;
          padding: 0.42rem 0.7rem;
          text-transform: uppercase;
        }

        .account-section-head {
          margin-bottom: 1.25rem;
        }

        .account-section-head h2 {
          font-family: var(--font-mono, monospace);
          font-size: 1.5rem;
          letter-spacing: 0.1em;
          margin: 0 0 0.5rem;
          text-transform: uppercase;
        }

        .account-tools {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1px;
          border: 1px solid rgba(0,0,0,0.12);
          background: rgba(0,0,0,0.12);
        }

        .account-tool {
          background: rgba(240,240,235,0.74);
          padding: 1.25rem;
          display: flex;
          align-items: start;
          justify-content: space-between;
          gap: 1rem;
          min-height: 150px;
        }

        .account-tool.is-locked {
          opacity: 0.58;
        }

        .account-tool h3 {
          font-family: var(--font-mono, monospace);
          font-size: 1rem;
          letter-spacing: 0.08em;
          margin: 0 0 0.65rem;
          text-transform: uppercase;
        }

        .account-tool small {
          display: inline-flex;
          margin-top: 0.7rem;
          text-transform: uppercase;
        }

        .account-tool.is-locked a {
          background: rgba(0,0,0,0.1);
          color: inherit;
        }

        @media (max-width: 760px) {
          .account-header,
          .account-tool {
            flex-direction: column;
            align-items: stretch;
          }

          .account-grid,
          .account-dashboard,
          .account-tools,
          .account-history,
          .account-security-grid,
          .account-profile dl,
          .account-general-grid,
          .account-two-col,
          .account-loadout-featured {
            grid-template-columns: 1fr;
          }

          .account-avatar-card {
            grid-row: auto;
          }

          .account-edit-head,
          .account-profile-actions {
            display: grid;
            justify-content: stretch;
          }
        }
      `}</style>
    </>
  );
}
