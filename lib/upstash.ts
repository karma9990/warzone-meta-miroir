export function hasUpstash() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
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
