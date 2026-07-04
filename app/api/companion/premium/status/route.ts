import { NextRequest, NextResponse } from 'next/server';
import { verifyCompanionToken } from '@/lib/companionToken';
import { getCompanionDevice, touchCompanionDevice } from '@/lib/companionDeviceStore';
import { getEntitlements } from '@/lib/entitlementStore';
import { getProfile } from '@/lib/profileStore';
import { rateLimit } from '@/lib/rateLimit';

function bearerToken(request: NextRequest) {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || '';
}

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, 'companion-premium-status', 60, 10 * 60_000);
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

  return NextResponse.json({
    premium,
    checkedAt: new Date().toISOString(),
  });
}
