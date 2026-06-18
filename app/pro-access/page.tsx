import type { Metadata } from 'next';
import ProAccessClientPage from '@/components/ProAccessClientPage';
import { getSiteContent } from '@/lib/siteContent';
import { getRequestLocale } from '@/lib/requestLocale';
import { getUserSession } from '@/lib/userAuth';

export const metadata: Metadata = {
  title: 'Pro Access | WZPRO Meta',
  description: 'Unlock WZPRO Meta pro tools, Warzone loadout breakdowns, rotation guides and practical analysis.',
};

export default async function Page() {
  const [siteContent, locale, user] = await Promise.all([getSiteContent(), getRequestLocale(), getUserSession()]);
  return <ProAccessClientPage initialCopy={siteContent.proAccess} locale={locale} initialUser={user} />;
}
