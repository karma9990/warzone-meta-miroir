import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getNextMetaConfig, saveNextMetaConfig } from '@/lib/nextMetaConfig';
import { readJsonBody } from '@/lib/security';

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json(await getNextMetaConfig());
}

export async function PUT(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = await readJsonBody(req);
  if ('error' in parsed) return parsed.error;

  return NextResponse.json(await saveNextMetaConfig(parsed.data));
}
