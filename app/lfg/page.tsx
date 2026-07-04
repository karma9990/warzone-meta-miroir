import type { Metadata } from 'next';
import CommunityClient from '@/components/CommunityClient';
import { getCommunityPosts } from '@/lib/communityStore';
import { getMessageInbox } from '@/lib/messageStore';
import { getSiteContent } from '@/lib/siteContent';
import { getUserSession } from '@/lib/userAuth';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'LFG - Find Warzone teammates | WZPRO Meta',
  description: 'Find Warzone teammates fast: filter LFG posts by platform, input, region, rank and mic, then ask to join or DM the squad.',
  alternates: { canonical: '/lfg' },
};

export default async function LfgPage({
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
      initialType="lfg"
    />
  );
}
