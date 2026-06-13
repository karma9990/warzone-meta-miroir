export function hasUpstash() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

const warnedEphemeral = new Set<string>();

/**
 * Warn when a store falls back to writing the local filesystem on a serverless
 * platform (Vercel), where writes are ephemeral / read-only and silently lost
 * on the next cold start. Helps detect a missing Upstash configuration in prod.
 */
export function warnIfEphemeralWrite(store: string) {
  if (hasUpstash()) return;
  if (!process.env.VERCEL && process.env.NODE_ENV !== 'production') return;
  if (warnedEphemeral.has(store)) return;
  warnedEphemeral.add(store);
  console.warn(
    `[persistence] "${store}" is writing the local filesystem without Upstash configured. ` +
    `On serverless this data will not persist. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.`,
  );
}

async function upstashFetch(commands: unknown[][]) {
  const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Upstash request failed.');
  }

  return await res.json() as Array<{ result?: unknown }>;
}

export async function upstashCommand(command: unknown[]) {
  const data = await upstashFetch([command]);
  return data[0]?.result;
}

export async function upstashPipeline(commands: unknown[][]) {
  return await upstashFetch(commands);
}
