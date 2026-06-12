/**
 * Sync CODMunity → Upstash (hors Vercel, lance par GitHub Action).
 * Scrape les pages codmunity.gg via DeepSeek (OpenRouter) et ecrit le
 * resultat dans Upstash. Les pages du site lisent ensuite ce cache
 * (cles identiques a lib/codmunityScraper.ts).
 *
 * Env requis : OPENROUTER_API_KEY, UPSTASH_REDIS_REST_URL,
 *   UPSTASH_REDIS_REST_TOKEN. Optionnel : OPENROUTER_CODMUNITY_MODEL.
 */

const SITE = 'https://codmunity.gg';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = process.env.OPENROUTER_CODMUNITY_MODEL || 'deepseek/deepseek-chat';
const CACHE_PREFIX = 'cod:scrape:';
const CACHE_TTL = 21600; // 6 h
const TEAM_SLUGS = ['top-250', 'wsow', 'wrs', 'ewc', 'pcl'];

function stripHtml(html) {
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

async function fetchPageText(path) {
  const res = await fetch(`${SITE}${path}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WZPROMetaBot/1.0)', Accept: 'text/html' },
  });
  if (!res.ok) throw new Error(`fetch ${path} -> ${res.status}`);
  return stripHtml(await res.text());
}

async function callLLM(system, user, maxTokens) {
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://wzprometa.com',
      'X-Title': 'WZPRO Meta CODMunity Sync',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter -> ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? null;
}

function sliceObject(text) {
  const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const a = cleaned.indexOf('{');
  const b = cleaned.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error('no JSON object');
  return JSON.parse(cleaned.slice(a, b + 1));
}

async function upstashSet(key, value) {
  const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([['SET', CACHE_PREFIX + key, JSON.stringify(value), 'EX', CACHE_TTL]]),
  });
  if (!res.ok) throw new Error(`Upstash SET ${key} -> ${res.status}`);
}

async function scrapeTeamRows(slug) {
  const text = await fetchPageText(`/${slug}`);
  const raw = await callLLM(
    'Tu extrais des classements esport depuis du texte brut de page web. Reponds uniquement avec un objet JSON valide.',
    `Texte brut de la page CODMunity "${slug}". Extrais le classement en objet JSON {"rows":[...]}, max 50 entrees triees par rang croissant.\nChaque element: {"rank":number,"team":string,"players":string,"kills":number,"points":number}. "players" = joueurs separes par " / " si dispo, sinon "". N'invente rien.\n\nTexte:\n${text.slice(0, 28000)}`,
    4000,
  );
  if (!raw) return null;
  const rows = (sliceObject(raw).rows || [])
    .filter((r) => Number.isFinite(r.rank) && r.team)
    .map((r) => ({
      rank: Number(r.rank),
      team: String(r.team).trim(),
      players: typeof r.players === 'string' ? r.players.trim() : '',
      kills: Number.isFinite(r.kills) ? Number(r.kills) : 0,
      points: Number.isFinite(r.points) ? Number(r.points) : 0,
    }))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 250);
  return rows.length ? rows : null;
}

async function scrapeCalendar() {
  const text = await fetchPageText('/calendar');
  const raw = await callLLM(
    'Tu extrais un calendrier esport depuis du texte brut. Reponds uniquement avec un objet JSON valide.',
    `Texte brut de la page calendrier CODMunity. Extrais:\n{"liveEvent":{"tags":string[],"title":string,"subtitle":string,"series":string,"startedAt":string,"standings":[{"rank":number,"players":string,"team":string,"points":string}]}|null,"pastEvents":[{"tags":string[],"title":string,"subtitle":string,"when":string}]}\nliveEvent=null si aucun direct. standings=top 5. pastEvents=max 6. N'invente rien.\n\nTexte:\n${text.slice(0, 24000)}`,
    2500,
  );
  if (!raw) return null;
  const p = sliceObject(raw);
  return {
    liveEvent: p.liveEvent
      ? {
          tags: Array.isArray(p.liveEvent.tags) ? p.liveEvent.tags.map(String) : [],
          title: String(p.liveEvent.title || ''),
          subtitle: p.liveEvent.subtitle ? String(p.liveEvent.subtitle) : undefined,
          series: p.liveEvent.series ? String(p.liveEvent.series) : undefined,
          startedAt: p.liveEvent.startedAt ? String(p.liveEvent.startedAt) : undefined,
          standings: Array.isArray(p.liveEvent.standings)
            ? p.liveEvent.standings.slice(0, 8).map((s) => ({
                rank: Number(s.rank) || 0,
                players: String(s.players || ''),
                team: String(s.team || ''),
                points: String(s.points ?? ''),
              }))
            : [],
        }
      : null,
    pastEvents: Array.isArray(p.pastEvents)
      ? p.pastEvents.slice(0, 6).map((e) => ({
          tags: Array.isArray(e.tags) ? e.tags.map(String) : [],
          title: String(e.title || ''),
          subtitle: e.subtitle ? String(e.subtitle) : undefined,
          when: e.when ? String(e.when) : undefined,
        }))
      : [],
  };
}

async function run() {
  for (const v of ['OPENROUTER_API_KEY', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN']) {
    if (!process.env[v]) throw new Error(`Missing env ${v}`);
  }

  const results = {};
  await Promise.allSettled([
    ...TEAM_SLUGS.map(async (slug) => {
      try {
        const rows = await scrapeTeamRows(slug);
        if (rows) {
          await upstashSet(`rows:${slug}`, rows);
          results[slug] = `ok (${rows.length})`;
        } else results[slug] = 'empty';
      } catch (e) {
        results[slug] = `FAIL ${e.message}`;
      }
    }),
    (async () => {
      try {
        const cal = await scrapeCalendar();
        if (cal) {
          await upstashSet('calendar', cal);
          results.calendar = 'ok';
        } else results.calendar = 'empty';
      } catch (e) {
        results.calendar = `FAIL ${e.message}`;
      }
    })(),
  ]);

  console.log('CODMunity sync:', JSON.stringify(results, null, 2));
  if (Object.values(results).every((r) => String(r).startsWith('FAIL'))) process.exit(1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
