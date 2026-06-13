'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { CSSProperties, ChangeEvent } from 'react';
import { useMemo, useState } from 'react';
import AuthButton from '@/components/AuthButton';
import LoadoutCard from '@/components/LoadoutCard';
import type { Loadout } from '@/lib/data';
import type { HomeUiCopy, Locale } from '@/lib/i18n';
import { DEFAULT_LOCALE, HOME_UI_COPY, localizeLoadoutNote, translateTerm, withLocalePath } from '@/lib/i18n';
import { calculateMetaScore, formatMetaDate, getLoadoutSlug } from '@/lib/loadoutUtils';
import { getLoadoutPath } from '@/lib/seo';
import type { SiteContent } from '@/lib/siteContent';
import type { SiteControls } from '@/lib/siteControls';
import type { UserSession } from '@/lib/userAuth';

export type SearchableProfile = {
  pseudo: string;
  publicName: string;
  profilePicture: string;
  avatarPositionX: number;
  avatarPositionY: number;
  mainPlatform: string;
  inputDevice: string;
  favoriteWeapons: string[];
  stats: {
    games: number;
    kd: number;
    kills: number;
    winRate: number;
  } | null;
  updatedAt: string;
};

type HomeCopy = SiteContent['home'];

function score(loadout: Loadout) {
  return calculateMetaScore(loadout);
}

const IMAGE_SOURCES = [
  (slug: string) => `/assets/weapons/wzstats/${slug}.avif`,
  (slug: string) => `/assets/weapons/${slug}.avif`,
  (slug: string) => `/assets/weapons/${slug}.webp`,
  (slug: string) => `/assets/weapons/${slug}.png`,
];

const CONFIDENCE_COPY = {
  en: ['Patch verified', 'High confidence', 'Watchlist', 'Re-check after patch'],
  fr: ['Patch verifie', 'Confiance elevee', 'A surveiller', 'Reverifier apres patch'],
  es: ['Parche verificado', 'Alta confianza', 'Seguimiento', 'Revisar tras parche'],
} as const;

function confidenceLabel(loadout: Loadout, locale: Locale) {
  const labels = locale === 'fr' || locale === 'es' ? CONFIDENCE_COPY[locale] : CONFIDENCE_COPY.en;
  const daysSinceUpdate = Math.max(0, Math.round((Date.now() - new Date(loadout.updatedAt).getTime()) / 86400000));
  if (daysSinceUpdate <= 3) return labels[0];
  if (loadout.tier === 'S') return labels[1];
  if (daysSinceUpdate <= 14) return labels[2];
  return labels[3];
}

function bestPairFor(loadout: Loadout, options: Loadout[]) {
  const preferred = loadout.pairWith?.map((weapon) => options.find((candidate) => candidate.weapon === weapon)).find(Boolean);
  if (preferred) return preferred;

  const wantsClose = !loadout.playstyle.toLowerCase().includes('close') && loadout.category !== 'SMG';
  return options.find((candidate) => candidate.id !== loadout.id && (wantsClose ? candidate.category === 'SMG' : candidate.category !== 'SMG')) ?? options.find((candidate) => candidate.id !== loadout.id);
}

function pickLoadout(loadouts: Loadout[], id: string) {
  return loadouts.find((loadout) => loadout.id === id || loadout.weaponId === id);
}

function orderedByIds(loadouts: Loadout[], ids: string[]) {
  const used = new Set<string>();
  const picked = ids
    .map((id) => pickLoadout(loadouts, id))
    .filter((loadout): loadout is Loadout => {
      if (!loadout || used.has(loadout.id)) return false;
      used.add(loadout.id);
      return true;
    });

  return [...picked, ...loadouts.filter((loadout) => !used.has(loadout.id))];
}

