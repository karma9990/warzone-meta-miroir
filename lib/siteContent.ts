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
    titleMiddle: 'META',
    titleBottom: 'SYSTEM',
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
