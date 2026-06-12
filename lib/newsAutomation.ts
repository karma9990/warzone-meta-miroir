import { fetchPatchArticle, findLatestWarzonePatchUrl, type PatchArticle } from './patchNotesAutomation';
import { getNewsContent, saveNewsContent, type HiddenBalanceSignal, type NewsContent, type NewsItem } from './newsContent';
import { getSiteContent } from './siteContent';
import { collectWarzoneIntelSources, formatIntelSourcesForPrompt, type IntelSourceSnapshot } from './warzoneIntelSources';

const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_OPENROUTER_MODEL = 'openrouter/free';

type GeneratedNews = {
  'patch-notes': NewsItem[];
  meta: NewsItem[];
  esport: NewsItem[];
  evenements: NewsItem[];
  hiddenBalance: HiddenBalanceSignal[];
};

export type NewsSyncResult = {
  status: 'updated' | 'skipped' | 'error';
  reason?: string;
  sourceUrl?: string;
  sourceTitle?: string;
  usedAi?: boolean;
  hiddenBalanceUpdated?: boolean;
  newsContent?: NewsContent;
};

function newsPrompt(article: PatchArticle, intelSources: IntelSourceSnapshot[]) {
  return `Tu redige des actualites Warzone concises en francais pour 4 categories d'un site meta.
Utilise uniquement les faits fournis dans les patch notes officielles et les sources de veille ci-dessous. Pas d'invention, pas de remplissage.
Retourne uniquement un objet JSON valide avec exactement ces champs:
- "patch-notes": 3 a 5 objets { "title": string, "body": string } resumant les changements du patch (armes, equilibrage, bug fixes).
- "meta": 5 a 8 objets { "title": string, "body": string } listant les buffs et nerfs d'armes concrets du patch. Chaque title = nom de l'arme + "Buff" ou "Nerf" (ex: "VX Compact - Nerf"). Chaque body cite les changements chiffres (degats, recul, portee, TTK, mobilite) et dit si l'arme monte ou descend dans la meta. Couvre un maximum d'armes modifiees par le patch.
- "hiddenBalance": 3 a 6 objets { "title": string, "body": string, "tone": "buff" | "nerf" | "watch" } pour les buffs/nerfs caches ou indirects a tester. Ce ne sont pas des affirmations officielles: croise les patch notes Raven/Call of Duty avec JGOD, Sym.gg, TrueGameData et ModernWarzone si ces sources sont disponibles. Base-toi sur des indices comme changements d'accessoires, corrections de recoil, valeurs non detaillees, bug fixes de hit registration, portees, animations, stats communautaires ou posts X qui peuvent modifier une arme sans la nommer directement. Le body doit commencer par "Signal a verifier:" ou "Hypothese:" et mentionner la source utile entre parentheses, ex: "(source: Sym.gg)".
- "esport": 2 a 4 objets { "title": string, "body": string } sur l'impact competitif (ranked, regles, scrims, tournois) deductible du patch.
- "evenements": 3 a 5 objets { "title": string, "body": string } sur les events, playlists, modes, maps et saisons mentionnes.
Tout le texte en francais, sauf les noms propres d'armes, cartes, modes et lieux. Chaque body fait 1 a 2 phrases.
Si une source a STATUS:error, ne l'utilise pas comme preuve.

Source officielle: ${article.url}
Titre: ${article.title}
Date: ${article.dateLabel}

Sources de veille a utiliser:
${formatIntelSourcesForPrompt(intelSources).slice(0, 18_000)}

Patch notes:
${article.text.slice(0, 16_000)}`;
}

function parseGeneratedNews(text: string): GeneratedNews {
  const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('AI response did not contain a JSON object.');
  return JSON.parse(cleaned.slice(start, end + 1)) as GeneratedNews;
}

function parseHiddenBalance(text: string): HiddenBalanceSignal[] {
  const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start < 0 || end < start) throw new Error('AI response did not contain a JSON array.');
  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as HiddenBalanceSignal[];
  return parsed
    .map((item) => ({
      title: typeof item.title === 'string' ? item.title.trim().slice(0, 120) : '',
      body: typeof item.body === 'string' ? item.body.trim().slice(0, 700) : '',
      tone: item.tone === 'buff' || item.tone === 'nerf' || item.tone === 'watch' ? item.tone : 'watch',
    }))
    .filter((item) => item.title && item.body)
    .slice(0, 6);
}

