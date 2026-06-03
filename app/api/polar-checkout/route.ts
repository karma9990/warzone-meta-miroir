import { NextRequest, NextResponse } from 'next/server';
import { normalizeEmail, validateEmailAddress } from '@/lib/emailAuth';
import { getPurchaseByKey, validatePaymentConfig } from '@/lib/paymentConfig';
import { getPolarClient, returnUrlForPurchase, successUrl } from '@/lib/polar';
import { rateLimit } from '@/lib/rateLimit';
import { readJsonBody } from '@/lib/security';
import { getUserSession } from '@/lib/userAuth';

type CheckoutBody = {
  productKey?: unknown;
  email?: unknown;
};

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, 'polar-checkout', 12, 10 * 60_000);
  if (limited) return limited;

  validatePaymentConfig();

  const parsed = await readJsonBody<CheckoutBody>(req);
  if ('error' in parsed) return parsed.error;

  const productKey = typeof parsed.data.productKey === 'string' ? parsed.data.productKey : '';
  const purchase = getPurchaseByKey(productKey);
  if (!purchase) {
    return NextResponse.json({ error: 'Unknown product.' }, { status: 400 });
  }
  if (!purchase.productId) {
    return NextResponse.json({ error: 'Polar product is not configured yet.' }, { status: 503 });
  }

  const user = await getUserSession();
  if (purchase.type === 'tool' && !user) {
    return NextResponse.json({ error: 'Sign in before buying a tool.' }, { status: 401 });
  }

  const email = normalizeEmail(parsed.data.email || user?.email || '');
  const emailError = validateEmailAddress(email);
  if (emailError) {
    return NextResponse.json({ error: emailError }, { status: 400 });
  }

  const metadata: Record<string, string> = {
    purchaseKey: purchase.key,
    purchaseType: purchase.type,
    email,
  };
  if (user?.sub) metadata.userId = user.sub;
  if (purchase.type === 'tool') metadata.toolId = purchase.id;

  const customerMetadata: Record<string, string> = { email };
  if (user?.sub) customerMetadata.userId = user.sub;

  const polar = getPolarClient();
  let checkout;
  try {
    checkout = await polar.checkouts.create({
      products: [purchase.productId],
      customerEmail: email,
      externalCustomerId: user?.sub || email,
      successUrl: successUrl(),
      returnUrl: returnUrlForPurchase(purchase),
      metadata,
      customerMetadata,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Polar checkout failed.';
    console.error('Polar checkout failed:', message);
    return NextResponse.json({ error: 'Payment checkout is not available right now.' }, { status: 502 });
  }

  return NextResponse.json({ url: checkout.url, checkoutId: checkout.id });
}
