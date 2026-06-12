import { CompetitiveCalendarPage } from '@/components/CompetitivePageShell';
import { getCachedCalendar } from '@/lib/codmunityScraper';

export const metadata = {
  title: 'Warzone Events Calendar - WZPRO Meta',
  description: 'Live and past Warzone competitive events calendar.',
};

export default async function CalendarPage() {
  // Lecture du cache rempli par la tache de fond (cron) ; le composant
  // retombe sur un snapshot statique si le cache est vide.
  const data = await getCachedCalendar();
  return <CompetitiveCalendarPage data={data ?? undefined} />;
}
