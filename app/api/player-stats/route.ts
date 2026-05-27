import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';

export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, 'player-stats', 20, 5 * 60_000);
  if (limited) return limited;

  const username = req.nextUrl.searchParams.get('username');
  if (!username || username.length > 64 || !/^[\w .#-]+$/i.test(username)) {
    return NextResponse.json({ error: 'Invalid username' }, { status: 400 });
  }

  const apiKey = process.env.TRACKER_GG_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'API key not configured' }, { status: 503 });

  const encoded = encodeURIComponent(username);

  // Try current Warzone slug first, fallback to warzone-2
  const slugs = ['warzone', 'cod-warzone', 'warzone-2'];
  let res: Response | null = null;
  let lastStatus = 0;

  for (const slug of slugs) {
    const url = `https://api.tracker.gg/api/v2/${slug}/standard/profile/atvi/${encoded}`;
    res = await fetch(url, {
      headers: {
        'TRN-Api-Key': apiKey,
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
      next: { revalidate: 300 },
    });
    lastStatus = res.status;
    if (res.ok || res.status === 404) break;
  }

  if (!res) return NextResponse.json({ error: 'Network error.' }, { status: 500 });

  try {
    if (res.status === 404) return NextResponse.json({ error: 'Profile not found. Check your Activision ID (format: Username#1234567).' }, { status: 404 });
    if (res.status === 401) return NextResponse.json({ error: 'Stats provider is not available.' }, { status: 502 });
    if (res.status === 403) return NextResponse.json({ error: 'Access denied — profile data is not accessible through the API.' }, { status: 403 });
    if (!res.ok) return NextResponse.json({ error: `tracker.gg error (${lastStatus})` }, { status: lastStatus });

    const data = await res.json();
    const segments = data?.data?.segments;
    if (!segments?.length) return NextResponse.json({ error: 'No data available.' }, { status: 404 });

    const overview = segments.find((s: { type: string }) => s.type === 'overview');
    if (!overview) return NextResponse.json({ error: 'No overview data.' }, { status: 404 });

    const s = overview.stats;
    return NextResponse.json({
      username,
      kd:            s?.kdRatio?.value ?? null,
      kills:         s?.kills?.value ?? null,
      deaths:        s?.deaths?.value ?? null,
      damage:        s?.damageDone?.value ?? null,
      wins:          s?.wins?.value ?? null,
      gamesPlayed:   s?.gamesPlayed?.value ?? null,
      winPercent:    s?.winsPercent?.value ?? null,
      avgKills:      s?.killsPerGame?.value ?? null,
      avgDamage:     s?.damagePerGame?.value ?? null,
      avgPlacement:  s?.avgLifeTime?.value ?? null,
      topFive:       s?.topFive?.value ?? null,
      topTen:        s?.topTen?.value ?? null,
      headshotPct:   s?.headshotPct?.value ?? null,
    });
  } catch {
    return NextResponse.json({ error: 'Network error.' }, { status: 500 });
  }
}
