import fs from 'fs';
import path from 'path';
import { hasUpstash, upstashCommand } from './upstash';

const SITE_CONTENT_FILE = path.join(process.cwd(), 'data', 'site-content.json');
const BACKUP_DIR = path.join(process.cwd(), 'data', 'migration-backups');
const SITE_CONTENT_KEY = 'wz:site-content';

type TextPair = {
  title: string;
  body: string;
};

type FreePreviewFeature = TextPair & {
  eyebrow: string;
};

type FreePreviewMetaSignal = {
  weapon: string;
  status: string;
  note: string;
};

export type SiteContent = {
  home: {
    metaLeft: string;
    metaCenter: string;
    metaRight: string;
    titleTop: string;
    titleMiddle: string;
    titleBottom: string;
    eyebrow: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
  };
  proAccess: {
    backLabel: string;
    badge: string;
    tag: string;
    title: string;
    description: string;
    price: string;
    period: string;
    proofs: TextPair[];
    cta: string;
  };
  freePreview: {
    backLabel: string;
    kicker: string;
    title: string;
    lead: string;
    primaryCta: string;
    secondaryCta: string;
    features: FreePreviewFeature[];
    currentKicker: string;
    currentTitle: string;
    patchChecked: string;
    patchUrl: string;
    patchLinkLabel: string;
    patchHighlights: TextPair[];
    metaKicker: string;
    metaTitle: string;
    metaSignals: FreePreviewMetaSignal[];
    mapKicker: string;
    mapTitle: string;
    mapNotes: string[];
    checklistKicker: string;
    checklistTitle: string;
    weeklyChecklist: string[];
    sampleKicker: string;
    sampleTitle: string;
    sampleBriefing: TextPair[];
  };
  community: {
    kicker: string;
    titleTop: string;
    titleBottom: string;
    description: string;
  };
  updatedAt: string;
};

