import type { Metadata } from 'next';
import LocalizedSafariBar from '@/components/LocalizedSafariBar';
import CommunityBuilds from '@/components/CommunityBuilds';
import { getRankedBuilds } from '@/lib/communityBuildStore';
import { getRequestLocale } from '@/lib/requestLocale';
import { getUserSession } from '@/lib/userAuth';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Community Loadout Builds | WZPRO Meta',
  description: 'Share your Warzone loadout, vote on the best community builds and climb the leaderboard.',
  alternates: { canonical: '/builds' },
};

export default async function BuildsPage() {
  const [locale, builds, user] = await Promise.all([getRequestLocale(), getRankedBuilds(), getUserSession()]);

  return (
    <>
      <LocalizedSafariBar active="community" />
      <CommunityBuilds initialBuilds={builds} locale={locale} isAuthed={Boolean(user)} />
    </>
  );
}
