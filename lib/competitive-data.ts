import type { TeamRow } from '@/components/CompetitivePageShell';
import { getCachedTeamRows } from './codmunityScraper.ts';

const API_BASE = 'https://api.codmunity.gg/website/pages';

type RankedPlayer = {
  gamertag: string;
  rank: number;
  skillRating: number;
  deltaSkillRating?: number;
  updated?: number;
  player?: {
    displayName?: string;
    user?: {
      displayName?: string;
      followers?: number;
    } | null;
  } | null;
};

type CompetitionStat = {
  rank: number;
  name: string;
  players?: Array<{
    name?: string;
    gamertag?: string;
    totalKills?: number;
    totalDeaths?: number;
    avgKills?: number;
    totalKdRatio?: number;
    damageDone?: number[];
    weaponNames?: string[];
    kills?: Array<number | null>;
  }>;
  kills?: Array<number | null>;
  deaths?: Array<number | null>;
  scores?: number[];
  placements?: number[];
  totalKills?: number;
  totalDeaths?: number;
  totalScore?: number;
  totalPlacement?: number;
  avgKills?: number;
  avgPlacement?: number;
  totalKdRatio?: number;
};

type WeaponStat = {
  name?: string;
  category?: string;
  kills?: number;
};

type CompetitionPage = {
  stats?: CompetitionStat[];
  weaponStats?: WeaponStat[];
  selectedYear?: string;
  selectedStage?: string;
  selectedPhase?: string;
  selectedEvent?: string;
  years?: Array<CompetitionOptionSource>;
  stages?: Array<CompetitionOptionSource & { yearId?: string }>;
  phases?: Array<CompetitionOptionSource & { stageId?: string }>;
  events?: Array<CompetitionOptionSource & {
    phaseId?: string;
    format?: string;
    active?: boolean;
    totalMatches?: number;
    liveEndpointAvailable?: boolean;
    qualifyingThreshold?: number;
  }>;
  competitionEvents?: {
    liveEvents?: Array<{
      winners?: string;
      matchpointThreshold?: number;
      standings?: CompetitionStat[];
      phase?: { title?: string };
      stage?: { title?: string };
      year?: { title?: string };
    }>;
  };
};

type CompetitionOptionSource = {
  _id?: string;
  id?: string;
  name?: string;
  title?: string;
  urlParamName?: string;
  format?: string;
  active?: boolean;
  totalMatches?: number;
  liveEndpointAvailable?: boolean;
  qualifyingThreshold?: number;
};

export type CompetitionOption = {
  id: string;
  title: string;
  value: string;
  parentId?: string;
  format?: string;
  active?: boolean;
  totalMatches?: number;
  liveEndpointAvailable?: boolean;
  qualifyingThreshold?: number;
};

export type WrsTeam = {
  rank: number;
  name: string;
  players: string;
  points: number;
  kills: number;
  deaths: number;
  kd: number;
  avgKills: number;
  avgPlacement: number;
  placementRank: number;
  mapPlacement: number;
  mapKills: number;
  mapPoints: number;
  mapStatus: string;
  isWinner: boolean;
};

export type WrsPlayerStat = {
  name: string;
  team: string;
  kills: number;
  deaths: number;
  kd: number;
  avgKills: number;
  damageDone: number;
  favoriteWeapon: string;
};

export type WrsMapStat = {
  map: number;
  topTeam: string;
  topScore: number;
  topKills: number;
  winnerPlacement: number;
};

export type WrsWeaponStat = {
  name: string;
  category: string;
  kills: number;
};

export type WrsPageData = {
  teams: WrsTeam[];
  playerStats: WrsPlayerStat[];
  mapStats: WrsMapStat[];
  weaponStats: WrsWeaponStat[];
  topSlayers: Array<{ name: string; kills: number }>;
  topTeamKills: Array<{ name: string; kills: number }>;
  years: CompetitionOption[];
  stages: CompetitionOption[];
  phases: CompetitionOption[];
  events: CompetitionOption[];
  selected: {
    year?: CompetitionOption;
    stage?: CompetitionOption;
    phase?: CompetitionOption;
    event?: CompetitionOption;
  };
  mapNumber: number;
  gamesPlayed: number;
  topSlayer: string;
  topTeamSlayer: string;
  winner: string;
  matchpointThreshold: number;
  filters: string[];
};

