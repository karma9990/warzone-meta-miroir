import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import StatsShareActions from '@/components/StatsShareActions';
import { getProfileByPseudo } from '@/lib/profileStore';
import { getStatsSummary } from '@/lib/statsSummary';

export const dynamic = 'force-dynamic';

function formatDate(value: string) {
  return value || 'Recent';
}

function initials(profile: { pseudo: string; publicName: string }) {
  return (profile.publicName || profile.pseudo).slice(0, 2).toUpperCase();
}

function getPublicOrigin() {
  const value = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || 'https://wzprometa.com';
  return new URL(value.startsWith('http') ? value : `https://${value}`).origin;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pseudo: string }>;
}): Promise<Metadata> {
  const { pseudo } = await params;
  const profile = await getProfileByPseudo(decodeURIComponent(pseudo));
  if (!profile || !profile.pseudo || !profile.privacy.publicProfile) {
    return { title: 'Stats tracker - WZPRO Meta' };
  }

  const summary = getStatsSummary(profile.statsEntries);
  const name = profile.publicName || profile.pseudo;

  return {
    title: `${name} stats tracker - WZPRO Meta`,
    description: `${summary.games} recent games, ${summary.kd.toFixed(2)} K/D, ${Math.round(summary.damage).toLocaleString()} average damage.`,
  };
}

