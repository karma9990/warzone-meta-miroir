import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { buildAccessUrl, buildProToolLinks, createAccessToken } from '@/lib/accessLinks';
import { grantEntitlement } from '@/lib/entitlementStore';
import { getPurchaseByPriceId, validatePaymentConfig } from '@/lib/paymentConfig';

type PaddleTransaction = {
  id?: string;
  customer?: { email?: string };
  customer_email?: string;
  billing_details?: { email?: string };
  checkout?: { customer_email?: string };
  custom_data?: { email?: string };
  items?: Array<{ price?: { id?: string } }>;
};

const WEBHOOK_REPLAY_TTL_SECONDS = 60 * 60 * 24 * 30;
const WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS = 5 * 60;
const memoryWebhookIds = new Map<string, number>();

function hasUpstash() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function reserveWebhookEvent(id: string) {
  if (!id) return false;

  if (hasUpstash()) {
    const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([['SET', `wz:paddle-webhook:${id}`, '1', 'EX', WEBHOOK_REPLAY_TTL_SECONDS, 'NX']]),
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error('Webhook replay storage request failed.');
    }

    const data = await res.json() as Array<{ result?: unknown }>;
    return data[0]?.result === 'OK';
  }

  const now = Date.now();
  for (const [key, expiresAt] of memoryWebhookIds) {
    if (expiresAt <= now) memoryWebhookIds.delete(key);
  }
  if (memoryWebhookIds.has(id)) return false;
  memoryWebhookIds.set(id, now + WEBHOOK_REPLAY_TTL_SECONDS * 1000);
  return true;
}

function verifySignature(body: string, signature: string, secret: string): boolean {
  const ts = signature.split(';').find(p => p.startsWith('ts='))?.slice(3);
  const h1 = signature.split(';').find(p => p.startsWith('h1='))?.slice(3);
  if (!ts || !h1 || !secret) return false;
  const timestamp = Number(ts);
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(timestamp) || Math.abs(nowSeconds - timestamp) > WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS) {
    return false;
  }
  const expected = createHmac('sha256', secret).update(`${ts}:${body}`).digest('hex');
  try {
    const expectedBuffer = Buffer.from(expected, 'hex');
    const receivedBuffer = Buffer.from(h1, 'hex');
    return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
  } catch {
    return false;
  }
}

function getCustomerEmail(transaction: PaddleTransaction): string {
  return transaction?.customer?.email
    ?? transaction?.customer_email
    ?? transaction?.billing_details?.email
    ?? transaction?.checkout?.customer_email
    ?? transaction?.custom_data?.email
    ?? '';
}

export async function POST(req: NextRequest) {
  validatePaymentConfig();
  const isDryRun = process.env.PADDLE_WEBHOOK_DRY_RUN === '1'
    || (process.env.NODE_ENV !== 'production' && req.headers.get('x-wz-webhook-dry-run') === '1');

  const body = await req.text();
  if (body.length > 128_000) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  const signature = req.headers.get('paddle-signature') ?? '';
  const secret = process.env.PADDLE_WEBHOOK_SECRET ?? '';

  if (!verifySignature(body, signature, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: { event_id?: string; event_type?: string; data?: unknown };
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (event.event_type !== 'transaction.completed') {
    return NextResponse.json({ ok: true });
  }

  const transaction = event.data as PaddleTransaction;
  const eventId = event.event_id || transaction.id || '';
  if (!eventId) {
    return NextResponse.json({ error: 'Missing webhook event id' }, { status: 400 });
  }
  if (!await reserveWebhookEvent(eventId)) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const email = getCustomerEmail(transaction);
  const priceId: string = transaction?.items?.[0]?.price?.id ?? '';
  const purchase = getPurchaseByPriceId(priceId);

  if (!email || !purchase) {
    return NextResponse.json({ error: 'Missing data' }, { status: 400 });
  }

  await grantEntitlement({
    userId: email.toLowerCase(),
    email,
    pro: purchase.type === 'pro',
    toolId: purchase.type === 'tool' ? purchase.id : undefined,
  });

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

  if (!isDryRun) {
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
            Your payment was confirmed. Click below to claim <strong>${productName}</strong> on your account.
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

  return NextResponse.json({ ok: true });
}
