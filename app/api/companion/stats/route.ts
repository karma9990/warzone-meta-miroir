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

type EntryValidation =
  | { ok: true; entry: ProfileStatsEntry }
  | { ok: false; error: string };

function integerField(input: Record<string, unknown>, key: string, min: number, max: number): EntryValidation | number {
  const raw = input[key];
  const value = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() ? Number(raw) : NaN;
  if (!Number.isFinite(value)) {
    return { ok: false, error: `Invalid ${key}.` };
  }

  const rounded = Math.round(value);
  if (Math.abs(value - rounded) > 0.001 || rounded < min || rounded > max) {
    return { ok: false, error: `${key} outside expected Warzone range.` };
  }
  return rounded;
}

function safeDate(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return new Date().toLocaleDateString('en-GB');
  const clean = value.trim().slice(0, 32);
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(clean) || /^\d{4}-\d{2}-\d{2}/.test(clean)) return clean;
  return new Date().toLocaleDateString('en-GB');
}

function normalizeEntry(input: unknown): EntryValidation {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'Missing stats entry.' };
  }

  const record = input as Record<string, unknown>;
  const kills = integerField(record, 'kills', 0, 100);
  if (typeof kills !== 'number') return kills;
  const deaths = integerField(record, 'deaths', 0, 80);
  if (typeof deaths !== 'number') return deaths;
  const damage = integerField(record, 'damage', 0, 100000);
  if (typeof damage !== 'number') return damage;
  const placement = integerField(record, 'placement', 0, 200);
  if (typeof placement !== 'number') return placement;

  if (kills === 0 && deaths === 0 && damage === 0) {
    return { ok: false, error: 'Empty scoreboard row rejected.' };
  }
  if (kills > 0 && damage < kills * 20) {
    return { ok: false, error: 'Damage is too low for the detected kills.' };
  }
  if (damage > 0 && kills === 0 && damage > 15000) {
    return { ok: false, error: 'Damage-only row is too high to trust.' };
  }

  const rawId = typeof record.id === 'string' ? record.id.trim() : '';
  const id = rawId && /^[a-z0-9][a-z0-9._:-]{0,79}$/i.test(rawId)
    ? rawId
    : `companion-${Date.now()}`;

  return {
    ok: true,
    entry: {
      id,
      date: safeDate(record.date),
      kills,
      deaths,
      damage,
      placement,
      won: record.won === true,
    },
  };
}

function statsKey(entry: ProfileStatsEntry) {
  return `${entry.date}:${entry.kills}:${entry.deaths}:${entry.damage}:${entry.placement}:${entry.won ? 1 : 0}`;
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
  const normalized = normalizeEntry(parsed.data.entry);
  if (!normalized.ok) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }

  const entry = normalized.entry;
  const key = statsKey(entry);
  const duplicate = current.statsEntries.slice(0, 10).find((candidate) => statsKey(candidate) === key);
  if (duplicate) {
    return NextResponse.json({
      ok: true,
      duplicate: true,
      entry: duplicate,
      count: current.statsEntries.length,
    });
  }

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

  const summary = getStatsSummary(profile?.statsEntries ?? []);
  const { level, percentile } = skillLevel(summary.kd);

  const payload: Record<string, unknown> = {
    games: summary.games,
    kd: Math.round(summary.kd * 100) / 100,
    kills: Math.round(summary.kills * 10) / 10,
    damage: Math.round(summary.damage),
    winRate: Math.round(summary.winRate),
    topTenRate: Math.round(summary.topTenRate),
    premium,
    checkedAt: new Date().toISOString(),
  };

  if (premium) {
    payload.level = level;
    payload.percentile = percentile;
    payload.coach = coachTips(summary);
  }

  return NextResponse.json(payload);
}
