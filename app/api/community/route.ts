import { NextRequest, NextResponse } from 'next/server';
import { createCommunityPost, getCommunityPosts } from '@/lib/communityStore';
import { readJsonBody } from '@/lib/security';
import { getUserSession } from '@/lib/userAuth';
import { rateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET() {
  const posts = await getCommunityPosts();
  return NextResponse.json(posts);
}

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, 'community-post', 6, 10 * 60_000);
  if (limited) return limited;

  const parsed = await readJsonBody(req);
  if ('error' in parsed) return parsed.error;

  const user = await getUserSession();
  if (!user) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }

  const result = await createCommunityPost(parsed.data, user?.name ?? 'Operator');

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result.post, { status: 201 });
}
