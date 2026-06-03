import { NextRequest, NextResponse } from 'next/server';
import { emptyProfile, getProfile, saveProfile, sanitizeProfile } from '@/lib/profileStore';
import { rateLimit } from '@/lib/rateLimit';
import { readJsonBody } from '@/lib/security';
import { getUserSession } from '@/lib/userAuth';

export async function PUT(request: NextRequest) {
  const limited = await rateLimit(request, 'account-loadout-prefs', 30, 10 * 60_000);
  if (limited) return limited;

  const user = await getUserSession();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = await readJsonBody<{
    featuredLoadoutId?: unknown;
    favoriteLoadouts?: unknown;
    loadoutNotes?: unknown;
  }>(request, 24_576);
  if ('error' in parsed) return parsed.error;

  const payload = parsed.data;
  const input = typeof payload === 'object' && payload ? payload as {
    featuredLoadoutId?: unknown;
    favoriteLoadouts?: unknown;
    loadoutNotes?: unknown;
  } : {};
  const current = await getProfile(user.sub) || emptyProfile({
    userId: user.sub,
    email: user.email,
    name: user.name,
    picture: user.picture,
  });

  const profile = sanitizeProfile({
    ...current,
    featuredLoadoutId: (input.featuredLoadoutId ?? current.featuredLoadoutId) as string,
    favoriteLoadouts: (input.favoriteLoadouts ?? current.favoriteLoadouts) as string[],
    loadoutNotes: (input.loadoutNotes ?? current.loadoutNotes) as Record<string, string>,
  });

  const saved = await saveProfile({ userId: user.sub, email: user.email, profile });
  return NextResponse.json({
    featuredLoadoutId: saved.featuredLoadoutId,
    favoriteLoadouts: saved.favoriteLoadouts,
    loadoutNotes: saved.loadoutNotes,
  });
}
