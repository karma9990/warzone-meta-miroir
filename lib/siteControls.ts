import fs from 'fs';
import path from 'path';
import { getLoadouts, type Loadout } from './data';
import { calculateMetaScore } from './loadoutUtils';
import { hasUpstash, upstashCommand } from './upstash';

const CONTROLS_FILE = path.join(process.cwd(), 'data', 'site-controls.json');
const CONTROLS_KEY = 'wz:site:controls';
const BACKUP_DIR = path.join(process.cwd(), 'data', 'migration-backups');
const TOP_WEAPON_SLOTS = 8;

export type HomeControls = {
  rankingWeaponIds: string[];
  loadoutPairIds: LoadoutPairControl[];
  compareWeaponIds: string[];
  currentLongRangeId: string;
  closeMetaId: string;
  dailyDuoIds: string[];
};

export type LoadoutPairControl = {
  weaponIds: string[];
  perks: string[];
};

export type SetupSpec = {
  id: string;
  name: string;
  value: string;
  amazonUrl: string;
};

export type SetupBuild = {
  id: string;
  label: string;
  title: string;
  note: string;
  specs: SetupSpec[];
};

export type EsportSource = {
  id: string;
  name: string;
  type: string;
  url: string;
  note: string;
};

export type EsportControls = {
  starterSteps: string[];
  tournamentSources: EsportSource[];
  discordSources: EsportSource[];
};

export type SiteControls = {
  home: HomeControls;
  setup: {
    checklist: string[];
    builds: SetupBuild[];
  };
  esport: EsportControls;
  updatedAt: string;
};

const text = (value: unknown, fallback: string, max = 240) => (
  typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : fallback
);

const idText = (value: unknown, fallback: string) => text(value, fallback, 80).replace(/[^a-zA-Z0-9_-]/g, '-');

const urlText = (value: unknown, fallback: string) => {
  const candidate = text(value, fallback, 700);
  try {
    const url = new URL(candidate);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : fallback;
  } catch {
    return fallback;
  }
};

const amazonSearch = (query: string) => `https://www.amazon.fr/s?k=${encodeURIComponent(query)}`;

