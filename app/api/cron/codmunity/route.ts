import { NextResponse, type NextRequest } from 'next/server';
import { syncCodmunityEsport } from '@/lib/codmunityScraper';
import { requireCronSecret } from '@/lib/security';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  const result = await syncCodmunityEsport();
  return NextResponse.json(result, { status: result.status === 'error' ? 500 : 200 });
}
