import type { PatchArticle } from './patchNotesAutomation';

export type IntelSourceSnapshot = {
  id: string;
  label: string;
  url: string;
  status: 'ok' | 'error';
  text: string;
};

const SOURCE_LIMIT = 2600;

const SOURCES = [
  {
    id: 'jgod',
    label: 'JGOD YouTube',
    env: 'WARZONE_SOURCE_JGOD_URL',
    url: 'https://www.youtube.com/@JGOD/videos',
  },
  {
    id: 'symgg',
    label: 'Sym.gg',
    env: 'WARZONE_SOURCE_SYMGG_URL',
    url: 'https://sym.gg/',
  },
  {
    id: 'truegamedata',
    label: 'TrueGameData',
    env: 'WARZONE_SOURCE_TRUEGAMEDATA_URL',
    url: 'https://www.truegamedata.com/',
  },
  {
    id: 'modernwarzone',
    label: 'ModernWarzone on X',
    env: 'WARZONE_SOURCE_MODERNWARZONE_URL',
    url: 'https://x.com/ModernWarzone',
  },
  {
    id: 'raven',
    label: 'Raven Software notes',
    env: 'WARZONE_SOURCE_RAVEN_URL',
    url: 'https://www.callofduty.com/patchnotes',
  },
] as const;

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchSourceText(url: string) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'WZPRO Meta daily Warzone intel monitor',
      Accept: 'text/html,application/xml,text/xml,text/plain',
    },
    signal: AbortSignal.timeout(9000),
    cache: 'no-store',
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const raw = await response.text();
  return stripHtml(raw).slice(0, SOURCE_LIMIT);
}

function sourceUrl(source: typeof SOURCES[number]) {
  return process.env[source.env] || source.url;
}

export async function collectWarzoneIntelSources(article: PatchArticle): Promise<IntelSourceSnapshot[]> {
  const snapshots = await Promise.all(SOURCES.map(async (source): Promise<IntelSourceSnapshot> => {
    const url = sourceUrl(source);
    try {
      const text = await fetchSourceText(url);
      return {
        id: source.id,
        label: source.label,
        url,
        status: text ? 'ok' : 'error',
        text: text || 'Source fetched but no usable text was extracted.',
      };
    } catch (error) {
      return {
        id: source.id,
        label: source.label,
        url,
        status: 'error',
        text: error instanceof Error ? error.message : 'Source fetch failed.',
      };
    }
  }));

  return [
    {
      id: 'official-patch',
      label: 'Official Call of Duty / Raven patch article',
      url: article.url,
      status: 'ok',
      text: `${article.title}. ${article.dateLabel}. ${article.text}`.slice(0, SOURCE_LIMIT),
    },
    ...snapshots,
  ];
}

export function formatIntelSourcesForPrompt(sources: IntelSourceSnapshot[]) {
  return sources
    .map((source) => [
      `SOURCE: ${source.label}`,
      `URL: ${source.url}`,
      `STATUS: ${source.status}`,
      `TEXT: ${source.text}`,
    ].join('\n'))
    .join('\n\n---\n\n');
}
