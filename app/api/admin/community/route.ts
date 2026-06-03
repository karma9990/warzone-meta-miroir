import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getCommunityPosts } from '@/lib/communityStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const posts = await getCommunityPosts();
  return NextResponse.json(posts);
}
