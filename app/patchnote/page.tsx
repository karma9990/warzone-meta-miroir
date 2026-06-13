import type { Metadata } from 'next';
import NewsCategoryPage from '../actualites/NewsCategoryPage';

export const metadata: Metadata = {
  title: 'Patch Notes - Warzone News | WZPRO Meta',
  description: 'Weapon balance changes, nerfs, buffs and recent Warzone gameplay updates.',
};

export default function PatchnotePage() {
  return <NewsCategoryPage slug="patch-notes" />;
}
