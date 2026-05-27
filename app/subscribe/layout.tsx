import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Newsletter meta Warzone gratuite | WZPRO Meta',
  description: 'Rejoins gratuitement les alertes WZPRO Meta pour recevoir les changements de meta, patchs, cartes Resurgence et nouveaux loadouts.',
};

export default function SubscribeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
