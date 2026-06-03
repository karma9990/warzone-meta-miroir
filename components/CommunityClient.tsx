'use client';

import { FormEvent, useMemo, useState } from 'react';
import AuthButton from '@/components/AuthButton';
import LocalizedLink from '@/components/LocalizedLink';
import LocalizedSafariBar from '@/components/LocalizedSafariBar';
import type { CommunityPost, CommunityPostType } from '@/lib/communityStore';
import type { Locale } from '@/lib/i18n';
import { useCurrentLocale } from '@/lib/useCurrentLocale';
import type { MessageConversation } from '@/lib/messageStore';
import type { UserSession } from '@/lib/userAuth';

type User = {
  sub: string;
  name: string;
  provider: 'google' | 'battlenet' | 'apple' | 'email';
};

type SortMode = 'hot' | 'new' | 'replies';

const starterTags = ['LFG', 'Ranked', 'Resurgence', 'Meta'];
const ALL_FILTER = 'All';
const regionOptions = [ALL_FILTER, 'EU', 'NA', 'LATAM', 'Global'];
const platformOptions = [ALL_FILTER, 'Crossplay', 'PC', 'PlayStation', 'Xbox'];
const inputOptions = [ALL_FILTER, 'Controller', 'Keyboard + mouse'];
const micOptions = [ALL_FILTER, 'Mic required', 'Mic recommended', 'Optional'];
const rankOptions = [ALL_FILTER, 'Open', 'Gold', 'Platinum', 'Diamond', 'Crimson', 'Iridescent'];
const languageOptions = [ALL_FILTER, 'English', 'French', 'Spanish', 'Portuguese'];

type CommunityCopy = {
  kicker: string;
  titleTop: string;
  titleBottom: string;
  description: string;
};

const DEFAULT_COMMUNITY_COPY: CommunityCopy = {
  kicker: 'WZ SOCIAL HUB',
  titleTop: 'COMM',
  titleBottom: 'UNITY',
  description: 'A Reddit-style space to ask questions, share builds, find squadmates and organize sessions directly on the site.',
};

const communityCopy: Record<Locale, CommunityCopy> = {
  en: DEFAULT_COMMUNITY_COPY,
  fr: {
    kicker: 'HUB SOCIAL WZ',
    titleTop: 'COMM',
    titleBottom: 'UNAUTE',
    description: 'Un espace type Reddit pour poser des questions, partager des classes, trouver des coequipiers et organiser des sessions sur le site.',
  },
  es: {
    kicker: 'HUB SOCIAL WZ',
    titleTop: 'COM',
    titleBottom: 'UNIDAD',
    description: 'Un espacio tipo Reddit para hacer preguntas, compartir clases, encontrar companeros y organizar sesiones directamente en el sitio.',
  },
  de: {
    kicker: 'WZ SOCIAL HUB',
    titleTop: 'COMM',
    titleBottom: 'UNITY',
    description: 'Ein Reddit-ahnlicher Bereich fuer Fragen, Loadouts, Mitspieler und gemeinsame Sessions direkt auf der Seite.',
  },
  it: {
    kicker: 'HUB SOCIAL WZ',
    titleTop: 'COMM',
    titleBottom: 'UNITY',
    description: 'Uno spazio in stile Reddit per domande, loadout, compagni di squadra e sessioni organizzate sul sito.',
  },
  pt: {
    kicker: 'HUB SOCIAL WZ',
    titleTop: 'COM',
    titleBottom: 'UNIDADE',
    description: 'Um espaco estilo Reddit para perguntas, loadouts, colegas de squad e sessoes organizadas no site.',
  },
  nl: {
    kicker: 'WZ SOCIAL HUB',
    titleTop: 'COMM',
    titleBottom: 'UNITY',
    description: 'Een Reddit-achtige plek voor vragen, loadouts, teamgenoten en sessies direct op de site.',
  },
  pl: {
    kicker: 'HUB SPOLECZNOSCI WZ',
    titleTop: 'SPOLE',
    titleBottom: 'CZNOSC',
    description: 'Miejsce w stylu Reddita na pytania, loadouty, szukanie druzyny i umawianie sesji na stronie.',
  },
  ja: {
    kicker: 'WZコミュニティ',
    titleTop: 'コミュ',
    titleBottom: 'ニティ',
    description: '質問、ロードアウト共有、分隊探し、セッション調整のためのコミュニティスペースです。',
  },
};

