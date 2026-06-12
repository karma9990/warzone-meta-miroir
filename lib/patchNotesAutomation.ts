import { getSiteContent, saveSiteContent, type SiteContent } from './siteContent';

const PATCH_INDEX_URL = 'https://www.callofduty.com/patchnotes';
const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_OPENROUTER_MODEL = 'openrouter/free';

export type PatchArticle = {
  title: string;
  dateLabel: string;
  url: string;
  text: string;
};

type GeneratedFreePreviewPatch = {
  currentKicker: string;
  currentTitle: string;
  patchChecked: string;
  patchUrl: string;
  patchLinkLabel: string;
  patchHighlights: { title: string; body: string }[];
  metaKicker: string;
  metaTitle: string;
  metaSignals: { weapon: string; status: string; note: string }[];
  mapKicker: string;
  mapTitle: string;
  mapNotes: string[];
  checklistKicker: string;
  checklistTitle: string;
  weeklyChecklist: string[];
  sampleKicker: string;
  sampleTitle: string;
  sampleBriefing: { title: string; body: string }[];
};

export type PatchNotesSyncResult = {
  status: 'updated' | 'skipped' | 'error';
  reason?: string;
  sourceUrl?: string;
  sourceTitle?: string;
  usedAi?: boolean;
  aiProvider?: string;
  siteContent?: SiteContent;
};

function absoluteCallOfDutyUrl(pathOrUrl: string) {
  return new URL(pathOrUrl.replace(/&amp;/g, '&'), PATCH_INDEX_URL).toString().split('?')[0];
}

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

function extractArticleText(html: string) {
  const blocks = [...html.matchAll(/<div class="cmp-text">([\s\S]*?)<\/div>\s*<\/div>/g)]
    .map(match => stripHtml(match[1]))
    .filter(Boolean);

  const startIndex = blocks.findIndex(block => /CALL OF DUTY:\s*WARZONE/i.test(block));
  const relevant = (startIndex >= 0 ? blocks.slice(startIndex) : blocks)
    .filter(block => !/^(WEDNESDAY|MONDAY|TUESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)\b/i.test(block))
    .filter(block => !/^(GLOBAL|NEW|MAPS|MODES|WEAPONS|BUG FIXES|EVENTS)$/i.test(block))
    .join('. ');

  return relevant || stripHtml(html);
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function extractTitle(html: string, fallback: string) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  return stripHtml(h1 || fallback).replace(/\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\s*$/i, '').trim() || fallback;
}

function extractDateLabel(text: string, fallback = new Date().toISOString().slice(0, 10)) {
  return text.match(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b/i)?.[0] ?? fallback;
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'WZPRO Meta patch note monitor',
      Accept: 'text/html,text/plain',
    },
  });
  if (!response.ok) throw new Error(`Fetch failed for ${url}: ${response.status}`);
  return response.text();
}

