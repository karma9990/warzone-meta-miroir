import { NextResponse, type NextRequest } from 'next/server';
import { syncHiddenBalanceScan } from '@/lib/newsAutomation';
import { requireCronSecret } from '@/lib/security';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  const result = await syncHiddenBalanceScan({ force: req.nextUrl.searchParams.get('force') === '1' });
  return NextResponse.json(result, { status: result.status === 'error' ? 500 : 200 });
}
