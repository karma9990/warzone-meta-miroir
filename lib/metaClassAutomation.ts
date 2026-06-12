import { getLoadouts, saveLoadouts, type Loadout, type Tier } from './data';
import { getNextMetaConfig, saveNextMetaConfig, type NextMetaConfig, type NextMetaPatchSignal, type NextMetaRangeRole } from './nextMetaConfig';
import { fetchPatchArticle, findLatestWarzonePatchUrl, type PatchArticle } from './patchNotesAutomation';
import { getProClassesContent, saveProClassesContent, type ProClass } from './proClasses';
import { collectWarzoneIntelSources, formatIntelSourcesForPrompt, type IntelSourceSnapshot } from './warzoneIntelSources';

const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_OPENROUTER_MODEL = 'openrouter/free';

type LoadoutPatchUpdate = {
  weapon: string;
  tier?: Tier;
  patchSummary: string;
  sourceNote: string;
  tags?: string[];
};

type ProClassPatchUpdate = {
  name: string;
  role: string;
};

type GeneratedMetaClassUpdate = {
  nextMeta: Partial<NextMetaConfig>;
  loadouts: LoadoutPatchUpdate[];
  proClasses: ProClassPatchUpdate[];
};

export type MetaClassSyncResult = {
  status: 'updated' | 'skipped' | 'error';
  reason?: string;
  sourceUrl?: string;
  sourceTitle?: string;
  usedAi?: boolean;
  updatedLoadouts?: number;
  updatedProClasses?: number;
  nextMeta?: NextMetaConfig;
};

function compactLoadout(loadout: Loadout) {
  return {
    weapon: loadout.weapon,
    weaponId: loadout.weaponId,
    category: loadout.category,
    tier: loadout.tier,
    playstyle: loadout.playstyle,
    attachments: loadout.attachments.map((attachment) => `${attachment.slot}: ${attachment.name}`),
  };
}

function compactProClass(entry: ProClass) {
  return {
    name: entry.name,
    team: entry.team,
    role: entry.role,
    weapons: [entry.weapon1.name, entry.weapon2.name].filter(Boolean),
  };
}

function metaClassPrompt(
  article: PatchArticle,
  loadouts: Loadout[],
  proClasses: ProClass[],
  currentNextMeta: NextMetaConfig,
  intelSources: IntelSourceSnapshot[],
) {
  return `Tu es l'agent quotidien autonome de WZPRO Meta.
Tu lis des patch notes officielles Call of Duty: Warzone et des sources meta externes, puis tu mets a jour uniquement ce qui peut etre deduit des faits fournis.
N'invente jamais une classe pro, un accessoire exact ou une source qui n'est pas dans les donnees.

Retourne uniquement un objet JSON valide:
{
  "nextMeta": {
    "weaponOptions": string[],
    "defaultWeapon": string,
    "defaultCategory": string,
    "defaultRole": "Close range" | "Sniper support" | "Long range" | "Flex",
    "defaultSignal": "buff" | "nerf" | "indirect-buff" | "unchanged",
    "defaultPatchNote": string,
    "defaultReason": string,
    "defaultConfidence": number,
    "priorityScore": number,
    "defaultAttachments": [{ "slot": string, "name": string }]
  },
  "loadouts": [
    {
      "weapon": string,
      "tier": "S" | "A" | "B" | "C",
      "patchSummary": string,
      "sourceNote": string,
      "tags": string[]
    }
  ],
  "proClasses": [
    { "name": string, "role": string }
  ]
}

Regles:
- nextMeta.defaultWeapon doit etre une arme existante dans les loadouts ci-dessous, prioritaire si le patch la buff ou cree une ouverture meta.
- nextMeta.defaultAttachments doit rester vide si les patch notes ou les sources disponibles ne donnent pas d'accessoires exacts.
- loadouts: mets a jour seulement les armes existantes citees ou impactees clairement par le patch, maximum 12.
- proClasses: ne change que le champ role pour les classes existantes, en deduisant du duo d'armes et du patch; pas de changement d'accessoires.
- Pour les buffs/nerfs caches: croise Raven/Call of Duty, JGOD, Sym.gg, TrueGameData et ModernWarzone quand STATUS vaut ok. Si une source est en error, ne l'utilise pas comme preuve.
- Texte en francais simple, concis, sans markdown.

Source officielle: ${article.url}
Titre: ${article.title}
Date: ${article.dateLabel}

Config next-meta actuelle:
${JSON.stringify(currentNextMeta).slice(0, 4_000)}

Loadouts existants:
${JSON.stringify(loadouts.map(compactLoadout)).slice(0, 12_000)}

Classes pro existantes:
${JSON.stringify(proClasses.map(compactProClass)).slice(0, 8_000)}

Sources de veille a utiliser:
${formatIntelSourcesForPrompt(intelSources).slice(0, 18_000)}

Patch notes:
${article.text.slice(0, 16_000)}`;
}

