import { NextRequest, NextResponse } from 'next/server';
import { verifyCompanionToken } from '@/lib/companionToken';
import { getCompanionDevice, touchCompanionDevice } from '@/lib/companionDeviceStore';
import { emptyProfile, getProfile, saveProfile, sanitizeProfile, type ProfileStatsEntry } from '@/lib/profileStore';
import { rateLimit } from '@/lib/rateLimit';
import { readJsonBody } from '@/lib/security';

function bearerToken(request: NextRequest) {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || '';
}

function normalizeEntry(input: Partial<ProfileStatsEntry>): ProfileStatsEntry {
  return {
    id: typeof input.id === 'string' && input.id ? input.id : `companion-${Date.now()}`,
    date: typeof input.date === 'string' && input.date ? input.date : new Date().toLocaleDateString('en-GB'),
    kills: Number(input.kills) || 0,
    deaths: Number(input.deaths) || 1,
    damage: Number(input.damage) || 0,
    placement: Number(input.placement) || 0,
    won: Boolean(input.won),
  };
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, 'companion-stats', 120, 10 * 60_000);
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

  const parsed = await readJsonBody<{ entry?: Partial<ProfileStatsEntry> }>(request, 16_384);
  if ('error' in parsed) return parsed.error;

  const current = await getProfile(companion.sub) || emptyProfile({
    userId: companion.sub,
    email: companion.email,
    name: companion.name,
  });
  const entry = normalizeEntry(parsed.data.entry || {});
  const nextEntries = [entry, ...current.statsEntries].slice(0, 300);
  const profile = sanitizeProfile({
    ...current,
    statsEntries: nextEntries,
  });
  const saved = await saveProfile({ userId: companion.sub, email: companion.email, profile });

  return NextResponse.json({
    ok: true,
    entry: saved.statsEntries[0],
    count: saved.statsEntries.length,
  });
}
