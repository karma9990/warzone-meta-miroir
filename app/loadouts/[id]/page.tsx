import Image from 'next/image';
import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import StatBar from '@/components/StatBar';
import { getLoadouts } from '@/lib/data';
import { getHomeUiCopy, localizeLoadoutNote, translateTerm, withLocalePath } from '@/lib/i18n';
import { calculateMetaScore, formatMetaDate, getLoadoutSlug } from '@/lib/loadoutUtils';
import { getRequestLocale } from '@/lib/requestLocale';

type LoadoutPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateStaticParams() {
  const loadouts = await getLoadouts();
  return loadouts.map((loadout) => ({ id: loadout.id }));
}

export async function generateMetadata({ params }: LoadoutPageProps): Promise<Metadata> {
  const [{ id }, loadouts] = await Promise.all([params, getLoadouts()]);
  const loadout = loadouts.find((entry) => entry.id === id);

  if (!loadout) {
    return {
      title: 'Loadout not found | WZPRO Meta',
    };
  }

  const score = calculateMetaScore(loadout);

  return {
    title: `${loadout.weapon} Loadout - Warzone Meta | WZPRO Meta`,
    description: `${loadout.weapon} ${loadout.category} build with attachments, meta score ${score}, TTK data, strengths, limits and patch notes.`,
    openGraph: {
      title: `${loadout.weapon} Warzone Loadout`,
      description: `${loadout.playstyle} build ranked Tier ${loadout.tier} with a ${score} meta score.`,
    },
  };
}

