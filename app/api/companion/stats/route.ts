import { NextRequest, NextResponse } from 'next/server';
import { verifyCompanionToken } from '@/lib/companionToken';
import { getCompanionDevice, touchCompanionDevice } from '@/lib/companionDeviceStore';
import { emptyProfile, getProfile, saveProfile, sanitizeProfile, type ProfileStatsEntry } from '@/lib/profileStore';
import { getEntitlements } from '@/lib/entitlementStore';
import { getStatsSummary } from '@/lib/statsSummary';
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

// Skill bands used for the "level" comparison (premium tracker).
function skillLevel(kd: number): { level: string; percentile: number } {
  if (kd >= 2.5) return { level: 'PRO', percentile: 98 };
  if (kd >= 1.8) return { level: 'EXPERT', percentile: 92 };
  if (kd >= 1.3) return { level: 'ADVANCED', percentile: 80 };
  if (kd >= 1.0) return { level: 'AVERAGE', percentile: 55 };
  return { level: 'ROOKIE', percentile: 30 };
}

// Heuristic AI coach: up to 3 concrete tips derived from the player's numbers.
function coachTips(summary: ReturnType<typeof getStatsSummary>): string[] {
  const tips: string[] = [];
  if (summary.kd < 1) tips.push('Travaille tes 1v1 en solo : pre-aim hauteur de tete, baisse la sensibilite.');
  if (summary.winRate < 15) tips.push('Rotations trop tardives : bouge vers la zone avant la fermeture.');
  if (summary.kills > 0 && summary.damage / Math.max(1, summary.kills) < 250)
    tips.push('Beaucoup de degats sans finir : joue les angles, evite le decouvert.');
  if (summary.topTenRate < 30) tips.push('Joue plus safe en debut de partie pour atteindre le top 10.');
  if (summary.kd >= 1.8) tips.push('Bon niveau : travaille la constance et les fins de partie sous pression.');
  if (!tips.length) tips.push('Continue a importer tes parties pour des conseils plus precis.');
  return tips.slice(0, 3);
}

// Premium advanced tracker: aggregated stats, skill level/percentile and AI coach.
export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, 'companion-stats-get', 60, 10 * 60_000);
  if (limited) return limited;

  const token = bearerToken(request);
  const companion = token ? await verifyCompanionToken(token) : null;
  if (!companion) {
    return NextResponse.json({ error: 'Unauthorized companion token.' }, { status: 401 });
  }

  const device = companion.deviceId ? await getCompanionDevice(companion.deviceId) : null;
  if (companion.deviceId) {
    if (!device || device.revoked || device.userId !== companion.sub) {
      return NextResponse.json({ error: 'Companion device revoked.' }, { status: 401 });
    }
    await touchCompanionDevice(device);
  }

  const profile = await getProfile(companion.sub);
  const email = companion.email || device?.email || profile?.email || '';
  const userEntitlements = await getEntitlements(companion.sub);
  const emailEntitlements = email ? await getEntitlements(email.toLowerCase()) : null;
  const premium = Boolean(
    userEntitlements?.pro || userEntitlements?.companion || emailEntitlements?.pro || emailEntitlements?.companion,
  );
  if (!premium) {
    return NextResponse.json({ error: 'Premium access is required for the advanced tracker.' }, { status: 403 });
  }

  const summary = getStatsSummary(profile?.statsEntries ?? []);
  const { level, percentile } = skillLevel(summary.kd);

  return NextResponse.json({
    games: summary.games,
    kd: Math.round(summary.kd * 100) / 100,
    kills: Math.round(summary.kills * 10) / 10,
    damage: Math.round(summary.damage),
    winRate: Math.round(summary.winRate),
    topTenRate: Math.round(summary.topTenRate),
    level,
    percentile,
    coach: coachTips(summary),
    checkedAt: new Date().toISOString(),
  });
}
