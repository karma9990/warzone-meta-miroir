import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';
import { readJsonBody } from '@/lib/security';
import { addPushSubscription, removePushSubscription } from '@/lib/webPushStore';
import { getVapidPublicKey, hasWebPush } from '@/lib/webPush';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ enabled: hasWebPush(), publicKey: getVapidPublicKey() });
}

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, 'push-subscribe', 20, 10 * 60_000);
  if (limited) return limited;

  const parsed = await readJsonBody<{ subscription?: unknown }>(req, 4_096);
  if ('error' in parsed) return parsed.error;

  const result = await addPushSubscription(parsed.data.subscription);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const limited = await rateLimit(req, 'push-subscribe', 20, 10 * 60_000);
  if (limited) return limited;

  const parsed = await readJsonBody<{ endpoint?: unknown }>(req, 4_096);
  if ('error' in parsed) return parsed.error;

  await removePushSubscription(parsed.data.endpoint);
  return NextResponse.json({ ok: true });
}
