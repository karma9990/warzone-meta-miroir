import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProfileShareActions from '@/components/ProfileShareActions';
import { getLoadouts, type Loadout } from '@/lib/data';
import { getEntitlements } from '@/lib/entitlementStore';
import { getProfileByPseudo, type UserProfile } from '@/lib/profileStore';
import { calculateMetaScore, formatMetaDate, getLoadoutSlug } from '@/lib/loadoutUtils';
import { getStatsSummary } from '@/lib/statsSummary';
import { getUserSession } from '@/lib/userAuth';

export const dynamic = 'force-dynamic';

type ProfilePageProps = {
  params: Promise<{ pseudo: string }>;
};

function getPublicOrigin() {
  const value = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || 'https://wzprometa.com';
  return new URL(value.startsWith('http') ? value : `https://${value}`).origin;
}

function platformLabel(value: string) {
  const labels: Record<string, string> = {
    pc: 'PC',
    playstation: 'PlayStation',
    xbox: 'Xbox',
    'battle-net': 'Battle.net',
    steam: 'Steam',
  };

  return labels[value] || value.replace('-', ' ');
}

function inputLabel(value: string) {
  if (value === 'keyboard-mouse') return 'Keyboard + mouse';
  if (value === 'controller') return 'Controller';
  return 'Not set';
}

function initials(profile: UserProfile) {
  return (profile.publicName || profile.pseudo).slice(0, 2).toUpperCase();
}

function safeHost(url: string) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function favoriteRole(loadouts: Loadout[]) {
  if (!loadouts.length) return 'No role selected';
  const counts = new Map<string, number>();
  loadouts.forEach((loadout) => {
    counts.set(loadout.playstyle, (counts.get(loadout.playstyle) || 0) + 1);
  });

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || loadouts[0].playstyle;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { pseudo } = await params;
  const profile = await getProfileByPseudo(decodeURIComponent(pseudo));
  if (!profile || !profile.pseudo || !profile.privacy.publicProfile) {
    return { title: 'Player profile - WZPRO Meta' };
  }

  const name = profile.publicName || profile.pseudo;
  const summary = getStatsSummary(profile.statsEntries);
  const statLine = summary.games > 0
    ? `${summary.games} tracked games, ${summary.kd.toFixed(2)} K/D and ${summary.winRate.toFixed(0)}% win rate.`
    : 'Warzone player profile with loadouts, socials and LFG details.';

  return {
    title: `${name} Warzone Profile | WZPRO Meta`,
    description: `${name}'s WZPRO Meta profile. ${statLine}`,
    openGraph: {
      title: `${name} Warzone Profile`,
      description: statLine,
    },
  };
}

