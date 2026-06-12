import fs from 'fs';
import path from 'path';
import { hasUpstash, upstashCommand } from './upstash';

const NEWS_CONTENT_FILE = path.join(process.cwd(), 'data', 'news-content.json');
const NEWS_CONTENT_KEY = 'wz:news-content';

export type NewsItem = {
  title: string;
  body: string;
};

export type NewsCategoryContent = {
  items: NewsItem[];
};

export type HiddenBalanceSignal = NewsItem & {
  tone: 'buff' | 'nerf' | 'watch';
};

export type NewsContent = {
  updatedAt: string;
  sourceUrl: string;
  sourceTitle: string;
  hiddenBalance: {
    updatedAt: string;
    items: HiddenBalanceSignal[];
  };
  categories: {
    'patch-notes': NewsCategoryContent;
    meta: NewsCategoryContent;
    esport: NewsCategoryContent;
    evenements: NewsCategoryContent;
  };
};

export const DEFAULT_NEWS_CONTENT: NewsContent = {
  updatedAt: '',
  sourceUrl: '',
  sourceTitle: '',
  hiddenBalance: { updatedAt: '', items: [] },
  categories: {
    'patch-notes': { items: [] },
    meta: { items: [] },
    esport: { items: [] },
    evenements: { items: [] },
  },
};

function text(value: unknown, max = 400) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function items(value: unknown, max = 8): NewsItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => ({ title: text((entry as NewsItem)?.title, 120), body: text((entry as NewsItem)?.body, 600) }))
    .filter((entry) => entry.title && entry.body)
    .slice(0, max);
}

function hiddenBalanceItems(value: unknown): HiddenBalanceSignal[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      const tone = (entry as Partial<HiddenBalanceSignal>)?.tone;
      return {
        title: text((entry as NewsItem)?.title, 120),
        body: text((entry as NewsItem)?.body, 700),
        tone: tone === 'buff' || tone === 'nerf' || tone === 'watch' ? tone : 'watch',
      };
    })
    .filter((entry) => entry.title && entry.body)
    .slice(0, 6);
}

export function normalizeNewsContent(input: unknown): NewsContent {
  const body = (input ?? {}) as Partial<NewsContent>;
  const categories = (body.categories ?? {}) as Partial<NewsContent['categories']>;
  return {
    updatedAt: text(body.updatedAt, 40),
    sourceUrl: text(body.sourceUrl, 300),
    sourceTitle: text(body.sourceTitle, 200),
    hiddenBalance: {
      updatedAt: text(body.hiddenBalance?.updatedAt, 40),
      items: hiddenBalanceItems(body.hiddenBalance?.items),
    },
    categories: {
      'patch-notes': { items: items(categories['patch-notes']?.items) },
      meta: { items: items(categories.meta?.items) },
      esport: { items: items(categories.esport?.items) },
      evenements: { items: items(categories.evenements?.items) },
    },
  };
}

export async function getNewsContent(): Promise<NewsContent> {
  if (hasUpstash()) {
    const result = await upstashCommand(['GET', NEWS_CONTENT_KEY]);
    if (typeof result === 'string') return normalizeNewsContent(JSON.parse(result));
  }

  try {
    return normalizeNewsContent(JSON.parse(fs.readFileSync(NEWS_CONTENT_FILE, 'utf-8')));
  } catch {
    return DEFAULT_NEWS_CONTENT;
  }
}

export async function saveNewsContent(input: unknown): Promise<NewsContent> {
  const next = normalizeNewsContent(input);

  if (hasUpstash()) {
    await upstashCommand(['SET', NEWS_CONTENT_KEY, JSON.stringify(next)]);
  } else {
    fs.mkdirSync(path.dirname(NEWS_CONTENT_FILE), { recursive: true });
    fs.writeFileSync(NEWS_CONTENT_FILE, JSON.stringify(next, null, 2));
  }

  return next;
}
