'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import AuthButton from '@/components/AuthButton';
import LoadoutCard from '@/components/LoadoutCard';
import type { Loadout } from '@/lib/data';
import { calculateMetaScore, formatMetaDate, getLoadoutSlug } from '@/lib/loadoutUtils';

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

function score(loadout: Loadout) {
  return calculateMetaScore(loadout);
}

const CURRENT_META_ORDER = ['MK.78', 'Kogot-7'];
const ALL_FILTER = 'All';
const ROLE_FILTERS = [ALL_FILTER, 'Long-Range', 'Close-Range', 'Sniper Support', 'One-shot Sniper', 'Mid-Range'];
const MODE_FILTERS = [ALL_FILTER, 'Resurgence', 'Ranked', 'Battle Royale', 'Solo'];
const IMAGE_SOURCES = [
  (slug: string) => `/assets/weapons/wzstats/${slug}.avif`,
  (slug: string) => `/assets/weapons/${slug}.avif`,
  (slug: string) => `/assets/weapons/${slug}.webp`,
  (slug: string) => `/assets/weapons/${slug}.png`,
];

function rankScore(loadout: Loadout) {
  const metaIndex = CURRENT_META_ORDER.indexOf(loadout.weapon);
  return score(loadout) + (metaIndex === -1 ? 0 : 300 - metaIndex);
}

function confidenceLabel(loadout: Loadout) {
  const daysSinceUpdate = Math.max(0, Math.round((Date.now() - new Date(loadout.updatedAt).getTime()) / 86400000));
  if (daysSinceUpdate <= 3) return 'Patch verified';
  if (loadout.tier === 'S') return 'High confidence';
  if (daysSinceUpdate <= 14) return 'Watchlist';
  return 'Re-check after patch';
}

