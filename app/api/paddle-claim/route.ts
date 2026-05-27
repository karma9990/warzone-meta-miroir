import { NextRequest, NextResponse } from 'next/server';
import { buildAccessUrl, createAccessToken } from '@/lib/accessLinks';
import { grantEntitlement } from '@/lib/entitlementStore';
import { getPurchaseByPriceId } from '@/lib/paymentConfig';
import { normalizeEmail, validateEmailAddress } from '@/lib/emailAuth';
import { rateLimit } from '@/lib/rateLimit';
import { readJsonBody } from '@/lib/security';
import { getUserSession } from '@/lib/userAuth';

type ClaimBody = {
  transactionId?: unknown;
  email?: unknown;
};

type PaddleTransactionResponse = {
  data?: {
    status?: string;
    customer?: { email?: string };
    customer_email?: string;
    custom_data?: { email?: string } | string | null;
    items?: Array<{ price?: { id?: string } }>;
  };
};

type PaddleCustomData = NonNullable<PaddleTransactionResponse['data']>['custom_data'];

function paddleApiBase() {
  const isSandbox = process.env.NEXT_PUBLIC_PADDLE_ENV === 'sandbox'
    || process.env.PADDLE_API_KEY?.startsWith('pdl_sdbx_');
  return isSandbox
    ? 'https://sandbox-api.paddle.com'
    : 'https://api.paddle.com';
}

function getTransactionEmail(data: NonNullable<PaddleTransactionResponse['data']>, fallbackEmail: string) {
  const customData = parseCustomData(data.custom_data);
  return normalizeEmail(
    data.customer?.email
    ?? data.customer_email
    ?? customData.email
    ?? fallbackEmail
  );
}

function parseCustomData(customData: PaddleCustomData) {
  if (!customData) return {};
  if (typeof customData === 'object') return customData;
  try {
    const parsed = JSON.parse(customData);
    return typeof parsed === 'object' && parsed ? parsed as { email?: string } : {};
  } catch {
    return {};
  }
}

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, 'paddle-claim', 8, 10 * 60_000);
  if (limited) return limited;

  const user = await getUserSession();
  if (!user) {
    return NextResponse.json({ error: 'Sign in before buying a tool.' }, { status: 401 });
  }

  const parsed = await readJsonBody<ClaimBody>(req);
  if ('error' in parsed) return parsed.error;

  const transactionId = typeof parsed.data.transactionId === 'string' ? parsed.data.transactionId.trim() : '';
  const fallbackEmail = normalizeEmail(parsed.data.email);
  if (!transactionId.startsWith('txn_')) {
    return NextResponse.json({ error: 'Transaction id is required.' }, { status: 400 });
  }

  if (!process.env.PADDLE_API_KEY) {
    return NextResponse.json({ error: 'Paddle API key is not configured.' }, { status: 503 });
  }

  const headers = {
    Authorization: `Bearer ${process.env.PADDLE_API_KEY}`,
    'Content-Type': 'application/json',
  };
  const base = paddleApiBase();
  let res = await fetch(`${base}/transactions/${transactionId}?include=customer`, {
    headers,
    cache: 'no-store',
  });

  if (res.status === 403 || res.status === 404) {
    res = await fetch(`${base}/transactions/${transactionId}`, {
      headers,
      cache: 'no-store',
    });
  }

  if (!res.ok) {
    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json({
        error: 'Unable to verify Paddle transaction.',
        upstreamStatus: res.status,
        paddleApi: base.includes('sandbox') ? 'sandbox' : 'live',
      }, { status: 502 });
    }
    return NextResponse.json({ error: 'Unable to verify Paddle transaction.' }, { status: 502 });
  }

  const transaction = await res.json() as PaddleTransactionResponse;
  const data = transaction.data;
  const priceId = data?.items?.[0]?.price?.id ?? '';
  const purchase = getPurchaseByPriceId(priceId);
  const email = data ? getTransactionEmail(data, fallbackEmail) : fallbackEmail;
  const emailError = validateEmailAddress(email);

  if (data?.status !== 'completed') {
    return NextResponse.json({ error: 'Transaction is not completed yet.' }, { status: 409 });
  }

  if (!purchase || emailError) {
    return NextResponse.json({ error: 'Unable to match transaction to an access product.' }, { status: 400 });
  }

  await grantEntitlement({
    userId: user.sub,
    email: user.email || email,
    pro: purchase.type === 'pro',
    toolId: purchase.type === 'tool' ? purchase.id : undefined,
  });

  const token = await createAccessToken(purchase, email);
  const accessUrl = purchase.type === 'pro'
    ? '/tools/aim-tools?claimed=1'
    : `/tools/${purchase.id}?claimed=1`;

  return NextResponse.json({
    ok: true,
    accessUrl,
    fallbackAccessUrl: buildAccessUrl(purchase, token),
    product: purchase.name,
    type: purchase.type,
  });
}
