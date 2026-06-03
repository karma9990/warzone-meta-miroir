import type { Metadata } from 'next';
import ProAccessClientPage from '@/components/ProAccessClientPage';
import { getSiteContent } from '@/lib/siteContent';

export const metadata: Metadata = {
  title: 'Pro Access | WZPRO Meta',
  description: 'Unlock WZPRO Meta pro tools, Warzone loadout breakdowns, rotation guides and practical analysis.',
};

export default async function Page() {
  const siteContent = await getSiteContent();
  return <ProAccessClientPage initialCopy={siteContent.proAccess} />;
}