function bestPairFor(loadout: Loadout, options: Loadout[]) {
  const preferred = loadout.pairWith?.map((weapon) => options.find((candidate) => candidate.weapon === weapon)).find(Boolean);
  if (preferred) return preferred;

  const wantsClose = !loadout.playstyle.toLowerCase().includes('close') && loadout.category !== 'SMG';
  return options.find((candidate) => candidate.id !== loadout.id && (wantsClose ? candidate.category === 'SMG' : candidate.category !== 'SMG')) ?? options.find((candidate) => candidate.id !== loadout.id);
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
        unoptimized
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

export default function HomeClient({ loadouts, profiles }: { loadouts: Loadout[]; profiles: SearchableProfile[] }) {
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState(ALL_FILTER);
  const [modeFilter, setModeFilter] = useState(ALL_FILTER);
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = window.localStorage.getItem('wzpro-favorite-loadouts');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [compareA, setCompareA] = useState(loadouts[0]?.id ?? '');
  const [compareB, setCompareB] = useState(loadouts[1]?.id ?? '');
  const normalizedQuery = query.trim().toLowerCase();

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

  const filteredLoadouts = useMemo(() => {
    const filtered = loadouts.filter((loadout) => {
      if (roleFilter !== ALL_FILTER && loadout.playstyle !== roleFilter && loadout.category !== roleFilter) return false;
      if (modeFilter !== ALL_FILTER && !(loadout.modes ?? []).includes(modeFilter)) return false;
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

    return [...filtered].sort((a, b) => rankScore(b) - rankScore(a));
  }, [loadouts, modeFilter, normalizedQuery, roleFilter]);

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
    main: filteredLoadouts.find((loadout) => loadout.weapon === 'MK.78'),
    close: filteredLoadouts.find((loadout) => loadout.weapon === 'Kogot-7'),
  };
  const bestMeta = filteredLoadouts[0] ?? loadouts[0];
  const dailyPartner = bestMeta ? bestPairFor(bestMeta, loadouts) : undefined;
  const favoriteLoadouts = favorites
    .map((id) => loadouts.find((loadout) => loadout.id === id))
    .filter((loadout): loadout is Loadout => Boolean(loadout));

  const loadoutPairNames = [
    ['MK.78', 'Kogot-7'],
    ['DS20 Mirage', 'VST'],
    ['M15 MOD 0', 'Carbon 57'],
  ];
  const loadoutPairs = loadoutPairNames
    .map((pair) => pair
      .map((weapon) => filteredLoadouts.find((loadout) => loadout.weapon === weapon))
      .filter((loadout): loadout is Loadout => Boolean(loadout)))
    .filter((pair) => pair.length > 0);

  const lastUpdated = loadouts
    .map((l) => l.updatedAt)
    .filter(Boolean)
    .sort()
    .at(-1);

  const compared = [
    loadouts.find((loadout) => loadout.id === compareA),
    loadouts.find((loadout) => loadout.id === compareB),
  ].filter((loadout): loadout is Loadout => Boolean(loadout));
  const compareMax = Math.max(...compared.flatMap((loadout) => [
    loadout.stats.damage,
    loadout.stats.range,
    loadout.stats.mobility,
    loadout.stats.control,
  ]), 100);

  const buildCount = loadouts.length;

  const perks = [
    { name: 'Scavenger', type: 'scavenger' as const },
    { name: 'Sprinter', type: 'sprinter' as const },
    { name: 'Hunter', type: 'hunter' as const },
  ];

  return (
    <main className="glass-demo">
      <section className="liquid-viewport" id="meta">
        <div className="war-overlay" aria-hidden="true">
          <div className="geo-frame">
            <span>AO-17 / VERDANSK NORTH</span>
            <span>LAT 45.4241 N</span>
            <span>LON 31.6128 E</span>
            <span>GRID 08T KT 421 773</span>
          </div>
          <div className="map-contours">
            <i />
            <i />
            <i />
          </div>
          <div className="target-reticle">
            <span />
          </div>
          <div className="telemetry-stack">
            <span>SIGNAL 92%</span>
            <span>WIND 14 KTS NE</span>
            <span>ELEV 142 M</span>
            <span>THERMAL PASSIVE</span>
          </div>
          <div className="scanline">META DATABASE / LOADOUTS / LIVE SORT</div>
        </div>

        <aside className="side-dock glass-lens" aria-label="Quick actions">
          <a href="#ranking">M</a>
          <a href="#all-loadouts">L</a>
        </aside>

        <div className="hero-meta">
          <span>WZ_META / GD_FOUNDRY</span>
          <span>TYPEFACE / TACTICAL MONO</span>
          <span>AO-17 VERDANSK NORTH</span>
        </div>
        <h1 className="hero-title">
          <span>WARZONE</span>
          <b
            className="hero-r-badge"
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '-24px',
              right: '8.5vw',
              zIndex: 20,
              boxSizing: 'border-box',
              display: 'grid',
              width: '82px',
              height: '82px',
              placeItems: 'center',
              border: '6px solid #080807',
              borderRadius: '999px',
              color: '#080807',
              background: 'transparent',
              fontFamily: 'Arial, Helvetica, sans-serif',
              fontSize: '48px',
              fontStyle: 'normal',
              fontWeight: 400,
              lineHeight: 1,
              letterSpacing: 0,
              textTransform: 'none',
            }}
          >
            R
          </b>
          <strong>
            META <br className="hero-mobile-break" />
            SYSTEM
          </strong>
        </h1>
        <div className="hero-brief">
          <span>[ META LIVE ]</span>
          <p>Find the best Warzone loadout, compare meta weapons and tune your setup before the lobby even loads.</p>
          <span>[ {String(buildCount).padStart(2, '0')} BUILDS ]</span>
        </div>
        <div className="hero-actions">
          <a href="#all-loadouts">View loadouts</a>
          <Link href="/pro-tools">Open Pro Tools</Link>
        </div>
      </section>

      <div className="safari-bar">
        <Link className="brand-pill" href="/">
          <b>WZ</b>
          <span>Meta</span>
        </Link>
        <nav>
          <Link href="/pro-tools">Pro Tools</Link>
          <a href="#all-loadouts" aria-current="page">Loadouts</a>
          <Link href="/set-up">Set-up</Link>
          <Link href="/esport">Esport</Link>
          <Link href="/community">Community</Link>
        </nav>
        <div className="global-search-panel">
          <label>
            <span>Search</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Weapon, player, attachment"
            />
          </label>
          {normalizedQuery && (
            <div className="player-search-results" aria-label="Player results">
              <div className="player-search-title">
                <span>Players</span>
                <b>{matchingProfiles.length}</b>
              </div>
              {matchingProfiles.map((profile) => (
                <Link
                  key={profile.pseudo}
                  className="player-search-card"
                  href={`/profile/${encodeURIComponent(profile.pseudo)}`}
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
                      {profile.stats ? `K/D ${profile.stats.kd.toFixed(2)} - ${profile.stats.games} games` : 'Private or empty stats'}
                    </small>
                    <em>{profile.favoriteWeapons.length ? profile.favoriteWeapons.join(' / ') : 'No favorite weapon yet'}</em>
                  </span>
                  <span className="player-search-meta">
                    {profile.mainPlatform ? profile.mainPlatform.replace('-', ' ') : 'player'}
                  </span>
                </Link>
              ))}
              {matchingProfiles.length === 0 && (
                <p>No public player found for this search.</p>
              )}
            </div>
          )}
        </div>
        <AuthButton />
        <div className="nav-readout" aria-hidden="true">
          <span>{filteredLoadouts.length + matchingProfiles.length} MATCHES</span>
          <span>{lastUpdated ? `UPDATED ${formatMetaDate(lastUpdated)}` : 'UPDATE PENDING'}</span>
          <span>{profiles.length} PUBLIC PLAYERS</span>
        </div>
      </div>

      <section className="tiers content-layer home-loadout-priority" id="all-loadouts">
        <section className="tier-section">
          <div className="tier-title">
            <h2>Loadouts</h2>
            <span>{loadoutPairs.length} recommended duos</span>
          </div>
          <div className="home-proof-strip" aria-label="Trust signals">
            <span>{lastUpdated ? `Patch checked ${formatMetaDate(lastUpdated)}` : 'Patch check active'}</span>
            <span>Meta + handling + control score</span>
            <span>Shareable builds</span>
          </div>
          <div className="meta-now">
            <div>
              <span>Current long range</span>
              <strong>{currentMeta.main?.weapon ?? 'MK.78'}</strong>
              <p>
                {currentMeta.main
                  ? `${currentMeta.main.category} / ${currentMeta.main.playstyle} - ${score(currentMeta.main)} meta`
                  : 'Current long-range pick to verify in the loadouts.'}
              </p>
            </div>
            <div>
              <span>Close meta</span>
              <strong>{currentMeta.close?.weapon ?? 'Kogot-7'}</strong>
              <p>
                {currentMeta.close
                  ? `${currentMeta.close.category} / ${currentMeta.close.playstyle} - ${score(currentMeta.close)} meta`
                  : 'Current SMG for fast fights and coordinated pushes.'}
              </p>
            </div>
            <div>
              <span>Daily duo</span>
              <strong>{bestMeta && dailyPartner ? `${bestMeta.weapon} + ${dailyPartner.weapon}` : 'Build your duo'}</strong>
              <p>Use filters and the comparison lab to lock a reliable pair before your session.</p>
            </div>
          </div>
          <div className="loadout-filter-panel" aria-label="Loadout filters">
            <div>
              <span>Role</span>
              <div>
                {ROLE_FILTERS.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    className={roleFilter === filter ? 'is-active' : undefined}
                    onClick={() => setRoleFilter(filter)}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span>Mode</span>
              <div>
                {MODE_FILTERS.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    className={modeFilter === filter ? 'is-active' : undefined}
                    onClick={() => setModeFilter(filter)}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {favoriteLoadouts.length > 0 && (
            <div className="favorite-loadouts" aria-label="Saved loadouts">
              <span>Saved builds</span>
              <div>
                {favoriteLoadouts.slice(0, 6).map((loadout) => (
                  <Link key={loadout.id} href={`/loadouts/${loadout.id}`}>{loadout.weapon}</Link>
                ))}
              </div>
            </div>
          )}
          {lastUpdated && (
            <p className="loadout-freshness">
              Live board - last updated {formatMetaDate(lastUpdated)}
            </p>
          )}
          <p className="loadout-intro">
            Rankings combine weapon stats, practical range, handling, recoil control and Resurgence pace.
            Re-check after major balance patches: a meta can move faster than raw stat sheets.
          </p>
          <div className="home-loadout-actions">
            <a href="#ranking">View full ranking</a>
            <a href="#compare">Compare two weapons</a>
          </div>
          <div className="loadout-grid full-loadout-grid" style={{ marginBottom: '34px' }}>
            {loadoutPairs.map((pair) => (
              <div key={pair.map((loadout) => loadout.id).join('-')} className="loadout-pair embedded-loadout-pair">
                <div className="pair-header">
                  <span>Duo</span>
                  <strong>{pair.map((loadout) => loadout.weapon).join(' - ')}</strong>
                </div>
                <div className="pair-cards">
                  {pair.map((loadout) => (
                    <LoadoutCard
                      key={loadout.id}
                      loadout={loadout}
                      metaScore={score(loadout)}
                      confidence={confidenceLabel(loadout)}
                      isFavorite={favorites.includes(loadout.id)}
                      onToggleFavorite={() => toggleFavorite(loadout.id)}
                    />
                  ))}
                </div>
                <div className="perk-panel" aria-label="Recommended perks">
                  {perks.map((perk) => (
                    <div key={perk.name} className={`perk-item perk-${perk.type}`}>
                      <span className="perk-mark">
                        <PerkIcon type={perk.type} />
                      </span>
                      <strong>{perk.name}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>

      <section className="content-layer" id="ranking">
        <div className="section-heading">
          <span>Ranking from current filters</span>
          <h2>Top weapons</h2>
        </div>
        <div className="ranking-list">
          {topLoadouts.map((loadout, index) => (
            <div key={loadout.id} className="content-row" style={{ textDecoration: 'none' }}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{loadout.weapon}</strong>
              <RankingWeaponImage loadout={loadout} />
              <small>{loadout.category}</small>
              <b>{score(loadout)}</b>
            </div>
          ))}
          {topLoadouts.length === 0 && (
            <div className="content-row" style={{ textDecoration: 'none' }}>
              <span>--</span>
              <strong>No weapon found</strong>
              <span className="ranking-weapon-art ranking-weapon-art--empty" aria-hidden="true" />
              <small>Try another search</small>
              <b>0</b>
            </div>
          )}
        </div>
      </section>

      <section className="content-layer meta-lab" id="compare">
        <div className="section-heading">
          <span>Data lab</span>
          <h2>Compare</h2>
        </div>
        <div className="meta-compare-controls">
          <select value={compareA} onChange={(event) => setCompareA(event.target.value)}>
            {loadouts.map((loadout) => <option key={loadout.id} value={loadout.id}>{loadout.weapon}</option>)}
          </select>
          <select value={compareB} onChange={(event) => setCompareB(event.target.value)}>
            {loadouts.map((loadout) => <option key={loadout.id} value={loadout.id}>{loadout.weapon}</option>)}
          </select>
        </div>
        <div className="meta-compare-grid">
          {compared.map((loadout) => (
            <article key={loadout.id}>
              <span>{loadout.category} / {loadout.playstyle}</span>
              <h3>{loadout.weapon}</h3>
              <strong>{score(loadout)} META</strong>
              <dl>
                <div><dt>TTK close</dt><dd>{loadout.advanced?.ttkClose ? `${loadout.advanced.ttkClose} ms` : 'N/A'}</dd></div>
                <div><dt>TTK mid</dt><dd>{loadout.advanced?.ttkMid ? `${loadout.advanced.ttkMid} ms` : 'N/A'}</dd></div>
                <div><dt>ADS</dt><dd>{loadout.advanced?.ads ? `${loadout.advanced.ads} ms` : 'N/A'}</dd></div>
                <div><dt>Velocity</dt><dd>{loadout.advanced?.bulletVelocity ? `${loadout.advanced.bulletVelocity} m/s` : 'N/A'}</dd></div>
              </dl>
              <div className="compare-bars" aria-label={`${loadout.weapon} stat comparison`}>
                {[
                  ['Damage', loadout.stats.damage],
                  ['Range', loadout.stats.range],
                  ['Mobility', loadout.stats.mobility],
                  ['Control', loadout.stats.control],
                ].map(([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <i style={{ '--value': `${Math.round((Number(value) / compareMax) * 100)}%` } as CSSProperties} />
                    <b>{value}</b>
                  </div>
                ))}
              </div>
              <p>{loadout.notes || `${loadout.weapon} is a practical ${loadout.playstyle.toLowerCase()} build focused on role fit and repeatable fights.`}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