function parseJsonObject(text: string): GeneratedMetaClassUpdate {
  const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('AI response did not contain a JSON object.');
  return JSON.parse(cleaned.slice(start, end + 1)) as GeneratedMetaClassUpdate;
}

async function generateWithOpenRouter(
  article: PatchArticle,
  loadouts: Loadout[],
  proClasses: ProClass[],
  currentNextMeta: NextMetaConfig,
  intelSources: IntelSourceSnapshot[],
): Promise<GeneratedMetaClassUpdate | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const response = await fetch(OPENROUTER_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://wzprometa.com',
      'X-Title': 'WZPRO Meta Daily Intelligence',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_META_MODEL || process.env.OPENROUTER_NEWS_MODEL || process.env.OPENROUTER_PATCH_NOTES_MODEL || DEFAULT_OPENROUTER_MODEL,
      messages: [
        {
          role: 'system',
          content: 'Tu es un analyste Warzone. Tu reponds uniquement en JSON valide, sans markdown, et tu n inventes pas de faits.',
        },
        { role: 'user', content: metaClassPrompt(article, loadouts, proClasses, currentNextMeta, intelSources) },
      ],
      temperature: 0.15,
      max_tokens: 4200,
    }),
  });

  if (!response.ok) throw new Error(`OpenRouter response failed: ${response.status}`);
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const outputText = data.choices?.[0]?.message?.content ?? '';
  if (!outputText) return null;
  return parseJsonObject(outputText);
}

function fallbackUpdate(article: PatchArticle, loadouts: Loadout[], proClasses: ProClass[], currentNextMeta: NextMetaConfig): GeneratedMetaClassUpdate {
  const articleText = article.text.toLowerCase();
  const mentioned = loadouts.filter((loadout) => {
    const names = [loadout.weapon, loadout.weaponId ?? '']
      .filter(Boolean)
      .map((value) => value.toLowerCase().replace(/[-.]/g, ' '));
    return names.some((name) => articleText.includes(name));
  });
  const primary = mentioned[0] ?? loadouts.find((loadout) => loadout.tier === 'S') ?? loadouts[0];

  return {
    nextMeta: {
      ...currentNextMeta,
      weaponOptions: Array.from(new Set([primary?.weapon, ...mentioned.map((loadout) => loadout.weapon), ...currentNextMeta.weaponOptions].filter(Boolean))).slice(0, 20),
      defaultWeapon: primary?.weapon ?? currentNextMeta.defaultWeapon,
      defaultCategory: primary?.category ?? currentNextMeta.defaultCategory,
      defaultRole: roleFromLoadout(primary) ?? currentNextMeta.defaultRole,
      defaultSignal: mentioned.length ? 'unchanged' : currentNextMeta.defaultSignal,
      defaultPatchNote: `Patch officiel verifie (${article.dateLabel}): ${article.title}. Aucun changement chiffre fiable n a ete isole par le fallback automatique.`,
      defaultReason: primary
        ? `${primary.weapon} reste le candidat a surveiller car il est deja present dans les classes WZPRO et doit etre reteste apres ce patch.`
        : currentNextMeta.defaultReason,
      defaultConfidence: mentioned.length ? 62 : 50,
      priorityScore: mentioned.length ? 64 : 52,
      defaultAttachments: primary?.attachments.map(({ slot, name }) => ({ slot, name })).slice(0, 6) ?? currentNextMeta.defaultAttachments,
    },
    loadouts: mentioned.slice(0, 8).map((loadout) => ({
      weapon: loadout.weapon,
      tier: loadout.tier,
      patchSummary: `Patch officiel verifie (${article.dateLabel}). ${loadout.weapon} doit etre reteste avant de changer son classement meta.`,
      sourceNote: `Source officielle: ${article.url}`,
      tags: Array.from(new Set([...(loadout.tags ?? []), 'patch watch'])).slice(0, 6),
    })),
    proClasses: proClasses.map((entry) => ({
      name: entry.name,
      role: entry.role || inferProClassRole(entry),
    })),
  };
}

function roleFromLoadout(loadout?: Loadout): NextMetaRangeRole | undefined {
  if (!loadout) return undefined;
  const text = `${loadout.category} ${loadout.playstyle}`.toLowerCase();
  if (text.includes('sniper support')) return 'Sniper support';
  if (text.includes('long') || text.includes('sniper')) return 'Long range';
  if (text.includes('close') || text.includes('smg')) return 'Close range';
  return 'Flex';
}

