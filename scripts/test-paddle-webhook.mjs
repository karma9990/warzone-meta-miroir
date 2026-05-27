import crypto from 'node:crypto';
import fs from 'node:fs';

const envFile = '.env.local';
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([^#][^=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) {
      process.env[match[1].trim()] = match[2];
    }
  }
}

const target = process.env.PADDLE_WEBHOOK_TEST_URL ?? 'http://localhost:3000/api/paddle-webhook';
const secret = process.env.PADDLE_WEBHOOK_SECRET;
const toolId = process.env.PADDLE_WEBHOOK_TEST_TOOL_ID;
const priceId = process.env.PADDLE_WEBHOOK_TEST_PRICE_ID
  ?? (toolId ? process.env[`PADDLE_PRICE_ID_${toolId.toUpperCase().replaceAll('-', '_')}`] : undefined)
  ?? (toolId ? process.env[`NEXT_PUBLIC_PADDLE_PRICE_ID_${toolId.toUpperCase().replaceAll('-', '_')}`] : undefined)
  ?? process.env.PADDLE_PRICE_ID_PRO
  ?? process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_PRO
  ?? process.env.PADDLE_PRICE_ID_PRO_OPTI
  ?? process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_PRO_OPTI;
const email = process.env.PADDLE_WEBHOOK_TEST_EMAIL ?? 'sandbox-webhook-test@example.com';
const eventId = `evt_test_${Date.now().toString(36)}_${crypto.randomBytes(6).toString('hex')}`;
const transactionId = `txn_test_${Date.now().toString(36)}_${crypto.randomBytes(6).toString('hex')}`;

if (!secret) {
  throw new Error('PADDLE_WEBHOOK_SECRET is required.');
}

if (!priceId) {
  throw new Error('PADDLE_PRICE_ID_PRO or NEXT_PUBLIC_PADDLE_PRICE_ID_PRO is required.');
}

const body = JSON.stringify({
  event_id: eventId,
  event_type: 'transaction.completed',
  data: {
    id: transactionId,
    customer: { email },
    custom_data: toolId ? { email, toolId } : { email, access: 'pro' },
    items: [{ price: { id: priceId } }],
  },
});

const ts = Math.floor(Date.now() / 1000).toString();
const h1 = crypto.createHmac('sha256', secret).update(`${ts}:${body}`).digest('hex');

const res = await fetch(target, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'paddle-signature': `ts=${ts};h1=${h1}`,
    'x-wz-webhook-dry-run': process.env.PADDLE_WEBHOOK_TEST_DRY_RUN ?? '1',
  },
  body,
});

const text = await res.text();
console.log(JSON.stringify({
  target,
  status: res.status,
  body: text,
  email,
  priceId,
  toolId: toolId ?? 'pro',
  eventId,
  transactionId,
  dryRun: process.env.PADDLE_WEBHOOK_TEST_DRY_RUN ?? '1',
}, null, 2));

if (!res.ok) {
  process.exitCode = 1;
}