const labels: Record<Locale, Record<string, string>> = {
  en: {
    all: 'All', lfg: 'Find mates', discussion: 'Discussions', tip: 'Tips', patch: 'Patch talk',
    threads: 'threads', replies: 'replies', allPostTypes: 'All post types', hotFirst: 'Hot first', newestFirst: 'Newest first', mostReplies: 'Most replies',
    allRegions: 'All regions', allPlatforms: 'All platforms', allInputs: 'All inputs', noSearch: 'No search filter', searchPrefix: 'Search',
    profile: 'Complete player profile', region: 'Region', platform: 'Platform', input: 'Input', rank: 'Rank', mic: 'Mic', language: 'Language',
    post: 'POST', startThread: 'Start a thread', type: 'Type', signInPost: 'Sign in to post', signInBody: 'Reading is open. To publish, reply or vote, sign in with your WZ Meta account.',
    signIn: 'Sign in', title: 'Title', message: 'Message', safety: 'Respectful comms only. Insults and harassment are blocked automatically.',
    availability: 'Availability', tags: 'Tags', publishing: 'Publishing...', publish: 'Publish', dm: 'DM', privateMessages: 'Private messages',
    playerPseudo: 'Player pseudo', sending: 'Sending...', sendPrivate: 'Send private message', noPrivate: 'No private conversations yet.',
    hot: 'Hot', news: 'New', profileLink: 'Profile', report: 'Report', joinRequests: 'join requests', hotScore: 'Hot score',
    askJoin: 'Ask to join', reply: 'Reply', noThread: 'No thread found', noThreadBody: 'Change the filters or start the first post for this search.',
  },
  fr: {
    all: 'Tous', lfg: 'Trouver des mates', discussion: 'Discussions', tip: 'Conseils', patch: 'Patch notes',
    threads: 'sujets', replies: 'reponses', allPostTypes: 'Tous les types', hotFirst: 'Populaires d abord', newestFirst: 'Plus recents', mostReplies: 'Plus de reponses',
    allRegions: 'Toutes regions', allPlatforms: 'Toutes plateformes', allInputs: 'Tous inputs', noSearch: 'Aucun filtre recherche', searchPrefix: 'Recherche',
    profile: 'Completer le profil joueur', region: 'Region', platform: 'Plateforme', input: 'Input', rank: 'Rang', mic: 'Micro', language: 'Langue',
    post: 'POST', startThread: 'Creer un sujet', type: 'Type', signInPost: 'Connecte-toi pour poster', signInBody: 'La lecture est ouverte. Pour publier, repondre ou voter, connecte-toi a ton compte WZ Meta.',
    signIn: 'Connexion', title: 'Titre', message: 'Message', safety: 'Communication respectueuse uniquement. Les insultes et le harcelement sont bloques automatiquement.',
    availability: 'Disponibilite', tags: 'Tags', publishing: 'Publication...', publish: 'Publier', dm: 'DM', privateMessages: 'Messages prives',
    playerPseudo: 'Pseudo joueur', sending: 'Envoi...', sendPrivate: 'Envoyer un message prive', noPrivate: 'Aucune conversation privee.',
    hot: 'Hot', news: 'Nouveau', profileLink: 'Profil', report: 'Signaler', joinRequests: 'demandes pour rejoindre', hotScore: 'Score hot',
    askJoin: 'Demander a rejoindre', reply: 'Repondre', noThread: 'Aucun sujet trouve', noThreadBody: 'Change les filtres ou cree le premier post pour cette recherche.',
  },
  es: {
    all: 'Todo', lfg: 'Encontrar equipo', discussion: 'Debates', tip: 'Consejos', patch: 'Parches',
    threads: 'temas', replies: 'respuestas', allPostTypes: 'Todos los tipos', hotFirst: 'Populares primero', newestFirst: 'Mas recientes', mostReplies: 'Mas respuestas',
    allRegions: 'Todas las regiones', allPlatforms: 'Todas las plataformas', allInputs: 'Todos los inputs', noSearch: 'Sin filtro de busqueda', searchPrefix: 'Buscar',
    profile: 'Completar perfil de jugador', region: 'Region', platform: 'Plataforma', input: 'Input', rank: 'Rango', mic: 'Micro', language: 'Idioma',
    post: 'POST', startThread: 'Crear un tema', type: 'Tipo', signInPost: 'Inicia sesion para publicar', signInBody: 'La lectura esta abierta. Para publicar, responder o votar, inicia sesion con tu cuenta WZ Meta.',
    signIn: 'Iniciar sesion', title: 'Titulo', message: 'Mensaje', safety: 'Comunicacion respetuosa solamente. Insultos y acoso se bloquean automaticamente.',
    availability: 'Disponibilidad', tags: 'Etiquetas', publishing: 'Publicando...', publish: 'Publicar', dm: 'DM', privateMessages: 'Mensajes privados',
    playerPseudo: 'Pseudo del jugador', sending: 'Enviando...', sendPrivate: 'Enviar mensaje privado', noPrivate: 'No hay conversaciones privadas.',
    hot: 'Hot', news: 'Nuevo', profileLink: 'Perfil', report: 'Denunciar', joinRequests: 'solicitudes para unirse', hotScore: 'Puntuacion hot',
    askJoin: 'Pedir unirse', reply: 'Responder', noThread: 'No se encontro ningun tema', noThreadBody: 'Cambia los filtros o crea el primer post para esta busqueda.',
  },
  de: {
    all: 'Alle', lfg: 'Mitspieler finden', discussion: 'Diskussionen', tip: 'Tipps', patch: 'Patch Talk',
    threads: 'Threads', replies: 'Antworten', allPostTypes: 'Alle Beitragstypen', hotFirst: 'Beliebt zuerst', newestFirst: 'Neueste zuerst', mostReplies: 'Meiste Antworten',
    allRegions: 'Alle Regionen', allPlatforms: 'Alle Plattformen', allInputs: 'Alle Eingaben', noSearch: 'Kein Suchfilter', searchPrefix: 'Suche',
    profile: 'Spielerprofil vervollstaendigen', region: 'Region', platform: 'Plattform', input: 'Eingabe', rank: 'Rang', mic: 'Mikro', language: 'Sprache',
    post: 'POST', startThread: 'Thread starten', type: 'Typ', signInPost: 'Zum Posten anmelden', signInBody: 'Lesen ist offen. Zum Posten, Antworten oder Voten melde dich mit deinem WZ Meta Konto an.',
    signIn: 'Anmelden', title: 'Titel', message: 'Nachricht', safety: 'Nur respektvolle Kommunikation. Beleidigungen und Belästigung werden automatisch blockiert.',
    availability: 'Verfuegbarkeit', tags: 'Tags', publishing: 'Wird veroeffentlicht...', publish: 'Veroeffentlichen', dm: 'DM', privateMessages: 'Private Nachrichten',
    playerPseudo: 'Spielername', sending: 'Senden...', sendPrivate: 'Private Nachricht senden', noPrivate: 'Noch keine privaten Unterhaltungen.',
    hot: 'Hot', news: 'Neu', profileLink: 'Profil', report: 'Melden', joinRequests: 'Beitrittsanfragen', hotScore: 'Hot Score',
    askJoin: 'Beitritt anfragen', reply: 'Antworten', noThread: 'Kein Thread gefunden', noThreadBody: 'Aendere die Filter oder starte den ersten Post fuer diese Suche.',
  },
  it: {
    all: 'Tutti', lfg: 'Trova compagni', discussion: 'Discussioni', tip: 'Consigli', patch: 'Patch',
    threads: 'thread', replies: 'risposte', allPostTypes: 'Tutti i tipi', hotFirst: 'Popolari prima', newestFirst: 'Piu recenti', mostReplies: 'Piu risposte',
    allRegions: 'Tutte le regioni', allPlatforms: 'Tutte le piattaforme', allInputs: 'Tutti gli input', noSearch: 'Nessun filtro ricerca', searchPrefix: 'Cerca',
    profile: 'Completa profilo giocatore', region: 'Regione', platform: 'Piattaforma', input: 'Input', rank: 'Rank', mic: 'Microfono', language: 'Lingua',
    post: 'POST', startThread: 'Apri un thread', type: 'Tipo', signInPost: 'Accedi per pubblicare', signInBody: 'La lettura e aperta. Per pubblicare, rispondere o votare, accedi al tuo account WZ Meta.',
    signIn: 'Accedi', title: 'Titolo', message: 'Messaggio', safety: 'Solo comunicazioni rispettose. Insulti e molestie sono bloccati automaticamente.',
    availability: 'Disponibilita', tags: 'Tag', publishing: 'Pubblicazione...', publish: 'Pubblica', dm: 'DM', privateMessages: 'Messaggi privati',
    playerPseudo: 'Pseudo giocatore', sending: 'Invio...', sendPrivate: 'Invia messaggio privato', noPrivate: 'Nessuna conversazione privata.',
    hot: 'Hot', news: 'Nuovo', profileLink: 'Profilo', report: 'Segnala', joinRequests: 'richieste di ingresso', hotScore: 'Punteggio hot',
    askJoin: 'Chiedi di entrare', reply: 'Rispondi', noThread: 'Nessun thread trovato', noThreadBody: 'Cambia filtri o crea il primo post per questa ricerca.',
  },
  pt: {
    all: 'Todos', lfg: 'Encontrar squad', discussion: 'Discussões', tip: 'Dicas', patch: 'Patches',
    threads: 'topicos', replies: 'respostas', allPostTypes: 'Todos os tipos', hotFirst: 'Populares primeiro', newestFirst: 'Mais recentes', mostReplies: 'Mais respostas',
    allRegions: 'Todas as regioes', allPlatforms: 'Todas as plataformas', allInputs: 'Todos os inputs', noSearch: 'Sem filtro de busca', searchPrefix: 'Buscar',
    profile: 'Completar perfil do jogador', region: 'Regiao', platform: 'Plataforma', input: 'Input', rank: 'Rank', mic: 'Microfone', language: 'Idioma',
    post: 'POST', startThread: 'Criar topico', type: 'Tipo', signInPost: 'Entrar para publicar', signInBody: 'A leitura esta aberta. Para publicar, responder ou votar, entre com sua conta WZ Meta.',
    signIn: 'Entrar', title: 'Titulo', message: 'Mensagem', safety: 'Comunicacao respeitosa somente. Insultos e assedio sao bloqueados automaticamente.',
    availability: 'Disponibilidade', tags: 'Tags', publishing: 'Publicando...', publish: 'Publicar', dm: 'DM', privateMessages: 'Mensagens privadas',
    playerPseudo: 'Pseudo do jogador', sending: 'Enviando...', sendPrivate: 'Enviar mensagem privada', noPrivate: 'Nenhuma conversa privada.',
    hot: 'Hot', news: 'Novo', profileLink: 'Perfil', report: 'Denunciar', joinRequests: 'pedidos para entrar', hotScore: 'Pontuacao hot',
    askJoin: 'Pedir para entrar', reply: 'Responder', noThread: 'Nenhum topico encontrado', noThreadBody: 'Mude os filtros ou crie o primeiro post para esta busca.',
  },
  nl: {
    all: 'Alles', lfg: 'Teamgenoten zoeken', discussion: 'Discussies', tip: 'Tips', patch: 'Patchpraat',
    threads: 'threads', replies: 'reacties', allPostTypes: 'Alle posttypes', hotFirst: 'Populair eerst', newestFirst: 'Nieuwste eerst', mostReplies: 'Meeste reacties',
    allRegions: 'Alle regio’s', allPlatforms: 'Alle platforms', allInputs: 'Alle inputs', noSearch: 'Geen zoekfilter', searchPrefix: 'Zoeken',
    profile: 'Spelersprofiel aanvullen', region: 'Regio', platform: 'Platform', input: 'Input', rank: 'Rank', mic: 'Microfoon', language: 'Taal',
    post: 'POST', startThread: 'Start een thread', type: 'Type', signInPost: 'Log in om te posten', signInBody: 'Lezen is open. Log in met je WZ Meta-account om te posten, reageren of stemmen.',
    signIn: 'Inloggen', title: 'Titel', message: 'Bericht', safety: 'Alleen respectvolle communicatie. Beledigingen en intimidatie worden automatisch geblokkeerd.',
    availability: 'Beschikbaarheid', tags: 'Tags', publishing: 'Publiceren...', publish: 'Publiceren', dm: 'DM', privateMessages: 'Priveberichten',
    playerPseudo: 'Spelersnaam', sending: 'Verzenden...', sendPrivate: 'Privebericht sturen', noPrivate: 'Nog geen privegesprekken.',
    hot: 'Hot', news: 'Nieuw', profileLink: 'Profiel', report: 'Melden', joinRequests: 'deelnameverzoeken', hotScore: 'Hot score',
    askJoin: 'Vragen om mee te doen', reply: 'Reageren', noThread: 'Geen thread gevonden', noThreadBody: 'Wijzig de filters of start de eerste post voor deze zoekopdracht.',
  },
  pl: {
    all: 'Wszystko', lfg: 'Znajdz druzyne', discussion: 'Dyskusje', tip: 'Porady', patch: 'Patche',
    threads: 'watki', replies: 'odpowiedzi', allPostTypes: 'Wszystkie typy', hotFirst: 'Popularne najpierw', newestFirst: 'Najnowsze', mostReplies: 'Najwiecej odpowiedzi',
    allRegions: 'Wszystkie regiony', allPlatforms: 'Wszystkie platformy', allInputs: 'Wszystkie inputy', noSearch: 'Brak filtra wyszukiwania', searchPrefix: 'Szukaj',
    profile: 'Uzupelnij profil gracza', region: 'Region', platform: 'Platforma', input: 'Input', rank: 'Ranga', mic: 'Mikrofon', language: 'Jezyk',
    post: 'POST', startThread: 'Utworz watek', type: 'Typ', signInPost: 'Zaloguj sie, aby publikowac', signInBody: 'Czytanie jest otwarte. Aby publikowac, odpowiadac lub glosowac, zaloguj sie na konto WZ Meta.',
    signIn: 'Zaloguj', title: 'Tytul', message: 'Wiadomosc', safety: 'Tylko kulturalna komunikacja. Obrazy i nękanie sa blokowane automatycznie.',
    availability: 'Dostepnosc', tags: 'Tagi', publishing: 'Publikowanie...', publish: 'Publikuj', dm: 'DM', privateMessages: 'Prywatne wiadomosci',
    playerPseudo: 'Nick gracza', sending: 'Wysylanie...', sendPrivate: 'Wyslij prywatna wiadomosc', noPrivate: 'Brak prywatnych rozmow.',
    hot: 'Hot', news: 'Nowe', profileLink: 'Profil', report: 'Zglos', joinRequests: 'prosby o dolaczenie', hotScore: 'Hot score',
    askJoin: 'Popros o dolaczenie', reply: 'Odpowiedz', noThread: 'Nie znaleziono watku', noThreadBody: 'Zmien filtry albo utworz pierwszy post dla tego wyszukiwania.',
  },
  ja: {
    all: 'すべて', lfg: '仲間を探す', discussion: '議論', tip: 'ヒント', patch: 'パッチ',
    threads: 'スレッド', replies: '返信', allPostTypes: '全タイプ', hotFirst: '人気順', newestFirst: '新着順', mostReplies: '返信数順',
    allRegions: '全地域', allPlatforms: '全プラットフォーム', allInputs: '全入力', noSearch: '検索なし', searchPrefix: '検索',
    profile: 'プレイヤープロフィールを完成', region: '地域', platform: 'プラットフォーム', input: '入力', rank: 'ランク', mic: 'マイク', language: '言語',
    post: '投稿', startThread: 'スレッド開始', type: 'タイプ', signInPost: '投稿にはサインインが必要です', signInBody: '閲覧は可能です。投稿、返信、投票にはWZ Metaアカウントでサインインしてください。',
    signIn: 'サインイン', title: 'タイトル', message: 'メッセージ', safety: '敬意あるコミュニケーションのみ。侮辱や嫌がらせは自動的にブロックされます。',
    availability: '参加可能時間', tags: 'タグ', publishing: '投稿中...', publish: '投稿', dm: 'DM', privateMessages: 'プライベートメッセージ',
    playerPseudo: 'プレイヤー名', sending: '送信中...', sendPrivate: '個別メッセージを送信', noPrivate: 'まだ会話はありません。',
    hot: '人気', news: '新着', profileLink: 'プロフィール', report: '通報', joinRequests: '参加リクエスト', hotScore: 'Hotスコア',
    askJoin: '参加を申請', reply: '返信', noThread: 'スレッドが見つかりません', noThreadBody: 'フィルターを変更するか、この検索で最初の投稿を作成してください。',
  },
};