function RankingWeaponImage({ loadout }: { loadout: Loadout }) {
  const [imageIndex, setImageIndex] = useState(0);
  const [hidden, setHidden] = useState(false);
  const slug = getLoadoutSlug(loadout);
  const imageSrc = IMAGE_SOURCES[imageIndex](slug);

  if (hidden) {
    return <span className="ranking-weapon-art ranking-weapon-art--empty" aria-hidden="true" />;
  }

  return (
    <span className="ranking-weapon-art" data-weapon-slug={slug} aria-hidden="true">
      <Image
        src={imageSrc}
        alt=""
        width={260}
        height={104}
        onError={() => {
          setImageIndex((current) => {
            if (current < IMAGE_SOURCES.length - 1) return current + 1;
            setHidden(true);
            return current;
          });
        }}
      />
    </span>
  );
}

function PerkIcon({ type }: { type: 'scavenger' | 'sprinter' | 'hunter' }) {
  if (type === 'scavenger') {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M32 6 52 14v15c0 13-8 22-20 29C20 51 12 42 12 29V14l20-8Z" />
        <path d="M23 25h18v19H23z" />
        <path d="M20 25h24l-4-8H24l-4 8Z" />
        <path d="M28 30h8M28 36h8" />
      </svg>
    );
  }

  if (type === 'sprinter') {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M11 18h25l7 7h10" />
        <path d="M19 31h19l6 6h9" />
        <path d="M13 46h20l7-8" />
        <path d="M43 14 54 25 43 36" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M32 7 53 19v26L32 57 11 45V19L32 7Z" />
      <circle cx="32" cy="32" r="13" />
      <circle cx="32" cy="32" r="4" />
      <path d="M32 15v8M32 41v8M15 32h8M41 32h8" />
    </svg>
  );
}

function perkIconType(name: string): 'scavenger' | 'sprinter' | 'hunter' {
  const normalized = name.trim().toLowerCase();
  if (normalized.includes('sprint')) return 'sprinter';
  if (normalized.includes('scavenger') || normalized.includes('pill') || normalized.includes('field medic') || normalized.includes('quick fix')) return 'scavenger';
  return 'hunter';
}

