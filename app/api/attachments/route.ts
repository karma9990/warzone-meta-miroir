import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

const attachmentsFile = path.join(process.cwd(), 'scripts', 'attachments-slots.json');
const attachmentsData = JSON.parse(fs.readFileSync(attachmentsFile, 'utf-8'));

export async function GET() {
  return NextResponse.json(attachmentsData, {
    headers: { 'Cache-Control': 'public, max-age=86400' },
  });
}
