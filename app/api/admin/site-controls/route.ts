import { NextResponse, type NextRequest } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { readJsonBody } from '@/lib/security';
import { getSiteControls, saveSiteControls } from '@/lib/siteControls';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json(await getSiteControls());
}

export async function PUT(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = await readJsonBody(req, 64_000);
  if ('error' in parsed) return parsed.error;

  return NextResponse.json(await saveSiteControls(parsed.data));
}
