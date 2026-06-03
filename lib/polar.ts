import { Polar } from '@polar-sh/sdk';
import type { Checkout } from '@polar-sh/sdk/models/components/checkout';
import type { MetadataOutputType } from '@polar-sh/sdk/models/components/metadataoutputtype';
import { absoluteUrl } from '@/lib/siteConfig';
import type { Purchase } from '@/lib/paymentConfig';

export function polarServer() {
  return process.env.POLAR_SERVER === 'sandbox' ? 'sandbox' : 'production';
}

export function getPolarClient() {
  const accessToken = process.env.POLAR_ACCESS_TOKEN ?? '';
  if (!accessToken) {
    throw new Error('POLAR_ACCESS_TOKEN is not configured.');
  }
  return new Polar({
    accessToken,
    server: polarServer(),
  });
}

export function successUrl() {
  return absoluteUrl('/payment-success?checkout_id={CHECKOUT_ID}');
}

export function returnUrlForPurchase(purchase: Purchase) {
  return purchase.type === 'pro'
    ? absoluteUrl('/pro-access')
    : absoluteUrl('/tools-individual');
}

export function metadataString(
  metadata: Record<string, MetadataOutputType> | undefined,
  key: string,
) {
  const value = metadata?.[key];
  return typeof value === 'string' ? value : '';
}

export function checkoutEmail(checkout: Checkout, fallback = '') {
  return checkout.customerEmail || metadataString(checkout.metadata, 'email') || fallback;
}
