import { NextResponse, type NextRequest } from 'next/server';
import { syncMetaAndClassIntelligence } from '@/lib/metaClassAutomation';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await syncMetaAndClassIntelligence({ force: req.nextUrl.searchParams.get('force') === '1' });
  return NextResponse.json(result, { status: result.status === 'error' ? 500 : 200 });
}