export const DEFAULT_SITE_CONTROLS: SiteControls = {
  home: {
    rankingWeaponIds: ['mk-78', 'kogot-7', 'meta-voyak-kt3', 'carbon-57', 'strider-300', '1777660094808'],
    loadoutPairIds: [
      { weaponIds: ['mk-78', 'kogot-7'], perks: ['Scavenger', 'Sprinter', 'Hunter'] },
      { weaponIds: ['1777660094808', 'vst'], perks: ['Scavenger', 'Sprinter', 'Hunter'] },
      { weaponIds: ['m15-mod-0', 'carbon-57'], perks: ['Scavenger', 'Sprinter', 'Hunter'] },
    ],
    compareWeaponIds: ['kogot-7', '1777660094808'],
    currentLongRangeId: 'mk-78',
    closeMetaId: 'kogot-7',
    dailyDuoIds: ['mk-78', 'kogot-7'],
  },
  setup: {
    checklist: [
      'Ethernet cable before any software tweak.',
      'Stable FPS cap before chasing average FPS.',
      'Headset EQ that keeps footsteps clear, not bass-heavy.',
      'Controller dead zones checked every few weeks.',
      'One sensitivity profile kept long enough to build muscle memory.',
      'Router QoS enabled only if it actually improves packet loss.',
    ],
    builds: [
      {
        id: 'starter-1080p',
        label: 'Starter 1080p',
        title: 'Clean 120 FPS target',
        note: 'For players who want Warzone smooth without building an expensive station. Aim for low/competitive settings and stable 1% lows.',
        specs: [
          ['cpu', 'CPU', 'Ryzen 5 5600 / i5-12400F class', 'Ryzen 5 5600 i5 12400F'],
          ['gpu', 'GPU', 'RTX 3060 / RX 6600 XT class', 'RTX 3060 RX 6600 XT'],
          ['ram', 'RAM', '16 GB DDR4, dual channel minimum', '16GB DDR4 3200 dual channel'],
          ['monitor', 'Monitor', '1080p 144 Hz', 'monitor 1080p 144hz gaming'],
          ['storage', 'Storage', 'NVMe SSD with room for COD updates', '1TB NVMe SSD gaming'],
          ['network', 'Network', 'Ethernet, no Wi-Fi if possible', 'cat 6 ethernet cable gaming'],
        ].map(([id, name, value, query]) => ({ id, name, value, amazonUrl: amazonSearch(query) })),
      },
      {
        id: 'ranked-1440p',
        label: 'Ranked 1440p',
        title: 'Competitive 165 FPS target',
        note: 'The best balance for serious ranked: sharper image than 1080p, high refresh, and enough CPU headroom for busy endgames.',
        specs: [
          ['cpu', 'CPU', 'Ryzen 5 7600 / i5-13600K class', 'Ryzen 5 7600 i5 13600K'],
          ['gpu', 'GPU', 'RTX 4070 / RX 7800 XT class', 'RTX 4070 RX 7800 XT'],
          ['ram', 'RAM', '32 GB DDR5 preferred', '32GB DDR5 6000 gaming ram'],
          ['monitor', 'Monitor', '1440p 165-180 Hz', 'monitor 1440p 165hz gaming'],
          ['audio', 'Audio', 'Closed-back headset or IEMs with clear mids/highs', 'closed back gaming headset footsteps'],
          ['input', 'Input', 'Controller with low deadzone or light FPS mouse', 'pro controller fps mouse gaming'],
        ].map(([id, name, value, query]) => ({ id, name, value, amazonUrl: amazonSearch(query) })),
      },
      {
        id: 'pro-240hz',
        label: 'Pro 240 Hz',
        title: 'High FPS sweat setup',
        note: 'For players chasing the most responsive feel: consistent frame pacing, low latency, and no stutter.',
        specs: [
          ['cpu', 'CPU', 'Ryzen 7 7800X3D / newer X3D class', 'Ryzen 7 7800X3D'],
          ['gpu', 'GPU', 'RTX 4080 Super / RX 7900 XTX class', 'RTX 4080 Super RX 7900 XTX'],
          ['ram', 'RAM', '32 GB DDR5 tuned, dual channel', '32GB DDR5 6000 CL30'],
          ['monitor', 'Monitor', '1080p or 1440p 240 Hz', '240hz gaming monitor 1440p'],
          ['cooling', 'Cooling', 'Strong airflow, stable boost clocks', 'PC case airflow CPU cooler gaming'],
          ['settings', 'Settings', 'Competitive low, VRAM budget controlled', 'gaming PC optimization accessories'],
        ].map(([id, name, value, query]) => ({ id, name, value, amazonUrl: amazonSearch(query) })),
      },
      {
        id: 'console',
        label: 'Console',
        title: 'PS5 / Xbox Series setup',
        note: 'A console setup can be very strong if the display and network are right. Focus on 120 Hz support, clean input, and stable connection.',
        specs: [
          ['console', 'Console', 'PS5 / Xbox Series X preferred', 'PS5 Xbox Series X'],
          ['display', 'Display', '1080p or 1440p 120 Hz with low input lag', '120hz gaming monitor PS5 Xbox Series X'],
          ['cable', 'Cable', 'HDMI 2.1 for compatible displays', 'HDMI 2.1 cable PS5 Xbox Series X'],
          ['controller', 'Controller', 'Fresh sticks, checked dead zones', 'PS5 Xbox pro controller'],
          ['audio', 'Audio', 'Stereo headset, avoid muddy bass EQ', 'console gaming headset stereo'],
          ['network', 'Network', 'Ethernet to router', 'cat 6 ethernet cable gaming'],
        ].map(([id, name, value, query]) => ({ id, name, value, amazonUrl: amazonSearch(query) })),
      },
    ],
  },
  esport: {
    starterSteps: [
      'Stabilize your setup: FPS, audio, sensitivity, connection, and no crashes.',
      'Grind ranked to learn rotations, timings, and fights under pressure.',
      'Start with free or low buy-in kill races and leaderboards.',
      'Find a regular duo or trio instead of playing every tournament with randoms.',
      'Join scrim Discords, read the rules, and show up for check-ins.',
      'Review your deaths, write down your mistakes, then queue again. Consistency matters more than one good night.',
    ],
    tournamentSources: [
      { id: 'checkmate-gaming', name: 'CheckMate Gaming', type: 'Cash tournaments', url: 'https://www.checkmategaming.com/de/tournament/cross-platform/warzone', note: 'Wagers, ladders, kill races, solo/duo/trio/quads formats, and cash prizes depending on open events.' },
      { id: 'console-kings', name: 'Console Kings', type: 'Daily tournaments', url: 'https://www.consolekings.com/', note: 'Esports platform with Warzone tournaments, Resurgence Kill Race, cash prizes, and NA+EU regions depending on open events.' },
      { id: 'repeat-gg', name: 'Repeat.gg', type: 'Leaderboards', url: 'https://support.repeat.gg/hc/en-us/sections/38087540602139-Call-of-Duty-Warzone', note: 'Automated tournaments and challenges, useful for starting solo with less pressure.' },
    ],
    discordSources: [
      { id: 'cod-warzone-discord', name: 'Call of Duty: Warzone Discord', type: 'Discord', url: 'https://discord.com/servers/560422033171808256', note: 'Large public server for LFG, ranked, loadouts, discussion, and first competitive contacts.' },
      { id: 'na-practice-scrims', name: 'NA Practice Scrims', type: 'Discord', url: 'https://discord.com/servers/na-practice-scrims-778438158605615115', note: 'NA server focused on practice customs, scrims, money scrims, player search, and tournament prep.' },
      { id: 'gameface-warzone', name: 'GameFace Warzone Tournaments', type: 'Discord', url: 'https://discord.com/invite/R4UEUAuesg', note: 'Warzone community with automated tournaments, skill divisions, leaderboards, and cash prizes.' },
    ],
  },
  updatedAt: '',
};

