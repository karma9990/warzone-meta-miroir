import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import StatBar from '@/components/StatBar';
import { getLoadouts } from '@/lib/data';
import { calculateMetaScore, formatMetaDate, getLoadoutSlug } from '@/lib/loadoutUtils';

export function generateStaticParams() {
  return getLoadouts().map((loadout) => ({ id: loadout.id }));
}

export default async function LoadoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const loadout = getLoadouts().find((entry) => entry.id === id);
  if (!loadout) notFound();

  const slug = getLoadoutSlug(loadout);
  const score = calculateMetaScore(loadout);

  return (
    <main style={{ maxWidth: '980px', margin: '0 auto', padding: '5rem 2rem 6rem', fontFamily: 'var(--mono)' }}>
      <Link href="/#all-loadouts" style={{ color: 'inherit', opacity: 0.5, textDecoration: 'none', fontSize: '0.68rem', letterSpacing: '0.16em' }}>
        BACK TO LOADOUTS
      </Link>

      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(260px, 0.9fr)', gap: '2rem', alignItems: 'center', marginTop: '2rem' }}>
        <div>
          <p style={{ margin: '0 0 0.7rem', color: '#163cff', fontSize: '0.72rem', fontWeight: 900, letterSpacing: '0.18em' }}>
            {loadout.category.toUpperCase()} / TIER {loadout.tier}
          </p>
          <h1 style={{ margin: 0, fontSize: 'clamp(2.25rem, 7vw, 5rem)', lineHeight: 0.9, letterSpacing: '0.06em' }}>
            {loadout.weapon.toUpperCase()}
          </h1>
          <p style={{ margin: '1.2rem 0 0', maxWidth: '620px', color: 'rgba(16,16,14,0.62)', lineHeight: 1.75 }}>
            {loadout.notes || 'A practical Warzone build focused on reliable performance, clean handling, and repeatable fights.'}
          </p>
          <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', marginTop: '1.1rem' }}>
            {(loadout.modes ?? []).map((mode) => (
              <span key={mode} style={{ border: '1px solid rgba(16,16,14,0.14)', padding: '0.28rem 0.5rem', fontSize: '0.62rem', textTransform: 'uppercase', color: '#163cff', fontWeight: 900 }}>
                {mode}
              </span>
            ))}
            {(loadout.tags ?? []).slice(0, 4).map((tag) => (
              <span key={tag} style={{ border: '1px solid rgba(16,16,14,0.14)', padding: '0.28rem 0.5rem', fontSize: '0.62rem', textTransform: 'uppercase', opacity: 0.62 }}>
                {tag}
              </span>
            ))}
          </div>
        </div>

        <aside style={{ border: '1px solid rgba(16,16,14,0.14)', padding: '1.25rem', background: 'rgba(239,238,232,0.72)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.65rem', opacity: 0.5, letterSpacing: '0.16em' }}>META SCORE</span>
            <strong style={{ fontSize: '2.2rem', color: '#163cff' }}>{score}</strong>
          </div>
          <Image
            src={`/assets/weapons/wzstats/${slug}.avif`}
            alt=""
            width={420}
            height={210}
            unoptimized
            style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
          />
          <small style={{ display: 'block', marginTop: '1rem', opacity: 0.45, letterSpacing: '0.12em' }}>
            UPDATED {formatMetaDate(loadout.updatedAt)}
          </small>
        </aside>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 0.8fr)', gap: '1.5rem', marginTop: '2rem' }}>
        <div style={{ borderTop: '1px solid rgba(16,16,14,0.14)', paddingTop: '1.5rem' }}>
          <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', letterSpacing: '0.12em' }}>ATTACHMENTS</h2>
          <div style={{ display: 'grid', gap: '0.65rem' }}>
            {loadout.attachments.map((attachment) => (
              <div key={`${attachment.slot}-${attachment.name}`} style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '1rem', borderBottom: '1px solid rgba(16,16,14,0.08)', paddingBottom: '0.65rem' }}>
                <span style={{ opacity: 0.5, fontSize: '0.72rem', textTransform: 'uppercase' }}>{attachment.slot}</span>
                <div>
                  <strong>{attachment.name}</strong>
                  {attachment.reason && (
                    <p style={{ margin: '0.35rem 0 0', color: 'rgba(16,16,14,0.55)', fontSize: '0.7rem', lineHeight: 1.55 }}>
                      {attachment.reason}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(16,16,14,0.14)', paddingTop: '1.5rem' }}>
          <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', letterSpacing: '0.12em' }}>PERFORMANCE</h2>
          <StatBar label="Damage" value={loadout.stats.damage} />
          <StatBar label="Range" value={loadout.stats.range} />
          <StatBar label="Mobility" value={loadout.stats.mobility} />
          <StatBar label="Control" value={loadout.stats.control} />
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '1rem', marginTop: '2rem' }}>
        <div style={{ border: '1px solid rgba(16,16,14,0.14)', padding: '1rem' }}>
          <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', letterSpacing: '0.12em' }}>ADVANCED</h2>
          {[
            ['TTK close', loadout.advanced?.ttkClose ? `${loadout.advanced.ttkClose} ms` : 'N/A'],
            ['TTK mid', loadout.advanced?.ttkMid ? `${loadout.advanced.ttkMid} ms` : 'N/A'],
            ['ADS', loadout.advanced?.ads ? `${loadout.advanced.ads} ms` : 'N/A'],
            ['Velocity', loadout.advanced?.bulletVelocity ? `${loadout.advanced.bulletVelocity} m/s` : 'N/A'],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', borderBottom: '1px solid rgba(16,16,14,0.08)', padding: '0.45rem 0' }}>
              <span style={{ opacity: 0.52 }}>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>

        <div style={{ border: '1px solid rgba(16,16,14,0.14)', padding: '1rem' }}>
          <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', letterSpacing: '0.12em' }}>STRENGTHS</h2>
          {(loadout.strengths ?? ['Reliable handling', 'Practical build']).map((item) => (
            <p key={item} style={{ margin: '0 0 0.65rem', color: 'rgba(16,16,14,0.62)', lineHeight: 1.55 }}>{item}</p>
          ))}
        </div>

        <div style={{ border: '1px solid rgba(16,16,14,0.14)', padding: '1rem' }}>
          <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', letterSpacing: '0.12em' }}>LIMITS</h2>
          {(loadout.weaknesses ?? ['Re-check after major patches']).map((item) => (
            <p key={item} style={{ margin: '0 0 0.65rem', color: 'rgba(16,16,14,0.62)', lineHeight: 1.55 }}>{item}</p>
          ))}
        </div>
      </section>

      <section style={{ marginTop: '2rem', borderTop: '1px solid rgba(16,16,14,0.14)', paddingTop: '1.5rem' }}>
        <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', letterSpacing: '0.12em' }}>PATCH READ</h2>
        <p style={{ maxWidth: '760px', margin: 0, color: 'rgba(16,16,14,0.64)', lineHeight: 1.75 }}>
          {loadout.patchSummary || 'No dedicated patch note yet. This build is ranked from practical stat balance, handling and role fit.'}
        </p>
        <p style={{ maxWidth: '760px', margin: '0.75rem 0 0', color: 'rgba(16,16,14,0.46)', lineHeight: 1.65, fontSize: '0.72rem' }}>
          {loadout.sourceNote || 'WZPRO Meta is an independent fan site. Re-check major balance updates before ranked sessions.'}
        </p>
      </section>
    </main>
  );
}
