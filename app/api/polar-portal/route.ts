import { NextRequest, NextResponse } from 'next/server';
import { getPolarClient } from '@/lib/polar';
import { rateLimit } from '@/lib/rateLimit';
import { sameOriginGuard } from '@/lib/security';
import { getUserSession } from '@/lib/userAuth';

function errorStatus(error: unknown): number | undefined {
  const value = error as { statusCode?: unknown; status?: unknown } | null;
  const raw = value?.statusCode ?? value?.status;
  return typeof raw === 'number' ? raw : undefined;
}

// Creates a Polar customer-portal session so the user can view invoices,
// update payment method and cancel their subscription themselves.
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, 'polar-portal', 10, 10 * 60_000);
  if (limited) return limited;

  const guard = sameOriginGuard(req);
  if (guard) return guard;

  const user = await getUserSession();
  if (!user) {
    return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  }
  if (!process.env.POLAR_ACCESS_TOKEN) {
    return NextResponse.json({ error: 'Billing portal is not configured.' }, { status: 503 });
  }

  const polar = getPolarClient();
  // The Polar customer is keyed by the external id used at checkout: the user id
  // when signed in, or the email for email-only purchases. Try both.
  const candidates = [user.sub, user.email?.toLowerCase()].filter(
    (value): value is string => Boolean(value),
  );

  let lastError: unknown = null;
  let sawNonNotFound = false;
  for (const externalCustomerId of candidates) {
    try {
      const session = await polar.customerSessions.create({ externalCustomerId });
      return NextResponse.json({ url: session.customerPortalUrl });
    } catch (error) {
      lastError = error;
      if (errorStatus(error) !== 404) sawNonNotFound = true;
    }
  }

  // Every candidate returned 404 -> genuinely no billing account for this user.
  if (!sawNonNotFound) {
    return NextResponse.json({ error: 'No billing account found for this user.' }, { status: 404 });
  }
  const message = lastError instanceof Error ? lastError.message : 'Portal unavailable.';
  console.error('Polar portal failed:', message);
  return NextResponse.json({ error: 'Billing portal is temporarily unavailable.' }, { status: 502 });
}
