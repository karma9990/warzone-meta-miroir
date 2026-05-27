import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const scriptPath = join(process.cwd(), 'gaming-optimizer.ps1');
  const script = await readFile(scriptPath, 'utf8');

  return new Response(script, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'attachment; filename="gaming-optimizer.ps1"',
      'Cache-Control': 'no-store',
    },
  });
}
