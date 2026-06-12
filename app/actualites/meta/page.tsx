import type { Metadata } from 'next';
import NewsCategoryPage from '../NewsCategoryPage';

export const metadata: Metadata = {
  title: 'Meta - Warzone News | WZPRO Meta',
  description: 'Meta shifts, tier movements and new dominant builds.',
};

export default function MetaNewsPage() {
  return <NewsCategoryPage slug="meta" />;
}
