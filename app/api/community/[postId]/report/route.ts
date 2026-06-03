import { NextResponse } from 'next/server';
import { reportCommunityPost } from '@/lib/communityStore';
import { getUserSession } from '@/lib/userAuth';
import { rateLimit } from '@/lib/rateLimit';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const limited = await rateLimit(req, 'community-report', 12, 10 * 60_000);
  if (limited) return limited;

  const user = await getUserSession();
  if (!user) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }

  const { postId } = await params;
  const result = await reportCommunityPost(postId);
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json(result.post);
}
