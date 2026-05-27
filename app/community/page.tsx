import CommunityClient from '@/components/CommunityClient';
import { getCommunityPosts } from '@/lib/communityStore';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Community - WZPRO Meta',
  description: 'Warzone community hub for discussions, LFG, loadout talk, tips, and teammates.',
};

export default async function CommunityPage() {
  const posts = await getCommunityPosts();
  return <CommunityClient initialPosts={posts} />;
}
