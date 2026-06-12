import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getSiteContent, saveSiteContent } from '@/lib/siteContent';
import { readJsonBody } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json(await getSiteContent());
}

export async function PUT(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = await readJsonBody(req, 96_000);
  if ('error' in parsed) return parsed.error;

  return NextResponse.json(await saveSiteContent(parsed.data));
}
