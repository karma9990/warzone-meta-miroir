import { NextRequest, NextResponse } from 'next/server';
import { emptyProfile, getProfile, getProfileByPseudo, saveProfile, sanitizeProfile } from '@/lib/profileStore';
import { getProfileModerationError } from '@/lib/profileValidation';
import { rateLimit } from '@/lib/rateLimit';
import { readJsonBody } from '@/lib/security';
import { getUserSession } from '@/lib/userAuth';

export async function GET() {
  const user = await getUserSession();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ profile: await getProfile(user.sub) });
}

export async function PUT(request: NextRequest) {
  const limited = await rateLimit(request, 'account-profile', 20, 10 * 60_000);
  if (limited) return limited;

  const user = await getUserSession();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = await readJsonBody(request, 786_432);
  if ('error' in parsed) return parsed.error;
  const payload = parsed.data;

  const current = await getProfile(user.sub) || emptyProfile({
    userId: user.sub,
    email: user.email,
    name: user.name,
    picture: user.picture,
  });
  const profile = sanitizeProfile({
    ...current,
    ...(typeof payload === 'object' && payload ? payload : {}),
  });
  const moderationError = getProfileModerationError(profile);
  if (moderationError) {
    return NextResponse.json({ error: moderationError }, { status: 400 });
  }
  if (profile.pseudo) {
    const existing = await getProfileByPseudo(profile.pseudo);
    if (existing && existing.userId !== user.sub) {
      return NextResponse.json({ error: 'This pseudo is already taken.' }, { status: 409 });
    }
  }

  const saved = await saveProfile({
    userId: user.sub,
    email: user.email,
    profile,
  });

  return NextResponse.json({ profile: saved });
}
