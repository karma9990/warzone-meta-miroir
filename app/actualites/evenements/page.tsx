import type { Metadata } from 'next';
import NewsCategoryPage from '../NewsCategoryPage';

export const metadata: Metadata = {
  title: 'Events - Warzone News | WZPRO Meta',
  description: 'In-game events, new seasons, maps and limited modes.',
};

export default function EvenementsNewsPage() {
  return <NewsCategoryPage slug="evenements" />;
}
