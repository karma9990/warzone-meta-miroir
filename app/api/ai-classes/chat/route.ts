import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';
import { readJsonBody } from '@/lib/security';
import { hasUpstash, upstashCommand } from '@/lib/upstash';

type CoachBody = {
  message?: string;
  answers?: Record<string, string>;
  recommendation?: string;
  history?: Array<{
    role?: 'assistant' | 'user';
    text?: string;
  }>;
  image?: {
    dataUrl?: string;
    mimeType?: string;
    name?: string;
  };
};

type ValidCoachImage = {
  dataUrl: string;
  mimeType: string;
  name?: string;
};

type OpenRouterMessage = {
  role: 'system' | 'assistant' | 'user';
  content: string | Array<
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } }
  >;
};

type MetaSignal = {
  weapon: string;
  status: string;
  note: string;
};

const OPENROUTER_MODEL = process.env.OPENROUTER_AI_CLASSES_MODEL || 'google/gemma-4-31b-it:free';
const OPENROUTER_MODEL_VISION = process.env.OPENROUTER_AI_CLASSES_MODEL_VISION || 'meta-llama/llama-3.2-11b-vision-instruct';

const CHAT_BODY_LIMIT_BYTES = 6_500_000;

const WARZONE_CONTEXT_BASE = `
Tu es IA WZPRO, un vrai coach Warzone. Tu dois discuter naturellement, garder le contexte de la conversation, poser des questions pertinentes, et ne jamais repeter une reponse template si l'utilisateur precise son cas.

LANGUE: reponds TOUJOURS dans la langue du dernier message de l'utilisateur. S'il ecrit en anglais, reponds en anglais; en espagnol, reponds en espagnol; en francais, reponds en francais. Ne force jamais le francais.

Domaines que tu maitrises:
- Warzone Saison 04, armes, classes, accessoires, recoil, TTK, velocite, ranked, resurgence, battle royale, rotations, perks, audio, reglages manette/clavier-souris.
- Progression haut niveau: VOD review, scrims, tournois, trio/squad, roles, communication, mental, routines, objectifs chiffres.
- Circuit competitif: Ranked Play utilise le Skill Rating (SR); WSOW est le circuit officiel Warzone; FACEIT sert souvent aux inscriptions/qualifs selon formats; Call of Duty Challengers est le path-to-pro officiel COD cote CDL.

Regles de comportement:
- Si l'utilisateur discute normalement, reponds normalement. Tu n'es pas seulement un generateur de classes.
- Si l'utilisateur dit salut/bonjour, reponds simplement et ouvre la conversation.
- Si l'utilisateur demande comment progresser/devenir pro, donne une reponse concrete selon son niveau actuel, pas un paragraphe generique.
- Si l'utilisateur dit etre Iri/Iridescent, considere qu'il est deja haut niveau: parle de scrims, VOD, reseau, trio stable, tournois, role, discipline, pas de conseils debutants.
- Ne propose une classe que si l'utilisateur demande clairement une classe/build/loadout/arme/accessoires, ou envoie une image de classe a analyser.
- Avant une classe, si les infos manquent, pose 2 ou 3 questions utiles: mode, distance, style, priorite, input, recoil tolere.
- Ne cite jamais "profil interne", "intention detectee" ou les variables techniques.
- Si une info officielle peut changer (dates, regles, inscriptions), dis de verifier Activision, Call of Duty Esports, WSOW ou FACEIT.

Base armes de l'outil:
- Armes suivies: MXR-17, CBRS-3, Dravec 45, Carbon 57, Kogot-7, VX Compact, VST, KRS-7.62, REV-46, M10 Breacher, DS20 Mirage, Voyak KT-3, AK-27.
- Long range stable: MXR-17, DS20 Mirage, Voyak KT-3, AK-27.
- SMG agressives: Kogot-7, Carbon 57, Dravec 45, VST, REV-46.
- Sniper support / flex: VX Compact, DS20 Mirage, Carbon 57.
- Accessoires: muzzle/barrel pour portee-velocite-recul; stock/rear grip/laser pour mobilite ADS sprint-to-fire; magazine pour squad/ranked; optic pour lisibilite.
- Ne conseille jamais un accessoire si tu n'es pas sur qu'il soit montable sur l'arme.

Style: direct, coach, utile, dans la langue de l'utilisateur. Reponds en 5 a 10 lignes sauf demande detaillee.`;

async function getMetaSignals(): Promise<MetaSignal[]> {
  try {
    if (!hasUpstash()) return [];
    const result = await upstashCommand(['GET', 'wz:site-content']);
    if (typeof result !== 'string') return [];
    const parsed = JSON.parse(result);
    const signals = parsed?.freePreview?.metaSignals;
    if (!Array.isArray(signals)) return [];
    return signals.filter((s: MetaSignal) => s.weapon && s.status && s.note);
  } catch {
    return [];
  }
}

function buildContext(metaSignals: MetaSignal[]): string {
  if (!metaSignals.length) return WARZONE_CONTEXT_BASE;

  const signalLines = metaSignals
    .map(s => `- ${s.weapon} (${s.status}): ${s.note}`)
    .join('\n');

  return `${WARZONE_CONTEXT_BASE}

Signaux meta actuels (mis a jour depuis le site, utilise ces infos en priorite pour tes conseils):
${signalLines}`;
}

