import { NextRequest, NextResponse } from 'next/server';
import { requestJoinCommunityPost } from '@/lib/communityStore';
import { getProfile } from '@/lib/profileStore';
import { readJsonBody } from '@/lib/security';
import { getUserSession } from '@/lib/userAuth';
import { rateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const limited = await rateLimit(req, 'community-join', 12, 10 * 60_000);
  if (limited) return limited;

  const parsed = await readJsonBody<{ body?: unknown }>(req);
  if ('error' in parsed) return parsed.error;

  const [user, { postId }] = await Promise.all([getUserSession(), params]);
  if (!user) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }

  const profile = await getProfile(user.sub);
  const result = await requestJoinCommunityPost(postId, parsed.data, {
    id: user.sub,
    name: profile?.pseudo || user.name,
    pseudo: profile?.pseudo || undefined,
  });

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result.post);
}
