import { NextRequest, NextResponse } from 'next/server';
import { buildLoadoutFromInput, getLoadouts, saveLoadouts, type Loadout } from '@/lib/data';
import { isAuthenticated } from '@/lib/auth';
import { readJsonBody } from '@/lib/security';

export async function GET() {
  const loadouts = getLoadouts();
  return NextResponse.json(loadouts);
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = await readJsonBody(req);
  if ('error' in parsed) return parsed.error;
  const body = parsed.data;
  const loadouts = getLoadouts();
  const result = buildLoadoutFromInput(body);

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const newLoadout: Loadout = {
    id: Date.now().toString(),
    ...result.loadout,
  };

  loadouts.push(newLoadout);
  saveLoadouts(loadouts);

  return NextResponse.json(newLoadout, { status: 201 });
}
