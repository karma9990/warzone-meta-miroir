import type { Metadata } from 'next';
import SubscribeClientPage from '@/components/SubscribeClientPage';

export const metadata: Metadata = {
  title: 'Subscribe Free | WZPRO Meta',
  description: 'Subscribe to free WZPRO Meta updates for Warzone meta alerts, patch digests and map updates.',
};

export default function Page() {
  return <SubscribeClientPage />;
}
