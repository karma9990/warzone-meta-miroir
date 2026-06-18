import Image from 'next/image';
import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import StatBar from '@/components/StatBar';
import StatRadar from '@/components/StatRadar';
import WeaponWatchButton from '@/components/WeaponWatchButton';
import { getLoadouts } from '@/lib/data';
import { getHomeUiCopy, localizeLoadoutNote, localizeLoadoutText, translateTerm, withLocalePath } from '@/lib/i18n';
import { calculateMetaScore, formatMetaDate, getLoadoutSlug } from '@/lib/loadoutUtils';
import { getRequestLocale } from '@/lib/requestLocale';
import {
  CURRENT_WARZONE_SEASON,
  findLoadoutByRouteId,
  getLoadoutCanonicalUrl,
  getLoadoutJsonLd,
  getLoadoutKeywords,
  getLoadoutPath,
  getLoadoutSeoDescription,
  getLoadoutSeoTitle,
} from '@/lib/seo';

type LoadoutPageProps = {
  params: Promise<{ id: string }>;
};

function getPublicOrigin() {
  const value = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || 'https://wzprometa.com';
  const origin = value.startsWith('http') ? value : `https://${value}`;
  return origin.replace(/\/$/, '');
}

export async function generateStaticParams() {
  const loadouts = await getLoadouts();
  const params = new Map<string, { id: string }>();

  for (const loadout of loadouts) {
    params.set(loadout.id, { id: loadout.id });
    if (loadout.weaponId) params.set(loadout.weaponId, { id: loadout.weaponId });
  }

  return Array.from(params.values());
}

