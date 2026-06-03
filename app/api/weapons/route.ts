import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

const weaponsFile = path.join(process.cwd(), 'scripts', 'weapons.json');
const weaponsData = JSON.parse(fs.readFileSync(weaponsFile, 'utf-8'));

export async function GET() {
  return NextResponse.json(weaponsData, {
    headers: { 'Cache-Control': 'public, max-age=86400' },
  });
}
