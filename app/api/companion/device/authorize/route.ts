import { NextRequest, NextResponse } from 'next/server';
import { authorizeCompanionFlow } from '@/lib/companionDeviceStore';
import { getProfile } from '@/lib/profileStore';
import { rateLimit } from '@/lib/rateLimit';
import { readJsonBody } from '@/lib/security';
import { getUserSession } from '@/lib/userAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, 'companion-device-authorize', 30, 10 * 60_000);
  if (limited) return limited;

  const user = await getUserSession();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = await readJsonBody<{ code?: string }>(request, 4096);
  if ('error' in parsed) return parsed.error;

  const code = typeof parsed.data.code === 'string' ? parsed.data.code.trim().toUpperCase() : '';
  const profile = await getProfile(user.sub);
  const authorized = await authorizeCompanionFlow(code, user, profile?.profilePicture || user.picture);
  if (!authorized) {
    return NextResponse.json({ error: 'Code expired or invalid.' }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    device: authorized.device,
  });
}