export default function HomeClient({
  loadouts,
  profiles,
  copy,
  controls,
  uiCopy = HOME_UI_COPY.en,
  locale = DEFAULT_LOCALE,
  initialCompareA,
  initialCompareB,
  initialUser,
}: {
  loadouts: Loadout[];
  profiles: SearchableProfile[];
  copy: HomeCopy;
  controls: SiteControls;
  uiCopy?: HomeUiCopy;
  locale?: Locale;
  initialCompareA?: string;
  initialCompareB?: string;
  initialUser?: UserSession | null;
}) {
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = window.localStorage.getItem('wzpro-favorite-loadouts');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [compareA, setCompareA] = useState(pickLoadout(loadouts, initialCompareA ?? controls.home.compareWeaponIds[0])?.id ?? loadouts[0]?.id ?? '');
  const [compareB, setCompareB] = useState(pickLoadout(loadouts, initialCompareB ?? controls.home.compareWeaponIds[1])?.id ?? loadouts[1]?.id ?? '');
  const normalizedQuery = query.trim().toLowerCase();
  const rankingOrder = controls.home.rankingWeaponIds;

  function toggleFavorite(id: string) {
    setFavorites((current) => {
      const next = current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id];
      try {
        window.localStorage.setItem('wzpro-favorite-loadouts', JSON.stringify(next));
      } catch {
        // Local favorites are an enhancement only.
      }
      return next;
    });
  }

  function clearSavedLoadouts() {
    setFavorites([]);
    try {
      window.localStorage.removeItem('wzpro-favorite-loadouts');
    } catch {
      // Local favorites are an enhancement only.
    }
  }

  const filteredLoadouts = useMemo(() => {
    const filtered = loadouts.filter((loadout) => {
      if (!normalizedQuery) return true;

      const haystack = [
        loadout.weapon,
        loadout.category,
        loadout.tier,
        loadout.playstyle,
        loadout.notes,
        loadout.patchSummary,
        loadout.sourceNote,
        ...(loadout.modes ?? []),
        ...(loadout.tags ?? []),
        ...(loadout.strengths ?? []),
        ...(loadout.weaknesses ?? []),
        ...loadout.attachments.map((attachment) => `${attachment.slot} ${attachment.name}`),
      ].join(' ').toLowerCase();
      return haystack.includes(normalizedQuery);
    });

    return orderedByIds(
      [...filtered].sort((a, b) => score(b) - score(a)),
      rankingOrder
    );
  }, [loadouts, normalizedQuery, rankingOrder]);

  const topLoadouts = filteredLoadouts.slice(0, 8);
  const matchingProfiles = useMemo(() => {
    if (!normalizedQuery) return [];

    return profiles
      .filter((profile) => {
        const haystack = [
          profile.pseudo,
          profile.publicName,
          profile.mainPlatform,
          profile.inputDevice,
          ...profile.favoriteWeapons,
        ].join(' ').toLowerCase();

        return haystack.includes(normalizedQuery);
      })
      .slice(0, 4);
  }, [normalizedQuery, profiles]);

  const currentMeta = {
    main: pickLoadout(loadouts, controls.home.currentLongRangeId) ?? filteredLoadouts[0],
    close: pickLoadout(loadouts, controls.home.closeMetaId) ?? filteredLoadouts.find((loadout) => loadout.category === 'SMG'),
  };
  const bestMeta = pickLoadout(loadouts, controls.home.dailyDuoIds[0]) ?? filteredLoadouts[0] ?? loadouts[0];
  const dailyPartner = pickLoadout(loadouts, controls.home.dailyDuoIds[1]) ?? (bestMeta ? bestPairFor(bestMeta, loadouts) : undefined);
  const favoriteLoadouts = favorites
    .map((id) => pickLoadout(loadouts, id))
    .filter((loadout): loadout is Loadout => Boolean(loadout));

  const visibleLoadoutsByAdminOrder = orderedByIds(filteredLoadouts, rankingOrder);
  const loadoutPairs = controls.home.loadoutPairIds
    .map((pair) => ({
      loadouts: pair.weaponIds
        .map((id) => pickLoadout(loadouts, id))
        .filter((loadout): loadout is Loadout => Boolean(loadout)),
      perks: pair.perks.length ? pair.perks : ['Scavenger', 'Sprinter', 'Hunter'],
    }))
    .filter((pair) => pair.loadouts.length === 2);

  const lastUpdated = loadouts
    .map((l) => l.updatedAt)
    .filter(Boolean)
    .sort()
    .at(-1);

  const compared = [
    { slot: 'a', loadout: pickLoadout(loadouts, compareA) },
    { slot: 'b', loadout: pickLoadout(loadouts, compareB) },
  ].filter((entry): entry is { slot: string; loadout: Loadout } => Boolean(entry.loadout));
  const compareMax = Math.max(...compared.flatMap(({ loadout }) => [
    loadout.stats.damage,
    loadout.stats.range,
    loadout.stats.mobility,
    loadout.stats.control,
  ]), 100);

  const buildCount = loadouts.length;
  const href = (pathname: string) => withLocalePath(pathname, locale);
  const clearSavedLabel = locale === 'fr' ? 'Nettoyer' : locale === 'es' ? 'Limpiar' : 'Clear';

  function syncCompareUrl(event: ChangeEvent<HTMLFormElement>) {
    if (!(event.target instanceof HTMLSelectElement)) return;

    const form = event.currentTarget;
    const params = new URLSearchParams(new FormData(form) as unknown as Record<string, string>);
    const url = new URL(form.getAttribute('action') || window.location.href, window.location.href);
    url.search = params.toString();
    url.hash = 'compare';
    window.location.assign(url.toString());
  }

  return (
    <main className="glass-demo">
      <section className="liquid-viewport" id="meta">
        <div className="war-overlay" aria-hidden="true">
          <div className="map-contours">
            <i />
            <i />
            <i />
          </div>
          <div className="target-reticle">
            <span />
          </div>
        </div>

        <aside className="side-dock glass-lens" aria-label={uiCopy.ariaQuickActions}>
          <a href="#ranking">M</a>
          <a href="#all-loadouts">L</a>
        </aside>

        <h1 className="hero-title hero-title-logo" aria-label="Warzone Pro Meta">
          <img className="hero-logo" src="/brand/wazonepro.png" alt="Wazonepro Meta" />
        </h1>
        <div className="hero-brief">
          <span>{copy.eyebrow}</span>
          <p>{copy.description}</p>
          <span>[ {String(buildCount).padStart(2, '0')} BUILDS ]</span>
        </div>
        <div className="hero-actions">
          <a href="#all-loadouts">{copy.primaryCta}</a>
          <Link href={href('/pro-tools')}>{copy.secondaryCta}</Link>
        </div>
      </section>

      <div className="safari-bar">
        <Link className="brand-pill" href={href('/')}>
          <b>WZ</b>
          <span>Meta</span>
        </Link>
        <nav>
          <Link href={href('/pro-tools')}>{uiCopy.proTools}</Link>
          <a href="#all-loadouts" aria-current="page">{uiCopy.loadouts}</a>
          <Link href={href('/ai-classes')}>IA WZPRO</Link>
          <Link href={href('/pro-classe')}>{locale === 'fr' ? 'Classes Pro' : locale === 'es' ? 'Clases Pro' : 'Pro Classes'}</Link>
          <Link href={href('/set-up')}>{uiCopy.setUp}</Link>
          <Link href={href('/esport')}>{uiCopy.esport}</Link>
          <Link href={href('/tournois')}>{locale === 'fr' ? 'Tournois' : locale === 'es' ? 'Torneos' : 'Tournaments'}</Link>
          <Link href={href('/actualites')}>{locale === 'fr' ? 'Actualites' : locale === 'es' ? 'Noticias' : 'News'}</Link>
          <Link href={href('/createur')}>{locale === 'fr' ? 'Createur' : locale === 'es' ? 'Creador' : 'Creator'}</Link>
          <Link href={href('/community')}>{uiCopy.community}</Link>
        </nav>
        <div className="global-search-panel">
          <label>
            <span>{uiCopy.search}</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={uiCopy.searchPlaceholder}
            />
          </label>
          {normalizedQuery && (
            <div className="player-search-results" aria-label="Player results">
              <div className="player-search-title">
                <span>{uiCopy.players}</span>
                <b>{matchingProfiles.length}</b>
              </div>
              {matchingProfiles.map((profile) => (
                <Link
                  key={profile.pseudo}
                  className="player-search-card"
                  href={href(`/profile/${encodeURIComponent(profile.pseudo)}`)}
                >
                  <span className="player-search-avatar">
                    {profile.profilePicture ? (
                      <i
                        aria-hidden="true"
                        style={{
                          backgroundImage: `url(${profile.profilePicture})`,
                          backgroundPosition: `${profile.avatarPositionX}% ${profile.avatarPositionY}%`,
                        }}
                      />
                    ) : (
                      <b>{profile.pseudo.slice(0, 2).toUpperCase()}</b>
                    )}
                  </span>
                  <span className="player-search-body">
                    <strong>{profile.pseudo}</strong>
                    <small>
                      {profile.stats ? `K/D ${profile.stats.kd.toFixed(2)} - ${profile.stats.games} games` : uiCopy.privateStats}
                    </small>
                    <em>{profile.favoriteWeapons.length ? profile.favoriteWeapons.join(' / ') : uiCopy.noFavoriteWeapon}</em>
                  </span>
                  <span className="player-search-meta">
                    {profile.mainPlatform ? profile.mainPlatform.replace('-', ' ') : 'player'}
                  </span>
                </Link>
              ))}
              {matchingProfiles.length === 0 && (
                <p>{uiCopy.noPublicPlayer}</p>
              )}
            </div>
          )}
        </div>
        <AuthButton initialUser={initialUser} />
        <div className="nav-readout" aria-hidden="true">
          <span>{filteredLoadouts.length + matchingProfiles.length} {uiCopy.matches}</span>
          <span>{lastUpdated ? `${uiCopy.updated} ${formatMetaDate(lastUpdated)}` : uiCopy.updatePending}</span>
          <span>{profiles.length} {uiCopy.publicPlayers}</span>
        </div>
      </div>

      <section className="tiers content-layer home-loadout-priority" id="all-loadouts">
        <section className="tier-section">
          <div className="tier-title">
            <h2>{uiCopy.loadouts}</h2>
            <span>{loadoutPairs.length} {uiCopy.recommendedDuos}</span>
          </div>
          <div className="home-proof-strip" aria-label="Trust signals">
            <span>{lastUpdated ? `${uiCopy.trustPatchChecked} ${formatMetaDate(lastUpdated)}` : uiCopy.trustPatchActive}</span>
            <span>{uiCopy.trustScore}</span>
            <span>{uiCopy.trustShareable}</span>
          </div>
          <div className="meta-now">
            <div>
              <span>{uiCopy.currentLongRange}</span>
              <strong>{currentMeta.main?.weapon ?? 'MK.78'}</strong>
              <p>
                {currentMeta.main
                  ? `${translateTerm(currentMeta.main.category, locale)} / ${translateTerm(currentMeta.main.playstyle, locale)} - ${score(currentMeta.main)} meta`
                  : 'Current long-range pick to verify in the loadouts.'}
              </p>
            </div>
            <div>
              <span>{uiCopy.closeMeta}</span>
              <strong>{currentMeta.close?.weapon ?? 'Kogot-7'}</strong>
              <p>
                {currentMeta.close
                  ? `${translateTerm(currentMeta.close.category, locale)} / ${translateTerm(currentMeta.close.playstyle, locale)} - ${score(currentMeta.close)} meta`
                  : 'Current SMG for fast fights and coordinated pushes.'}
              </p>
            </div>
            <div>
              <span>{uiCopy.dailyDuo}</span>
              <strong>{bestMeta && dailyPartner ? `${bestMeta.weapon} + ${dailyPartner.weapon}` : uiCopy.buildYourDuo}</strong>
              <p>{uiCopy.dailyDuoText}</p>
            </div>
          </div>
          {favoriteLoadouts.length > 0 && (
            <div className="favorite-loadouts" aria-label="Saved loadouts">
              <div className="favorite-loadouts-head">
                <span>{uiCopy.savedBuilds}</span>
                <button type="button" onClick={clearSavedLoadouts}>{clearSavedLabel}</button>
              </div>
              <div>
                {favoriteLoadouts.slice(0, 6).map((loadout) => (
                  <Link key={loadout.id} href={href(getLoadoutPath(loadout))}>{loadout.weapon}</Link>
                ))}
              </div>
            </div>
          )}
          {lastUpdated && (
            <p className="loadout-freshness">
              {uiCopy.liveBoard} {formatMetaDate(lastUpdated)}
            </p>
          )}
          <p className="loadout-intro">{uiCopy.intro}</p>
          <div className="home-loadout-actions">
            <a href="#ranking">{uiCopy.viewFullRanking}</a>
            <a href="#compare">{uiCopy.compareTwoWeapons}</a>
          </div>
          <div className="loadout-grid full-loadout-grid" style={{ marginBottom: '34px' }}>
            {(loadoutPairs.length ? loadoutPairs : visibleLoadoutsByAdminOrder.slice(0, 6).reduce<Array<{ loadouts: Loadout[]; perks: string[] }>>((pairs, loadout, index) => {
              if (index % 2 === 0) pairs.push({ loadouts: [loadout], perks: ['Scavenger', 'Sprinter', 'Hunter'] });
              else pairs[pairs.length - 1].loadouts.push(loadout);
              return pairs;
            }, [])).map((pair) => (
              <div key={pair.loadouts.map((loadout) => loadout.id).join('-')} className="loadout-pair embedded-loadout-pair">
                <div className="pair-header">
                  <span>{uiCopy.duo}</span>
                  <strong>{pair.loadouts.map((loadout) => loadout.weapon).join(' - ')}</strong>
                </div>
                <div className="pair-cards">
                  {pair.loadouts.map((loadout) => (
                    <LoadoutCard
                      key={loadout.id}
                      loadout={loadout}
                      metaScore={score(loadout)}
                      confidence={confidenceLabel(loadout, locale)}
                      isFavorite={favorites.includes(loadout.id)}
                      onToggleFavorite={() => toggleFavorite(loadout.id)}
                      locale={locale}
                    />
                  ))}
                </div>
                <div className="perk-panel" aria-label={uiCopy.recommendedPerks}>
                  {pair.perks.slice(0, 3).map((perk) => {
                    const type = perkIconType(perk);
                    return (
                    <div key={perk} className={`perk-item perk-${type}`}>
                      <span className="perk-mark">
                        <PerkIcon type={type} />
                      </span>
                      <strong>{translateTerm(perk, locale)}</strong>
                    </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>

      <section className="content-layer" id="ranking">
        <div className="section-heading">
          <span>{uiCopy.rankingFromFilters}</span>
          <h2>{uiCopy.topWeapons}</h2>
        </div>
        <p className="ranking-score-note">{uiCopy.scoreNote}</p>
        <div className="ranking-list">
          {topLoadouts.map((loadout, index) => (
            <div key={loadout.id} className="content-row" style={{ textDecoration: 'none' }}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{loadout.weapon}</strong>
              <RankingWeaponImage loadout={loadout} />
              <small>{translateTerm(loadout.category, locale)}</small>
              <b>{score(loadout)}</b>
            </div>
          ))}
          {topLoadouts.length === 0 && (
            <div className="content-row" style={{ textDecoration: 'none' }}>
              <span>--</span>
              <strong>{uiCopy.noWeaponFound}</strong>
              <span className="ranking-weapon-art ranking-weapon-art--empty" aria-hidden="true" />
              <small>{uiCopy.tryAnotherSearch}</small>
              <b>0</b>
            </div>
          )}
        </div>
      </section>

      <section className="content-layer meta-lab" id="compare">
        <div className="section-heading">
          <span>{uiCopy.dataLab}</span>
          <h2>{uiCopy.compare}</h2>
        </div>
        <form className="meta-compare-controls" action={href('/')} method="get" onChange={syncCompareUrl}>
          <select
            name="compareA"
            value={compareA}
            onChange={(event) => setCompareA(event.currentTarget.value)}
            onInput={(event) => setCompareA(event.currentTarget.value)}
          >
            {loadouts.map((loadout) => <option key={loadout.id} value={loadout.id}>{loadout.weapon}</option>)}
          </select>
          <select
            name="compareB"
            value={compareB}
            onChange={(event) => setCompareB(event.currentTarget.value)}
            onInput={(event) => setCompareB(event.currentTarget.value)}
          >
            {loadouts.map((loadout) => <option key={loadout.id} value={loadout.id}>{loadout.weapon}</option>)}
          </select>
          <button type="submit">{uiCopy.compare}</button>
        </form>
        <div className="meta-compare-grid">
          {compared.map(({ slot, loadout }) => (
            <article key={`${slot}-${loadout.id}`}>
              <span>{translateTerm(loadout.category, locale)} / {translateTerm(loadout.playstyle, locale)}</span>
              <h3>{loadout.weapon}</h3>
              <strong>{score(loadout)} META</strong>
              <dl>
                <div><dt>{uiCopy.ttkClose}</dt><dd>{loadout.advanced?.ttkClose ? `${loadout.advanced.ttkClose} ms` : 'N/A'}</dd></div>
                <div><dt>{uiCopy.ttkMid}</dt><dd>{loadout.advanced?.ttkMid ? `${loadout.advanced.ttkMid} ms` : 'N/A'}</dd></div>
                <div><dt>{uiCopy.ads}</dt><dd>{loadout.advanced?.ads ? `${loadout.advanced.ads} ms` : 'N/A'}</dd></div>
                <div><dt>{uiCopy.velocity}</dt><dd>{loadout.advanced?.bulletVelocity ? `${loadout.advanced.bulletVelocity} m/s` : 'N/A'}</dd></div>
              </dl>
              <div className="compare-bars" aria-label={`${loadout.weapon} stat comparison`}>
                {[
                  [uiCopy.damage, loadout.stats.damage],
                  [uiCopy.range, loadout.stats.range],
                  [uiCopy.mobility, loadout.stats.mobility],
                  [uiCopy.control, loadout.stats.control],
                ].map(([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <i style={{ '--value': `${Math.round((Number(value) / compareMax) * 100)}%` } as CSSProperties} />
                    <b>{value}</b>
                  </div>
                ))}
              </div>
              <p>{localizeLoadoutNote(loadout.weapon, loadout.playstyle, loadout.notes, locale)}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
