import { NextResponse, type NextRequest } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { deleteCommunityPost, setCommunityPostHidden } from '@/lib/communityStore';
import { readJsonBody, sameOriginGuard } from '@/lib/security';

export const dynamic = 'force-dynamic';

type Context = {
  params: Promise<{ postId: string }>;
};

export async function PATCH(req: NextRequest, context: Context) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = await readJsonBody<{ hidden?: unknown }>(req, 2_000);
  if ('error' in parsed) return parsed.error;

  const { postId } = await context.params;
  const result = await setCommunityPostHidden(postId, Boolean(parsed.data.hidden));
  if ('error' in result) return NextResponse.json(result, { status: 404 });

  return NextResponse.json(result.post);
}

export async function DELETE(_req: NextRequest, context: Context) {
  const csrfError = sameOriginGuard(_req);
  if (csrfError) return csrfError;

  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { postId } = await context.params;
  const result = await deleteCommunityPost(postId);
  if ('error' in result) return NextResponse.json(result, { status: 404 });

  return NextResponse.json(result);
}
