import { NextRequest, NextResponse } from 'next/server';
import { getLoadouts } from '@/lib/data';
import { rateLimit } from '@/lib/rateLimit';
import { readJsonBody } from '@/lib/security';
import { isCompleteQuizAnswers, rankQuizLoadouts, type QuizAnswers } from '@/lib/loadoutQuizLogic';
import { calculateMetaScore } from '@/lib/loadoutUtils';

type QuizRecommendationBody = {
  answers?: QuizAnswers;
  locale?: string;
};

type OpenRouterMessage = {
  role: 'system' | 'user';
  content: string;
};

type AiRecommendation = {
  id?: string;
  weapon?: string;
  category?: string;
  tier?: 'S' | 'A' | 'B' | 'C';
  metaScore?: number;
  reason?: string;
  attachments?: Array<{
    slot?: string;
    name?: string;
  }>;
};

const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL =
  process.env.OPENROUTER_QUIZ_MODEL ||
  process.env.OPENROUTER_AI_CLASSES_MODEL ||
  'google/gemma-4-31b-it:free';

function fallbackResponse(loadouts: Awaited<ReturnType<typeof getLoadouts>>, answers: QuizAnswers, error?: string) {
  if (!isCompleteQuizAnswers(answers)) {
    return NextResponse.json({ error: 'Incomplete quiz answers.' }, { status: 400 });
  }

  return NextResponse.json({
    source: 'local-fallback',
    error,
    recommendations: rankQuizLoadouts(loadouts, answers, 3).map(({ loadout }) => ({
      id: loadout.id,
      reason: `Fallback WZPRO: tier ${loadout.tier}, meta ${calculateMetaScore(loadout)}, ${loadout.category}.`,
    })),
  });
}

function parseAiJson(text: string): { recommendations?: AiRecommendation[] } {
  const trimmed = text.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('AI response did not contain JSON.');
  return JSON.parse(trimmed.slice(start, end + 1)) as { recommendations?: AiRecommendation[] };
}

function cleanText(value: unknown, max = 120) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function cleanTier(value: unknown): 'S' | 'A' | 'B' | 'C' {
  return value === 'S' || value === 'A' || value === 'B' || value === 'C' ? value : 'A';
}

function cleanMetaScore(value: unknown) {
  const score = Number(value);
  if (!Number.isFinite(score)) return undefined;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function cleanAiRecommendation(item: AiRecommendation) {
  const weapon = cleanText(item.weapon, 80);
  const category = cleanText(item.category, 60) || 'Meta Weapon';
  const attachments = (Array.isArray(item.attachments) ? item.attachments : [])
    .map((attachment) => ({
      slot: cleanText(attachment.slot, 40),
      name: cleanText(attachment.name, 90),
    }))
    .filter((attachment) => attachment.slot && attachment.name)
    .slice(0, 5);

  if (!weapon || attachments.length < 5) return null;

  return {
    id: cleanText(item.id, 80) || undefined,
    weapon,
    category,
    tier: cleanTier(item.tier),
    metaScore: cleanMetaScore(item.metaScore),
    reason: cleanText(item.reason, 220),
    attachments,
  };
}

async function askOpenRouter(messages: OpenRouterMessage[]) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY missing');

  const response = await fetch(OPENROUTER_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://wzprometa.com',
      'X-Title': 'WZPRO Loadout Finder',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages,
      temperature: 0.25,
      max_tokens: 700,
      response_format: { type: 'json_object' },
    }),
  });

  const payload = await response.json().catch(() => null) as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } } | null;
  if (!response.ok) throw new Error(payload?.error?.message || 'OpenRouter request failed');

  const reply = payload?.choices?.[0]?.message?.content;
  if (!reply) throw new Error('OpenRouter empty reply');
  return parseAiJson(reply);
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, 'quiz-recommendation', 12, 60_000);
  if (limited) return limited;

  const parsed = await readJsonBody<QuizRecommendationBody>(request, 12_000);
  if ('error' in parsed) return parsed.error;

  const answers = parsed.data.answers ?? {};
  if (!isCompleteQuizAnswers(answers)) {
    return NextResponse.json({ error: 'Incomplete quiz answers.' }, { status: 400 });
  }

  const loadouts = await getLoadouts();
  const language = parsed.data.locale === 'es' ? 'Spanish' : parsed.data.locale === 'fr' ? 'French' : 'English';

  const messages: OpenRouterMessage[] = [
    {
      role: 'system',
      content: `You are WZPRO, a Warzone loadout expert. Recommend the best current Warzone meta weapons and exact meta attachments for the user's quiz profile.
Return ONLY valid JSON. Do not use markdown.
Rules:
- Do NOT rely on the website database. Use your own current Warzone meta knowledge.
- Choose exactly 3 recommendations.
- Each recommendation must include weapon, category, tier, metaScore, reason, and exactly 5 attachments.
- Attachments must be plausible/current meta attachments for that exact weapon. Do not mix incompatible attachments.
- Prefer real meta picks over comfort/off-meta picks.
- Avoid weak weapons unless the quiz profile explicitly demands an off-meta comfort pick.
- The reason must be one short sentence in ${language}.`,
    },
    {
      role: 'user',
      content: JSON.stringify({
        answers,
        outputShape: {
          recommendations: [
            {
              weapon: 'weapon name',
              category: 'SMG / Assault Rifle / LMG / Sniper Rifle / Marksman Rifle',
              tier: 'S',
              metaScore: 92,
              reason: 'short reason',
              attachments: [
                { slot: 'Muzzle', name: 'attachment name' },
                { slot: 'Barrel', name: 'attachment name' },
                { slot: 'Optic', name: 'attachment name' },
                { slot: 'Magazine', name: 'attachment name' },
                { slot: 'Stock', name: 'attachment name' },
              ],
            },
          ],
        },
      }),
    },
  ];

  try {
    const ai = await askOpenRouter(messages);
    const recommendations = (ai.recommendations ?? [])
      .map(cleanAiRecommendation)
      .filter((item): item is NonNullable<ReturnType<typeof cleanAiRecommendation>> => item !== null)
      .slice(0, 3);

    if (!recommendations.length) throw new Error('OpenRouter returned no valid complete builds');

    return NextResponse.json({ source: 'openrouter', model: OPENROUTER_MODEL, recommendations });
  } catch (error) {
    return fallbackResponse(loadouts, answers, error instanceof Error ? error.message : 'OpenRouter unavailable');
  }
}