function inferProClassRole(entry: ProClass) {
  const weapons = `${entry.weapon1.name} ${entry.weapon2.name}`.toLowerCase();
  if (/(sniper|hdr|strider|recon|hawker)/i.test(weapons)) return 'Sniper + support';
  if (/(ds20|mxr|ak|voyak|mk\.?78|kilo|amax)/i.test(weapons) && /(mpc|carbon|dravec|vst|smg|45|57)/i.test(weapons)) {
    return 'Long range + close range';
  }
  return 'Competitive loadout';
}

function normalizeSignal(value: unknown, fallback: NextMetaPatchSignal): NextMetaPatchSignal {
  return value === 'buff' || value === 'nerf' || value === 'indirect-buff' || value === 'unchanged' ? value : fallback;
}

function normalizeRole(value: unknown, fallback: NextMetaRangeRole): NextMetaRangeRole {
  return value === 'Close range' || value === 'Sniper support' || value === 'Long range' || value === 'Flex' ? value : fallback;
}

function applyLoadoutUpdates(loadouts: Loadout[], updates: LoadoutPatchUpdate[], article: PatchArticle) {
  let count = 0;
  const byName = new Map(updates.map((update) => [update.weapon.toLowerCase(), update]));

  const next = loadouts.map((loadout) => {
    const update = byName.get(loadout.weapon.toLowerCase()) ?? byName.get((loadout.weaponId ?? '').toLowerCase());
    if (!update?.patchSummary || !update.sourceNote) return loadout;
    count += 1;
    return {
      ...loadout,
      tier: update.tier ?? loadout.tier,
      tags: update.tags?.length ? Array.from(new Set(update.tags)).slice(0, 8) : loadout.tags,
      patchSummary: update.patchSummary,
      sourceNote: update.sourceNote || `Source officielle: ${article.url}`,
      updatedAt: new Date().toISOString().slice(0, 10),
    };
  });

  return { next, count };
}

function applyProClassUpdates(classes: ProClass[], updates: ProClassPatchUpdate[]) {
  let count = 0;
  const byName = new Map(updates.map((update) => [update.name.toLowerCase(), update]));

  const next = classes.map((entry) => {
    const update = byName.get(entry.name.toLowerCase());
    const role = update?.role || entry.role || inferProClassRole(entry);
    if (role === entry.role) return entry;
    count += 1;
    return { ...entry, role };
  });

  return { next, count };
}

export async function syncMetaAndClassIntelligence(options: { force?: boolean } = {}): Promise<MetaClassSyncResult> {
  try {
    const latestUrl = await findLatestWarzonePatchUrl();
    if (!latestUrl) return { status: 'error', reason: 'No Warzone patch note URL found.' };

    const [currentNextMeta, loadouts, proClassesContent] = await Promise.all([
      getNextMetaConfig(),
      getLoadouts(),
      getProClassesContent(),
    ]);

    if (!options.force && currentNextMeta.defaultPatchNote.includes(latestUrl) && currentNextMeta.updatedAt === new Date().toISOString().slice(0, 10)) {
      return { status: 'skipped', reason: 'Meta and class intelligence already synced today.', sourceUrl: latestUrl };
    }

    const article = await fetchPatchArticle(latestUrl);
    const intelSources = await collectWarzoneIntelSources(article);
    let generated: GeneratedMetaClassUpdate | null = null;
    let usedAi = false;

    try {
      generated = await generateWithOpenRouter(article, loadouts, proClassesContent.classes, currentNextMeta, intelSources);
      usedAi = Boolean(generated);
    } catch (error) {
      console.error('OpenRouter meta/class generation failed, using fallback:', error);
    }

    const content = generated ?? fallbackUpdate(article, loadouts, proClassesContent.classes, currentNextMeta);
    const nextMeta = await saveNextMetaConfig({
      ...currentNextMeta,
      ...content.nextMeta,
      defaultSignal: normalizeSignal(content.nextMeta.defaultSignal, currentNextMeta.defaultSignal),
      defaultRole: normalizeRole(content.nextMeta.defaultRole, currentNextMeta.defaultRole),
      defaultPatchNote: `${content.nextMeta.defaultPatchNote || currentNextMeta.defaultPatchNote}\nSource: ${article.url}`,
    });

    const loadoutResult = applyLoadoutUpdates(loadouts, content.loadouts ?? [], article);
    if (loadoutResult.count) await saveLoadouts(loadoutResult.next);

    const proClassResult = applyProClassUpdates(proClassesContent.classes, content.proClasses ?? []);
    await saveProClassesContent({
      updatedAt: new Date().toISOString(),
      sourceUrl: article.url,
      sourceTitle: article.title,
      classes: proClassResult.next,
    });

    return {
      status: 'updated',
      sourceUrl: article.url,
      sourceTitle: article.title,
      usedAi,
      updatedLoadouts: loadoutResult.count,
      updatedProClasses: proClassResult.count,
      nextMeta,
    };
  } catch (error) {
    return { status: 'error', reason: error instanceof Error ? error.message : 'Meta/class sync failed.' };
  }
}
