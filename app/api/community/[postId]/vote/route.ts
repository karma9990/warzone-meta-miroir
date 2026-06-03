import { NextRequest, NextResponse } from 'next/server';
import { voteCommunityPost } from '@/lib/communityStore';
import { readJsonBody } from '@/lib/security';
import { getUserSession } from '@/lib/userAuth';
import { rateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const limited = await rateLimit(req, 'community-vote', 30, 10 * 60_000);
  if (limited) return limited;

  const parsed = await readJsonBody<{ delta?: unknown }>(req);
  if ('error' in parsed) return parsed.error;

  const [{ postId }, user] = await Promise.all([params, getUserSession()]);
  if (!user) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }

  const delta = typeof parsed.data.delta === 'number' ? parsed.data.delta : 1;
  const result = await voteCommunityPost(postId, delta, user.sub);

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json(result.post);
}