function labelFor(locale: Locale, key: string) {
  return labels[locale]?.[key] ?? labels.en[key] ?? key;
}

function typeLabelsFor(locale: Locale): Record<CommunityPostType | 'all', string> {
  return {
    all: labelFor(locale, 'all'),
    lfg: labelFor(locale, 'lfg'),
    discussion: labelFor(locale, 'discussion'),
    tip: labelFor(locale, 'tip'),
    patch: labelFor(locale, 'patch'),
  };
}

function formatTime(value: string) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function normalizeTags(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function localizeCommunityText(value: string, locale: Locale) {
  if (locale !== 'es') return value;

  const map: Record<string, string> = {
    'Looking for two ranked Resurgence teammates tonight': 'Busco dos companeros ranked Resurgence para esta noche',
    'Goal: clean rotations, short callouts, no rage quit. I play SMG support and I am available 21:00-00:00.': 'Objetivo: rotaciones limpias, callouts cortos y nada de rage quit. Juego soporte SMG y estoy disponible 21:00-00:00.',
    'Which SMG are you running after the latest patch?': 'Que SMG estas usando despues del ultimo parche?',
    'I am in. AR anchor, Diamond too. I can start around 21:15.': 'Me apunto. AR anchor, tambien Diamond. Puedo empezar sobre las 21:15.',
    'Mode, time, rank, playstyle...': 'Modo, hora, rango, estilo de juego...',
    'Looking for a ranked duo tonight': 'Busco duo ranked esta noche',
    'Short join request...': 'Solicitud corta para unirse...',
    'Sign in to ask to join': 'Inicia sesion para pedir unirte',
    'Reply, suggest a session, share a build...': 'Responde, propone una sesion, comparte una clase...',
    'Sign in to reply': 'Inicia sesion para responder',
  };

  return map[value] ?? value;
}

function localizeCommunityOption(value: string, locale: Locale) {
  if (locale !== 'es') return value;

  const map: Record<string, string> = {
    All: 'Todo',
    Global: 'Global',
    Crossplay: 'Crossplay',
    Controller: 'Mando',
    'Keyboard + mouse': 'Teclado + raton',
    Open: 'Abierto',
    'Mic required': 'Micro obligatorio',
    'Mic recommended': 'Micro recomendado',
    Optional: 'Opcional',
    English: 'Ingles',
    French: 'Frances',
    Spanish: 'Espanol',
    Portuguese: 'Portugues',
    Discussion: 'Debate',
  };

  return map[value] ?? value;
}

export default function CommunityClient({
  initialPosts,
  initialUser,
  initialMessages = [],
  initialCopy,
  initialPlayer = '',
}: {
  initialPosts: CommunityPost[];
  initialUser?: UserSession | null;
  initialMessages?: MessageConversation[];
  initialCopy?: CommunityCopy;
  initialPlayer?: string;
}) {
  const locale = useCurrentLocale();
  const t = (key: string) => labelFor(locale, key);
  const typeLabels = typeLabelsFor(locale);
  const copy = locale === 'en' ? (initialCopy ?? DEFAULT_COMMUNITY_COPY) : (communityCopy[locale] ?? DEFAULT_COMMUNITY_COPY);
  const [posts, setPosts] = useState(initialPosts);
  const [user] = useState<User | null>(initialUser ?? null);
  const [activeType, setActiveType] = useState<CommunityPostType | 'all'>(initialPlayer ? 'lfg' : 'all');
  const [sortMode, setSortMode] = useState<SortMode>('hot');
  const query = initialPlayer;
  const [now] = useState(() => Date.now());
  const [regionFilter, setRegionFilter] = useState(ALL_FILTER);
  const [platformFilter, setPlatformFilter] = useState(ALL_FILTER);
  const [inputFilter, setInputFilter] = useState(ALL_FILTER);
  const [micFilter, setMicFilter] = useState(ALL_FILTER);
  const [rankFilter, setRankFilter] = useState(ALL_FILTER);
  const [languageFilter, setLanguageFilter] = useState(ALL_FILTER);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [joinDrafts, setJoinDrafts] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<MessageConversation[]>(initialMessages);
  const [messageForm, setMessageForm] = useState({ recipientPseudo: initialPlayer, body: '' });
  const [busy, setBusy] = useState(false);
  const [messageBusy, setMessageBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    type: 'lfg' as CommunityPostType,
    title: initialPlayer ? `Looking to squad with ${initialPlayer}` : '',
    body: initialPlayer ? `I found ${initialPlayer}'s profile and want to set up a Warzone session.` : '',
    author: '',
    platform: 'Crossplay',
    region: 'EU',
    mode: 'Ranked Resurgence',
    mic: 'Mic required',
    rank: 'Open',
    language: 'English',
    availability: '',
    tags: initialPlayer ? `LFG, ${initialPlayer}, Ranked` : 'LFG, Ranked, EU',
  });

  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = posts.filter((post) => {
      if (post.hidden) return false;
      if (post.expiresAt && new Date(post.expiresAt).getTime() < now) return false;
      if (activeType !== 'all' && post.type !== activeType) return false;
      if (regionFilter !== ALL_FILTER && post.region !== regionFilter) return false;
      if (platformFilter !== ALL_FILTER && post.platform !== platformFilter) return false;
      if (inputFilter !== ALL_FILTER && post.authorInput !== inputFilter) return false;
      if (micFilter !== ALL_FILTER && post.mic !== micFilter) return false;
      if (rankFilter !== ALL_FILTER && post.rank !== rankFilter) return false;
      if (languageFilter !== ALL_FILTER && post.language !== languageFilter) return false;
      if (!normalizedQuery) return true;

      return [
        post.title,
        post.body,
        post.author,
        post.authorPseudo,
        post.authorPlatform,
        post.authorInput,
        post.authorRole,
        post.platform,
        post.region,
        post.mode,
        post.rank,
        post.language,
        post.availability,
        ...post.tags,
      ].join(' ').toLowerCase().includes(normalizedQuery);
    });

    return [...filtered].sort((a, b) => {
      if (sortMode === 'new') return b.createdAt.localeCompare(a.createdAt);
      if (sortMode === 'replies') return b.replies.length - a.replies.length;
      return (b.score + b.replies.length * 2) - (a.score + a.replies.length * 2);
    });
  }, [activeType, inputFilter, languageFilter, micFilter, now, platformFilter, posts, query, rankFilter, regionFilter, sortMode]);

  const lfgCount = posts.filter((post) => post.type === 'lfg').length;
  const replyCount = posts.reduce((total, post) => total + post.replies.length, 0);
  const activeFilters = [
    activeType === 'all' ? t('allPostTypes') : typeLabels[activeType],
    sortMode === 'hot' ? t('hotFirst') : sortMode === 'new' ? t('newestFirst') : t('mostReplies'),
    regionFilter === ALL_FILTER ? t('allRegions') : regionFilter,
    platformFilter === ALL_FILTER ? t('allPlatforms') : platformFilter,
    inputFilter === ALL_FILTER ? t('allInputs') : inputFilter,
    query.trim() ? `${t('searchPrefix')}: ${query.trim()}` : t('noSearch'),
  ];

  async function publishPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');

    const res = await fetch('/api/community', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        tags: normalizeTags(form.tags),
      }),
    });

    const data = await res.json();
    setBusy(false);

    if (!res.ok) {
      setError(data.error || 'Unable to publish right now.');
      return;
    }

    setPosts((current) => [data, ...current]);
    setForm((current) => ({
      ...current,
      title: '',
      body: '',
      tags: starterTags.join(', '),
    }));
  }

  async function submitReply(postId: string) {
    const body = replyDrafts[postId]?.trim();
    if (!body) return;

    const res = await fetch(`/api/community/${postId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body, author: form.author }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Unable to reply right now.');
      return;
    }

    setPosts((current) => current.map((post) => post.id === postId ? data : post));
    setReplyDrafts((current) => ({ ...current, [postId]: '' }));
  }

  async function askToJoin(postId: string) {
    if (!user) {
      setError(locale === 'es' ? 'Inicia sesion para pedir unirte a un squad.' : 'Sign in to ask to join a squad.');
      return;
    }

    const res = await fetch(`/api/community/${postId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: joinDrafts[postId] || 'I can join this session.' }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Unable to send join request right now.');
      return;
    }

    setError('Join request sent.');
    setPosts((current) => current.map((post) => post.id === postId ? data : post));
    setJoinDrafts((current) => ({ ...current, [postId]: '' }));
  }

  async function vote(postId: string, delta: 1 | -1) {
    if (!user) {
      setError('Sign in to vote on community posts.');
      return;
    }

    const res = await fetch(`/api/community/${postId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Unable to vote right now.');
      return;
    }

    setError('');
    setPosts((current) => current.map((post) => post.id === postId ? data : post));
  }

  async function reportPost(postId: string) {
    if (!user) {
      setError('Sign in to report a post.');
      return;
    }

    const res = await fetch(`/api/community/${postId}/report`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Unable to report right now.');
      return;
    }

    setError('Report queued for moderator review.');
    setPosts((current) => current.map((post) => post.id === postId ? data : post));
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      setError('Sign in to send private messages.');
      return;
    }

    setMessageBusy(true);
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messageForm),
    });

    const data = await res.json();
    setMessageBusy(false);

    if (!res.ok) {
      setError(data.error || 'Unable to send private message.');
      return;
    }

    setError('Private message sent.');
    setMessages((current) => [data, ...current.filter((conversation) => conversation.id !== data.id)]);
    setMessageForm((current) => ({ ...current, body: '' }));
  }

  return (
    <>
      <div className="pt-technical-backdrop" aria-hidden="true" />

      <LocalizedSafariBar
        active="community"
        searchPlaceholder={locale === 'es' ? 'Mate, rango, clase' : locale === 'fr' ? 'Mate, rang, classe' : locale === 'ja' ? '味方、ランク、ロードアウト' : 'Mate, rank, loadout'}
        readout={[`${posts.length} POSTS`, `${lfgCount} LFG ACTIVE`, 'CHAT: LIVE']}
      />
      <div className="community-auth-strip"><AuthButton initialUser={user} /></div>

      <main className="community-main">
        <header className="community-hero">
          <div>
            <span>{copy.kicker}</span>
            <h1><span>{copy.titleTop}</span><span>{copy.titleBottom}</span></h1>
            <p>{copy.description}</p>
          </div>
          <aside aria-label="Community stats">
            <strong>{posts.length}</strong>
            <small>{t('threads')}</small>
            <strong>{replyCount}</strong>
            <small>{t('replies')}</small>
          </aside>
        </header>

        <section className="community-matchmaking" aria-label="Matchmaking filters">
          {activeFilters.map((filter) => <span key={filter}>{filter}</span>)}
          <LocalizedLink href="/account">{t('profile')}</LocalizedLink>
        </section>

        <section className="community-filter-grid" aria-label="LFG filters">
          <label>
            {t('region')}
            <select aria-label="Select" value={regionFilter} onChange={(event) => setRegionFilter(event.target.value)}>
              {regionOptions.map((option) => <option key={option} value={option}>{localizeCommunityOption(option, locale)}</option>)}
            </select>
          </label>
          <label>
            {t('platform')}
            <select aria-label="Select" value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value)}>
              {platformOptions.map((option) => <option key={option} value={option}>{localizeCommunityOption(option, locale)}</option>)}
            </select>
          </label>
          <label>
            {t('input')}
            <select aria-label="Select" value={inputFilter} onChange={(event) => setInputFilter(event.target.value)}>
              {inputOptions.map((option) => <option key={option} value={option}>{localizeCommunityOption(option, locale)}</option>)}
            </select>
          </label>
          <label>
            {t('rank')}
            <select aria-label="Select" value={rankFilter} onChange={(event) => setRankFilter(event.target.value)}>
              {rankOptions.map((option) => <option key={option} value={option}>{localizeCommunityOption(option, locale)}</option>)}
            </select>
          </label>
          <label>
            {t('mic')}
            <select aria-label="Select" value={micFilter} onChange={(event) => setMicFilter(event.target.value)}>
              {micOptions.map((option) => <option key={option} value={option}>{localizeCommunityOption(option, locale)}</option>)}
            </select>
          </label>
          <label>
            {t('language')}
            <select aria-label="Select" value={languageFilter} onChange={(event) => setLanguageFilter(event.target.value)}>
              {languageOptions.map((option) => <option key={option} value={option}>{localizeCommunityOption(option, locale)}</option>)}
            </select>
          </label>
        </section>

        <section className="community-layout">
          <aside className="community-compose">
            <div className="community-panel-head">
              <span>{t('post')}</span>
              <h2>{t('startThread')}</h2>
            </div>
            <form onSubmit={publishPost}>
              <label>
                {t('type')}
                <select aria-label="Select" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as CommunityPostType })}>
                  <option value="lfg">{typeLabels.lfg}</option>
                  <option value="discussion">{typeLabels.discussion}</option>
                  <option value="tip">{typeLabels.tip}</option>
                  <option value="patch">{typeLabels.patch}</option>
                </select>
              </label>
              {!user && (
                <div className="community-signin-note">
                  <strong>{t('signInPost')}</strong>
                  <p>{t('signInBody')}</p>
                  <LocalizedLink href="/sign-in">{t('signIn')}</LocalizedLink>
                </div>
              )}
              <label>
                {t('title')}
                <input aria-label="Input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder={localizeCommunityText('Looking for a ranked duo tonight', locale)} required />
              </label>
              <label>
                {t('message')}
                <textarea aria-label="Textarea" value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} placeholder={localizeCommunityText('Mode, time, rank, playstyle...', locale)} required />
              </label>
              <p className="community-safety-note">{t('safety')}</p>
              <div className="community-form-grid">
                <label>
                  {t('region')}
                  <select aria-label="Select" value={form.region} onChange={(event) => setForm({ ...form, region: event.target.value })}>
                    <option value="EU">EU</option>
                    <option value="NA">NA</option>
                    <option value="LATAM">LATAM</option>
                    <option value="Global">{localizeCommunityOption('Global', locale)}</option>
                  </select>
                </label>
                <label>
                  {t('platform')}
                  <select aria-label="Select" value={form.platform} onChange={(event) => setForm({ ...form, platform: event.target.value })}>
                    <option value="Crossplay">{localizeCommunityOption('Crossplay', locale)}</option>
                    <option value="PC">PC</option>
                    <option value="PlayStation">PlayStation</option>
                    <option value="Xbox">Xbox</option>
                  </select>
                </label>
              </div>
              <div className="community-form-grid">
                <label>
                  Mode
                  <input aria-label="Input" value={form.mode} onChange={(event) => setForm({ ...form, mode: event.target.value })} />
                </label>
                <label>
                  {t('rank')}
                  <input aria-label="Input" value={form.rank} onChange={(event) => setForm({ ...form, rank: event.target.value })} />
                </label>
              </div>
              <div className="community-form-grid">
                <label>
                  {t('language')}
                  <select aria-label="Select" value={form.language} onChange={(event) => setForm({ ...form, language: event.target.value })}>
                    <option value="English">{localizeCommunityOption('English', locale)}</option>
                    <option value="French">{localizeCommunityOption('French', locale)}</option>
                    <option value="Spanish">{localizeCommunityOption('Spanish', locale)}</option>
                    <option value="Portuguese">{localizeCommunityOption('Portuguese', locale)}</option>
                  </select>
                </label>
                <label>
                  {t('availability')}
                  <input aria-label="Input" value={form.availability} onChange={(event) => setForm({ ...form, availability: event.target.value })} placeholder="Tonight 21:00-00:00" />
                </label>
              </div>
              <label>
                {t('mic')}
                <select aria-label="Select" value={form.mic} onChange={(event) => setForm({ ...form, mic: event.target.value })}>
                  <option value="Mic required">{localizeCommunityOption('Mic required', locale)}</option>
                  <option value="Mic recommended">{localizeCommunityOption('Mic recommended', locale)}</option>
                  <option value="Optional">{localizeCommunityOption('Optional', locale)}</option>
                </select>
              </label>
              <label>
                {t('tags')}
                <input aria-label="Input" value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} placeholder="LFG, Ranked, EU" />
              </label>
              {error && <p className="community-error">{error}</p>}
              <button type="submit" disabled={busy || !user}>{busy ? t('publishing') : t('publish')}</button>
            </form>

            <div className="community-messages">
              <div className="community-panel-head">
                <span>{t('dm')}</span>
                <h2>{t('privateMessages')}</h2>
              </div>
              <form onSubmit={sendMessage}>
                <label>
                  {t('playerPseudo')}
                  <input aria-label="Input"
                    value={messageForm.recipientPseudo}
                    onChange={(event) => setMessageForm({ ...messageForm, recipientPseudo: event.target.value })}
                    placeholder="CodexTest"
                    disabled={!user}
                  />
                </label>
                <label>
                  {t('message')}
                  <textarea aria-label="Textarea"
                    value={messageForm.body}
                    onChange={(event) => setMessageForm({ ...messageForm, body: event.target.value })}
                    placeholder={user ? 'Plan a session, exchange IDs, confirm roles...' : 'Sign in to message players'}
                    disabled={!user}
                  />
                </label>
                <button type="submit" disabled={!user || messageBusy}>{messageBusy ? t('sending') : t('sendPrivate')}</button>
              </form>
              <div className="community-inbox">
                {messages.slice(0, 4).map((conversation) => {
                  const last = conversation.messages.at(-1);
                  const otherId = conversation.participants.find((id) => id !== user?.sub) || conversation.participants[0];
                  const label = conversation.participantPseudos[otherId] || conversation.participantNames[otherId] || 'Player';
                  return (
                    <article key={conversation.id}>
                      <strong>{label}</strong>
                      <p>{last?.body || 'No message yet.'}</p>
                      <small>{last ? formatTime(last.createdAt) : 'New'}</small>
                    </article>
                  );
                })}
                {messages.length === 0 && <p>{t('noPrivate')}</p>}
              </div>
            </div>
          </aside>

          <section className="community-feed" aria-label="Community feed">
            <div className="community-toolbar">
              <div>
                {(Object.keys(typeLabels) as Array<CommunityPostType | 'all'>).map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={activeType === type ? 'is-active' : undefined}
                    onClick={() => setActiveType(type)}
                  >
                    {typeLabels[type]}
                  </button>
                ))}
              </div>
              <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} aria-label="Sort posts">
                <option value="hot">{t('hot')}</option>
                <option value="new">{t('news')}</option>
                <option value="replies">{t('mostReplies')}</option>
              </select>
            </div>

            <div className="community-posts">
              {filteredPosts.map((post) => {
                const canContactAuthor = Boolean(post.authorId && post.authorPseudo);

                return (
                <article className="community-post" key={post.id}>
                  <div className="community-vote-rail" aria-label={`Vote on ${post.title}`}>
                    <button type="button" onClick={() => vote(post.id, 1)} disabled={!user} aria-label="Upvote">+</button>
                    <strong>{post.score}</strong>
                    <button type="button" onClick={() => vote(post.id, -1)} disabled={!user} aria-label="Downvote">-</button>
                  </div>
                  <div className="community-post-body">
                    <div className="community-post-meta">
                      <span>{typeLabels[post.type]}</span>
                      <small>{post.author} / {post.region} / {formatTime(post.createdAt)}</small>
                    </div>
                    <h2>{localizeCommunityText(post.title, locale)}</h2>
                    <p>{localizeCommunityText(post.body, locale)}</p>
                    <div className="community-tags">
                      <span>{post.platform}</span>
                      <span>{post.mode}</span>
                      <span>{post.rank}</span>
                      <span>{post.mic}</span>
                      {post.language && <span>{post.language}</span>}
                      {post.availability && <span>{post.availability}</span>}
                      {post.tags.map((tag, index) => <span key={`${post.id}-${tag}-${index}`}>{tag}</span>)}
                    </div>
                    <div className="community-user-card">
                      <strong>{post.authorPseudo || post.author}</strong>
                      <span>{post.region} / {post.authorInput || post.platform} / {post.authorRole || post.rank}</span>
                      {canContactAuthor && <LocalizedLink href={`/profile/${encodeURIComponent(post.authorPseudo!)}`}>{t('profileLink')}</LocalizedLink>}
                      {canContactAuthor && <LocalizedLink href={`/messages/${encodeURIComponent(post.authorPseudo!)}`}>DM</LocalizedLink>}
                      <button type="button" onClick={() => reportPost(post.id)}>{t('report')}</button>
                    </div>
                    <div className="community-thread-actions">
                      <span>{post.replies.length} {t('replies')}</span>
                      <span>{post.joinRequests?.length || 0} {t('joinRequests')}</span>
                      <span>{t('hotScore')} {post.score + post.replies.length * 2}</span>
                      {post.type === 'lfg' && (
                        <>
                          <input aria-label="Input"
                            value={joinDrafts[post.id] ?? ''}
                            onChange={(event) => setJoinDrafts({ ...joinDrafts, [post.id]: event.target.value })}
                            placeholder={localizeCommunityText(user ? 'Short join request...' : 'Sign in to ask to join', locale)}
                            disabled={!user}
                          />
                          <button type="button" onClick={() => askToJoin(post.id)} disabled={!user}>{t('askJoin')}</button>
                        </>
                      )}
                    </div>
                    <div className="community-replies">
                      {post.replies.map((reply) => (
                        <div key={reply.id}>
                          <strong>{reply.author}</strong>
                          <span>{formatTime(reply.createdAt)}</span>
                          <p>{localizeCommunityText(reply.body, locale)}</p>
                        </div>
                      ))}
                    </div>
                    <div className="community-reply-box">
                      <input aria-label="Input"
                        value={replyDrafts[post.id] ?? ''}
                        onChange={(event) => setReplyDrafts({ ...replyDrafts, [post.id]: event.target.value })}
                        placeholder={localizeCommunityText(user ? 'Reply, suggest a session, share a build...' : 'Sign in to reply', locale)}
                        disabled={!user}
                      />
                      <button type="button" onClick={() => submitReply(post.id)} disabled={!user}>{t('reply')}</button>
                    </div>
                  </div>
                </article>
              );
              })}
              {filteredPosts.length === 0 && (
                <div className="community-empty">
                  <strong>{t('noThread')}</strong>
                  <p>{t('noThreadBody')}</p>
                </div>
              )}
            </div>
          </section>
        </section>
      </main>
    </>
  );
}