export type WrsQuery = {
  year?: string;
  stage?: string;
  phase?: string;
  event?: string;
};

const pclTeamNames: Record<string, string> = {
  'Team 4': 'Twisted Minds',
  'Team 10': 'GoatClamp',
  'Team 11': 'Virtus Pro',
  'Team 1': 'JD GAMING',
  'Team 16': 'Gen.G',
  'Team 3': 'G2',
  'Team 13': 'Gentle Mates',
  'Team 9': 'For Fun Esports',
  'Team 14': 'AG Global',
  'Team 15': 'NIP',
  'Team 2': 'Ravens',
  'Team 7': 'CONTROLDEC',
  'Team 6': 'VXLCOM',
  'Team 5': 'ETCTHOMAS',
  'Team 12': 'PRAISE',
  'Team 8': 'Geekay Esports',
};

const wrsMatchPointScores: Record<string, number> = {
  'Team Falcons': 205.8,
  'Ravens Esports': 203,
  'Twisted Minds': 190.4,
  G2: 179.8,
  'NOVO Esports': 165.2,
  T1: 145.8,
  'Team Orchid': 200.2,
  'JD Gaming': 151.4,
  BRS: 132.6,
  'Team Vitality': 140.6,
  'Gen.G Esports': 138.8,
  'Virtus.Pro': 135.4,
  GodLike: 129.4,
  Gentlemates: 132.6,
  'Geekay ESports': 103.8,
  UCJ: 80.4,
};

const wrsOverallTopSlayers = [
  { name: 'Anziety', kills: 72 },
  { name: 'Swiizn', kills: 68 },
  { name: 'Niasen', kills: 67 },
  { name: 'Dongy', kills: 63 },
  { name: 'Shifty', kills: 59 },
  { name: 'Sariel', kills: 58 },
  { name: 'Grimey', kills: 57 },
  { name: 'zSmit', kills: 52 },
  { name: 'Waartex', kills: 52 },
  { name: 'blaztcitys', kills: 52 },
  { name: 'Fedee', kills: 51 },
  { name: 'kingchawk', kills: 49 },
  { name: 'Newbz', kills: 49 },
];

const wrsOverallTopTeamKills = [
  { name: 'Team Orchid', kills: 152 },
  { name: 'Ravens Esports', kills: 150 },
  { name: 'G2', kills: 144 },
  { name: 'Team Falcons', kills: 143 },
  { name: 'Twisted Minds', kills: 143 },
  { name: 'NOVO Esports', kills: 133 },
  { name: 'JD Gaming', kills: 122 },
  { name: 'T1', kills: 120 },
  { name: 'Team Vitality', kills: 117 },
  { name: 'Virtus.Pro', kills: 109 },
  { name: 'GodLike', kills: 109 },
  { name: 'Gen.G Esports', kills: 108 },
  { name: 'BRS', kills: 104 },
];

const WRS_ONLINE_QUALIFIERS = 'cod:wrs-online-qualifiers';
const WRS_ONLINE_DEFAULT_EVENTS: Record<string, string> = {
  eu: 'round-4---lobby-1',
  na: 'round-3---lobby-1',
  finals: 'na',
};

function podiumTone(rank: number): TeamRow['tone'] {
  if (rank === 1) return 'gold';
  if (rank === 2) return 'silver';
  if (rank === 3) return 'bronze';
  return undefined;
}

function displayName(player: RankedPlayer) {
  return player.player?.user?.displayName || player.player?.displayName || player.gamertag;
}

function formatDate(timestamp?: number) {
  if (!timestamp) return 'No public timestamp';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(timestamp));
}

