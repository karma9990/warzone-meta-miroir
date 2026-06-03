import { NextRequest, NextResponse } from 'next/server';
import { addCommunityReply } from '@/lib/communityStore';
import { getProfile } from '@/lib/profileStore';
import { readJsonBody } from '@/lib/security';
import { getUserSession } from '@/lib/userAuth';
import { rateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const limited = await rateLimit(req, 'community-reply', 10, 10 * 60_000);
  if (limited) return limited;

  const parsed = await readJsonBody(req);
  if ('error' in parsed) return parsed.error;

  const [{ postId }, user] = await Promise.all([params, getUserSession()]);
  if (!user) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }

  const profile = await getProfile(user.sub);
  const result = await addCommunityReply(postId, {
    ...(typeof parsed.data === 'object' && parsed.data ? parsed.data : {}),
    authorPseudo: profile?.pseudo || '',
  }, profile?.pseudo || user.name);

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json(result.post, { status: 201 });
}
