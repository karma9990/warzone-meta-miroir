import { NextRequest, NextResponse } from 'next/server';
import { buildAccessUrl, createAccessToken } from '@/lib/accessLinks';
import { normalizeEmail, validateEmailAddress } from '@/lib/emailAuth';
import { grantEntitlement } from '@/lib/entitlementStore';
import { getPurchaseByKey, getPurchaseByProductId } from '@/lib/paymentConfig';
import { checkoutEmail, getPolarClient, metadataString } from '@/lib/polar';
import { rateLimit } from '@/lib/rateLimit';
import { readJsonBody } from '@/lib/security';
import { getUserSession } from '@/lib/userAuth';

type ClaimBody = {
  checkoutId?: unknown;
  email?: unknown;
};

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, 'polar-claim', 8, 10 * 60_000);
  if (limited) return limited;

  const parsed = await readJsonBody<ClaimBody>(req);
  if ('error' in parsed) return parsed.error;

  const checkoutId = typeof parsed.data.checkoutId === 'string' ? parsed.data.checkoutId.trim() : '';
  if (!checkoutId) {
    return NextResponse.json({ error: 'Checkout id is required.' }, { status: 400 });
  }

  const polar = getPolarClient();
  const checkout = await polar.checkouts.get({ id: checkoutId });
  if (checkout.status !== 'succeeded') {
    return NextResponse.json({ error: 'Checkout is not completed yet.' }, { status: 409 });
  }

  const purchase = getPurchaseByProductId(checkout.productId || '')
    ?? getPurchaseByKey(metadataString(checkout.metadata, 'purchaseKey'));
  if (!purchase) {
    return NextResponse.json({ error: 'Unable to match checkout to an access product.' }, { status: 400 });
  }

  const user = await getUserSession();
  if (purchase.type === 'tool' && !user) {
    return NextResponse.json({ error: 'Sign in before opening this tool.' }, { status: 401 });
  }

  const email = normalizeEmail(checkoutEmail(checkout, normalizeEmail(parsed.data.email)));
  const emailError = validateEmailAddress(email);
  if (emailError) {
    return NextResponse.json({ error: emailError }, { status: 400 });
  }

  await grantEntitlement({
    userId: user?.sub || metadataString(checkout.metadata, 'userId') || email,
    email: user?.email || email,
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
