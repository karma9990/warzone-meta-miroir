import { NextRequest, NextResponse } from 'next/server';
import { createCompanionDeviceToken } from '@/lib/companionToken';
import { getCompanionFlow } from '@/lib/companionDeviceStore';
import { rateLimit } from '@/lib/rateLimit';
import { readJsonBody } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, 'companion-device-poll', 120, 10 * 60_000);
  if (limited) return limited;

  const parsed = await readJsonBody<{ code?: string; deviceId?: string }>(request, 4096);
  if ('error' in parsed) return parsed.error;

  const code = typeof parsed.data.code === 'string' ? parsed.data.code.trim().toUpperCase() : '';
  const deviceId = typeof parsed.data.deviceId === 'string' ? parsed.data.deviceId.trim() : '';
  const flow = await getCompanionFlow(code);

  if (!flow || flow.deviceId !== deviceId || new Date(flow.expiresAt).getTime() <= Date.now()) {
    return NextResponse.json({ status: 'expired' });
  }

  if (!flow.authorizedAt || !flow.userId) {
    return NextResponse.json({ status: 'pending', expiresAt: flow.expiresAt });
  }

  return NextResponse.json({
    status: 'authorized',
    userName: flow.userName || 'WZPRO Player',
    profilePicture: flow.userPicture || '',
    deviceName: flow.deviceName,
    token: await createCompanionDeviceToken({ userId: flow.userId, deviceId: flow.deviceId }),
  });
}