function optionValue(option: CompetitionOptionSource) {
  return option.urlParamName || option.title || option.name || option.id || option._id || '';
}

function toOption(option: CompetitionOptionSource, parentId?: string): CompetitionOption | null {
  const id = option.id || option._id;
  const title = option.title || option.name || optionValue(option);

  if (!id || !title) return null;

  return {
    id,
    title,
    value: optionValue(option),
    parentId,
    format: 'format' in option ? option.format : undefined,
    active: 'active' in option ? option.active : undefined,
    totalMatches: 'totalMatches' in option ? option.totalMatches : undefined,
    liveEndpointAvailable: 'liveEndpointAvailable' in option ? option.liveEndpointAvailable : undefined,
    qualifyingThreshold: 'qualifyingThreshold' in option ? option.qualifyingThreshold : undefined,
  };
}

function findOption(options: CompetitionOption[], selectedId?: string) {
  return options.find((option) => option.id === selectedId) || options[0];
}

function apiParam(value?: string) {
  return value?.trim() ? encodeURIComponent(value.trim()) : 'null';
}

function normalizeWrsQuery(query: WrsQuery) {
  const year = query.year || '2026';
  const stage = query.stage || WRS_ONLINE_QUALIFIERS;
  const requestedPhase = query.phase || 'eu';
  const phase = stage.toLowerCase() === WRS_ONLINE_QUALIFIERS &&
    !['eu', 'na', 'finals'].includes(requestedPhase.toLowerCase())
    ? 'eu'
    : requestedPhase;
  const event = query.event || (
    stage.toLowerCase() === WRS_ONLINE_QUALIFIERS
      ? WRS_ONLINE_DEFAULT_EVENTS[phase.toLowerCase()]
      : undefined
  );

  return { year, stage, phase, event };
}

export async function getTop250Rows(): Promise<TeamRow[]> {
  // Source primaire : scraping LLM de codmunity.gg ; fallback : API officielle.
  try {
    const scraped = await getCachedTeamRows('top-250');
    if (scraped?.length) {
      const byRank = new Map(scraped.map((row) => [row.rank, row]));
      return Array.from({ length: 250 }, (_, index) => {
        const rank = index + 1;
        const row = byRank.get(rank);
        if (!row) {
          return {
            rank,
            team: 'Rank slot not exposed',
            players: 'Not present in scraped CODMunity page',
            unavailable: true,
          };
        }
        return {
          rank,
          team: row.team,
          players: row.players || 'CODMunity (scraped)',
          kills: row.kills || 0,
          points: row.points || 0,
          tone: podiumTone(rank),
        };
      });
    }
  } catch (error) {
    console.error('Top 250 scrape failed, falling back to API:', error);
  }

  return getTop250RowsViaApi();
}

async function getTop250RowsViaApi(): Promise<TeamRow[]> {
  const data = await fetch(`${API_BASE}/top-250`, { next: { revalidate: 1800 } }).then((response) => response.json());
  const players = new Map<number, RankedPlayer>(
    (data.rankedPlayers || []).map((player: RankedPlayer) => [player.rank + 1, player]),
  );

  return Array.from({ length: 250 }, (_, index) => {
    const rank = index + 1;
    const player = players.get(rank);

    if (!player) {
      return {
        rank,
        team: 'Rank slot not exposed',
        players: 'CODMunity public API has no player object for this slot',
        unavailable: true,
      };
    }

    return {
      rank,
      team: displayName(player),
      players: `${formatDate(player.updated)}${player.player?.user?.followers ? ` - ${player.player.user.followers} followers` : ''}`,
      kills: player.deltaSkillRating || 0,
      points: player.skillRating,
      tone: podiumTone(rank),
    };
  });
}