export default async function PublicStatsSharePage({
  params,
}: {
  params: Promise<{ pseudo: string }>;
}) {
  const { pseudo } = await params;
  const profile = await getProfileByPseudo(decodeURIComponent(pseudo));
  if (!profile || !profile.pseudo || !profile.privacy.publicProfile || !profile.privacy.stats) notFound();

  const summary = getStatsSummary(profile.statsEntries);
  if (summary.games === 0) notFound();

  const name = profile.publicName || profile.pseudo;
  const shareUrl = `${getPublicOrigin()}/profile/${encodeURIComponent(profile.pseudo)}/stats`;

  return (
    <main className="stats-share-page">
      <Link className="stats-share-back" href="/account">Back to account</Link>

      <section className="stats-share-shell">
        <article className="stats-share-card">
          <div className="stats-share-cover">
            <div className="stats-share-avatar">
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
            <div className="stats-share-rings" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>

          <div className="stats-share-content">
            <span>WZPRO META / STATS TRACKER</span>
            <h1>{name}</h1>
            <p>Last {summary.games} games performance card. Shareable profile snapshot for squad checks, socials and LFG posts.</p>

            <div className="stats-share-scoreboard">
              <strong>{summary.kd.toFixed(2)}<small>K/D</small></strong>
              <strong>{summary.kills.toFixed(1)}<small>KILLS/GAME</small></strong>
              <strong>{Math.round(summary.damage).toLocaleString()}<small>DMG/GAME</small></strong>
              <strong>{summary.winRate.toFixed(0)}%<small>WIN</small></strong>
            </div>

            <div className="stats-share-details">
              <div><span>Games</span><b>{summary.games}</b></div>
              <div><span>Total kills</span><b>{summary.totalKills}</b></div>
              <div><span>Top 10 rate</span><b>{summary.topTenRate.toFixed(0)}%</b></div>
              <div><span>Platform</span><b>{profile.mainPlatform ? profile.mainPlatform.replace('-', ' ') : 'Not set'}</b></div>
            </div>
          </div>
        </article>

        <aside className="stats-share-side">
          <div>
            <span>Share card</span>
            <h2>{profile.pseudo}</h2>
            <p>This page is public only while profile visibility and stats are enabled in profile privacy.</p>
            <StatsShareActions url={shareUrl} />
          </div>

          <div className="stats-share-history">
            <span>Recent games</span>
            {summary.recent.slice(0, 6).map((entry) => (
              <div key={entry.id}>
                <small>{formatDate(entry.date)}</small>
                <b>{entry.kills}/{entry.deaths}</b>
                <strong>{entry.damage.toLocaleString()} dmg</strong>
                <em>#{entry.placement || '--'}{entry.won ? ' win' : ''}</em>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <style>{`
        .stats-share-page {
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;
          padding: 3rem 0 6rem;
          color: var(--tm-ink, #10100e);
          font-family: var(--font-mono, monospace);
        }
        .stats-share-back {
          color: inherit;
          font-size: 0.65rem;
          opacity: 0.5;
          text-decoration: none;
          text-transform: uppercase;
        }
        .stats-share-shell {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 320px;
          gap: 1rem;
          align-items: stretch;
          margin-top: 2rem;
        }
        .stats-share-card,
        .stats-share-side > div {
          border: 1px solid rgba(16,16,14,0.16);
          background: rgba(239,238,232,0.82);
        }
        .stats-share-card {
          display: grid;
          grid-template-columns: minmax(260px, 0.42fr) minmax(0, 1fr);
          min-height: 620px;
          overflow: hidden;
        }
        .stats-share-cover {
          position: relative;
          display: grid;
          place-items: center;
          overflow: hidden;
          background:
            linear-gradient(145deg, rgba(22,60,255,0.96), rgba(16,16,14,0.92)),
            radial-gradient(circle at 20% 12%, rgba(255,255,255,0.24), transparent 32%);
        }
        .stats-share-cover::after {
          position: absolute;
          inset: auto -20% -18% -20%;
          height: 48%;
          background: rgba(239,238,232,0.12);
          content: "";
          transform: rotate(-8deg);
        }
        .stats-share-avatar {
          position: relative;
          z-index: 2;
          display: grid;
          width: min(72%, 260px);
          aspect-ratio: 1;
          place-items: center;
          border: 1px solid rgba(255,255,255,0.5);
          background: rgba(239,238,232,0.14);
          box-shadow: 0 28px 80px rgba(0,0,0,0.32);
        }
        .stats-share-avatar i {
          display: grid;
          width: 72%;
          aspect-ratio: 1;
          place-items: center;
          border-radius: 999px;
          background: rgba(239,238,232,0.9);
          background-size: cover;
          color: #163cff;
          font-size: clamp(2.4rem, 6vw, 4.8rem);
          font-style: normal;
          font-weight: 950;
        }
        .stats-share-rings {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .stats-share-rings span {
          position: absolute;
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 999px;
          inset: 14%;
        }
        .stats-share-rings span:nth-child(2) { inset: 26%; }
        .stats-share-rings span:nth-child(3) { inset: 38%; }
        .stats-share-content {
          display: grid;
          align-content: center;
          padding: clamp(1.4rem, 4vw, 3rem);
        }
        .stats-share-content > span,
        .stats-share-side span {
          color: #163cff;
          font-size: 0.68rem;
          font-weight: 950;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .stats-share-content h1 {
          margin: 0.65rem 0 0.9rem;
          font-size: clamp(3.3rem, 10vw, 7.8rem);
          line-height: 0.84;
          text-transform: uppercase;
        }
        .stats-share-content p,
        .stats-share-side p {
          max-width: 620px;
          margin: 0;
          color: rgba(16,16,14,0.58);
          font-size: 0.82rem;
          line-height: 1.75;
        }
        .stats-share-scoreboard {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1px;
          margin-top: 2rem;
          background: rgba(16,16,14,0.14);
          border: 1px solid rgba(16,16,14,0.14);
        }
        .stats-share-scoreboard strong {
          display: grid;
          gap: 0.38rem;
          min-height: 122px;
          align-content: center;
          padding: 1rem;
          background: rgba(239,238,232,0.84);
          color: #163cff;
          font-size: clamp(1.4rem, 3vw, 2.35rem);
        }
        .stats-share-scoreboard small {
          color: rgba(16,16,14,0.48);
          font-size: 0.58rem;
        }
        .stats-share-details {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.6rem;
          margin-top: 1rem;
        }
        .stats-share-details div {
          border-top: 1px solid rgba(16,16,14,0.14);
          padding-top: 0.7rem;
        }
        .stats-share-details span {
          display: block;
          color: rgba(16,16,14,0.46);
          font-size: 0.58rem;
          text-transform: uppercase;
        }
        .stats-share-details b {
          display: block;
          margin-top: 0.3rem;
          overflow-wrap: anywhere;
          text-transform: uppercase;
        }
        .stats-share-side {
          display: grid;
          gap: 1rem;
        }
        .stats-share-side > div {
          padding: 1rem;
        }
        .stats-share-side h2 {
          margin: 0.5rem 0 0.7rem;
          font-size: 1.6rem;
          text-transform: uppercase;
        }
        .stats-share-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.55rem;
          margin-top: 1rem;
        }
        .stats-share-actions button {
          min-height: 42px;
          border: 1px solid rgba(16,16,14,0.16);
          background: #163cff;
          color: #fff;
          font: inherit;
          font-size: 0.7rem;
          font-weight: 950;
          text-transform: uppercase;
          cursor: pointer;
        }
        .stats-share-actions button + button {
          background: transparent;
          color: #10100e;
        }
        .stats-share-history {
          display: grid;
          align-content: start;
          gap: 0.55rem;
        }
        .stats-share-history div {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 0.25rem 0.75rem;
          border-top: 1px solid rgba(16,16,14,0.12);
          padding-top: 0.6rem;
        }
        .stats-share-history small,
        .stats-share-history em {
          color: rgba(16,16,14,0.48);
          font-size: 0.62rem;
          font-style: normal;
          text-transform: uppercase;
        }
        .stats-share-history strong {
          color: rgba(16,16,14,0.62);
          font-size: 0.68rem;
        }
        @media (max-width: 940px) {
          .stats-share-shell,
          .stats-share-card {
            grid-template-columns: 1fr;
          }
          .stats-share-card {
            min-height: auto;
          }
          .stats-share-cover {
            min-height: 360px;
          }
        }
        @media (max-width: 680px) {
          .stats-share-page {
            width: min(100% - 28px, 560px);
          }
          .stats-share-scoreboard,
          .stats-share-details {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
    </main>
  );
}
