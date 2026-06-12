import type { Metadata } from 'next';
import NewsCategoryPage from '../NewsCategoryPage';

export const metadata: Metadata = {
  title: 'Patch Notes - Warzone News | WZPRO Meta',
  description: 'Weapon balance changes, nerfs, buffs and gameplay updates.',
};

export default function PatchNotesNewsPage() {
  return <NewsCategoryPage slug="patch-notes" />;
}