export async function getCompetitionRows(slug: 'wsow' | 'wrs' | 'ewc' | 'pcl'): Promise<TeamRow[]> {
  // Source primaire : scraping LLM de codmunity.gg ; fallback : API officielle.
  try {
    const scraped = await getCachedTeamRows(slug);
    if (scraped?.length) {
      return scraped
        .slice()
        .sort((a, b) => a.rank - b.rank)
        .map((row) => ({
          rank: row.rank,
          team: slug === 'pcl' ? pclTeamNames[row.team] || row.team : row.team,
          players: row.players,
          kills: row.kills || 0,
          points: row.points || 0,
          tone: podiumTone(row.rank),
        }));
    }
  } catch (error) {
    console.error(`Competition ${slug} scrape failed, falling back to API:`, error);
  }

  return getCompetitionRowsViaApi(slug);
}

async function getCompetitionRowsViaApi(slug: 'wsow' | 'wrs' | 'ewc' | 'pcl'): Promise<TeamRow[]> {
  const data: CompetitionPage = await fetch(`${API_BASE}/competition/${slug}/params/null/null/null/null`, {
    next: { revalidate: 1800 },
  }).then((response) => response.json());

  return (data.stats || [])
    .slice()
    .sort((a, b) => a.rank - b.rank)
    .map((stat) => ({
      rank: stat.rank,
      team: slug === 'pcl' ? (pclTeamNames[stat.name] || stat.name) : stat.name,
      players: (stat.players || []).map((player) => player.name || player.gamertag).filter(Boolean).join(' / '),
      kills: stat.totalKills || 0,
      points: stat.totalScore || 0,
      tone: podiumTone(stat.rank),
    }));
}

