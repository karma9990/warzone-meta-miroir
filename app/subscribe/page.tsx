import type { Metadata } from 'next';
import SubscribeClientPage from '@/components/SubscribeClientPage';
import { getRequestLocale } from '@/lib/requestLocale';

export const metadata: Metadata = {
  title: 'Subscribe Free | WZPRO Meta',
  description: 'Subscribe to free WZPRO Meta updates for Warzone meta alerts, patch digests and map updates.',
};

export default async function Page() {
  const locale = await getRequestLocale();
  return <SubscribeClientPage locale={locale} />;
}
