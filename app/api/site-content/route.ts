import { NextResponse } from 'next/server';
import { getSiteContent } from '@/lib/siteContent';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await getSiteContent());
}