export default async function LoadoutDetailPage({ params }: LoadoutPageProps) {
  const [locale, { id }, loadouts] = await Promise.all([getRequestLocale(), params, getLoadouts()]);
  const uiCopy = getHomeUiCopy(locale);
  const href = (pathname: string) => withLocalePath(pathname, locale);
  const loadout = loadouts.find((entry) => entry.id === id);
  if (!loadout) notFound();

  const slug = getLoadoutSlug(loadout);
  const score = calculateMetaScore(loadout);
  const weaponImageCandidates = [
    `/assets/weapons/wzstats/${slug}.avif`,
    `/assets/weapons/${slug}.avif`,
    `/assets/weapons/${slug}.webp`,
  ];
  const weaponImageSrc = weaponImageCandidates.find((src) => (
    fs.existsSync(path.join(process.cwd(), 'public', ...src.split('/').filter(Boolean)))
  ));

  return (
    <main style={{ maxWidth: '980px', margin: '0 auto', padding: '5rem 2rem 6rem', fontFamily: 'var(--mono)' }}>
      <Link href={href('/#all-loadouts')} style={{ color: 'inherit', opacity: 0.5, textDecoration: 'none', fontSize: '0.75rem', letterSpacing: '0' }}>
        {locale === 'es' ? 'VOLVER A CLASES' : locale === 'fr' ? 'RETOUR AUX CLASSES' : 'BACK TO LOADOUTS'}
      </Link>

      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(260px, 0.9fr)', gap: '2rem', alignItems: 'center', marginTop: '2rem' }}>
        <div>
          <p style={{ margin: '0 0 0.7rem', color: '#163cff', fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0' }}>
            {translateTerm(loadout.category, locale).toUpperCase()} / TIER {loadout.tier}
          </p>
          <h1 style={{ margin: 0, fontSize: 'clamp(2.25rem, 7vw, 5rem)', lineHeight: 0.9, letterSpacing: '0' }}>
            {loadout.weapon.toUpperCase()}
          </h1>
          <p style={{ margin: '1.2rem 0 0', maxWidth: '620px', color: 'rgba(16,16,14,0.62)', lineHeight: 1.75 }}>
            {localizeLoadoutNote(loadout.weapon, loadout.playstyle, loadout.notes, locale)}
          </p>
          <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', marginTop: '1.1rem' }}>
            {(loadout.modes ?? []).map((mode) => (
              <span key={mode} style={{ border: '1px solid rgba(16,16,14,0.14)', padding: '0.28rem 0.5rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#163cff', fontWeight: 900 }}>
                {mode}
              </span>
            ))}
            {(loadout.tags ?? []).slice(0, 4).map((tag) => (
              <span key={tag} style={{ border: '1px solid rgba(16,16,14,0.14)', padding: '0.28rem 0.5rem', fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.62 }}>
                {tag}
              </span>
            ))}
          </div>
        </div>

        <aside style={{ border: '1px solid rgba(16,16,14,0.14)', padding: '1.25rem', background: 'rgba(239,238,232,0.72)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.75rem', opacity: 0.5, letterSpacing: '0' }}>META SCORE</span>
            <strong style={{ fontSize: '2.2rem', color: '#163cff' }}>{score}</strong>
          </div>
          {weaponImageSrc ? (
            <Image
              src={weaponImageSrc}
              alt=""
              width={420}
              height={210}
              unoptimized
              priority
              style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
            />
          ) : (
            <div style={{
              minHeight: '210px',
              display: 'grid',
              alignContent: 'center',
              gap: '0.7rem',
              border: '1px solid rgba(16,16,14,0.12)',
              background: 'linear-gradient(135deg, rgba(22,60,255,0.08), rgba(16,16,14,0.035))',
              padding: '1.25rem',
            }}>
              <div style={{
                height: '54px',
                position: 'relative',
                borderTop: '10px solid #10100e',
                borderBottom: '8px solid #10100e',
                clipPath: 'polygon(4% 38%, 49% 38%, 54% 18%, 68% 18%, 74% 38%, 94% 38%, 94% 62%, 76% 62%, 70% 82%, 56% 82%, 50% 62%, 4% 62%)',
                opacity: 0.92,
              }} />
              <div>
                <strong style={{
                  display: 'block',
                  color: '#163cff',
                  fontSize: '1.4rem',
                  lineHeight: 1,
                  letterSpacing: '0',
                  textTransform: 'uppercase',
                }}>
                  {loadout.weapon}
                </strong>
                <span style={{
                  display: 'block',
                  marginTop: '0.45rem',
                  color: 'rgba(16,16,14,0.52)',
                  fontSize: '0.75rem',
                  fontWeight: 900,
                  letterSpacing: '0',
                  textTransform: 'uppercase',
                }}>
                  {locale === 'es' ? 'Visual de clase curada' : locale === 'fr' ? 'Visuel de classe selectionnee' : 'Curated build visual'}
                </span>
              </div>
            </div>
          )}
          <small style={{ display: 'block', marginTop: '1rem', opacity: 0.45, letterSpacing: '0' }}>
            {uiCopy.updated} {formatMetaDate(loadout.updatedAt)}
          </small>
        </aside>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 0.8fr)', gap: '1.5rem', marginTop: '2rem' }}>
        <div style={{ borderTop: '1px solid rgba(16,16,14,0.14)', paddingTop: '1.5rem' }}>
          <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', letterSpacing: '0' }}>{locale === 'es' ? 'ACCESORIOS' : locale === 'fr' ? 'ACCESSOIRES' : 'ATTACHMENTS'}</h2>
          <div style={{ display: 'grid', gap: '0.65rem' }}>
            {loadout.attachments.map((attachment) => (
              <div key={`${attachment.slot}-${attachment.name}`} style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '1rem', borderBottom: '1px solid rgba(16,16,14,0.08)', paddingBottom: '0.65rem' }}>
                <span style={{ opacity: 0.5, fontSize: '0.75rem', textTransform: 'uppercase' }}>{attachment.slot}</span>
                <div>
                  <strong>{attachment.name}</strong>
                  {attachment.reason && (
                    <p style={{ margin: '0.35rem 0 0', color: 'rgba(16,16,14,0.55)', fontSize: '0.75rem', lineHeight: 1.55 }}>
                      {attachment.reason}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(16,16,14,0.14)', paddingTop: '1.5rem' }}>
          <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', letterSpacing: '0' }}>{locale === 'es' ? 'RENDIMIENTO' : locale === 'fr' ? 'PERFORMANCE' : 'PERFORMANCE'}</h2>
          <StatBar label={uiCopy.damage} value={loadout.stats.damage} />
          <StatBar label={uiCopy.range} value={loadout.stats.range} />
          <StatBar label={uiCopy.mobility} value={loadout.stats.mobility} />
          <StatBar label={uiCopy.control} value={loadout.stats.control} />
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '1rem', marginTop: '2rem' }}>
        <div style={{ border: '1px solid rgba(16,16,14,0.14)', padding: '1rem' }}>
          <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', letterSpacing: '0' }}>{locale === 'es' ? 'AVANZADO' : locale === 'fr' ? 'AVANCE' : 'ADVANCED'}</h2>
          {[
            [uiCopy.ttkClose, loadout.advanced?.ttkClose ? `${loadout.advanced.ttkClose} ms` : 'N/A'],
            [uiCopy.ttkMid, loadout.advanced?.ttkMid ? `${loadout.advanced.ttkMid} ms` : 'N/A'],
            [uiCopy.ads, loadout.advanced?.ads ? `${loadout.advanced.ads} ms` : 'N/A'],
            [uiCopy.velocity, loadout.advanced?.bulletVelocity ? `${loadout.advanced.bulletVelocity} m/s` : 'N/A'],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', borderBottom: '1px solid rgba(16,16,14,0.08)', padding: '0.45rem 0' }}>
              <span style={{ opacity: 0.52 }}>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>

        <div style={{ border: '1px solid rgba(16,16,14,0.14)', padding: '1rem' }}>
          <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', letterSpacing: '0' }}>{locale === 'es' ? 'FORTALEZAS' : locale === 'fr' ? 'FORCES' : 'STRENGTHS'}</h2>
          {(loadout.strengths ?? ['Reliable handling', 'Practical build']).map((item) => (
            <p key={item} style={{ margin: '0 0 0.65rem', color: 'rgba(16,16,14,0.62)', lineHeight: 1.55 }}>{item}</p>
          ))}
        </div>

        <div style={{ border: '1px solid rgba(16,16,14,0.14)', padding: '1rem' }}>
          <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', letterSpacing: '0' }}>{locale === 'es' ? 'LIMITES' : locale === 'fr' ? 'LIMITES' : 'LIMITS'}</h2>
          {(loadout.weaknesses ?? ['Re-check after major patches']).map((item) => (
            <p key={item} style={{ margin: '0 0 0.65rem', color: 'rgba(16,16,14,0.62)', lineHeight: 1.55 }}>{item}</p>
          ))}
        </div>
      </section>

      <section style={{ marginTop: '2rem', borderTop: '1px solid rgba(16,16,14,0.14)', paddingTop: '1.5rem' }}>
        <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', letterSpacing: '0' }}>{locale === 'es' ? 'LECTURA DEL PARCHE' : locale === 'fr' ? 'LECTURE DU PATCH' : 'PATCH READ'}</h2>
        <p style={{ maxWidth: '760px', margin: 0, color: 'rgba(16,16,14,0.64)', lineHeight: 1.75 }}>
          {loadout.patchSummary || 'No dedicated patch note yet. This build is ranked from practical stat balance, handling and role fit.'}
        </p>
        <p style={{ maxWidth: '760px', margin: '0.75rem 0 0', color: 'rgba(16,16,14,0.46)', lineHeight: 1.65, fontSize: '0.75rem' }}>
          {loadout.sourceNote || 'WZPRO Meta is an independent fan site. Re-check major balance updates before ranked sessions.'}
        </p>
      </section>
    </main>
  );
}
