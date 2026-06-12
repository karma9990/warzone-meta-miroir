function getSiteUrl() {
  const value = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (value) return value.replace(/\/$/, '');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_SITE_URL or SITE_URL must be configured in production.');
  }
  return 'http://localhost:3000';
}

export const SITE_URL = getSiteUrl();

export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@wzpro-meta.com';

export const LEGAL = {
  publisherName: process.env.NEXT_PUBLIC_LEGAL_PUBLISHER_NAME || 'WZPRO Meta',
  publisherStatus: process.env.NEXT_PUBLIC_LEGAL_PUBLISHER_STATUS || 'Independent digital publisher',
  publisherAddress: process.env.NEXT_PUBLIC_LEGAL_PUBLISHER_ADDRESS || 'Available from support for legitimate legal requests',
  publisherRegistration: process.env.NEXT_PUBLIC_LEGAL_PUBLISHER_REGISTRATION || 'Not publicly registered yet or not applicable',
  publicationDirector: process.env.NEXT_PUBLIC_LEGAL_PUBLICATION_DIRECTOR || 'WZPRO Meta editorial team',
  hostName: process.env.NEXT_PUBLIC_LEGAL_HOST_NAME || 'Vercel Inc.',
  hostAddress: process.env.NEXT_PUBLIC_LEGAL_HOST_ADDRESS || 'Hosting address available from the hosting provider or support for legitimate legal requests',
  mediatorName: process.env.NEXT_PUBLIC_LEGAL_MEDIATOR_NAME || 'Consumer mediator available where required by applicable law',
  mediatorWebsite: process.env.NEXT_PUBLIC_LEGAL_MEDIATOR_WEBSITE || 'Contact support for the current mediator details',
  privacyContact: process.env.NEXT_PUBLIC_PRIVACY_EMAIL || SUPPORT_EMAIL,
};

export function absoluteUrl(path: string) {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
