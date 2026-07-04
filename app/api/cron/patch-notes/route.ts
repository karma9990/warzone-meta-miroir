import { NextResponse, type NextRequest } from 'next/server';
import { syncLatestWarzonePatchNotes } from '@/lib/patchNotesAutomation';
import { requireCronSecret } from '@/lib/security';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  const result = await syncLatestWarzonePatchNotes();
  return NextResponse.json(result, { status: result.status === 'error' ? 500 : 200 });
}
