import type { Metadata } from 'next';
import ProAccessClientPage from '@/components/ProAccessClientPage';
import { getSiteContent } from '@/lib/siteContent';
import { getRequestLocale } from '@/lib/requestLocale';

export const metadata: Metadata = {
  title: 'Pro Access | WZPRO Meta',
  description: 'Unlock WZPRO Meta pro tools, Warzone loadout breakdowns, rotation guides and practical analysis.',
};

export default async function Page() {
  const [siteContent, locale] = await Promise.all([getSiteContent(), getRequestLocale()]);
  return <ProAccessClientPage initialCopy={siteContent.proAccess} locale={locale} />;
}