export async function findLatestWarzonePatchUrl() {
  const html = await fetchText(PATCH_INDEX_URL);
  const hrefs = unique([...html.matchAll(/href=["']([^"']*warzone[^"']*patch-notes[^"']*)["']/gi)].map(match => absoluteCallOfDutyUrl(match[1])));
  const candidates = hrefs
    .filter(url => /\/patchnotes\/\d{4}\/\d{2}\//.test(url))
    .sort((a, b) => b.localeCompare(a));

  return candidates[0] ?? null;
}

export async function fetchPatchArticle(url: string): Promise<PatchArticle> {
  const html = await fetchText(url);
  const text = extractArticleText(html);
  const title = extractTitle(html, 'Call of Duty: Warzone Patch Notes');
  const dateLabel = extractDateLabel(text);

  return {
    title,
    dateLabel,
    url,
    text: text.slice(0, 20_000),
  };
}

function fallbackGenerate(article: PatchArticle): GeneratedFreePreviewPatch {
  const source = article.text;
  const mentionsVerdansk = /verdansk/i.test(source);
  const mentionsFortunesKeep = /fortune.?s keep/i.test(source);
  const mentionsNewZones = /Launch|Signal Station|Factory|Airport/i.test(source);
  const mentionsWeapon = /weapon|rifle|smg|sniper|attachment|VX Compact/i.test(source);
  const mentionsPlaylist = /playlist|Battle Royale|Resurgence|Quads|Casual/i.test(source);
  const mapName = mentionsVerdansk ? 'Verdansk' : mentionsFortunesKeep ? "Fortune's Keep" : 'la carte active';
  const weaponName = /VX Compact/i.test(source) ? 'VX Compact' : 'armes et accessoires';

  return {
    currentKicker: 'Briefing gratuit actuel',
    currentTitle: article.title,
    patchChecked: `Patch verifie: ${article.dateLabel}`,
    patchUrl: article.url,
    patchLinkLabel: 'Patch notes officielles',
    patchHighlights: [
      {
        title: 'Patch Season 04 detecte',
        body: `La page suit les notes officielles ${article.title} et prepare les points a verifier avant de modifier tes classes.`,
      },
      {
        title: mentionsNewZones ? 'Nouvelles zones a tester' : 'Carte a recontroler',
        body: mentionsNewZones
          ? 'Launch, Signal Station, Factory et Airport sont signales comme zones de combat a surveiller pour les rotations et reprises.'
          : `Recontrole les rotations, lignes de vue et zones de regain sur ${mapName} avant tes sessions ranked.`,
      },
      {
        title: mentionsWeapon ? 'Signal armes' : 'Signal gameplay',
        body: mentionsWeapon
          ? `Les changements autour de ${weaponName} doivent etre testes en courte portee, longue portee et support sniper.`
          : 'Les changements de gameplay doivent etre testes en partie reelle avant de verrouiller une classe meta.',
      },
      {
        title: mentionsPlaylist ? 'Playlists et modes' : 'Plan de test',
        body: mentionsPlaylist
          ? 'Les playlists et modes mentionnes dans le patch peuvent changer le rythme des fights, du loot et des regains.'
          : 'Lance un test rapide en BR puis en Resurgence pour separer les vrais buffs des simples impressions.',
      },
    ],
    metaKicker: 'Alertes meta armes',
    metaTitle: 'Signaux meta a tester',
    metaSignals: [
      {
        weapon: weaponName,
        status: 'A tester',
        note: mentionsWeapon
          ? 'Controle le recul, le TTK ressenti et la stabilite sur plusieurs distances avant de la placer dans le top meta.'
          : 'Aucun buff ou nerf d arme clair n a ete isole par le fallback, garde tes classes stables et teste en live.',
      },
      {
        weapon: 'Longue portee',
        status: 'A surveiller',
        note: `Teste les combats ouverts sur ${mapName}, surtout si les nouvelles zones changent les lignes de vue dominantes.`,
      },
      {
        weapon: 'Courte portee',
        status: 'A tester',
        note: 'Refais un comparatif SMG en interieur, dans les escaliers et sur les reprises rapides avant de changer ton secondaire.',
      },
      {
        weapon: 'Support sniper',
        status: 'A surveiller',
        note: 'Verifie si les rotations et les hauteurs favorisent encore les supports sniper ou les AR plus polyvalents.',
      },
    ],
    mapKicker: 'Mises a jour Resurgence',
    mapTitle: 'Notes map et regain',
    mapNotes: [
      mentionsNewZones
        ? 'Les zones Launch, Signal Station, Factory et Airport doivent etre scout en priorite pour trouver les nouveaux timings de rotation.'
        : `Recontrole les points chauds de ${mapName} avant de reprendre les routes habituelles.`,
      'Teste les contrats, stations d achat et ballons de redeploiement avant de figer tes routes de regain.',
      'Garde une classe mobile pour les premieres games du patch: les nouveaux chemins changent souvent le rythme des fights.',
      'Note les zones ou les fights durent plus longtemps, puis adapte les smokes, perks et choix de secondaire.',
    ],
    checklistKicker: 'Conseils communaute',
    checklistTitle: 'Checklist rapide de la semaine',
    weeklyChecklist: [
      `Lire les notes officielles de ${article.title} avant de verrouiller tes classes ranked.`,
      'Re-tester une arme courte portee, une longue portee et un support sniper apres ce patch.',
      'Verifier les changements de loot, de map et de playlists avant de planifier les regains.',
      'Adapter les calls squad si les regles ranked, modes ou endgames ont change.',
    ],
    sampleKicker: 'Exemple de briefing',
    sampleTitle: 'A quoi ressemble un email gratuit',
    sampleBriefing: [
      { title: 'Signal patch', body: `Dernieres notes Warzone officielles detectees: ${article.title}.` },
      { title: 'Note meta', body: `Priorite test: ${weaponName}, longue portee, courte portee et support sniper.` },
      { title: 'Conseil joueur', body: `Avant ta prochaine session, recontrole ${mapName}, les playlists et les routes de regain.` },
    ],
  };
}

function parseJsonObject(text: string) {
  const cleaned = text
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('AI response did not contain a JSON object.');
  return JSON.parse(cleaned.slice(start, end + 1)) as GeneratedFreePreviewPatch;
}

function patchPrompt(article: PatchArticle) {
  return `Tu transformes les patch notes officielles Call of Duty: Warzone en contenu CMS concis en francais pour une page free preview.
Utilise uniquement les faits fournis. Evite les menus, le texte de navigation, les disclaimers inutiles et le remplissage.
Retourne uniquement un objet JSON valide avec exactement ces champs:
currentKicker, currentTitle, patchChecked, patchUrl, patchLinkLabel, patchHighlights, metaKicker, metaTitle, metaSignals, mapKicker, mapTitle, mapNotes, checklistKicker, checklistTitle, weeklyChecklist, sampleKicker, sampleTitle, sampleBriefing.
Contraintes:
- patchHighlights: 4 objets { "title": string, "body": string }
- metaSignals: 4 a 6 objets { "weapon": string, "status": string, "note": string }
- mapNotes: 4 strings
- weeklyChecklist: 4 strings
- sampleBriefing: 3 objets { "title": string, "body": string }
- Tout le texte doit etre en francais, sauf les noms propres d'armes, cartes, modes et lieux.

Source officielle: ${article.url}
Titre: ${article.title}
Date: ${article.dateLabel}

Patch notes:
${article.text.slice(0, 16_000)}`;
}

async function generateWithOpenRouter(article: PatchArticle): Promise<GeneratedFreePreviewPatch | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const response = await fetch(OPENROUTER_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://wzprometa.com',
      'X-Title': 'WZPRO Meta Patch Notes',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_PATCH_NOTES_MODEL || DEFAULT_OPENROUTER_MODEL,
      messages: [
        {
          role: 'system',
          content: 'Tu es un redacteur Warzone francophone. Reponds uniquement en JSON valide, sans markdown.',
        },
        { role: 'user', content: patchPrompt(article) },
      ],
      temperature: 0.2,
      max_tokens: 1400,
    }),
  });

  if (!response.ok) throw new Error(`OpenRouter response failed: ${response.status}`);
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const outputText = data.choices?.[0]?.message?.content ?? '';
  if (!outputText) return null;
  return parseJsonObject(outputText);
}

function mergePatchContent(current: SiteContent, patch: GeneratedFreePreviewPatch): SiteContent {
  return {
    ...current,
    freePreview: {
      ...current.freePreview,
      ...patch,
    },
  };
}

export async function syncLatestWarzonePatchNotes(options: { force?: boolean } = {}): Promise<PatchNotesSyncResult> {
  try {
    const latestUrl = await findLatestWarzonePatchUrl();
    if (!latestUrl) return { status: 'error', reason: 'No Warzone patch note URL found.' };

    const current = await getSiteContent();
    if (!options.force && current.freePreview.patchUrl === latestUrl) {
      return { status: 'skipped', reason: 'Latest patch note is already published.', sourceUrl: latestUrl };
    }

    const article = await fetchPatchArticle(latestUrl);
    let generated: GeneratedFreePreviewPatch | null = null;
    let usedAi = false;
    let aiProvider: string | undefined;

    try {
      generated = await generateWithOpenRouter(article);
      usedAi = Boolean(generated);
      if (generated) aiProvider = 'openrouter';
    } catch (error) {
      console.error('OpenRouter patch notes generation failed, using fallback:', error);
    }

    const next = await saveSiteContent(mergePatchContent(current, generated ?? fallbackGenerate(article)));
    return {
      status: 'updated',
      sourceUrl: article.url,
      sourceTitle: article.title,
      usedAi,
      aiProvider,
      siteContent: next,
    };
  } catch (error) {
    return { status: 'error', reason: error instanceof Error ? error.message : 'Patch notes sync failed.' };
  }
}
