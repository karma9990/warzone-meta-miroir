import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type ProviderHealth = {
  provider: string;
  ok: boolean;
  hasKey: boolean;
  status: number | null;
  model: string;
  message: string;
  errorType?: string | null;
  errorCode?: string | null;
};

async function checkOpenRouter(): Promise<ProviderHealth> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_PATCH_NOTES_MODEL || 'openrouter/free';

  if (!apiKey) {
    return {
      provider: 'OpenRouter',
      ok: false,
      hasKey: false,
      status: null,
      model,
      message: 'OPENROUTER_API_KEY is missing in this deployment.',
    };
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://wzprometa.com',
        'X-Title': 'WZPRO Meta Admin Health',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Reply with OK.' }],
        max_tokens: 16,
      }),
    });
    const body = await response.json().catch(() => null) as { error?: { message?: string; type?: string; code?: string } } | null;
    const error = body?.error;

    return {
      provider: 'OpenRouter',
      ok: response.ok,
      hasKey: true,
      status: response.status,
      model,
      message: response.ok ? 'OpenRouter API key works.' : error?.message || 'OpenRouter rejected the key or request.',
      errorType: error?.type ?? null,
      errorCode: error?.code ?? null,
    };
  } catch (error) {
    return {
      provider: 'OpenRouter',
      ok: false,
      hasKey: true,
      status: null,
      model,
      message: error instanceof Error ? error.message : 'OpenRouter health check failed.',
    };
  }
}

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const providers = [await checkOpenRouter()];
  const ok = providers.some(provider => provider.ok);

  return NextResponse.json({
    ok,
    providers,
    message: ok ? 'OpenRouter is ready.' : 'OpenRouter is not ready.',
  });
}
