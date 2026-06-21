import { NextRequest, NextResponse } from 'next/server';
import { getCompanionDevice, touchCompanionDevice } from '@/lib/companionDeviceStore';
import { verifyCompanionToken } from '@/lib/companionToken';
import { emptyProfile, getProfile, saveProfile, sanitizeProfile } from '@/lib/profileStore';
import { getProfileModerationError } from '@/lib/profileValidation';
import { rateLimit } from '@/lib/rateLimit';
import { readJsonBody } from '@/lib/security';

function bearerToken(request: NextRequest) {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || '';
}

async function companionUser(request: NextRequest) {
  const token = bearerToken(request);
  const companion = token ? await verifyCompanionToken(token) : null;
  if (!companion) return null;

  const device = companion.deviceId ? await getCompanionDevice(companion.deviceId) : null;
  if (companion.deviceId) {
    if (!device || device.revoked || device.userId !== companion.sub) return null;
    await touchCompanionDevice(device);
  }

  return { companion, device };
}

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, 'companion-profile-get', 60, 10 * 60_000);
  if (limited) return limited;

  const auth = await companionUser(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized companion token.' }, { status: 401 });

  const profile = await getProfile(auth.companion.sub);
  return NextResponse.json({
    profile: {
      publicName: profile?.publicName || auth.companion.name || '',
      activisionId: profile?.activisionId || '',
      profilePicture: profile?.profilePicture || auth.device?.userPicture || '',
    },
  });
}

export async function PUT(request: NextRequest) {
  const limited = await rateLimit(request, 'companion-profile-put', 20, 10 * 60_000);
  if (limited) return limited;

  const auth = await companionUser(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized companion token.' }, { status: 401 });

  const parsed = await readJsonBody<{ activisionId?: unknown; profilePicture?: unknown }>(request, 786_432);
  if ('error' in parsed) return parsed.error;

  const activisionId = typeof parsed.data.activisionId === 'string' ? parsed.data.activisionId.trim() : '';
  const profilePicture = typeof parsed.data.profilePicture === 'string' ? parsed.data.profilePicture.trim() : '';

  const current = await getProfile(auth.companion.sub) || emptyProfile({
    userId: auth.companion.sub,
    email: auth.companion.email,
    name: auth.companion.name,
    picture: auth.device?.userPicture,
  });
  const profile = sanitizeProfile({
    ...current,
    publicName: activisionId || current.publicName,
    activisionId,
    profilePicture,
  });

  const moderationError = getProfileModerationError(profile);
  if (moderationError) return NextResponse.json({ error: moderationError }, { status: 400 });

  const saved = await saveProfile({
    userId: auth.companion.sub,
    email: auth.companion.email,
    profile,
  });

  return NextResponse.json({
    profile: {
      publicName: saved.publicName,
      activisionId: saved.activisionId,
      profilePicture: saved.profilePicture,
    },
  });
}
