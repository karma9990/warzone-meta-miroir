import { NextResponse, type NextRequest } from 'next/server';
import { syncMetaAndClassIntelligence } from '@/lib/metaClassAutomation';
import { syncWarzoneNews } from '@/lib/newsAutomation';
import { requireCronSecret } from '@/lib/security';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  const force = req.nextUrl.searchParams.get('force') === '1';
  const [news, metaClasses] = await Promise.all([
    syncWarzoneNews({ force }),
    syncMetaAndClassIntelligence({ force }),
  ]);
  const hasError = news.status === 'error' || metaClasses.status === 'error';

  return NextResponse.json({ news, metaClasses }, { status: hasError ? 500 : 200 });
}