export async function getWrsPageData(query: WrsQuery = {}): Promise<WrsPageData> {
  const normalizedQuery = normalizeWrsQuery(query);

  // Classement principal scrape par LLM (fallback : stats de l'API ci-dessous).
  let scrapedWrsTeams: WrsTeam[] | null = null;
  try {
    const scraped = await getCachedTeamRows('wrs');
    if (scraped?.length) {
      scrapedWrsTeams = scraped
        .slice()
        .sort((a, b) => a.rank - b.rank)
        .map((row, index) => ({
          rank: index + 1,
          name: row.team,
          players: row.players,
          points: row.points || 0,
          kills: row.kills || 0,
          deaths: 0,
          kd: 0,
          avgKills: 0,
          avgPlacement: 0,
          placementRank: 0,
          mapPlacement: 0,
          mapKills: 0,
          mapPoints: 0,
          mapStatus: 'Dead',
          isWinner: index === 0,
        }));
    }
  } catch (error) {
    console.error('WRS scrape failed, falling back to API teams:', error);
  }

  const data: CompetitionPage = await fetch(`${API_BASE}/competition/wrs/params/${apiParam(normalizedQuery.year)}/${apiParam(normalizedQuery.stage)}/${apiParam(normalizedQuery.phase)}/${apiParam(normalizedQuery.event)}`, {
    next: { revalidate: 1800 },
  }).then((response) => response.json());

  const liveEvent = data.competitionEvents?.liveEvents?.[0];
  const years = (data.years || []).map((option) => toOption(option)).filter((option): option is CompetitionOption => Boolean(option));
  const stages = (data.stages || []).map((option) => toOption(option, option.yearId)).filter((option): option is CompetitionOption => Boolean(option));
  const phases = (data.phases || []).map((option) => toOption(option, option.stageId)).filter((option): option is CompetitionOption => Boolean(option));
  const events = (data.events || []).map((option) => toOption(option, option.phaseId)).filter((option): option is CompetitionOption => Boolean(option));
  const selected = {
    year: findOption(years, data.selectedYear),
    stage: findOption(stages, data.selectedStage),
    phase: findOption(phases, data.selectedPhase),
    event: findOption(events, data.selectedEvent),
  };
  const stats = (data.stats || []).slice().sort((a, b) => a.rank - b.rank);
  const gamesPlayed = Math.max(...stats.map((stat) => stat.scores?.length || 0), 0);
  const currentMapIndex = Math.max(gamesPlayed - 1, 0);
  const winner = liveEvent?.winners || '';
  const topPlayer = stats
    .flatMap((stat) => stat.players || [])
    .sort((a, b) => (b.totalKills || 0) - (a.totalKills || 0))[0];
  const topTeam = stats.slice().sort((a, b) => (b.totalKills || 0) - (a.totalKills || 0))[0];
  const playerStats = stats
    .flatMap((stat) => (stat.players || []).map((player) => ({
      name: player.name || player.gamertag || 'Unknown',
      team: stat.name,
      kills: player.totalKills || 0,
      deaths: player.totalDeaths || 0,
      kd: player.totalKdRatio || ((player.totalKills || 0) / Math.max(player.totalDeaths || 1, 1)),
      avgKills: player.avgKills || 0,
      damageDone: Array.isArray(player.damageDone)
        ? player.damageDone.reduce((total, damage) => total + (Number(damage) || 0), 0)
        : 0,
      favoriteWeapon: Array.isArray(player.weaponNames) && player.weaponNames.length
        ? player.weaponNames[player.weaponNames.length - 1] || 'Unknown'
        : 'Unknown',
    })))
    .sort((a, b) => b.kills - a.kills);
  const mapStats = Array.from({ length: gamesPlayed }, (_, index) => {
    const topMapTeam = stats
      .slice()
      .sort((a, b) => (b.scores?.[index] || 0) - (a.scores?.[index] || 0))[0];

    return {
      map: index + 1,
      topTeam: topMapTeam?.name || 'Unknown',
      topScore: topMapTeam?.scores?.[index] || 0,
      topKills: topMapTeam?.kills?.[index] || 0,
      winnerPlacement: topMapTeam?.placements?.[index] || 0,
    };
  });
  const weaponStats = (data.weaponStats || [])
    .map((weapon) => ({
      name: weapon.name || 'Unknown',
      category: weapon.category || 'Unknown',
      kills: weapon.kills || 0,
    }))
    .sort((a, b) => b.kills - a.kills);

  const teams = stats
    .map((stat) => {
      const mapKills = stat.kills?.[currentMapIndex] || 0;
      const mapPoints = stat.scores?.[currentMapIndex] || 0;
      const mapPlacement = stat.placements?.[currentMapIndex] || 0;

      return {
        rank: stat.rank,
        name: stat.name,
        players: (stat.players || []).map((player) => player.name || player.gamertag).filter(Boolean).join(' / '),
        points: wrsMatchPointScores[stat.name] || stat.totalScore || 0,
        kills: stat.totalKills || 0,
        deaths: stat.totalDeaths || 0,
        kd: stat.totalKdRatio || ((stat.totalKills || 0) / Math.max(stat.totalDeaths || 1, 1)),
        avgKills: stat.avgKills || 0,
        avgPlacement: stat.avgPlacement || 0,
        placementRank: stat.totalPlacement || 0,
        mapPlacement,
        mapKills,
        mapPoints,
        mapStatus: 'Dead',
        isWinner: stat.name === winner,
      };
    })
    .sort((a, b) => {
      if (a.isWinner) return -1;
      if (b.isWinner) return 1;
      return b.points - a.points;
    })
    .map((team, index) => ({ ...team, rank: index + 1 }));

  return {
    teams: scrapedWrsTeams ?? teams,
    playerStats,
    mapStats,
    weaponStats,
    topSlayers: wrsOverallTopSlayers,
    topTeamKills: wrsOverallTopTeamKills,
    years,
    stages,
    phases,
    events,
    selected,
    mapNumber: gamesPlayed,
    gamesPlayed,
    topSlayer: topPlayer?.name || topPlayer?.gamertag || 'Unknown',
    topTeamSlayer: topTeam?.name || 'Unknown',
    winner,
    matchpointThreshold: liveEvent?.matchpointThreshold || selected.event?.qualifyingThreshold || 150,
    filters: [
      selected.year?.title || liveEvent?.year?.title || '2026',
      selected.stage?.title || liveEvent?.stage?.title || 'COD:WRS Atlanta',
      selected.phase?.title || liveEvent?.phase?.title || 'LAN Finals',
      selected.event?.title || 'Finals',
    ],
  };
}