function normalizeStringArray(value: unknown, fallback: string[], maxItems: number, maxLength = 220) {
  const source = Array.isArray(value) ? value : fallback;
  return source.map((item, index) => text(item, fallback[index] ?? '', maxLength)).filter(Boolean).slice(0, maxItems);
}

function loadoutKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function buildLoadoutIdLookup(loadouts: Loadout[]) {
  const lookup = new Map<string, string>();

  for (const loadout of loadouts) {
    const aliases = [
      loadout.id,
      loadout.weaponId,
      loadout.weapon,
      loadout.weapon.replace(/\s+/g, '-'),
    ].filter((alias): alias is string => Boolean(alias));

    for (const alias of aliases) {
      const looseKey = loadoutKey(alias);
      if (looseKey && !lookup.has(looseKey)) lookup.set(looseKey, loadout.id);

      const exactKey = alias.trim().toLowerCase();
      if (exactKey && !lookup.has(exactKey)) lookup.set(exactKey, loadout.id);
    }
  }

  return lookup;
}

function resolveLoadoutId(value: string, lookup: Map<string, string>) {
  const trimmed = value.trim();
  return lookup.get(trimmed.toLowerCase()) ?? lookup.get(loadoutKey(trimmed)) ?? trimmed;
}

function normalizeHomeControlIds(home: HomeControls, loadouts: Loadout[]): HomeControls {
  const lookup = buildLoadoutIdLookup(loadouts);
  const normalizeIds = (ids: string[], maxItems: number) => (
    ids
      .map((id) => resolveLoadoutId(id, lookup))
      .filter(Boolean)
      .slice(0, maxItems)
  );
  const completeTopWeapons = (ids: string[]) => {
    const knownIds = new Set(loadouts.flatMap((loadout) => [loadout.id, loadout.weaponId].filter(Boolean) as string[]));
    const validIds = ids.filter((id) => knownIds.has(id));
    const used = new Set(validIds);
    const backfill = [...loadouts]
      .sort((a, b) => calculateMetaScore(b) - calculateMetaScore(a))
      .map((loadout) => loadout.id)
      .filter((id) => !used.has(id));

    return [...validIds, ...backfill].slice(0, TOP_WEAPON_SLOTS);
  };

  return {
    rankingWeaponIds: completeTopWeapons(normalizeIds(home.rankingWeaponIds, TOP_WEAPON_SLOTS)),
    loadoutPairIds: home.loadoutPairIds
      .map((pair) => ({
        ...pair,
        weaponIds: normalizeIds(pair.weaponIds, 2),
      }))
      .filter((pair) => pair.weaponIds.length > 0)
      .slice(0, 6),
    compareWeaponIds: normalizeIds(home.compareWeaponIds, 2),
    currentLongRangeId: home.currentLongRangeId ? resolveLoadoutId(home.currentLongRangeId, lookup) : '',
    closeMetaId: home.closeMetaId ? resolveLoadoutId(home.closeMetaId, lookup) : '',
    dailyDuoIds: normalizeIds(home.dailyDuoIds, 2),
  };
}

