import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getUserSession } from '@/lib/userAuth';

export const dynamic = 'force-dynamic';

const FILE_NAME = 'WZPRO Companion.zip';
const FILE_PATH = path.join(process.cwd(), 'dist', 'wzpro-companion', FILE_NAME);

export async function GET() {
  const user = await getUserSession();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let data: Buffer;
  try {
    data = await readFile(FILE_PATH);
  } catch {
    return NextResponse.json({ error: 'Companion package not found.' }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="WZPRO-Companion.zip"`,
      'Content-Length': String(data.length),
      'Cache-Control': 'no-store',
    },
  });
}