export const DEFAULT_SITE_CONTENT: SiteContent = {
  home: {
    metaLeft: 'WZ_META / GD_FOUNDRY',
    metaCenter: 'TYPEFACE / TACTICAL MONO',
    metaRight: 'AO-17 VERDANSK NORTH',
    titleTop: 'WARZONE',
    titleMiddle: 'PRO',
    titleBottom: 'META',
    eyebrow: '[ META LIVE ]',
    description: 'Find the best Warzone loadout, compare meta weapons and tune your setup before the lobby even loads.',
    primaryCta: 'View loadouts',
    secondaryCta: 'Open Pro Tools',
  },
  proAccess: {
    backLabel: '← BACK',
    badge: 'MOST POPULAR',
    tag: 'PRO TIER',
    title: 'GET PRO ACCESS',
    description: 'Access every Pro Tool in one place, with loadout breakdowns, rotation guides and practical Warzone analysis.',
    price: '50 €',
    period: '/ month — no commitment',
    proofs: [
      { title: 'Preview before purchase', body: 'You can see the modules, expected outcomes and free excerpts before paying.' },
      { title: 'Everything in one place', body: 'Aim, movement, meta, spawns, mindset and optimization are grouped into one access path.' },
      { title: 'No long commitment', body: 'Monthly subscription, cancellable according to the policy shown before checkout.' },
    ],
    cta: 'GET STARTED — 50 € / MONTH',
  },
  freePreview: {
    backLabel: 'BACK TO PRO TOOLS',
    kicker: 'WZPRO META / FREE TIER',
    title: 'Free preview',
    lead: 'This is what the free newsletter gives you: the useful meta signals without a paid subscription, sent as a clean inbox briefing when something matters.',
    primaryCta: 'Subscribe free',
    secondaryCta: 'Upgrade to Pro',
    features: [
      {
        title: 'Weekly meta newsletter',
        eyebrow: 'Every week',
        body: 'A compact read on what changed, what matters, and what to test first before you waste sessions on stale setups.',
      },
      {
        title: 'Patch notes digest',
        eyebrow: 'After updates',
        body: 'Patch changes translated into practical loadout, perk, movement, map-control and settings decisions.',
      },
      {
        title: 'Resurgence map updates',
        eyebrow: 'Map flow',
        body: 'Rotation, spawn, power-position and regain notes when the playable flow changes across Resurgence maps.',
      },
      {
        title: 'New weapon tier alerts',
        eyebrow: 'Meta shifts',
        body: 'Early signals when a weapon climbs, falls, or needs a fresh attachment pass after tuning changes.',
      },
      {
        title: 'Community tips & tricks',
        eyebrow: 'Player notes',
        body: 'Useful setups, routines and small improvements collected for regular players who want cleaner games.',
      },
    ],
    currentKicker: 'Current free briefing',
    currentTitle: 'Warzone Season 03 Reloaded',
    patchChecked: 'Patch checked: May 21, 2026',
    patchUrl: 'https://www.callofduty.com/patchnotes/2026/04/call-of-duty-bo7-warzone-season-03-reloaded-patch-notes',
    patchLinkLabel: 'Official patch notes',
    patchHighlights: [
      {
        title: 'Black Ops Royale refresh',
        body: 'Black Ops Royale returned to playlist rotation with Hot Pursuit-style updates: stronger Last Stand health and Attachment Kits from Finishers or Target Uplink Terminal activity.',
      },
      {
        title: 'Endgame pressure increased',
        body: 'Final gas now clears Stims, Self-Revives and PDS from ground loot, which makes late circles less about gas stalling and more about position, trade timing and clean pushes.',
      },
      {
        title: 'Resurgence loot changed',
        body: 'Rebirth Island and Havens Hollow now share base/reusable box loot tables, with lower perk and Armor Satchel drop rates plus duplicate equipment prevention in normal boxes.',
      },
      {
        title: 'Cash is easier to read',
        body: 'Common cash piles moved from $250 to $300 and death cash now rounds to the nearest $100, making quick buy-station calls cleaner during fights.',
      },
    ],
    metaKicker: 'New weapon tier alerts',
    metaTitle: 'Meta signals to test',
    metaSignals: [
      { weapon: 'MPC-25', status: 'Buff watch', note: 'More damage and range in the first two damage bands. Treat it as a stronger close-range test pick.' },
      { weapon: 'Razor 9mm', status: 'Control nerf', note: 'ADS is slower and recoil increased in BR/Resurgence, so it is less automatic as a comfort SMG.' },
      { weapon: 'Sturmwolf 45', status: 'Rising SMG', note: 'ADS improved from 190ms to 170ms, with a small range gain. Worth testing for aggressive Resurgence.' },
      { weapon: 'MK.78', status: 'Long-range buff', note: 'Max range improved to 58m, ADS improved, and key recoil/barrel attachments got stronger.' },
      { weapon: 'Sokol 545', status: 'Long-range buff', note: 'Range bands stretched hard and bullet velocity improved, making it a serious control/range candidate.' },
      { weapon: 'XM325', status: 'Control buff', note: 'Range improved and horizontal recoil/deviation dropped by 12%, so it should feel steadier at mid-long range.' },
    ],
    mapKicker: 'Resurgence map updates',
    mapTitle: 'Map and regain notes',
    mapNotes: [
      'Prematch Rejoin is now enabled in standard playlists and rejoin support extends through the end of the match, excluding Ranked Play.',
      'Avalon final-circle logic was adjusted toward more consistent competitive endgame areas.',
      'Avalon free Loadout Drop locations were adjusted so public-event drops should be less likely to land in awkward or unreachable spots.',
      'Weapon drops from eliminated players now have a 5-minute cleanup protection window unless the owner disconnects or is fully eliminated.',
    ],
    checklistKicker: 'Community tips & tricks',
    checklistTitle: "This week's quick checklist",
    weeklyChecklist: [
      'Re-test your close-range slot: MPC-25 and Sturmwolf 45 are the first two SMGs to try after this tuning pass.',
      'Keep one stable long-range build ready: Sokol 545, MK.78 and XM325 all received changes that reward control-focused players.',
      'Play final circles earlier: with gas-stall items removed from final gas, rotate before you need the bailout.',
      'In Resurgence, do not assume perk/satchel comfort from boxes. Secure loadout, buy station and regain routes sooner.',
    ],
    sampleKicker: 'Sample briefing',
    sampleTitle: 'What a free email looks like',
    sampleBriefing: [
      { title: 'Meta signal', body: 'check weapon tiers after every balancing patch before locking a ranked loadout.' },
      { title: 'Map note', body: 'track regain routes and squad spacing when Resurgence zones pull away from safe rooftops.' },
      { title: 'Player tip', body: 'keep one low-recoil build and one mobility build ready so you can adapt without rebuilding mid-session.' },
    ],
  },
  community: {
    kicker: 'WZ SOCIAL HUB',
    titleTop: 'COMM',
    titleBottom: 'UNITY',
    description: 'A Reddit-style space to ask questions, share builds, find squadmates and organize sessions directly on the site.',
  },
  updatedAt: '2026-06-01',
};

function text(value: unknown, fallback: string, max = 240) {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned ? cleaned.slice(0, max) : fallback;
}

