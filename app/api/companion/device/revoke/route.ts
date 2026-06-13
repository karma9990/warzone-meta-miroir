import { NextRequest, NextResponse } from 'next/server';
import { revokeCompanionDevice } from '@/lib/companionDeviceStore';
import { rateLimit } from '@/lib/rateLimit';
import { readJsonBody } from '@/lib/security';
import { getUserSession } from '@/lib/userAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, 'companion-device-revoke', 60, 10 * 60_000);
  if (limited) return limited;

  const user = await getUserSession();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = await readJsonBody<{ deviceId?: string }>(request, 4096);
  if ('error' in parsed) return parsed.error;

  const deviceId = typeof parsed.data.deviceId === 'string' ? parsed.data.deviceId.trim() : '';
  const revoked = await revokeCompanionDevice({ userId: user.sub, deviceId });
  if (!revoked) {
    return NextResponse.json({ error: 'Device not found.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, device: revoked });
}