function wantsClassAdvice(message: string, hasImage: boolean) {
  const lower = message.toLowerCase();
  if (hasImage) return true;
  return /(classe|build|loadout|arme|accessoire|accessoires|conseille|conseil|recommande|meta|optimise|optimiser|setup|ttk|recul|viseur|canon|muzzle|chargeur|stock|crosse|sniper support)/.test(lower);
}

function wantsProgressAdvice(message: string) {
  return /(devenir pro|passer pro|etre pro|être pro|pro player|joueur pro|competitive|competitif|compétitif|tournoi|wsow|world series|faceit|challengers|scrim|progresser|ameliorer|améliorer|entrainement|entraînement|ranked|iridescent|iri|top 250|vod)/i.test(message);
}

function validImage(body: CoachBody): ValidCoachImage | null {
  const image = body.image;
  if (!image?.dataUrl || !image.mimeType) return null;
  if (!/^image\/(png|jpe?g|webp|gif|avif)$/i.test(image.mimeType)) return null;
  if (!/^data:image\/(png|jpe?g|webp|gif|avif);base64,/i.test(image.dataUrl)) return null;
  if (image.dataUrl.length > 6_000_000) return null;
  return {
    dataUrl: image.dataUrl,
    mimeType: image.mimeType,
    name: image.name,
  };
}

function safeHistory(body: CoachBody) {
  return (body.history ?? [])
    .filter((item): item is { role: 'assistant' | 'user'; text: string } => {
      return (item.role === 'assistant' || item.role === 'user') && typeof item.text === 'string' && item.text.trim().length > 0;
    })
    .slice(-10)
    .map((item) => ({
      role: item.role,
      content: item.text.slice(0, 1200),
    }));
}

async function askOpenRouter(messages: OpenRouterMessage[], model: string) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY missing');

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://wzprometa.com',
      'X-Title': 'IA WZPRO',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.55,
      max_tokens: 520,
    }),
  });

  const payload = await response.json().catch(() => null) as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } } | null;
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'OpenRouter request failed');
  }

  const reply = payload?.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error('OpenRouter empty reply');
  return reply;
}

async function askBrain(messages: OpenRouterMessage[], hasImage: boolean) {
  const errors: string[] = [];
  const model = hasImage ? OPENROUTER_MODEL_VISION : OPENROUTER_MODEL;

  try {
    return await askOpenRouter(messages, model);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'OpenRouter failed');
  }

  const fallbackModel = hasImage ? OPENROUTER_MODEL : OPENROUTER_MODEL_VISION;
  try {
    return await askOpenRouter(messages, fallbackModel);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Fallback failed');
  }

  throw new Error(errors.join(' | '));
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, 'ai-classes', 10, 60_000);
  if (limited) return limited;

  const parsed = await readJsonBody<CoachBody>(request, CHAT_BODY_LIMIT_BYTES);
  if ('error' in parsed) return parsed.error;

  const body = parsed.data;
  const message = body.message?.slice(0, 1200) ?? '';
  const image = validImage(body);
  const classIntent = wantsClassAdvice(message, Boolean(image));
  const progressIntent = wantsProgressAdvice(message);

  if (!message.trim() && !image) {
    return NextResponse.json({ reply: "Dis-moi ce que tu veux faire sur Warzone: discuter, progresser, analyser une image, ou creer une classe." });
  }

  const [metaSignals] = await Promise.all([getMetaSignals()]);
  const WARZONE_CONTEXT = buildContext(metaSignals);

  const promptText = `Contexte actuel:
- Type: ${classIntent ? 'demande de classe/build' : progressIntent ? 'progression/competition/discussion haut niveau' : 'discussion normale'}
- Profil outil indicatif: ${JSON.stringify(body.answers ?? {})}
- Arme recommandee seulement si build demande: ${classIntent ? body.recommendation ?? 'non definie' : 'ne pas utiliser'}
Question utilisateur: ${message || "Analyse cette image pour m'aider sur Warzone."}`;

  const messages: OpenRouterMessage[] = [
    { role: 'system', content: WARZONE_CONTEXT },
    ...safeHistory(body),
    {
      role: 'user',
      content: image
        ? [
            { type: 'text', text: `${promptText}\nImage envoyee: ${image.name ?? 'image utilisateur'} (${image.mimeType}). Analyse-la visuellement.` },
            { type: 'image_url', image_url: { url: image.dataUrl } },
          ]
        : promptText,
    },
  ];

  try {
    const reply = await askBrain(messages, Boolean(image));
    return NextResponse.json({ reply });
  } catch (error) {
    return NextResponse.json(
      {
        reply: "L'IA WZPRO n'arrive pas a joindre son modele pour l'instant. Je prefere te le dire clairement plutot que de te sortir une reponse prefaite. Reessaie dans quelques secondes.",
        error: error instanceof Error ? error.message : 'AI model unavailable',
      },
      { status: 503 },
    );
  }
}