function normalizeLoadoutPair(value: unknown, fallback: LoadoutPairControl): LoadoutPairControl {
  const legacyWeaponIds = Array.isArray(value) ? value : null;
  const item = (value && typeof value === 'object' && !Array.isArray(value) ? value : {}) as Partial<LoadoutPairControl>;
  return {
    weaponIds: normalizeStringArray(legacyWeaponIds ?? item.weaponIds, fallback.weaponIds, 2, 80),
    perks: normalizeStringArray(item.perks, fallback.perks.length ? fallback.perks : ['Scavenger', 'Sprinter', 'Hunter'], 3, 80),
  };
}

function normalizeSource(value: unknown, fallback: EsportSource, index: number): EsportSource {
  const item = (value && typeof value === 'object' ? value : {}) as Partial<EsportSource>;
  return {
    id: idText(item.id, fallback.id || `source-${index + 1}`),
    name: text(item.name, fallback.name, 90),
    type: text(item.type, fallback.type, 60),
    url: urlText(item.url, fallback.url),
    note: text(item.note, fallback.note, 420),
  };
}

function normalizeBuild(value: unknown, fallback: SetupBuild, index: number): SetupBuild {
  const item = (value && typeof value === 'object' ? value : {}) as Partial<SetupBuild>;
  const specFallbacks = fallback.specs.length ? fallback.specs : DEFAULT_SITE_CONTROLS.setup.builds[0].specs;
  const sourceSpecs = Array.isArray(item.specs) ? item.specs : specFallbacks;
  return {
    id: idText(item.id, fallback.id || `setup-${index + 1}`),
    label: text(item.label, fallback.label, 50),
    title: text(item.title, fallback.title, 90),
    note: text(item.note, fallback.note, 420),
    specs: sourceSpecs.map((spec, specIndex) => {
      const specObject = (spec && typeof spec === 'object' ? spec : {}) as Partial<SetupSpec>;
      const specFallback = specFallbacks[specIndex] ?? { id: `spec-${specIndex + 1}`, name: 'Item', value: 'Describe item', amazonUrl: amazonSearch('gaming setup') };
      return {
        id: idText(specObject.id, specFallback.id || `spec-${specIndex + 1}`),
        name: text(specObject.name, specFallback.name, 40),
        value: text(specObject.value, specFallback.value, 160),
        amazonUrl: urlText(specObject.amazonUrl, specFallback.amazonUrl),
      };
    }).slice(0, 12),
  };
}

