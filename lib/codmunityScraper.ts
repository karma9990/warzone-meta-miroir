import { hasUpstash, upstashCommand } from './upstash.ts';

/**
 * Scraper LLM des pages publiques codmunity.gg.
 * Les pages CODMunity sont rendues cote serveur : le HTML contient les
 * donnees. On le nettoie en texte, puis OpenRouter en extrait du JSON
 * structure. Le resultat est mis en cache (Upstash, TTL 30 min) pour ne
 * pas relancer un appel LLM a chaque requete.
 *
 * Le client appelant garde un fallback (API officielle / donnees statiques)
 * si OPENROUTER_API_KEY est absent ou si l'extraction echoue.
 */

const SITE = 'https://codmunity.gg';
const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'openrouter/free';
const CACHE_TTL = 1800; // 30 min
const CACHE_PREFIX = 'cod:scrape:';

export type ScrapedTeamRow = {
  rank: number;
  team: string;
  players: string;
  kills?: number;
  points?: number;
};

export type ScrapedCalendarEvent = {
  tags: string[];
  title: string;
  subtitle?: string;
  when?: string;
};

export type ScrapedCalendar = {
  liveEvent?: {
    tags: string[];
    title: string;
    subtitle?: string;
    series?: string;
    startedAt?: string;
    standings: Array<{ rank: number; players: string; team: string; points: string }>;
  } | null;
  pastEvents: ScrapedCalendarEvent[];
};

