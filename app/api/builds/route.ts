import { NextRequest, NextResponse } from 'next/server';
import { createCommunityBuild, getRankedBuilds } from '@/lib/communityBuildStore';
import { getProfile } from '@/lib/profileStore';
import { rateLimit } from '@/lib/rateLimit';
import { readJsonBody } from '@/lib/security';
import { getUserSession } from '@/lib/userAuth';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await getRankedBuilds());
}

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, 'community-build', 6, 10 * 60_000);
  if (limited) return limited;

  const parsed = await readJsonBody(req, 8_192);
  if ('error' in parsed) return parsed.error;

  const user = await getUserSession();
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

  const profile = await getProfile(user.sub);
  const result = await createCommunityBuild(
    typeof parsed.data === 'object' && parsed.data ? (parsed.data as Record<string, unknown>) : {},
    { id: user.sub, name: profile?.pseudo || user.name || 'Operator', pseudo: profile?.pseudo },
  );

  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result.build, { status: 201 });
}