function multiline(value: unknown, fallback: string, max = 900) {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.replace(/\r\n/g, '\n').trim();
  return cleaned ? cleaned.slice(0, max) : fallback;
}

function textPairs(value: unknown, fallback: TextPair[]) {
  if (!Array.isArray(value)) return fallback;
  const pairs = value
    .map((item, index) => {
      const record = item as Partial<TextPair>;
      const fallbackPair = fallback[index] ?? { title: 'Item', body: '' };
      return {
        title: text(record.title, fallbackPair.title, 80),
        body: multiline(record.body, fallbackPair.body, 360),
      };
    })
    .filter(item => item.title && item.body)
    .slice(0, 6);
  return pairs.length ? pairs : fallback;
}

function featurePairs(value: unknown, fallback: FreePreviewFeature[]) {
  if (!Array.isArray(value)) return fallback;
  const pairs = value
    .map((item, index) => {
      const record = item as Partial<FreePreviewFeature>;
      const fallbackPair = fallback[index] ?? { eyebrow: 'Label', title: 'Item', body: '' };
      return {
        eyebrow: text(record.eyebrow, fallbackPair.eyebrow, 60),
        title: text(record.title, fallbackPair.title, 80),
        body: multiline(record.body, fallbackPair.body, 360),
      };
    })
    .filter(item => item.eyebrow && item.title && item.body)
    .slice(0, 8);
  return pairs.length ? pairs : fallback;
}

function metaSignals(value: unknown, fallback: FreePreviewMetaSignal[]) {
  if (!Array.isArray(value)) return fallback;
  const signals = value
    .map((item, index) => {
      const record = item as Partial<FreePreviewMetaSignal>;
      const fallbackSignal = fallback[index] ?? { weapon: 'Weapon', status: 'Status', note: '' };
      return {
        weapon: text(record.weapon, fallbackSignal.weapon, 60),
        status: text(record.status, fallbackSignal.status, 60),
        note: multiline(record.note, fallbackSignal.note, 360),
      };
    })
    .filter(item => item.weapon && item.status && item.note)
    .slice(0, 10);
  return signals.length ? signals : fallback;
}