function stripHtml(html: string) {
  return html
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

async function fetchPageText(path: string): Promise<string> {
  const response = await fetch(`${SITE}${path}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; WZPROMetaBot/1.0)',
      Accept: 'text/html',
    },
    next: { revalidate: CACHE_TTL },
  });
  if (!response.ok) throw new Error(`CODMunity fetch failed for ${path}: ${response.status}`);
  return stripHtml(await response.text());
}

// Appele uniquement par la tache de fond (cron/admin), jamais pendant le
// rendu : on peut donc laisser un timeout large (DeepSeek via OpenRouter
// peut prendre > 2 min sur un gros prompt).
const LLM_TIMEOUT_MS = 180_000;

async function callOpenRouter(system: string, user: string, maxTokens: number): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(OPENROUTER_CHAT_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://wzprometa.com',
        'X-Title': 'WZPRO Meta CODMunity Scraper',
      },
      body: JSON.stringify({
        model:
          process.env.OPENROUTER_CODMUNITY_MODEL ||
          process.env.OPENROUTER_NEWS_MODEL ||
          process.env.OPENROUTER_AI_CLASSES_MODEL ||
          DEFAULT_MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
      }),
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) throw new Error(`OpenRouter scrape failed: ${response.status}`);
  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content ?? null;
  if (content && !content.trim().match(/[[{]/)) {
    console.error('CODMunity LLM returned non-JSON (first 200 chars):', content.slice(0, 200));
  }
  return content;
}

function sliceJson(text: string, open: '[' | '{', close: ']' | '}') {
  const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const start = cleaned.indexOf(open);
  const end = cleaned.lastIndexOf(close);
  if (start < 0 || end < start) throw new Error('AI response did not contain JSON.');
  return cleaned.slice(start, end + 1);
}

async function readCache<T>(key: string): Promise<T | null> {
  if (!hasUpstash()) return null;
  try {
    const raw = await upstashCommand(['GET', CACHE_PREFIX + key]);
    return raw ? (JSON.parse(raw as string) as T) : null;
  } catch {
    return null;
  }
}

async function writeCache(key: string, value: unknown): Promise<void> {
  if (!hasUpstash()) return;
  try {
    await upstashCommand(['SET', CACHE_PREFIX + key, JSON.stringify(value), 'EX', CACHE_TTL]);
  } catch {
    /* cache best-effort */
  }
}

export const CODMUNITY_TEAM_SLUGS = ['top-250', 'wsow', 'wrs', 'ewc', 'pcl'] as const;
export type CodmunitySlug = (typeof CODMUNITY_TEAM_SLUGS)[number];

/** Lecture cache seule (instantane, sans appel LLM). Utilise par les pages. */
export async function getCachedTeamRows(slug: string): Promise<ScrapedTeamRow[] | null> {
  const cached = await readCache<ScrapedTeamRow[]>(`rows:${slug}`);
  return cached?.length ? cached : null;
}

/** Lecture cache seule du calendrier (instantane, sans appel LLM). */
export async function getCachedCalendar(): Promise<ScrapedCalendar | null> {
  return readCache<ScrapedCalendar>('calendar');
}

/**
 * Scrape (LLM) le classement d'une page leaderboard CODMunity et met a jour
 * le cache. Appele par la tache de fond (cron/admin), pas pendant le rendu.
 * Retourne null si le LLM est indisponible ou si l'extraction echoue.
 */
export async function refreshTeamRows(slug: string): Promise<ScrapedTeamRow[] | null> {
  let text: string;
  try {
    text = await fetchPageText(`/${slug}`);
  } catch (error) {
    console.error(`CODMunity scrape fetch failed (${slug}):`, error);
    return null;
  }

  const system =
    'Tu extrais des classements esport depuis du texte brut de page web. Reponds uniquement avec un objet JSON valide, sans markdown ni commentaire.';
  const user = `Voici le texte brut de la page CODMunity "${slug}". Extrais le classement (leaderboard) sous forme d'un objet JSON { "rows": [...] }, au maximum 50 entrees, triees par rang croissant.
Chaque element de "rows": { "rank": number, "team": string, "players": string, "kills": number, "points": number }.
- "team" = nom de l'equipe ou du joueur de la ligne.
- "players" = liste des joueurs separes par " / " si disponible, sinon "".
- "kills" et "points" = nombres de la ligne (0 si absent).
N'invente aucune donnee: n'inclus que ce qui est present dans le texte.

Texte:
${text.slice(0, 28_000)}`;

  let raw: string | null;
  try {
    raw = await callOpenRouter(system, user, 4000);
  } catch (error) {
    console.error(`CODMunity scrape LLM failed (${slug}):`, error);
    return null;
  }
  if (!raw) return null;

  try {
    const wrapper = JSON.parse(sliceJson(raw, '{', '}')) as { rows?: ScrapedTeamRow[] };
    const parsed = Array.isArray(wrapper.rows) ? wrapper.rows : [];
    const rows = parsed
      .filter((row) => Number.isFinite(row.rank) && typeof row.team === 'string' && row.team.trim())
      .map((row) => ({
        rank: Number(row.rank),
        team: String(row.team).trim(),
        players: typeof row.players === 'string' ? row.players.trim() : '',
        kills: Number.isFinite(row.kills) ? Number(row.kills) : 0,
        points: Number.isFinite(row.points) ? Number(row.points) : 0,
      }))
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 250);

    if (!rows.length) return null;
    await writeCache(`rows:${slug}`, rows);
    return rows;
  } catch (error) {
    console.error(`CODMunity scrape parse failed (${slug}):`, error);
    return null;
  }
}

/** Scrape (LLM) l'evenement en direct + evenements passes et met a jour le cache. */
export async function refreshCalendar(): Promise<ScrapedCalendar | null> {
  let text: string;
  try {
    text = await fetchPageText('/calendar');
  } catch (error) {
    console.error('CODMunity scrape fetch failed (calendar):', error);
    return null;
  }

  const system =
    'Tu extrais un calendrier esport depuis du texte brut de page web. Reponds uniquement avec un objet JSON valide, sans markdown ni commentaire.';
  const user = `Voici le texte brut de la page calendrier CODMunity. Extrais un objet JSON:
{
  "liveEvent": { "tags": string[], "title": string, "subtitle": string, "series": string, "startedAt": string, "standings": [ { "rank": number, "players": string, "team": string, "points": string } ] } | null,
  "pastEvents": [ { "tags": string[], "title": string, "subtitle": string, "when": string } ]
}
- "liveEvent" = null s'il n'y a aucun evenement en direct.
- "standings" = top 5 du classement en direct si present, sinon [].
- "pastEvents" = jusqu'a 6 evenements passes.
N'invente aucune donnee: n'inclus que ce qui est present dans le texte.

Texte:
${text.slice(0, 24_000)}`;

  let raw: string | null;
  try {
    raw = await callOpenRouter(system, user, 2500);
  } catch (error) {
    console.error('CODMunity scrape LLM failed (calendar):', error);
    return null;
  }
  if (!raw) return null;

  try {
    const parsed = JSON.parse(sliceJson(raw, '{', '}')) as ScrapedCalendar;
    const result: ScrapedCalendar = {
      liveEvent: parsed.liveEvent
        ? {
            tags: Array.isArray(parsed.liveEvent.tags) ? parsed.liveEvent.tags.map(String) : [],
            title: String(parsed.liveEvent.title || ''),
            subtitle: parsed.liveEvent.subtitle ? String(parsed.liveEvent.subtitle) : undefined,
            series: parsed.liveEvent.series ? String(parsed.liveEvent.series) : undefined,
            startedAt: parsed.liveEvent.startedAt ? String(parsed.liveEvent.startedAt) : undefined,
            standings: Array.isArray(parsed.liveEvent.standings)
              ? parsed.liveEvent.standings.slice(0, 8).map((s) => ({
                  rank: Number(s.rank) || 0,
                  players: String(s.players || ''),
                  team: String(s.team || ''),
                  points: String(s.points ?? ''),
                }))
              : [],
          }
        : null,
      pastEvents: Array.isArray(parsed.pastEvents)
        ? parsed.pastEvents.slice(0, 6).map((e) => ({
            tags: Array.isArray(e.tags) ? e.tags.map(String) : [],
            title: String(e.title || ''),
            subtitle: e.subtitle ? String(e.subtitle) : undefined,
            when: e.when ? String(e.when) : undefined,
          }))
        : [],
    };
    await writeCache('calendar', result);
    return result;
  } catch (error) {
    console.error('CODMunity scrape parse failed (calendar):', error);
    return null;
  }
}

export type CodmunitySyncResult = {
  status: 'updated' | 'error';
  llmAvailable: boolean;
  pages: Record<string, 'ok' | 'failed'>;
};

/**
 * Tache de fond : scrape les 6 pages CODMunity via LLM et remplit le cache.
 * A declencher par cron ou depuis l'admin. Les pages publiques lisent
 * ensuite le cache instantanement (aucun appel LLM au rendu).
 */
export async function syncCodmunityEsport(): Promise<CodmunitySyncResult> {
  const llmAvailable = Boolean(process.env.OPENROUTER_API_KEY);
  const pages: Record<string, 'ok' | 'failed'> = {};

  // En parallele : chaque extraction LLM peut prendre > 2 min, un traitement
  // sequentiel des 6 pages depasserait toute limite de duree de fonction.
  const jobs: Array<Promise<void>> = CODMUNITY_TEAM_SLUGS.map(async (slug) => {
    try {
      const rows = await refreshTeamRows(slug);
      pages[slug] = rows?.length ? 'ok' : 'failed';
    } catch (error) {
      console.error(`CODMunity sync failed (${slug}):`, error);
      pages[slug] = 'failed';
    }
  });

  jobs.push(
    (async () => {
      try {
        const calendar = await refreshCalendar();
        pages.calendar = calendar ? 'ok' : 'failed';
      } catch (error) {
        console.error('CODMunity sync failed (calendar):', error);
        pages.calendar = 'failed';
      }
    })(),
  );

  await Promise.allSettled(jobs);

  const anyOk = Object.values(pages).some((status) => status === 'ok');
  return {
    status: anyOk ? 'updated' : 'error',
    llmAvailable,
    pages,
  };
}
