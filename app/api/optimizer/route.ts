import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const scriptPath = join(process.cwd(), 'gaming-optimizer.ps1');
const scriptPromise = readFile(scriptPath, 'utf8');

export async function GET() {
  const script = await scriptPromise;

  return new Response(script, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'attachment; filename="gaming-optimizer.ps1"',
      'Cache-Control': 'no-store',
    },
  });
}
