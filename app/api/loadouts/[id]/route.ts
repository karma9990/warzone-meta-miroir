import { NextRequest, NextResponse } from 'next/server';
import { buildLoadoutFromInput, getLoadouts, saveLoadouts, type Loadout } from '@/lib/data';
import { isAuthenticated } from '@/lib/auth';
import { readJsonBody } from '@/lib/security';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [authenticated, { id }] = await Promise.all([isAuthenticated(), params]);
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = await readJsonBody(req);
  if ('error' in parsed) return parsed.error;
  const body = parsed.data;
  const loadouts = await getLoadouts();
  const index = loadouts.findIndex(l => l.id === id);

  if (index === -1) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const result = buildLoadoutFromInput(body, loadouts[index]);

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const updated: Loadout = {
    ...loadouts[index],
    ...result.loadout,
  };

  loadouts[index] = updated;
  await saveLoadouts(loadouts);

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [authenticated, { id }] = await Promise.all([isAuthenticated(), params]);
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const loadouts = await getLoadouts();
  const filtered = loadouts.filter(l => l.id !== id);

  if (filtered.length === loadouts.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await saveLoadouts(filtered);
  return NextResponse.json({ ok: true });
}
