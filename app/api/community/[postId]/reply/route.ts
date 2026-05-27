import { NextRequest, NextResponse } from 'next/server';
import { addCommunityReply } from '@/lib/communityStore';
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

  const { postId } = await params;
  const user = await getUserSession();
  if (!user) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }

  const result = await addCommunityReply(postId, parsed.data, user.name);

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json(result.post, { status: 201 });
}
