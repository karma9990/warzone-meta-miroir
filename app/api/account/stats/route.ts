import { NextRequest, NextResponse } from 'next/server';
import { emptyProfile, getProfile, saveProfile, sanitizeProfile, type ProfileStatsEntry } from '@/lib/profileStore';
import { rateLimit } from '@/lib/rateLimit';
import { readJsonBody } from '@/lib/security';
import { getUserSession } from '@/lib/userAuth';

export async function PUT(request: NextRequest) {
  const limited = await rateLimit(request, 'account-stats', 60, 10 * 60_000);
  if (limited) return limited;

  const user = await getUserSession();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = await readJsonBody<{ entries?: unknown }>(request, 32_768);
  if ('error' in parsed) return parsed.error;

  const current = await getProfile(user.sub) || emptyProfile({
    userId: user.sub,
    email: user.email,
    name: user.name,
    picture: user.picture,
  });

  const profile = sanitizeProfile({
    ...current,
    statsEntries: (Array.isArray(parsed.data.entries) ? parsed.data.entries : []) as ProfileStatsEntry[],
  });

  const saved = await saveProfile({ userId: user.sub, email: user.email, profile });
  return NextResponse.json({ entries: saved.statsEntries });
}
