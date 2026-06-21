import { NextRequest, NextResponse } from 'next/server';
import { verifyCompanionToken } from '@/lib/companionToken';
import { getCompanionDevice, touchCompanionDevice } from '@/lib/companionDeviceStore';
import { getProfile } from '@/lib/profileStore';
import { getStatsSummary } from '@/lib/statsSummary';
import { rateLimit } from '@/lib/rateLimit';
import { readJsonBody } from '@/lib/security';

type TrainingCoachBody = {
  mode?: 'profile' | 'routine';
  locale?: string;
  goal?: string;
  module?: string;
  moduleTitle?: string;
  moduleNote?: string;
  moduleProgress?: string;
  quiz?: {
    style?: string;
    input?: string;
    team?: string;
    weakness?: string;
    pace?: string;
  };
  routine?: {
    duration?: string;
    focus?: string;
  };
};

type OpenRouterMessage = {
  role: 'system' | 'user';
  content: string;
};

type CoachJson = {
  playerType?: string;
  focus?: string;
  analysis?: string;
  routine?: string;
};

const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL =
  process.env.OPENROUTER_TRAINING_COACH_MODEL ||
  process.env.OPENROUTER_AI_CLASSES_MODEL ||
  'google/gemma-4-31b-it:free';

function bearerToken(request: NextRequest) {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || '';
}

function cleanText(value: unknown, max = 900) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function languageName(locale: string | undefined) {
  if (locale === 'es') return 'Spanish';
  if (locale === 'en') return 'English';
  return 'French';
}

function parseAiJson(text: string): CoachJson {
  const trimmed = text.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('AI response did not contain JSON.');
  return JSON.parse(trimmed.slice(start, end + 1)) as CoachJson;
}

function sanitizeCoachJson(value: CoachJson): Required<CoachJson> {
  return {
    playerType: cleanText(value.playerType, 80) || 'Joueur flex',
    focus: cleanText(value.focus, 120) || 'Stabiliser la session',
    analysis: cleanText(value.analysis, 900) || 'Profil a completer avec plus de donnees.',
    routine: cleanText(value.routine, 900) || '10 min warmup aim, 10 min rotations propres, 10 min review des morts.',
  };
}

function fallbackCoach(body: TrainingCoachBody, summary: ReturnType<typeof getStatsSummary>, error?: string) {
  const quiz = body.quiz ?? {};
  const routine = body.routine ?? {};
  const weak = cleanText(quiz.weakness, 80) || cleanText(body.moduleTitle, 80) || 'regularite';
  const style = cleanText(quiz.style, 80) || 'flex';
  const focus = cleanText(routine.focus, 80) || cleanText(body.goal, 80) || weak;
  const duration = cleanText(routine.duration, 20) || '30';
  const kdLine = summary.games > 0 ? `K/D ${Math.round(summary.kd * 100) / 100}, ${summary.games} games importees.` : 'Pas encore assez de games importees.';

  return NextResponse.json({
    source: 'local-fallback',
    model: null,
    error,
    playerType: style === 'aggressive' ? 'Entry agressif' : style === 'support' ? 'Support / anchor' : style === 'sniper' ? 'Sniper support' : 'Joueur flex',
    focus,
    analysis: `${kdLine} Ton axe principal est ${weak}. Priorite: garder un plan simple avant chaque fight, noter une seule erreur apres la game, puis rejouer la situation au lieu de changer tout ton style.`,
    routine: `${duration} min: 5 min warmup tracking, 10 min fights controles, 10 min rotations/regain selon ${focus}, puis 5 min review rapide avec une note concrete pour la prochaine game.`,
  });
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
      'X-Title': 'WZPRO Training Coach',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages,
      temperature: 0.35,
      max_tokens: 650,
      response_format: { type: 'json_object' },
    }),
  });

  const payload = await response.json().catch(() => null) as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } } | null;
  if (!response.ok) throw new Error(payload?.error?.message || 'OpenRouter request failed');

  const reply = payload?.choices?.[0]?.message?.content;
  if (!reply) throw new Error('OpenRouter empty reply');
  return sanitizeCoachJson(parseAiJson(reply));
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, 'companion-training-coach', 24, 60_000);
  if (limited) return limited;

  const token = bearerToken(request);
  const companion = token ? await verifyCompanionToken(token) : null;
  if (!companion) {
    return NextResponse.json({ error: 'Unauthorized companion token.' }, { status: 401 });
  }

  if (companion.deviceId) {
    const device = await getCompanionDevice(companion.deviceId);
    if (!device || device.revoked || device.userId !== companion.sub) {
      return NextResponse.json({ error: 'Companion device revoked.' }, { status: 401 });
    }
    await touchCompanionDevice(device);
  }

  const parsed = await readJsonBody<TrainingCoachBody>(request, 16_384);
  if ('error' in parsed) return parsed.error;

  const body = parsed.data;
  const profile = await getProfile(companion.sub);
  const summary = getStatsSummary(profile?.statsEntries ?? []);
  const language = languageName(body.locale);

  const messages: OpenRouterMessage[] = [
    {
      role: 'system',
      content: `You are WZPRO Training Coach, a practical Warzone coach. Return ONLY valid JSON with keys playerType, focus, analysis, routine.
Rules:
- Reply in ${language}.
- Be concrete and tactical, not motivational fluff.
- Use the player's quiz, current Training Lab journal, and imported stats.
- The analysis must identify the player archetype and 2-3 improvement points.
- The routine must be usable today with time blocks and Warzone-specific drills.
- Keep each text field short enough for a desktop app panel.`,
    },
    {
      role: 'user',
      content: JSON.stringify({
        requestMode: body.mode === 'routine' ? 'routine' : 'profile',
        quiz: body.quiz ?? {},
        routine: body.routine ?? {},
        trainingJournal: {
          goal: body.goal,
          module: body.module,
          moduleTitle: body.moduleTitle,
          moduleProgress: body.moduleProgress,
          moduleNote: body.moduleNote,
        },
        importedStats: {
          games: summary.games,
          kd: Math.round(summary.kd * 100) / 100,
          kills: Math.round(summary.kills * 10) / 10,
          damage: Math.round(summary.damage),
          winRate: Math.round(summary.winRate),
          topTenRate: Math.round(summary.topTenRate),
        },
      }),
    },
  ];

  try {
    const coach = await askOpenRouter(messages);
    return NextResponse.json({ source: 'openrouter', model: OPENROUTER_MODEL, ...coach });
  } catch (error) {
    return fallbackCoach(body, summary, error instanceof Error ? error.message : 'OpenRouter unavailable');
  }
}
