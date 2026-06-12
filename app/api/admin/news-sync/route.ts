import { NextResponse, type NextRequest } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { syncWarzoneNews } from '@/lib/newsAutomation';
import { sameOriginGuard } from '@/lib/security';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const csrfError = sameOriginGuard(req);
  if (csrfError) return csrfError;

  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await syncWarzoneNews({ force: true });
  return NextResponse.json(result, { status: result.status === 'error' ? 500 : 200 });
}