function stringList(value: unknown, fallback: string[], maxItems: number, maxLength = 360) {
  if (!Array.isArray(value)) return fallback;
  const items = value
    .map((item, index) => multiline(item, fallback[index] ?? '', maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
  return items.length ? items : fallback;
}

function safeUrl(value: unknown, fallback: string) {
  const candidate = text(value, fallback, 700);
  try {
    const url = new URL(candidate);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}

export function normalizeSiteContent(input: unknown, fallback = DEFAULT_SITE_CONTENT): SiteContent {
  const body = input as Partial<SiteContent>;
  const home = (body.home ?? {}) as Partial<SiteContent['home']>;
  const proAccess = (body.proAccess ?? {}) as Partial<SiteContent['proAccess']>;
  const freePreview = (body.freePreview ?? {}) as Partial<SiteContent['freePreview']>;
  const community = (body.community ?? {}) as Partial<SiteContent['community']>;

  return {
    home: {
      metaLeft: text(home.metaLeft, fallback.home.metaLeft, 80),
      metaCenter: text(home.metaCenter, fallback.home.metaCenter, 80),
      metaRight: text(home.metaRight, fallback.home.metaRight, 80),
      titleTop: text(home.titleTop, fallback.home.titleTop, 40),
      titleMiddle: text(home.titleMiddle, fallback.home.titleMiddle, 40),
      titleBottom: text(home.titleBottom, fallback.home.titleBottom, 40),
      eyebrow: text(home.eyebrow, fallback.home.eyebrow, 40),
      description: multiline(home.description, fallback.home.description, 320),
      primaryCta: text(home.primaryCta, fallback.home.primaryCta, 40),
      secondaryCta: text(home.secondaryCta, fallback.home.secondaryCta, 40),
    },
    proAccess: {
      backLabel: text(proAccess.backLabel, fallback.proAccess.backLabel, 40),
      badge: text(proAccess.badge, fallback.proAccess.badge, 40),
      tag: text(proAccess.tag, fallback.proAccess.tag, 40),
      title: text(proAccess.title, fallback.proAccess.title, 80),
      description: multiline(proAccess.description, fallback.proAccess.description, 420),
      price: text(proAccess.price, fallback.proAccess.price, 40),
      period: text(proAccess.period, fallback.proAccess.period, 80),
      proofs: textPairs(proAccess.proofs, fallback.proAccess.proofs),
      cta: text(proAccess.cta, fallback.proAccess.cta, 80),
    },
    freePreview: {
      backLabel: text(freePreview.backLabel, fallback.freePreview.backLabel, 60),
      kicker: text(freePreview.kicker, fallback.freePreview.kicker, 80),
      title: text(freePreview.title, fallback.freePreview.title, 80),
      lead: multiline(freePreview.lead, fallback.freePreview.lead, 420),
      primaryCta: text(freePreview.primaryCta, fallback.freePreview.primaryCta, 40),
      secondaryCta: text(freePreview.secondaryCta, fallback.freePreview.secondaryCta, 40),
      features: featurePairs(freePreview.features, fallback.freePreview.features),
      currentKicker: text(freePreview.currentKicker, fallback.freePreview.currentKicker, 80),
      currentTitle: text(freePreview.currentTitle, fallback.freePreview.currentTitle, 100),
      patchChecked: text(freePreview.patchChecked, fallback.freePreview.patchChecked, 100),
      patchUrl: safeUrl(freePreview.patchUrl, fallback.freePreview.patchUrl),
      patchLinkLabel: text(freePreview.patchLinkLabel, fallback.freePreview.patchLinkLabel, 80),
      patchHighlights: textPairs(freePreview.patchHighlights, fallback.freePreview.patchHighlights),
      metaKicker: text(freePreview.metaKicker, fallback.freePreview.metaKicker, 80),
      metaTitle: text(freePreview.metaTitle, fallback.freePreview.metaTitle, 100),
      metaSignals: metaSignals(freePreview.metaSignals, fallback.freePreview.metaSignals),
      mapKicker: text(freePreview.mapKicker, fallback.freePreview.mapKicker, 80),
      mapTitle: text(freePreview.mapTitle, fallback.freePreview.mapTitle, 100),
      mapNotes: stringList(freePreview.mapNotes, fallback.freePreview.mapNotes, 8),
      checklistKicker: text(freePreview.checklistKicker, fallback.freePreview.checklistKicker, 80),
      checklistTitle: text(freePreview.checklistTitle, fallback.freePreview.checklistTitle, 100),
      weeklyChecklist: stringList(freePreview.weeklyChecklist, fallback.freePreview.weeklyChecklist, 8),
      sampleKicker: text(freePreview.sampleKicker, fallback.freePreview.sampleKicker, 80),
      sampleTitle: text(freePreview.sampleTitle, fallback.freePreview.sampleTitle, 100),
      sampleBriefing: textPairs(freePreview.sampleBriefing, fallback.freePreview.sampleBriefing),
    },
    community: {
      kicker: text(community.kicker, fallback.community.kicker, 80),
      titleTop: text(community.titleTop, fallback.community.titleTop, 40),
      titleBottom: text(community.titleBottom, fallback.community.titleBottom, 40),
      description: multiline(community.description, fallback.community.description, 420),
    },
    updatedAt: text(body.updatedAt, new Date().toISOString().slice(0, 10), 20),
  };
}

function readLocalSiteContent(): SiteContent {
  try {
    return normalizeSiteContent(JSON.parse(fs.readFileSync(SITE_CONTENT_FILE, 'utf-8')));
  } catch {
    return DEFAULT_SITE_CONTENT;
  }
}

function backupLocalSiteContent(current: SiteContent) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(BACKUP_DIR, `${stamp}-site-content.json`);
  fs.writeFileSync(file, JSON.stringify(current, null, 2));
}

function writeLocalSiteContent(content: SiteContent) {
  fs.mkdirSync(path.dirname(SITE_CONTENT_FILE), { recursive: true });
  fs.writeFileSync(SITE_CONTENT_FILE, JSON.stringify(content, null, 2));
}

export async function getSiteContent(): Promise<SiteContent> {
  if (hasUpstash()) {
    const result = await upstashCommand(['GET', SITE_CONTENT_KEY]);
    if (typeof result === 'string') return normalizeSiteContent(JSON.parse(result));
  }

  return readLocalSiteContent();
}

export async function saveSiteContent(input: unknown): Promise<SiteContent> {
  const current = await getSiteContent();
  const next = normalizeSiteContent({
    ...(input as Partial<SiteContent>),
    updatedAt: new Date().toISOString().slice(0, 10),
  }, current);

  if (hasUpstash()) {
    await upstashCommand(['SET', SITE_CONTENT_KEY, JSON.stringify(next)]);
  } else {
    backupLocalSiteContent(current);
    writeLocalSiteContent(next);
  }

  return next;
}
