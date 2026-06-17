import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';
import { readJsonBody } from '@/lib/security';
import { isLocale, type Locale } from '@/lib/i18n';
import { hasUpstash, upstashPipeline } from '@/lib/upstash';

export const dynamic = 'force-dynamic';

const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'google/gemma-4-31b-it:free';
// Translations are immutable for a given (text, locale) pair, so we can cache
// them for a long time and reuse one translation across every visitor.
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30;

function cacheKey(text: string, targetLocale: Locale) {
  const hash = createHash('sha256').update(text).digest('hex').slice(0, 32);
  return `translate:${targetLocale}:${hash}`;
}

const TARGET_LANGUAGE: Record<Locale, string> = {
  en: 'English',
  fr: 'French',
  es: 'Spanish',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  nl: 'Dutch',
  pl: 'Polish',
  ja: 'Japanese',
};

type TranslateRequest = {
  targetLocale?: string;
  items?: Array<{
    id?: unknown;
    text?: unknown;
    sourceLanguage?: unknown;
  }>;
};

type TranslationResult = {
  id: string;
  text: string;
};

function sanitizeText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function extractJsonArray(value: string): unknown {
  const start = value.indexOf('[');
  const end = value.lastIndexOf(']');
  if (start < 0 || end < start) throw new Error('AI response did not contain JSON.');
  return JSON.parse(value.slice(start, end + 1));
}

function sameLanguage(sourceLanguage: string, targetLocale: Locale) {
  const target = TARGET_LANGUAGE[targetLocale].toLowerCase();
  return sourceLanguage.trim().toLowerCase() === target;
}

async function translateItems(
  items: Array<{ id: string; text: string; sourceLanguage: string }>,
  targetLocale: Locale
): Promise<TranslationResult[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY missing');

  const response = await fetch(OPENROUTER_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://wzprometa.com',
      'X-Title': 'WZPRO Meta Community translation',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_TRANSLATION_MODEL || process.env.OPENROUTER_AI_CLASSES_MODEL || DEFAULT_MODEL,
      messages: [
        {
          role: 'system',
          content: [
            'Translate community posts for a Warzone website.',
            `Target language: ${TARGET_LANGUAGE[targetLocale]}.`,
            'Preserve player names, weapon names, ranks, slang like LFG/IGL/SMG/AR, times, numbers, and URLs.',
            'Return only a JSON array of objects with exactly: id, text.',
            'Do not add explanations.',
          ].join(' '),
        },
        {
          role: 'user',
          content: JSON.stringify(items.map((item) => ({
            id: item.id,
            sourceLanguage: item.sourceLanguage || 'auto',
            text: item.text,
          }))),
        },
      ],
      temperature: 0.1,
    }),
  });

  const payload = await response.json().catch(() => null) as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } } | null;
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'Translation provider failed');
  }

  const content = payload?.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('Translation provider returned empty content');

  const parsed = extractJsonArray(content);
  if (!Array.isArray(parsed)) throw new Error('Translation provider returned invalid JSON');

  return parsed
    .map((entry) => ({
      id: sanitizeText((entry as { id?: unknown }).id, 120),
      text: sanitizeText((entry as { text?: unknown }).text, 1400),
    }))
    .filter((entry) => entry.id && entry.text);
}

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, 'community-translate', 20, 60_000);
  if (limited) return limited;

  const parsed = await readJsonBody<TranslateRequest>(req, 20_000);
  if ('error' in parsed) return parsed.error;

  const targetLocale = parsed.data.targetLocale;
  if (!isLocale(targetLocale)) {
    return NextResponse.json({ error: 'Unsupported target locale.' }, { status: 400 });
  }

  const items = (Array.isArray(parsed.data.items) ? parsed.data.items : [])
    .map((item) => ({
      id: sanitizeText(item.id, 120),
      text: sanitizeText(item.text, 1200),
      sourceLanguage: sanitizeText(item.sourceLanguage, 40),
    }))
    .filter((item) => item.id && item.text && !sameLanguage(item.sourceLanguage, targetLocale))
    .slice(0, 40);

  if (items.length === 0) {
    return NextResponse.json({ translations: [], unavailable: false });
  }

  // Serve already-translated text from the shared cache and only pay the AI
  // provider for the texts we have never translated into this locale before.
  const cached = new Map<string, string>();
  const useCache = hasUpstash();
  if (useCache) {
    try {
      const results = await upstashPipeline(items.map((item) => ['GET', cacheKey(item.text, targetLocale)]));
      results.forEach((entry, index) => {
        if (typeof entry?.result === 'string' && entry.result) {
          cached.set(items[index].id, entry.result);
        }
      });
    } catch (error) {
      console.warn('Translation cache read failed:', error);
    }
  }

  const cachedTranslations: TranslationResult[] = items
    .filter((item) => cached.has(item.id))
    .map((item) => ({ id: item.id, text: cached.get(item.id) as string }));

  const misses = items.filter((item) => !cached.has(item.id));
  if (misses.length === 0) {
    return NextResponse.json({ translations: cachedTranslations, unavailable: false });
  }

  try {
    const fresh = await translateItems(misses, targetLocale);

    if (useCache && fresh.length) {
      const textById = new Map(misses.map((item) => [item.id, item.text]));
      const writes = fresh
        .filter((entry) => textById.has(entry.id))
        .map((entry) => ['SET', cacheKey(textById.get(entry.id) as string, targetLocale), entry.text, 'EX', String(CACHE_TTL_SECONDS)]);
      if (writes.length) {
        upstashPipeline(writes).catch((error) => console.warn('Translation cache write failed:', error));
      }
    }

    return NextResponse.json({ translations: [...cachedTranslations, ...fresh], unavailable: false });
  } catch (error) {
    console.warn('Community translation failed:', error);
    // Still return whatever we could serve from cache.
    return NextResponse.json(
      { translations: cachedTranslations, unavailable: true },
      { status: cachedTranslations.length ? 200 : 503 },
    );
  }
}
