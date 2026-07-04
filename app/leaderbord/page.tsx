import { redirect } from 'next/navigation';
import { getRequestLocale } from '@/lib/requestLocale';
import { withLocalePath } from '@/lib/i18n';

export default async function LeaderbordRedirectPage() {
  const locale = await getRequestLocale();
  redirect(withLocalePath('/leaderboard', locale));
}