export async function generateMetadata({ params }: LoadoutPageProps): Promise<Metadata> {
  const [{ id }, loadouts] = await Promise.all([params, getLoadouts()]);
  const loadout = findLoadoutByRouteId(loadouts, id);

  if (!loadout) {
    return {
      title: 'Loadout not found | WZPRO Meta',
    };
  }

  const score = calculateMetaScore(loadout);

  return {
    title: getLoadoutSeoTitle(loadout),
    description: getLoadoutSeoDescription(loadout),
    keywords: getLoadoutKeywords(loadout),
    alternates: {
      canonical: getLoadoutCanonicalUrl(loadout),
    },
    openGraph: {
      title: `Meilleure classe ${loadout.weapon} Warzone`,
      description: `${loadout.playstyle} build ranked Tier ${loadout.tier} with a ${score} meta score. Updated for ${CURRENT_WARZONE_SEASON}.`,
      url: getLoadoutCanonicalUrl(loadout),
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Classe ${loadout.weapon} Warzone ${CURRENT_WARZONE_SEASON}`,
      description: getLoadoutSeoDescription(loadout),
    },
  };
}

export default async function LoadoutDetailPage({ params }: LoadoutPageProps) {
  const [locale, { id }, loadouts] = await Promise.all([getRequestLocale(), params, getLoadouts()]);
  const uiCopy = getHomeUiCopy(locale);
  const href = (pathname: string) => withLocalePath(pathname, locale);
  const loadout = findLoadoutByRouteId(loadouts, id);
  if (!loadout) notFound();

  const slug = getLoadoutSlug(loadout);
  const score = calculateMetaScore(loadout);
  const shareUrl = `${getPublicOrigin()}${href(getLoadoutPath(loadout))}`;
  const shareText = encodeURIComponent(`${loadout.weapon} Warzone - ${translateTerm(loadout.category, locale)} - ${score} meta`);
  const encodedShareUrl = encodeURIComponent(shareUrl);
  const shareCopy = {
    title: locale === 'es' ? 'COMPARTIR LA CLASE' : locale === 'fr' ? 'PARTAGER LA CLASSE' : 'SHARE BUILD',
    copy: locale === 'es' ? 'COPIAR ENLACE' : locale === 'fr' ? 'COPIER LE LIEN' : 'COPY LINK',
    open: locale === 'es' ? 'ABRIR' : locale === 'fr' ? 'OUVRIR' : 'OPEN',
  };
  const shareLinks = [
    { label: 'X', href: `https://twitter.com/intent/tweet?text=${shareText}&url=${encodedShareUrl}` },
    { label: 'WhatsApp', href: `https://wa.me/?text=${shareText}%20${encodedShareUrl}` },
    { label: 'Telegram', href: `https://t.me/share/url?url=${encodedShareUrl}&text=${shareText}` },
    { label: 'Reddit', href: `https://www.reddit.com/submit?url=${encodedShareUrl}&title=${shareText}` },
  ];
  const weaponImageCandidates = [
    `/assets/weapons/wzstats/${slug}.avif`,
    `/assets/weapons/${slug}.avif`,
    `/assets/weapons/${slug}.webp`,
  ];
  const weaponImageSrc = weaponImageCandidates.find((src) => (
    fs.existsSync(path.join(process.cwd(), 'public', ...src.split('/').filter(Boolean)))
  ));
  const jsonLd = getLoadoutJsonLd(loadout);
  const localizedSeason = locale === 'fr' ? CURRENT_WARZONE_SEASON : 'Season 04';
  const attachmentsList = loadout.attachments.map((attachment) => attachment.name).join(', ');
  const relatedLoadouts = loadouts
    .filter((entry) => entry.id !== loadout.id)
    .sort((a, b) => {
      const sameA = a.category === loadout.category ? 0 : 1;
      const sameB = b.category === loadout.category ? 0 : 1;
      if (sameA !== sameB) return sameA - sameB;
      return calculateMetaScore(b) - calculateMetaScore(a);
    })
    .slice(0, 6);
  const relatedCopy = locale === 'es' ? 'OTRAS CLASES META' : locale === 'fr' ? 'AUTRES CLASSES META' : 'OTHER META LOADOUTS';

  return (
    <main className="loadout-detail-page max-w-[980px] mx-auto px-8 py-20 pb-24 font-[var(--mono)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Link href={href('/#all-loadouts')} className="text-inherit opacity-50 no-underline text-[0.75rem] tracking-normal">
        {locale === 'es' ? 'VOLVER A CLASES' : locale === 'fr' ? 'RETOUR AUX CLASSES' : 'BACK TO LOADOUTS'}
      </Link>

      <section className="grid grid-cols-[minmax(0,1.1fr)_minmax(260px,0.9fr)] gap-8 items-center mt-8">
        <div>
          <p className="m-0 mb-3 text-[#163cff] text-[0.75rem] font-black tracking-normal">
            {translateTerm(loadout.category, locale).toUpperCase()} / TIER {loadout.tier}
          </p>
          <h1 className="m-0 text-[clamp(2.25rem,7vw,5rem)] leading-[0.9] tracking-normal">
            {locale === 'fr' ? 'MEILLEURE CLASSE ' : locale === 'es' ? 'MEJOR CLASE ' : 'BEST LOADOUT '}
            {loadout.weapon.toUpperCase()}
          </h1>
          <p className="m-0 mt-4 text-[#163cff] text-[0.78rem] font-black uppercase tracking-normal">
            {locale === 'fr' ? `Mis a jour pour la ${localizedSeason}` : locale === 'es' ? `Actualizado para ${localizedSeason}` : `Updated for ${localizedSeason}`}
          </p>
          <p className="mt-5 mb-0 max-w-[620px] text-[rgba(16,16,14,0.62)] leading-[1.75]">
            {localizeLoadoutNote(loadout.weapon, loadout.playstyle, loadout.notes, locale)}
          </p>
          <p className="mt-4 mb-0 max-w-[680px] text-[rgba(16,16,14,0.56)] leading-[1.7] text-[0.92rem]">
            {locale === 'fr'
              ? `Cette classe ${loadout.weapon} Warzone cible les recherches de meta loadout, accessoires ${loadout.weapon} et build ${loadout.playstyle.toLowerCase()} pour la ${localizedSeason}. Accessoires utilises: ${attachmentsList}.`
              : locale === 'es'
                ? `Esta clase ${loadout.weapon} Warzone cubre el meta loadout, accesorios ${loadout.weapon} y build ${loadout.playstyle.toLowerCase()} para ${localizedSeason}. Accesorios usados: ${attachmentsList}.`
                : `This ${loadout.weapon} Warzone class covers the meta loadout, ${loadout.weapon} attachments and ${loadout.playstyle.toLowerCase()} build for ${localizedSeason}. Attachments used: ${attachmentsList}.`}
          </p>
          <div className="flex gap-[0.45rem] flex-wrap mt-5">
            {(loadout.modes ?? []).map((mode) => (
              <span key={mode} className="border border-[rgba(16,16,14,0.14)] px-2 py-[0.28rem] text-[0.75rem] uppercase text-[#163cff] font-black">
                {translateTerm(mode, locale)}
              </span>
            ))}
            {(loadout.tags ?? []).slice(0, 4).map((tag) => (
              <span key={tag} className="border border-[rgba(16,16,14,0.14)] px-2 py-[0.28rem] text-[0.75rem] uppercase opacity-62">
                {translateTerm(tag, locale)}
              </span>
            ))}
          </div>
        </div>

        <aside className="border border-[var(--tm-line,rgba(16,16,14,0.14))] p-5 bg-[var(--theme-panel,rgba(239,238,232,0.72))]">
          <div className="flex justify-between items-center gap-4 mb-4">
            <span className="text-[0.75rem] opacity-50 tracking-normal">META SCORE</span>
            <strong className="text-[2.2rem] text-[#163cff]">{score}</strong>
          </div>
          {weaponImageSrc ? (
            <Image
              src={weaponImageSrc}
              alt=""
              width={420}
              height={210}
              priority
              className="w-full h-auto object-contain"
            />
          ) : (
            <div className="min-h-[210px] grid content-center gap-3 border border-[rgba(16,16,14,0.12)] bg-[linear-gradient(135deg,rgba(22,60,255,0.08),rgba(16,16,14,0.035))] p-5">
              <div className="h-[54px] relative border-t-[10px] border-b-[8px] border-[#10100e] opacity-92"
                style={{ clipPath: 'polygon(4% 38%, 49% 38%, 54% 18%, 68% 18%, 74% 38%, 94% 38%, 94% 62%, 76% 62%, 70% 82%, 56% 82%, 50% 62%, 4% 62%)' }}
              />
              <div>
                <strong className="block text-[#163cff] text-[1.4rem] leading-none tracking-normal uppercase">
                  {loadout.weapon}
                </strong>
                <span className="block mt-2 text-[rgba(16,16,14,0.52)] text-[0.75rem] font-black tracking-normal uppercase">
                  {locale === 'es' ? 'Visual de clase curada' : locale === 'fr' ? 'Visuel de classe selectionnee' : 'Curated build visual'}
                </span>
              </div>
            </div>
          )}
          <small className="block mt-4 opacity-45 tracking-normal">
            {uiCopy.updated} {formatMetaDate(loadout.updatedAt)}
          </small>
          <div className="mt-5 pt-4 border-t border-[rgba(16,16,14,0.12)]">
            <span className="block text-[#163cff] text-[0.72rem] font-black tracking-normal uppercase mb-2">{shareCopy.title}</span>
            <div className="flex flex-wrap gap-2">
              {shareLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-grid min-h-8 place-items-center border border-[var(--tm-line,rgba(16,16,14,0.18))] px-3 text-[0.68rem] font-black uppercase no-underline text-[var(--tm-ink,#10100e)] bg-[var(--theme-panel,rgba(239,238,232,0.78))]"
                >
                  {link.label}
                </a>
              ))}
              <a
                href={`mailto:?subject=${shareText}&body=${encodedShareUrl}`}
                className="inline-grid min-h-8 place-items-center border border-[var(--tm-line,rgba(16,16,14,0.18))] px-3 text-[0.68rem] font-black uppercase no-underline text-[var(--tm-ink,#10100e)] bg-[var(--theme-panel,rgba(239,238,232,0.78))]"
              >
                Email
              </a>
              <a
                href={shareUrl}
                className="inline-grid min-h-8 place-items-center border border-[var(--tm-line,rgba(16,16,14,0.18))] px-3 text-[0.68rem] font-black uppercase no-underline text-[var(--tm-ink,#10100e)] bg-[var(--theme-panel,rgba(239,238,232,0.78))]"
              >
                {shareCopy.open}
              </a>
            </div>
            <p className="m-0 mt-2 text-[0.68rem] opacity-55 break-all">{shareUrl}</p>
          </div>
          <WeaponWatchButton weaponId={loadout.weaponId || loadout.id} weapon={loadout.weapon} locale={locale} />
        </aside>
      </section>

      <section className="grid grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)] gap-6 mt-8">
        <div className="border-t border-[rgba(16,16,14,0.14)] pt-6">
          <h2 className="m-0 mb-4 text-[1rem] tracking-normal">{locale === 'es' ? 'ACCESORIOS' : locale === 'fr' ? 'ACCESSOIRES' : 'ATTACHMENTS'}</h2>
          <div className="grid gap-[0.65rem]">
            {loadout.attachments.map((attachment) => (
              <div key={`${attachment.slot}-${attachment.name}`} className="grid grid-cols-[130px_1fr] gap-4 border-b border-[rgba(16,16,14,0.08)] pb-[0.65rem]">
                <span className="opacity-50 text-[0.75rem] uppercase">{translateTerm(attachment.slot, locale)}</span>
                <div>
                  <strong>{attachment.name}</strong>
                  {attachment.reason && (
                    <p className="m-0 mt-1 text-[rgba(16,16,14,0.55)] text-[0.75rem] leading-[1.55]">
                      {localizeLoadoutText(attachment.reason, locale, loadout.playstyle)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-[rgba(16,16,14,0.14)] pt-6">
          <h2 className="m-0 mb-4 text-[1rem] tracking-normal">{locale === 'es' ? 'RENDIMIENTO' : locale === 'fr' ? 'PERFORMANCE' : 'PERFORMANCE'}</h2>
          <StatRadar
            tier={loadout.tier}
            axes={[
              { label: uiCopy.damage, value: loadout.stats.damage },
              { label: uiCopy.range, value: loadout.stats.range },
              { label: 'Meta', value: Math.min(score, 100) },
              { label: uiCopy.control, value: loadout.stats.control },
              { label: uiCopy.mobility, value: loadout.stats.mobility },
            ]}
          />
          <StatBar label={uiCopy.damage} value={loadout.stats.damage} />
          <StatBar label={uiCopy.range} value={loadout.stats.range} />
          <StatBar label={uiCopy.mobility} value={loadout.stats.mobility} />
          <StatBar label={uiCopy.control} value={loadout.stats.control} />
        </div>
      </section>

      <section className="grid grid-cols-3 gap-4 mt-8">
        <div className="border border-[rgba(16,16,14,0.14)] p-4">
          <h2 className="m-0 mb-4 text-[1rem] tracking-normal">{locale === 'es' ? 'AVANZADO' : locale === 'fr' ? 'AVANCE' : 'ADVANCED'}</h2>
          {[
            [uiCopy.ttkClose, loadout.advanced?.ttkClose ? `${loadout.advanced.ttkClose} ms` : 'N/A'],
            [uiCopy.ttkMid, loadout.advanced?.ttkMid ? `${loadout.advanced.ttkMid} ms` : 'N/A'],
            [uiCopy.ads, loadout.advanced?.ads ? `${loadout.advanced.ads} ms` : 'N/A'],
            [uiCopy.velocity, loadout.advanced?.bulletVelocity ? `${loadout.advanced.bulletVelocity} m/s` : 'N/A'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 border-b border-[rgba(16,16,14,0.08)] py-[0.45rem]">
              <span className="opacity-52">{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>

        <div className="border border-[rgba(16,16,14,0.14)] p-4">
          <h2 className="m-0 mb-4 text-[1rem] tracking-normal">{locale === 'es' ? 'FORTALEZAS' : locale === 'fr' ? 'FORCES' : 'STRENGTHS'}</h2>
          {(loadout.strengths ?? ['Reliable handling', 'Practical build']).map((item) => (
            <p key={item} className="m-0 mb-[0.65rem] text-[rgba(16,16,14,0.62)] leading-[1.55]">{localizeLoadoutText(item, locale, loadout.playstyle)}</p>
          ))}
        </div>

        <div className="border border-[rgba(16,16,14,0.14)] p-4">
          <h2 className="m-0 mb-4 text-[1rem] tracking-normal">{locale === 'es' ? 'LIMITES' : locale === 'fr' ? 'LIMITES' : 'LIMITS'}</h2>
          {(loadout.weaknesses ?? ['Re-check after major patches']).map((item) => (
            <p key={item} className="m-0 mb-[0.65rem] text-[rgba(16,16,14,0.62)] leading-[1.55]">{localizeLoadoutText(item, locale, loadout.playstyle)}</p>
          ))}
        </div>
      </section>

      <section className="mt-8 border-t border-[rgba(16,16,14,0.14)] pt-6">
        <h2 className="m-0 mb-4 text-[1rem] tracking-normal">{locale === 'es' ? 'LECTURA DEL PARCHE' : locale === 'fr' ? 'LECTURE DU PATCH' : 'PATCH READ'}</h2>
        <p className="max-w-[760px] m-0 text-[rgba(16,16,14,0.64)] leading-[1.75]">
          {localizeLoadoutText(loadout.patchSummary || 'No dedicated patch note yet. This build is ranked from practical stat balance, handling and role fit.', locale, loadout.playstyle)}
        </p>
        <p className="max-w-[760px] mt-3 mb-0 text-[rgba(16,16,14,0.46)] leading-[1.65] text-[0.75rem]">
          {localizeLoadoutText(loadout.sourceNote || 'WZPRO Meta is an independent fan site. Re-check major balance updates before ranked sessions.', locale, loadout.playstyle)}
        </p>
      </section>

      {relatedLoadouts.length > 0 && (
        <section className="mt-8 border-t border-[var(--tm-line,rgba(16,16,14,0.14))] pt-6">
          <h2 className="m-0 mb-4 text-[1rem] tracking-normal">{relatedCopy}</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
            {relatedLoadouts.map((entry) => (
              <Link
                key={entry.id}
                href={href(getLoadoutPath(entry))}
                className="block border border-[var(--tm-line,rgba(16,16,14,0.14))] p-4 no-underline text-[var(--tm-ink,#10100e)] bg-[var(--theme-panel,rgba(239,238,232,0.6))]"
              >
                <span className="block text-[var(--tm-blue,#163cff)] text-[0.7rem] font-black uppercase tracking-normal">
                  {translateTerm(entry.category, locale)} / TIER {entry.tier}
                </span>
                <strong className="block mt-1 text-[1.05rem] uppercase tracking-normal">{entry.weapon}</strong>
                <span className="block mt-2 text-[var(--tm-muted,rgba(16,16,14,0.55))] text-[0.7rem] font-black uppercase tracking-normal">
                  {locale === 'es' ? 'Meta' : locale === 'fr' ? 'Score meta' : 'Meta score'} {calculateMetaScore(entry)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
