import { NextRequest, NextResponse } from 'next/server';
import { reportCommunityBuild } from '@/lib/communityBuildStore';
import { rateLimit } from '@/lib/rateLimit';
import { readJsonBody } from '@/lib/security';
import { getUserSession } from '@/lib/userAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(req, 'community-build-report', 12, 10 * 60_000);
  if (limited) return limited;

  const parsed = await readJsonBody(req);
  if ('error' in parsed) return parsed.error;

  const [{ id }, user] = await Promise.all([params, getUserSession()]);
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

  const result = await reportCommunityBuild(id);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 404 });

  return NextResponse.json({ ok: true });
}
