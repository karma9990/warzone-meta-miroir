import type { Metadata } from 'next';
import LocalizedSafariBar from '@/components/LocalizedSafariBar';
import LoadoutQuiz from '@/components/LoadoutQuiz';
import { getLoadouts } from '@/lib/data';
import { getRequestLocale } from '@/lib/requestLocale';

export const metadata: Metadata = {
  title: 'Find Your Warzone Loadout | WZPRO Meta',
  description: 'Answer five quick questions and get the meta Warzone loadout ranked for your mode, range and playstyle.',
  alternates: { canonical: '/quiz' },
};

export default async function QuizPage() {
  const [locale, loadouts] = await Promise.all([getRequestLocale(), getLoadouts()]);

  return (
    <>
      <LocalizedSafariBar active="loadouts" />
      <LoadoutQuiz loadouts={loadouts} locale={locale} />
    </>
  );
}
