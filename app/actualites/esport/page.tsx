import type { Metadata } from 'next';
import NewsCategoryPage from '../NewsCategoryPage';

export const metadata: Metadata = {
  title: 'Esport - Warzone News | WZPRO Meta',
  description: 'Tournaments, qualifiers, results and competitive circuit news.',
};

export default function EsportNewsPage() {
  return <NewsCategoryPage slug="esport" />;
}
