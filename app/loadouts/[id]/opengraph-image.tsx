import { ImageResponse } from 'next/og';
import { getLoadouts } from '@/lib/data';
import { calculateMetaScore } from '@/lib/loadoutUtils';
import { findLoadoutByRouteId } from '@/lib/seo';

export const runtime = 'nodejs';
export const alt = 'WZPRO Meta - Warzone loadout';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const BLUE = '#163cff';
const INK = '#10100e';
const CREAM = '#efeee8';

const TIER_COLOR: Record<string, string> = {
  S: '#163cff',
  A: '#1f8f4d',
  B: '#b8860b',
  C: '#8a8a82',
};

type OgParams = { params: Promise<{ id: string }> };

export default async function LoadoutOgImage({ params }: OgParams) {
  const [{ id }, loadouts] = await Promise.all([params, getLoadouts()]);
  const loadout = findLoadoutByRouteId(loadouts, id);

  if (!loadout) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: CREAM,
            color: INK,
            fontSize: 64,
            fontWeight: 900,
            letterSpacing: '0.04em',
          }}
        >
          WZPRO META
        </div>
      ),
      size,
    );
  }

  const score = calculateMetaScore(loadout);
  const tierColor = TIER_COLOR[loadout.tier] ?? BLUE;
  const attachments = loadout.attachments.slice(0, 5);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: CREAM,
          color: INK,
          padding: '64px 72px',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                display: 'flex',
                background: BLUE,
                color: '#fff',
                fontWeight: 900,
                fontSize: 26,
                padding: '6px 14px',
                letterSpacing: '0.12em',
              }}
            >
              WZ
            </div>
            <div style={{ display: 'flex', fontSize: 26, fontWeight: 700, letterSpacing: '0.2em', opacity: 0.7 }}>
              META
            </div>
          </div>
          <div style={{ display: 'flex', fontSize: 24, fontWeight: 800, letterSpacing: '0.18em', color: BLUE }}>
            {loadout.category.toUpperCase()}
          </div>
        </div>

        {/* weapon name */}
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto', marginBottom: 'auto' }}>
          <div style={{ display: 'flex', fontSize: 30, fontWeight: 800, color: BLUE, letterSpacing: '0.06em' }}>
            BEST {loadout.playstyle.toUpperCase()} LOADOUT
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 116,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: '-0.01em',
              marginTop: 8,
            }}
          >
            {loadout.weapon.toUpperCase()}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
            {attachments.map((attachment) => (
              <div
                key={`${attachment.slot}-${attachment.name}`}
                style={{
                  display: 'flex',
                  border: `2px solid rgba(16,16,14,0.16)`,
                  padding: '8px 16px',
                  fontSize: 22,
                  fontWeight: 700,
                  color: 'rgba(16,16,14,0.7)',
                }}
              >
                {attachment.name}
              </div>
            ))}
          </div>
        </div>

        {/* bottom stats */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', fontSize: 22, fontWeight: 700, opacity: 0.5, letterSpacing: '0.1em' }}>
                META SCORE
              </div>
              <div style={{ display: 'flex', fontSize: 72, fontWeight: 900, color: BLUE, lineHeight: 1 }}>
                {score}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', fontSize: 22, fontWeight: 700, opacity: 0.5, letterSpacing: '0.1em' }}>
                TIER
              </div>
              <div style={{ display: 'flex', fontSize: 72, fontWeight: 900, color: tierColor, lineHeight: 1 }}>
                {loadout.tier}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', fontSize: 22, fontWeight: 700, opacity: 0.45, letterSpacing: '0.08em' }}>
            wzprometa.com
          </div>
        </div>

        {/* accent edge */}
        <div style={{ display: 'flex', position: 'absolute', left: 0, top: 0, bottom: 0, width: 14, background: tierColor }} />
      </div>
    ),
    size,
  );
}