function hiddenBalancePrompt(article: PatchArticle, intelSources: IntelSourceSnapshot[]) {
  return `Tu es l'agent quotidien WZPRO qui cherche les buffs et nerfs caches Warzone.
Tu dois scanner les sources de veille meme si aucun patch officiel n'est sorti aujourd'hui, car les changements caches peuvent apparaitre a des jours aleatoires.

Retourne uniquement un tableau JSON valide de 3 a 6 objets:
[{ "title": string, "body": string, "tone": "buff" | "nerf" | "watch" }]

Regles:
- Croise Raven/Call of Duty, JGOD, Sym.gg, TrueGameData et ModernWarzone quand STATUS vaut ok.
- Si une source a STATUS:error, ne l'utilise pas comme preuve.
- Ne presente jamais ces signaux comme officiels sauf si Raven/Call of Duty le dit explicitement.
- Repere les changements caches/indirects: stats communautaires qui bougent, videos JGOD recentes, posts ModernWarzone, valeurs Sym.gg/TrueGameData, bug fixes de recoil/hit registration/animations/accessoires.
- Chaque body commence par "Signal a verifier:" ou "Hypothese:" et mentionne au moins une source utile entre parentheses, ex: "(source: TrueGameData)".
- Texte en francais simple, 1 a 2 phrases.

Dernier patch officiel connu: ${article.title}
URL patch: ${article.url}
Date patch: ${article.dateLabel}

Sources de veille:
${formatIntelSourcesForPrompt(intelSources).slice(0, 22_000)}`;
}

async function generateWithOpenRouter(article: PatchArticle, intelSources: IntelSourceSnapshot[]): Promise<GeneratedNews | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const response = await fetch(OPENROUTER_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://wzprometa.com',
      'X-Title': 'WZPRO Meta News',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_NEWS_MODEL || process.env.OPENROUTER_PATCH_NOTES_MODEL || DEFAULT_OPENROUTER_MODEL,
      messages: [
        {
          role: 'system',
          content: 'Tu es un redacteur Warzone francophone. Reponds uniquement en JSON valide, sans markdown.',
        },
        { role: 'user', content: newsPrompt(article, intelSources) },
      ],
      temperature: 0.2,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) throw new Error(`OpenRouter response failed: ${response.status}`);
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const outputText = data.choices?.[0]?.message?.content ?? '';
  if (!outputText) return null;
  return parseGeneratedNews(outputText);
}

async function generateHiddenBalanceWithOpenRouter(article: PatchArticle, intelSources: IntelSourceSnapshot[]): Promise<HiddenBalanceSignal[] | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const response = await fetch(OPENROUTER_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://wzprometa.com',
      'X-Title': 'WZPRO Meta Hidden Balance Scan',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_HIDDEN_BALANCE_MODEL || process.env.OPENROUTER_NEWS_MODEL || process.env.OPENROUTER_PATCH_NOTES_MODEL || DEFAULT_OPENROUTER_MODEL,
      messages: [
        {
          role: 'system',
          content: 'Tu es un analyste Warzone. Reponds uniquement en JSON valide, sans markdown, et distingue toujours officiel vs hypothese.',
        },
        { role: 'user', content: hiddenBalancePrompt(article, intelSources) },
      ],
      temperature: 0.15,
      max_tokens: 2200,
    }),
  });

  if (!response.ok) throw new Error(`OpenRouter hidden balance response failed: ${response.status}`);
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const outputText = data.choices?.[0]?.message?.content ?? '';
  if (!outputText) return null;
  return parseHiddenBalance(outputText);
}