export default async function PublicProfilePage({ params }: ProfilePageProps) {
  const { pseudo } = await params;
  const profile = await getProfileByPseudo(decodeURIComponent(pseudo));
  if (!profile || !profile.pseudo || !profile.privacy.publicProfile) notFound();

  const [viewer, entitlements, emailEntitlements, loadouts] = await Promise.all([
    getUserSession(),
    getEntitlements(profile.userId),
    profile.email ? getEntitlements(profile.email.toLowerCase()) : Promise.resolve(null),
    getLoadouts(),
  ]);
  const pro = Boolean(entitlements?.pro || emailEntitlements?.pro);
  const toolCount = new Set([...(entitlements?.tools || []), ...(emailEntitlements?.tools || [])]).size;
  const favoriteLoadouts = loadouts.filter((loadout) => profile.favoriteLoadouts.includes(loadout.id));
  const featuredLoadout = loadouts.find((loadout) => loadout.id === profile.featuredLoadoutId);
  const displayedLoadouts = featuredLoadout
    ? [featuredLoadout, ...favoriteLoadouts.filter((loadout) => loadout.id !== featuredLoadout.id)]
    : favoriteLoadouts;
  const summary = getStatsSummary(profile.statsEntries);
  const name = profile.publicName || profile.pseudo;
  const shareUrl = `${getPublicOrigin()}/profile/${encodeURIComponent(profile.pseudo)}`;
  const bestMatch = summary.recent
    .slice()
    .sort((a, b) => (b.won ? 5000 : 0) + b.kills * 120 + b.damage - ((a.won ? 5000 : 0) + a.kills * 120 + a.damage))[0];
  const socials = [
    ['YT', 'YouTube', profile.youtube],
    ['TW', 'Twitch', profile.twitch],
    ['KI', 'Kick', profile.kick],
    ['DC', 'Discord', profile.discord],
    ['X', 'Twitter/X', profile.twitter],
    ['TT', 'TikTok', profile.tiktok],
    ['IG', 'Instagram', profile.instagram],
    ['OT', 'Other', profile.otherLink],
  ].filter(([, , url]) => Boolean(url));
  const lfgDetails = [
    ['Region', profile.mainPlatform ? 'Crossplay ready' : 'Not set'],
    ['Platform', profile.mainPlatform ? platformLabel(profile.mainPlatform) : 'Not set'],
    ['Input', inputLabel(profile.inputDevice)],
    ['Role', favoriteRole(favoriteLoadouts)],
  ];
  const updatedLabel = profile.updatedAt ? formatMetaDate(profile.updatedAt) : 'Not synced yet';

  return (
    <main className="public-profile-main">
      <nav className="public-profile-topbar" aria-label="Profile navigation">
        <Link className="public-profile-back" href="/">WZPRO Meta</Link>
        <Link href="/community">Community</Link>
        <Link href="/#all-loadouts">Loadouts</Link>
      </nav>

      <header className="public-profile-hero">
        <div
          className={`public-profile-cover ${profile.profileBanner ? 'has-banner' : ''}`}
          style={profile.profileBanner ? { backgroundImage: `url(${profile.profileBanner})` } : undefined}
          aria-hidden="true"
        >
          <span>PLAYER CARD</span>
          <b>{profile.pseudo.slice(0, 3).toUpperCase()}</b>
        </div>

        <div className="public-profile-avatar">
          {profile.profilePicture ? (
            <i
              aria-hidden="true"
              style={{
                backgroundImage: `url(${profile.profilePicture})`,
                backgroundPosition: `${profile.avatarPositionX}% ${profile.avatarPositionY}%`,
              }}
            />
          ) : (
            <i aria-hidden="true">{initials(profile)}</i>
          )}
        </div>

        <div className="public-profile-identity">
          <span>PLAYER PROFILE</span>
          <h1>{name}</h1>
          <p>{profile.description || 'No public description yet. Add playstyle, goals and availability from the account page.'}</p>
          <div className="public-profile-badges">
            {pro && <b>PRO</b>}
            {toolCount > 0 && <b>{toolCount} TOOL{toolCount > 1 ? 'S' : ''}</b>}
            {(profile.privacy.activisionId && profile.activisionId) && <b>ACTIVISION</b>}
            {profile.mainPlatform && <b>{platformLabel(profile.mainPlatform)}</b>}
            {profile.inputDevice && <b>{inputLabel(profile.inputDevice)}</b>}
          </div>
          <ProfileShareActions pseudo={profile.pseudo} url={shareUrl} canMessage={viewer?.sub !== profile.userId} />
        </div>
      </header>

      <section className="public-profile-snapshot" aria-label="Profile snapshot">
        <article>
          <span>K/D</span>
          <strong>{summary.games > 0 ? summary.kd.toFixed(2) : '--'}</strong>
          <small>{summary.games} tracked games</small>
        </article>
        <article>
          <span>Kills/game</span>
          <strong>{summary.games > 0 ? summary.kills.toFixed(1) : '--'}</strong>
          <small>{summary.totalKills} total kills</small>
        </article>
        <article>
          <span>Win rate</span>
          <strong>{summary.games > 0 ? `${summary.winRate.toFixed(0)}%` : '--'}</strong>
          <small>{summary.games > 0 ? `${summary.topTenRate.toFixed(0)}% top 10` : 'No stats yet'}</small>
        </article>
        <article>
          <span>Main role</span>
          <strong>{favoriteRole(favoriteLoadouts)}</strong>
          <small>From saved loadouts</small>
        </article>
      </section>

      <section className="public-profile-layout">
        <div className="public-profile-stack">
          <article className="public-profile-panel public-profile-panel--wide">
            <div className="public-profile-panel-head">
              <span>Favorite loadouts</span>
              <Link href="/#all-loadouts">Browse meta</Link>
            </div>
            <div className="public-profile-loadouts">
              {displayedLoadouts.length > 0 ? displayedLoadouts.map((loadout) => {
                const slug = getLoadoutSlug(loadout);
                const note = profile.loadoutNotes[loadout.id];
                return (
                  <Link key={loadout.id} href={`/loadouts/${loadout.id}`} className={`public-profile-loadout-card ${featuredLoadout?.id === loadout.id ? 'is-featured' : ''}`}>
                    <span className="public-profile-loadout-tier">{loadout.tier}</span>
                    <span className="public-profile-loadout-art">
                      <Image
                        src={`/assets/weapons/wzstats/${slug}.avif`}
                        alt=""
                        width={210}
                        height={90}
                        unoptimized
                      />
                    </span>
                    <span className="public-profile-loadout-body">
                      <strong>{loadout.weapon}</strong>
                      <small>{loadout.category} / {loadout.playstyle}</small>
                      {note && <em>{note}</em>}
                    </span>
                    <span className="public-profile-loadout-score">
                      {calculateMetaScore(loadout)}
                      <small>Meta</small>
                    </span>
                  </Link>
                );
              }) : (
                <div className="public-profile-empty">
                  <strong>No favorite loadouts yet</strong>
                  <p>Saved builds will appear here with weapon art, meta score and personal notes.</p>
                  <Link href="/#all-loadouts">Find loadouts</Link>
                </div>
              )}
            </div>
          </article>

          <article className="public-profile-panel">
            <div className="public-profile-panel-head">
              <span>Performance</span>
              {profile.privacy.stats && summary.games > 0 && (
                <Link href={`/profile/${encodeURIComponent(profile.pseudo)}/stats`}>Share stats card</Link>
              )}
            </div>
            {profile.privacy.stats && summary.games > 0 ? (
              <>
                <div className="public-profile-performance-grid">
                  <div><span>Average damage</span><strong>{Math.round(summary.damage).toLocaleString()}</strong></div>
                  <div><span>Top 10 rate</span><strong>{summary.topTenRate.toFixed(0)}%</strong></div>
                  <div><span>Games tracked</span><strong>{summary.games}</strong></div>
                  <div><span>Best match</span><strong>{bestMatch ? `${bestMatch.kills}/${bestMatch.deaths}` : '--'}</strong></div>
                </div>
                <div className="public-profile-history">
                  {summary.recent.slice(0, 5).map((entry) => (
                    <div key={entry.id}>
                      <small>{entry.date || 'Recent'}</small>
                      <b>{entry.kills}/{entry.deaths}</b>
                      <strong>{entry.damage.toLocaleString()} dmg</strong>
                      <em>#{entry.placement || '--'}{entry.won ? ' win' : ''}</em>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="public-profile-empty">
                <strong>Stats are private or empty</strong>
                <p>This player can enable public tracker stats from account privacy.</p>
              </div>
            )}
          </article>
        </div>

        <aside className="public-profile-side">
          <article className="public-profile-panel">
            <span className="public-profile-kicker">LFG card</span>
            <div className="public-profile-lfg">
              {lfgDetails.map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <Link className="public-profile-primary-link" href={`/community?player=${encodeURIComponent(profile.pseudo)}`}>
              Find squadmates
            </Link>
          </article>

          <article className="public-profile-panel">
            <span className="public-profile-kicker">Details</span>
            <dl className="public-profile-details">
              <div><dt>Pseudo</dt><dd>{profile.pseudo}</dd></div>
              {profile.privacy.email && profile.email && <div><dt>Email</dt><dd>{profile.email}</dd></div>}
              {profile.privacy.activisionId && profile.activisionId && <div><dt>Activision ID</dt><dd>{profile.activisionId}</dd></div>}
              {profile.privacy.platformId && profile.platformId && <div><dt>Platform ID</dt><dd>{profile.platformId}</dd></div>}
              {profile.mobileHudCode && <div><dt>Mobile HUD code</dt><dd>{profile.mobileHudCode}</dd></div>}
              <div><dt>Updated</dt><dd>{updatedLabel}</dd></div>
            </dl>
          </article>

          {profile.privacy.socials && socials.length > 0 && (
            <article className="public-profile-panel">
              <span className="public-profile-kicker">Socials</span>
              <div className="public-profile-socials">
                {socials.map(([mark, label, url]) => (
                  <a key={label} href={url} rel="noreferrer" target="_blank">
                    <b>{mark}</b>
                    <span>
                      <small>{label}</small>
                      <strong>{safeHost(url)}</strong>
                    </span>
                  </a>
                ))}
              </div>
            </article>
          )}
        </aside>
      </section>

      <style>{`
        .public-profile-main {
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;
          padding: 2rem 0 6rem;
          color: var(--tm-ink, #10100e);
          font-family: var(--font-mono, monospace);
        }
        .public-profile-topbar {
          display: flex;
          flex-wrap: wrap;
          gap: 0.8rem;
          align-items: center;
          margin-bottom: 1.2rem;
        }
        .public-profile-topbar a {
          color: inherit;
          font-size: 0.65rem;
          font-weight: 900;
          opacity: 0.58;
          text-decoration: none;
          text-transform: uppercase;
        }
        .public-profile-back {
          margin-right: auto;
          opacity: 0.9 !important;
        }
        .public-profile-hero {
          position: relative;
          display: grid;
          grid-template-columns: minmax(220px, 0.36fr) 132px minmax(0, 1fr);
          gap: 1.2rem;
          align-items: stretch;
          min-height: 360px;
          border: 1px solid rgba(16,16,14,0.16);
          background: rgba(239,238,232,0.78);
          overflow: hidden;
        }
        .public-profile-cover {
          display: grid;
          align-content: space-between;
          min-width: 0;
          padding: 1.2rem;
          background:
            linear-gradient(140deg, rgba(22,60,255,0.98), rgba(16,16,14,0.92)),
            radial-gradient(circle at 20% 10%, rgba(255,255,255,0.24), transparent 34%);
          background-position: center;
          background-size: cover;
          color: #fff;
        }
        .public-profile-cover.has-banner {
          background-color: #10100e;
        }
        .public-profile-cover span {
          font-size: 0.66rem;
          font-weight: 950;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .public-profile-cover b {
          font-size: clamp(4rem, 12vw, 8.5rem);
          line-height: 0.78;
          opacity: 0.9;
        }
        .public-profile-avatar {
          display: grid;
          place-items: center;
          padding: 1rem 0;
        }
        .public-profile-avatar i {
          display: grid;
          width: 132px;
          height: 132px;
          place-items: center;
          border: 1px solid rgba(22,60,255,0.36);
          border-radius: 999px;
          background: rgba(16,16,14,0.1);
          background-size: cover;
          color: #163cff;
          font-size: 2rem;
          font-style: normal;
          font-weight: 950;
        }
        .public-profile-identity {
          display: grid;
          align-content: center;
          min-width: 0;
          padding: clamp(1.3rem, 4vw, 2.5rem);
        }
        .public-profile-identity > span,
        .public-profile-kicker,
        .public-profile-panel-head > span,
        .public-profile-snapshot span {
          color: #163cff;
          font-size: 0.62rem;
          font-weight: 950;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }
        .public-profile-identity h1 {
          margin: 0.55rem 0 0.85rem;
          overflow-wrap: anywhere;
          font-size: clamp(2.4rem, 7vw, 5.8rem);
          letter-spacing: 0;
          line-height: 0.9;
          text-transform: uppercase;
        }
        .public-profile-identity p,
        .public-profile-empty p {
          max-width: 720px;
          margin: 0;
          color: rgba(16,16,14,0.62);
          font-size: 0.82rem;
          line-height: 1.75;
        }
        .public-profile-badges,
        .public-profile-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
          margin-top: 1rem;
        }
        .public-profile-badges b {
          border: 1px solid rgba(22,60,255,0.26);
          color: #163cff;
          font-size: 0.62rem;
          padding: 0.34rem 0.5rem;
          text-transform: uppercase;
        }
        .public-profile-actions button,
        .public-profile-actions a,
        .public-profile-primary-link,
        .public-profile-panel-head a,
        .public-profile-empty a {
          display: inline-grid;
          min-height: 38px;
          place-items: center;
          border: 1px solid rgba(16,16,14,0.16);
          background: transparent;
          color: #10100e;
          cursor: pointer;
          font: inherit;
          font-size: 0.62rem;
          font-weight: 950;
          padding: 0 0.8rem;
          text-decoration: none;
          text-transform: uppercase;
        }
        .public-profile-actions button:first-child,
        .public-profile-primary-link {
          border-color: #163cff;
          background: #163cff;
          color: #fff;
        }
        .public-profile-actions .is-muted {
          color: rgba(16,16,14,0.52);
        }
        .public-profile-snapshot {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1px;
          margin-top: 1rem;
          border: 1px solid rgba(16,16,14,0.14);
          background: rgba(16,16,14,0.14);
        }
        .public-profile-snapshot article {
          display: grid;
          gap: 0.35rem;
          min-height: 116px;
          align-content: center;
          padding: 1rem;
          background: rgba(239,238,232,0.82);
        }
        .public-profile-snapshot strong {
          overflow-wrap: anywhere;
          color: #10100e;
          font-size: clamp(1.25rem, 2.4vw, 2rem);
          line-height: 1;
          text-transform: uppercase;
        }
        .public-profile-snapshot small {
          color: rgba(16,16,14,0.48);
          font-size: 0.62rem;
          text-transform: uppercase;
        }
        .public-profile-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 340px;
          gap: 1rem;
          margin-top: 1rem;
          align-items: start;
        }
        .public-profile-stack,
        .public-profile-side {
          display: grid;
          gap: 1rem;
        }
        .public-profile-panel {
          border: 1px solid rgba(16,16,14,0.14);
          background: rgba(239,238,232,0.78);
          padding: 1rem;
        }
        .public-profile-panel-head {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .public-profile-panel-head a {
          min-height: 32px;
        }
        .public-profile-loadouts {
          display: grid;
          gap: 0.65rem;
        }
        .public-profile-loadout-card {
          display: grid;
          grid-template-columns: 44px minmax(120px, 210px) minmax(0, 1fr) 74px;
          gap: 0.8rem;
          align-items: center;
          min-height: 110px;
          border: 1px solid rgba(16,16,14,0.10);
          color: inherit;
          padding: 0.65rem;
          text-decoration: none;
        }
        .public-profile-loadout-card.is-featured {
          border-color: rgba(22,60,255,0.42);
          background: rgba(22,60,255,0.045);
        }
        .public-profile-loadout-tier {
          display: grid;
          width: 38px;
          height: 38px;
          place-items: center;
          border: 1px solid rgba(22,60,255,0.28);
          color: #163cff;
          font-weight: 950;
        }
        .public-profile-loadout-art {
          display: grid;
          min-width: 0;
          place-items: center;
        }
        .public-profile-loadout-art img {
          width: min(100%, 210px);
          height: auto;
          max-height: 82px;
          object-fit: contain;
          filter: grayscale(1) contrast(1.06) drop-shadow(0 8px 8px rgba(16,16,14,0.16));
        }
        .public-profile-loadout-body {
          display: grid;
          min-width: 0;
          gap: 0.25rem;
        }
        .public-profile-loadout-body strong {
          overflow-wrap: anywhere;
          font-size: 1.05rem;
          text-transform: uppercase;
        }
        .public-profile-loadout-body small,
        .public-profile-loadout-body em,
        .public-profile-loadout-score small {
          color: rgba(16,16,14,0.52);
          font-size: 0.62rem;
          font-style: normal;
          line-height: 1.45;
          text-transform: uppercase;
        }
        .public-profile-loadout-score {
          display: grid;
          justify-items: end;
          color: #163cff;
          font-size: 1.3rem;
          font-weight: 950;
        }
        .public-profile-performance-grid,
        .public-profile-lfg {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1px;
          border: 1px solid rgba(16,16,14,0.12);
          background: rgba(16,16,14,0.12);
        }
        .public-profile-lfg {
          grid-template-columns: 1fr;
          margin-top: 1rem;
        }
        .public-profile-performance-grid div,
        .public-profile-lfg div {
          display: grid;
          gap: 0.35rem;
          min-height: 82px;
          align-content: center;
          padding: 0.85rem;
          background: rgba(239,238,232,0.82);
        }
        .public-profile-performance-grid span,
        .public-profile-lfg span,
        .public-profile-details dt {
          color: rgba(16,16,14,0.48);
          font-size: 0.58rem;
          text-transform: uppercase;
        }
        .public-profile-performance-grid strong,
        .public-profile-lfg strong {
          overflow-wrap: anywhere;
          color: #10100e;
          font-size: 1.15rem;
          text-transform: uppercase;
        }
        .public-profile-history {
          display: grid;
          gap: 0.55rem;
          margin-top: 1rem;
        }
        .public-profile-history div {
          display: grid;
          grid-template-columns: 1fr auto auto auto;
          gap: 0.6rem;
          align-items: center;
          border-top: 1px solid rgba(16,16,14,0.10);
          padding-top: 0.55rem;
        }
        .public-profile-history small,
        .public-profile-history em {
          color: rgba(16,16,14,0.48);
          font-size: 0.62rem;
          font-style: normal;
          text-transform: uppercase;
        }
        .public-profile-history b {
          color: #163cff;
        }
        .public-profile-primary-link {
          width: 100%;
          margin-top: 0.8rem;
        }
        .public-profile-details {
          display: grid;
          gap: 0.65rem;
          margin: 1rem 0 0;
        }
        .public-profile-details dd {
          margin: 0.2rem 0 0;
          overflow-wrap: anywhere;
        }
        .public-profile-socials {
          display: grid;
          gap: 0.55rem;
          margin-top: 1rem;
        }
        .public-profile-socials a {
          display: grid;
          grid-template-columns: 36px minmax(0, 1fr);
          gap: 0.7rem;
          align-items: center;
          border: 1px solid rgba(16,16,14,0.1);
          color: inherit;
          padding: 0.65rem;
          text-decoration: none;
        }
        .public-profile-socials b {
          display: grid;
          width: 36px;
          height: 36px;
          place-items: center;
          border: 1px solid rgba(22,60,255,0.24);
          color: #163cff;
          font-size: 0.68rem;
        }
        .public-profile-socials span {
          display: grid;
          min-width: 0;
          gap: 0.16rem;
        }
        .public-profile-socials small {
          color: rgba(16,16,14,0.46);
          font-size: 0.58rem;
          text-transform: uppercase;
        }
        .public-profile-socials strong {
          overflow: hidden;
          font-size: 0.78rem;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .public-profile-empty {
          display: grid;
          gap: 0.65rem;
          padding: 1rem;
          border: 1px solid rgba(16,16,14,0.10);
        }
        .public-profile-empty strong {
          text-transform: uppercase;
        }
        .public-profile-empty a {
          width: fit-content;
        }
        @media (max-width: 980px) {
          .public-profile-hero,
          .public-profile-layout {
            grid-template-columns: 1fr;
          }
          .public-profile-cover {
            min-height: 170px;
          }
          .public-profile-avatar {
            justify-content: start;
            padding: 0 1.2rem;
          }
          .public-profile-snapshot,
          .public-profile-performance-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 680px) {
          .public-profile-main {
            width: min(100% - 28px, 560px);
            padding-top: 1rem;
          }
          .public-profile-hero {
            min-height: auto;
          }
          .public-profile-identity h1 {
            font-size: clamp(2rem, 15vw, 3.8rem);
          }
          .public-profile-snapshot,
          .public-profile-performance-grid,
          .public-profile-loadout-card {
            grid-template-columns: 1fr;
          }
          .public-profile-loadout-card {
            justify-items: start;
          }
          .public-profile-loadout-score {
            justify-items: start;
          }
          .public-profile-history div {
            grid-template-columns: 1fr auto;
          }
          .public-profile-actions button,
          .public-profile-actions a {
            flex: 1 1 140px;
          }
        }
      `}</style>
    </main>
  );
}
