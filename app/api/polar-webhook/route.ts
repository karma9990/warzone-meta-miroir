import { NextRequest, NextResponse } from 'next/server';
import { WebhookVerificationError, validateEvent } from '@polar-sh/sdk/webhooks';
import { Resend } from 'resend';
import { hasUpstash, upstashCommand } from '../../../lib/upstash';
import { buildAccessUrl, buildProToolLinks, createAccessToken } from '@/lib/accessLinks';
import { grantEntitlement } from '@/lib/entitlementStore';
import { getPurchaseByKey, getPurchaseByProductId, type Purchase, validatePaymentConfig } from '@/lib/paymentConfig';
import { metadataString } from '@/lib/polar';

type PolarWebhookData = {
  id?: string;
  productId?: string | null;
  metadata?: Record<string, string | number | boolean>;
  customer?: {
    email?: string | null;
    externalId?: string | null;
  };
};

const WEBHOOK_REPLAY_TTL_SECONDS = 60 * 60 * 24 * 30;
const memoryWebhookIds = new Map<string, number>();

async function reserveWebhookEvent(id: string) {
  if (!id) return false;

  if (hasUpstash()) {
    return await upstashCommand(['SET', `wz:polar-webhook:${id}`, '1', 'EX', WEBHOOK_REPLAY_TTL_SECONDS, 'NX']) === 'OK';
  }

  const now = Date.now();
  for (const [key, expiresAt] of memoryWebhookIds) {
    if (expiresAt <= now) memoryWebhookIds.delete(key);
  }
  if (memoryWebhookIds.has(id)) return false;
  memoryWebhookIds.set(id, now + WEBHOOK_REPLAY_TTL_SECONDS * 1000);
  return true;
}

function headerRecord(req: NextRequest) {
  return Object.fromEntries(req.headers.entries());
}

function resolvePurchase(data: PolarWebhookData) {
  return getPurchaseByProductId(data.productId || '')
    ?? getPurchaseByKey(metadataString(data.metadata, 'purchaseKey'));
}

function customerEmail(data: PolarWebhookData) {
  return data.customer?.email
    ?? metadataString(data.metadata, 'email')
    ?? '';
}

async function sendAccessEmail(purchase: Purchase, email: string) {
  if (!process.env.RESEND_API_KEY) return;

  const token = await createAccessToken(purchase, email);
  const productName = purchase.name;
  const accessNoun = purchase.type === 'pro' ? 'subscription access' : 'monthly tool access';
  const accessUrl = buildAccessUrl(purchase, token);
  const proToolLinks = purchase.type === 'pro'
    ? `
      <div style="margin:28px 0 0;border-top:1px solid rgba(0,0,0,0.12);padding-top:18px">
        <p style="font-size:11px;letter-spacing:0.16em;opacity:0.45;margin:0 0 12px">ALL PRO TOOLS</p>
        ${buildProToolLinks(token)}
      </div>
    `
    : '';

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: 'WZ Meta <onboarding@resend.dev>',
    to: process.env.RESEND_TO_OVERRIDE ?? email,
    subject: `Your access to ${productName} - WZ Meta`,
    html: `
      <div style="font-family:monospace;max-width:520px;margin:0 auto;padding:40px 24px;background:#f5f5f0;color:#0a0a08">
        <p style="font-size:11px;letter-spacing:0.2em;opacity:0.4;margin:0 0 32px">WZ META / ${purchase.type === 'pro' ? 'PRO ACCESS' : purchase.id.toUpperCase()}</p>
        <h1 style="font-size:24px;letter-spacing:0.08em;margin:0 0 16px">ACCESS ACTIVE - ${productName.toUpperCase()}</h1>
        <p style="font-size:13px;line-height:1.7;opacity:0.65;margin:0 0 32px">
          Your payment was confirmed through Polar. Click below to claim <strong>${productName}</strong> on your account.
          This is ${accessNoun}; it remains active while the subscription is active.
        </p>
        <a href="${accessUrl}" style="display:inline-block;background:#0000ff;color:#fff;padding:14px 28px;font-family:monospace;font-size:12px;letter-spacing:0.14em;text-decoration:none;text-transform:uppercase">
          ACCESS ${productName.toUpperCase()} ->
        </a>
        ${proToolLinks}
        <p style="font-size:11px;opacity:0.35;margin:32px 0 0;line-height:1.6">
          This claim link is personal, one-time use, and expires in 7 days.<br>
          After claiming it, sign in with the same email to access the active subscription.
        </p>
      </div>
    `,
  });
}

export async function POST(req: NextRequest) {
  validatePaymentConfig();

  const body = await req.text();
  if (body.length > 128_000) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  let event: ReturnType<typeof validateEvent>;
  try {
    event = validateEvent(body, headerRecord(req), process.env.POLAR_WEBHOOK_SECRET ?? '');
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    throw error;
  }

  if (event.type !== 'order.paid' && event.type !== 'subscription.active') {
    return NextResponse.json({ ok: true });
  }

  const data = event.data as PolarWebhookData;
  const eventId = req.headers.get('webhook-id') || `${event.type}:${data.id || ''}`;
  if (!await reserveWebhookEvent(eventId)) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const purchase = resolvePurchase(data);
  const email = customerEmail(data);
  if (!purchase || !email) {
    return NextResponse.json({ error: 'Missing data' }, { status: 400 });
  }

  await grantEntitlement({
    userId: metadataString(data.metadata, 'userId') || data.customer?.externalId || email.toLowerCase(),
    email,
    pro: purchase.type === 'pro',
    toolId: purchase.type === 'tool' ? purchase.id : undefined,
  });

  if (event.type === 'order.paid') {
    await sendAccessEmail(purchase, email);
  }

  return NextResponse.json({ ok: true });
}
