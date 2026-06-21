import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const VERSION = process.env.WZPRO_COMPANION_VERSION ?? '0.1.0';

export async function GET(request: Request) {
  const url = new URL(request.url);

  return NextResponse.json(
    {
      version: VERSION,
      latestVersion: VERSION,
      url: `${url.origin}/api/companion/download`,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}