async function fallbackFromFreePreview(): Promise<GeneratedNews> {
  const { freePreview } = await getSiteContent();
  return {
    'patch-notes': freePreview.patchHighlights,
    meta: freePreview.metaSignals.map(({ weapon, status, note }) => ({ title: `${weapon} - ${status}`, body: note })),
    hiddenBalance: freePreview.metaSignals.slice(0, 4).map(({ weapon, note }) => ({
      title: `${weapon} - Signal cache a verifier`,
      body: `Signal a verifier: ${note}`,
      tone: 'watch',
    })),
    esport: freePreview.sampleBriefing,
    evenements: freePreview.mapNotes.map((note, index) => ({ title: `Note ${index + 1}`, body: note })),
  };
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function refreshHiddenBalance(article: PatchArticle, current: NewsContent): Promise<{ next: NewsContent; usedAi: boolean }> {
  const intelSources = await collectWarzoneIntelSources(article);
  let items: HiddenBalanceSignal[] | null = null;
  let usedAi = false;

  for (let attempt = 0; attempt < 2 && !items; attempt += 1) {
    try {
      items = await generateHiddenBalanceWithOpenRouter(article, intelSources);
      usedAi = Boolean(items);
    } catch (error) {
      console.error(`OpenRouter hidden balance scan failed (attempt ${attempt + 1}):`, error);
    }
  }

  if (!items?.length) {
    items = current.hiddenBalance.items.length
      ? current.hiddenBalance.items
      : (await fallbackFromFreePreview()).hiddenBalance;
  }

  const next = await saveNewsContent({
    ...current,
    sourceUrl: current.sourceUrl || article.url,
    sourceTitle: current.sourceTitle || article.title,
    hiddenBalance: {
      updatedAt: new Date().toISOString(),
      items,
    },
  });

  return { next, usedAi };
}

export async function syncHiddenBalanceScan(options: { force?: boolean } = {}): Promise<NewsSyncResult> {
  try {
    const latestUrl = await findLatestWarzonePatchUrl();
    if (!latestUrl) return { status: 'error', reason: 'No Warzone patch note URL found.' };

    const current = await getNewsContent();
    if (!options.force && current.hiddenBalance.updatedAt.slice(0, 10) === todayKey()) {
      return {
        status: 'skipped',
        reason: 'Hidden balance scan already refreshed today.',
        sourceUrl: latestUrl,
        hiddenBalanceUpdated: false,
        newsContent: current,
      };
    }

    const article = await fetchPatchArticle(latestUrl);
    const hiddenBalance = await refreshHiddenBalance(article, current);
    return {
      status: 'updated',
      reason: 'Hidden balance scan refreshed.',
      sourceUrl: article.url,
      sourceTitle: article.title,
      usedAi: hiddenBalance.usedAi,
      hiddenBalanceUpdated: true,
      newsContent: hiddenBalance.next,
    };
  } catch (error) {
    return { status: 'error', reason: error instanceof Error ? error.message : 'Hidden balance scan failed.' };
  }
}

export async function syncWarzoneNews(options: { force?: boolean } = {}): Promise<NewsSyncResult> {
  try {
    const latestUrl = await findLatestWarzonePatchUrl();
    if (!latestUrl) return { status: 'error', reason: 'No Warzone patch note URL found.' };

    const current = await getNewsContent();
    const hiddenBalanceScannedToday = current.hiddenBalance.updatedAt.slice(0, 10) === todayKey();
    if (!options.force && current.sourceUrl === latestUrl && current.categories['patch-notes'].items.length && hiddenBalanceScannedToday) {
      return { status: 'skipped', reason: 'News and hidden balance scan already refreshed today.', sourceUrl: latestUrl };
    }

    const article = await fetchPatchArticle(latestUrl);
    if (!options.force && current.sourceUrl === latestUrl && current.categories['patch-notes'].items.length) {
      const hiddenBalance = await refreshHiddenBalance(article, current);
      return {
        status: 'updated',
        reason: 'Daily hidden balance scan refreshed without a new official patch.',
        sourceUrl: latestUrl,
        sourceTitle: article.title,
        usedAi: hiddenBalance.usedAi,
        hiddenBalanceUpdated: true,
        newsContent: hiddenBalance.next,
      };
    }

    const intelSources = await collectWarzoneIntelSources(article);
    let generated: GeneratedNews | null = null;
    let usedAi = false;

    for (let attempt = 0; attempt < 2 && !generated; attempt += 1) {
      try {
        generated = await generateWithOpenRouter(article, intelSources);
        usedAi = Boolean(generated);
      } catch (error) {
        console.error(`OpenRouter news generation failed (attempt ${attempt + 1}):`, error);
      }
    }

    const content = generated ?? await fallbackFromFreePreview();
    const next = await saveNewsContent({
      updatedAt: new Date().toISOString(),
      sourceUrl: article.url,
      sourceTitle: article.title,
      hiddenBalance: { updatedAt: new Date().toISOString(), items: content.hiddenBalance },
      categories: {
        'patch-notes': { items: content['patch-notes'] },
        meta: { items: content.meta },
        esport: { items: content.esport },
        evenements: { items: content.evenements },
      },
    });

    return {
      status: 'updated',
      sourceUrl: article.url,
      sourceTitle: article.title,
      usedAi,
      hiddenBalanceUpdated: true,
      newsContent: next,
    };
  } catch (error) {
    return { status: 'error', reason: error instanceof Error ? error.message : 'News sync failed.' };
  }
}
