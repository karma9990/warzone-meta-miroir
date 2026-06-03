import { NextResponse } from 'next/server';
import { getSiteControls } from '@/lib/siteControls';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await getSiteControls());
}
