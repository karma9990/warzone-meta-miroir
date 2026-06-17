import { NextRequest, NextResponse } from 'next/server';
import { verifyCompanionToken } from '@/lib/companionToken';
import { getCompanionDevice, touchCompanionDevice } from '@/lib/companionDeviceStore';
import { getLoadouts } from '@/lib/data';
import { calculateMetaScore } from '@/lib/loadoutUtils';
import { rateLimit } from '@/lib/rateLimit';

function bearerToken(request: NextRequest) {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || '';
}

// Rotating daily settings/aim tips surfaced on the free home page of the app.
const SETTINGS_TIPS = [
  'Garde le viseur a hauteur de tete et pre-aim les angles connus.',
  'Teste ta sensibilite a 3-6 inches/360 et garde-la 2 semaines avant de juger.',
  'Multiplicateur ADS entre 0.85 et 1.0 pour des transitions coherentes.',
  'Coupe motion blur, film grain et depth of field : zero gain de gameplay.',
  'Cale ton 1% low FPS au-dessus de ton refresh, pas juste la moyenne.',
  'Audio en Boost High + casque stereo : entends le combat avant de le voir.',
  'Slide-cancel a chaque engagement pour rester imprevisible.',
  'Ethernet plutot que WiFi : moins de ping, zero packet loss.',
];

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, 'companion-home', 60, 10 * 60_000);
  if (limited) return limited;

  const token = bearerToken(request);
  const companion = token ? await verifyCompanionToken(token) : null;
  if (!companion) {
    return NextResponse.json({ error: 'Unauthorized companion token.' }, { status: 401 });
  }

  const device = companion.deviceId ? await getCompanionDevice(companion.deviceId) : null;
  if (companion.deviceId) {
    if (!device || device.revoked || device.userId !== companion.sub) {
      return NextResponse.json({ error: 'Companion device revoked.' }, { status: 401 });
    }
    await touchCompanionDevice(device);
  }

  const loadouts = await getLoadouts();

  const top = [...loadouts].sort((a, b) => calculateMetaScore(b) - calculateMetaScore(a))[0] ?? null;
  const meta = top
    ? {
        weapon: top.weapon,
        category: top.category,
        playstyle: top.playstyle,
        tier: top.tier,
        score: calculateMetaScore(top),
        attachments: top.attachments.slice(0, 5).map((a) => ({ slot: a.slot, name: a.name })),
        updatedAt: top.updatedAt,
      }
    : null;

  const latestDate = loadouts.reduce((max, l) => (l.updatedAt > max ? l.updatedAt : max), '');
  const patch = latestDate
    ? {
        date: latestDate,
        summary:
          loadouts.find((l) => l.patchSummary && l.updatedAt === latestDate)?.patchSummary ??
          `Meta mise a jour (${loadouts.length} classes).`,
      }
    : null;

  const tip = SETTINGS_TIPS[Math.floor(Date.now() / 86_400_000) % SETTINGS_TIPS.length];

  return NextResponse.json({ meta, patch, tip, checkedAt: new Date().toISOString() });
}
