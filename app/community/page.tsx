import CommunityClient from '@/components/CommunityClient';
import { getCommunityPosts } from '@/lib/communityStore';
import { getMessageInbox } from '@/lib/messageStore';
import { getSiteContent } from '@/lib/siteContent';
import { getUserSession } from '@/lib/userAuth';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Community - WZPRO Meta',
  description: 'Warzone community hub for discussions, LFG, loadout talk, tips, and teammates.',
};

export default async function CommunityPage({
  searchParams,
}: {
  searchParams?: Promise<{ player?: string }>;
}) {
  const [posts, user, siteContent, query] = await Promise.all([
    getCommunityPosts(),
    getUserSession(),
    getSiteContent(),
    searchParams,
  ]);
  const messages = user ? await getMessageInbox(user.sub) : [];

  return (
    <CommunityClient
      initialPosts={posts}
      initialUser={user}
      initialMessages={messages}
      initialCopy={siteContent.community}
      initialPlayer={query?.player || ''}
    />
  );
}
