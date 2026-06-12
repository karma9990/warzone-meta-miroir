import { NextRequest, NextResponse } from 'next/server';
import { getLoadouts } from '@/lib/data';
import { rateLimit } from '@/lib/rateLimit';
import { readJsonBody } from '@/lib/security';
import { hasUpstash, upstashCommand, upstashPipeline } from '@/lib/upstash';

export const dynamic = 'force-dynamic';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const VOTE_TTL_SECONDS = 21 * 24 * 60 * 60;

const memoryVotes = new Map<string, Map<string, number>>();

function currentWeekIndex() {
  return Math.floor(Date.now() / WEEK_MS);
}

function voteKey(weekIndex: number) {
  return `fun:cursed-votes:${weekIndex}`;
}

function parseHashCounts(raw: unknown): Record<string, number> {
  const counts: Record<string, number> = {};
  if (!Array.isArray(raw)) return counts;
  for (let index = 0; index < raw.length - 1; index += 2) {
    const field = raw[index];
    const value = Number(raw[index + 1]);
    if (typeof field === 'string' && Number.isFinite(value)) {
      counts[field] = value;
    }
  }
  return counts;
}

async function readCounts(weekIndex: number): Promise<Record<string, number>> {
  if (hasUpstash()) {
    try {
      return parseHashCounts(await upstashCommand(['HGETALL', voteKey(weekIndex)]));
    } catch (error) {
      console.warn('Cursed vote store unavailable, falling back to memory.', error);
    }
  }
  return Object.fromEntries(memoryVotes.get(voteKey(weekIndex)) ?? []);
}

export async function GET() {
  const weekIndex = currentWeekIndex();
  return NextResponse.json({ weekIndex, counts: await readCounts(weekIndex) });
}

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, 'cursed-vote', 10, 10 * 60_000);
  if (limited) return limited;

  const parsed = await readJsonBody<{ weaponId?: unknown }>(req);
  if ('error' in parsed) return parsed.error;

  const weaponId = typeof parsed.data.weaponId === 'string' ? parsed.data.weaponId : '';
  const loadouts = await getLoadouts();
  if (!loadouts.some((loadout) => loadout.id === weaponId)) {
    return NextResponse.json({ error: 'Unknown weapon.' }, { status: 400 });
  }

  const weekIndex = currentWeekIndex();
  const key = voteKey(weekIndex);

  if (hasUpstash()) {
    try {
      await upstashPipeline([
        ['HINCRBY', key, weaponId, 1],
        ['EXPIRE', key, VOTE_TTL_SECONDS, 'NX'],
      ]);
      return NextResponse.json({ weekIndex, counts: await readCounts(weekIndex) });
    } catch (error) {
      console.warn('Cursed vote store unavailable, falling back to memory.', error);
    }
  }

  const bucket = memoryVotes.get(key) ?? new Map<string, number>();
  bucket.set(weaponId, (bucket.get(weaponId) ?? 0) + 1);
  memoryVotes.set(key, bucket);
  return NextResponse.json({ weekIndex, counts: Object.fromEntries(bucket) });
}