export function normalizeSiteControls(input: unknown): SiteControls {
  const body = (input && typeof input === 'object' ? input : {}) as Partial<SiteControls>;
  const home = (body.home ?? {}) as Partial<HomeControls>;
  const setup = (body.setup ?? {}) as Partial<SiteControls['setup']>;
  const esport = (body.esport ?? {}) as Partial<EsportControls>;

  return {
    home: {
      rankingWeaponIds: normalizeStringArray(home.rankingWeaponIds, DEFAULT_SITE_CONTROLS.home.rankingWeaponIds, TOP_WEAPON_SLOTS, 80),
      loadoutPairIds: (Array.isArray(home.loadoutPairIds) ? home.loadoutPairIds : DEFAULT_SITE_CONTROLS.home.loadoutPairIds)
        .map((pair, index) => normalizeLoadoutPair(pair, DEFAULT_SITE_CONTROLS.home.loadoutPairIds[index] ?? { weaponIds: [], perks: ['Scavenger', 'Sprinter', 'Hunter'] }))
        .filter((pair) => pair.weaponIds.length > 0)
        .slice(0, 6),
      compareWeaponIds: normalizeStringArray(home.compareWeaponIds, DEFAULT_SITE_CONTROLS.home.compareWeaponIds, 2, 80),
      currentLongRangeId: text(home.currentLongRangeId, DEFAULT_SITE_CONTROLS.home.currentLongRangeId, 80),
      closeMetaId: text(home.closeMetaId, DEFAULT_SITE_CONTROLS.home.closeMetaId, 80),
      dailyDuoIds: normalizeStringArray(home.dailyDuoIds, DEFAULT_SITE_CONTROLS.home.dailyDuoIds, 2, 80),
    },
    setup: {
      checklist: normalizeStringArray(setup.checklist, DEFAULT_SITE_CONTROLS.setup.checklist, 10, 220),
      builds: (Array.isArray(setup.builds) ? setup.builds : DEFAULT_SITE_CONTROLS.setup.builds)
        .map((build, index) => normalizeBuild(build, DEFAULT_SITE_CONTROLS.setup.builds[index] ?? DEFAULT_SITE_CONTROLS.setup.builds[0], index))
        .slice(0, 8),
    },
    esport: {
      starterSteps: normalizeStringArray(esport.starterSteps, DEFAULT_SITE_CONTROLS.esport.starterSteps, 10, 220),
      tournamentSources: (Array.isArray(esport.tournamentSources) ? esport.tournamentSources : DEFAULT_SITE_CONTROLS.esport.tournamentSources)
        .map((source, index) => normalizeSource(source, DEFAULT_SITE_CONTROLS.esport.tournamentSources[index] ?? DEFAULT_SITE_CONTROLS.esport.tournamentSources[0], index))
        .slice(0, 18),
      discordSources: (Array.isArray(esport.discordSources) ? esport.discordSources : DEFAULT_SITE_CONTROLS.esport.discordSources)
        .map((source, index) => normalizeSource(source, DEFAULT_SITE_CONTROLS.esport.discordSources[index] ?? DEFAULT_SITE_CONTROLS.esport.discordSources[0], index))
        .slice(0, 18),
    },
    updatedAt: text(body.updatedAt, '', 40),
  };
}

export function normalizeSiteControlsForLoadouts(input: unknown, loadouts: Loadout[]): SiteControls {
  const controls = normalizeSiteControls(input);
  return {
    ...controls,
    home: normalizeHomeControlIds(controls.home, loadouts),
  };
}

function backupLocalControls() {
  if (!fs.existsSync(CONTROLS_FILE)) return;
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(CONTROLS_FILE, path.join(BACKUP_DIR, `site-controls-${stamp}.json`));
}

function readLocalControls() {
  try {
    return normalizeSiteControls(JSON.parse(fs.readFileSync(CONTROLS_FILE, 'utf-8')));
  } catch {
    return DEFAULT_SITE_CONTROLS;
  }
}

function writeLocalControls(controls: SiteControls) {
  fs.mkdirSync(path.dirname(CONTROLS_FILE), { recursive: true });
  backupLocalControls();
  fs.writeFileSync(CONTROLS_FILE, JSON.stringify(controls, null, 2));
}

export async function getSiteControls(): Promise<SiteControls> {
  const loadouts = await getLoadouts();

  if (hasUpstash()) {
    const value = await upstashCommand(['GET', CONTROLS_KEY]);
    if (typeof value === 'string') return normalizeSiteControlsForLoadouts(JSON.parse(value), loadouts);
    const seed = readLocalControls();
    await saveSiteControls(seed);
    return seed;
  }

  return normalizeSiteControlsForLoadouts(readLocalControls(), loadouts);
}

export async function saveSiteControls(input: unknown): Promise<SiteControls> {
  const loadouts = await getLoadouts();
  const controls = {
    ...normalizeSiteControlsForLoadouts(input, loadouts),
    updatedAt: new Date().toISOString(),
  };

  if (hasUpstash()) {
    await upstashCommand(['SET', CONTROLS_KEY, JSON.stringify(controls)]);
    return controls;
  }

  writeLocalControls(controls);
  return controls;
}
