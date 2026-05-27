import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export async function GET() {
  const file = path.join(process.cwd(), 'scripts', 'attachments-slots.json');
  const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, max-age=86400' },
  });
}
