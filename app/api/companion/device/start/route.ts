import { NextRequest, NextResponse } from 'next/server';
import { createCompanionFlow } from '@/lib/companionDeviceStore';
import { rateLimit } from '@/lib/rateLimit';
import { readJsonBody } from '@/lib/security';
import { getSiteOrigin } from '@/lib/userAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, 'companion-device-start', 30, 10 * 60_000);
  if (limited) return limited;

  const parsed = await readJsonBody<{ deviceName?: string }>(request, 4096);
  if ('error' in parsed) return parsed.error;

  const flow = await createCompanionFlow({ deviceName: parsed.data.deviceName });
  return NextResponse.json({
    code: flow.code,
    deviceId: flow.deviceId,
    expiresAt: flow.expiresAt,
    connectUrl: `${getSiteOrigin(request)}/companion/connect?code=${encodeURIComponent(flow.code)}`,
  });
}
