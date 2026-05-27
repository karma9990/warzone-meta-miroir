import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLoadouts } from '@/lib/data';
import { getEntitlements } from '@/lib/entitlementStore';
import { getProfileByPseudo } from '@/lib/profileStore';
import { getStatsSummary } from '@/lib/statsSummary';

export const dynamic = 'force-dynamic';

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ pseudo: string }>;
}) {
  const { pseudo } = await params;
  const profile = await getProfileByPseudo(decodeURIComponent(pseudo));
  if (!profile || !profile.pseudo || !profile.privacy.publicProfile) notFound();

  const entitlements = await getEntitlements(profile.userId);
  const emailEntitlements = profile.email ? await getEntitlements(profile.email.toLowerCase()) : null;
  const pro = Boolean(entitlements?.pro || emailEntitlements?.pro);
  const toolCount = new Set([...(entitlements?.tools || []), ...(emailEntitlements?.tools || [])]).size;
  const loadouts = getLoadouts();
  const favoriteLoadouts = loadouts.filter((loadout) => profile.favoriteLoadouts.includes(loadout.id));
  const summary = getStatsSummary(profile.statsEntries);
  const socials = [
    ['YouTube', profile.youtube],
    ['Twitch', profile.twitch],
    ['Kick', profile.kick],
    ['Discord', profile.discord],
    ['Twitter/X', profile.twitter],
    ['TikTok', profile.tiktok],
    ['Instagram', profile.instagram],
    ['Other', profile.otherLink],
  ].filter(([, url]) => Boolean(url));

  return (
    <main className="public-profile-main">
      <Link className="public-profile-back" href="/">WZPRO Meta</Link>

      <header className="public-profile-hero">
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
            <i aria-hidden="true">{profile.pseudo.slice(0, 2).toUpperCase()}</i>
          )}
        </div>
        <div>
          <span>PLAYER PROFILE</span>
          <h1>{profile.pseudo}</h1>
          <p>{profile.description || 'No public description yet.'}</p>
          <div className="public-profile-badges">
            {pro && <b>PRO</b>}
            {toolCount > 0 && <b>{toolCount} TOOL{toolCount > 1 ? 'S' : ''}</b>}
            {profile.email && <b>ACCOUNT</b>}
            {profile.mainPlatform && <b>{profile.mainPlatform.replace('-', ' ')}</b>}
          </div>
        </div>
      </header>

      <section className="public-profile-grid">
        <article>
          <span>DETAILS</span>
          <dl>
            <div><dt>Pseudo</dt><dd>{profile.pseudo}</dd></div>
            {profile.privacy.email && profile.email && <div><dt>Email</dt><dd>{profile.email}</dd></div>}
            {profile.inputDevice && <div><dt>Input</dt><dd>{profile.inputDevice === 'keyboard-mouse' ? 'Keyboard + mouse' : 'Controller'}</dd></div>}
            {profile.mainPlatform && <div><dt>Platform</dt><dd>{profile.mainPlatform.replace('-', '.')}</dd></div>}
            {profile.privacy.activisionId && profile.activisionId && <div><dt>Activision ID</dt><dd>{profile.activisionId}</dd></div>}
            {profile.privacy.platformId && profile.platformId && <div><dt>Platform account ID</dt><dd>{profile.platformId}</dd></div>}
          </dl>
        </article>

        {profile.privacy.socials && socials.length > 0 && (
          <article>
            <span>SOCIALS</span>
            <div className="public-profile-socials">
              {socials.map(([label, url]) => (
                <a key={label} href={url} rel="noreferrer" target="_blank">
                  <small>{label}</small>
                  <strong>{new URL(url).hostname.replace('www.', '')}</strong>
                </a>
              ))}
            </div>
          </article>
        )}

        {profile.privacy.stats && summary.games > 0 && (
          <article>
            <span>STATS</span>
            <div className="public-profile-stats">
              <strong>{summary.kd.toFixed(2)}<small>K/D</small></strong>
              <strong>{Math.round(summary.damage).toLocaleString()}<small>DMG</small></strong>
              <strong>{summary.winRate.toFixed(0)}%<small>WIN</small></strong>
            </div>
            <Link className="public-profile-share-stats" href={`/profile/${profile.pseudo}/stats`}>
              Share stats card
            </Link>
          </article>
        )}

        <article>
          <span>FAVORITES</span>
          <div className="public-profile-loadouts">
            {favoriteLoadouts.length > 0 ? favoriteLoadouts.map((loadout) => (
              <Link key={loadout.id} href={`/loadouts/${loadout.id}`}>
                <b>{loadout.tier}</b>
                <strong>{loadout.weapon}</strong>
                <small>{loadout.category}</small>
              </Link>
            )) : <p>No favorite loadouts yet.</p>}
          </div>
        </article>
      </section>

      <style>{`
        .public-profile-main {
          max-width: 1080px;
          margin: 0 auto;
          padding: 4rem 2rem 6rem;
          color: var(--tm-ink, #10100e);
          font-family: var(--font-mono, monospace);
        }
        .public-profile-back {
          color: inherit;
          font-size: 0.65rem;
          opacity: 0.48;
          text-decoration: none;
          text-transform: uppercase;
        }
        .public-profile-hero {
          display: grid;
          grid-template-columns: 132px minmax(0, 1fr);
          gap: 1.4rem;
          align-items: end;
          border-bottom: 1px solid rgba(0,0,0,0.14);
          padding: 3rem 0 2rem;
        }
        .public-profile-avatar {
          display: grid;
          min-height: 132px;
          place-items: center;
          border: 1px solid rgba(22,60,255,0.36);
          background: rgba(22,60,255,0.04);
        }
        .public-profile-avatar i {
          display: grid;
          width: 82px;
          height: 82px;
          place-items: center;
          border-radius: 999px;
          background: rgba(16,16,14,0.1);
          background-size: cover;
          color: blue;
          font-style: normal;
          font-weight: 950;
        }
        .public-profile-hero span,
        .public-profile-grid article > span {
          color: blue;
          font-size: 0.62rem;
          font-weight: 950;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .public-profile-hero h1 {
          margin: 0.55rem 0 0.85rem;
          font-size: clamp(2.4rem, 7vw, 5rem);
          letter-spacing: 0.04em;
          line-height: 0.9;
          text-transform: uppercase;
        }
        .public-profile-hero p,
        .public-profile-loadouts p {
          max-width: 720px;
          margin: 0;
          color: rgba(16,16,14,0.58);
          font-size: 0.82rem;
          line-height: 1.75;
        }
        .public-profile-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
          margin-top: 1rem;
        }
        .public-profile-badges b {
          border: 1px solid rgba(22,60,255,0.26);
          color: blue;
          font-size: 0.62rem;
          padding: 0.34rem 0.5rem;
          text-transform: uppercase;
        }
        .public-profile-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1px;
          margin-top: 2rem;
          border: 1px solid rgba(0,0,0,0.12);
          background: rgba(0,0,0,0.12);
        }
        .public-profile-grid article {
          background: rgba(240,240,235,0.74);
          padding: 1.2rem;
        }
        .public-profile-grid dl {
          display: grid;
          gap: 0.65rem;
          margin: 1rem 0 0;
        }
        .public-profile-grid dt {
          color: rgba(16,16,14,0.45);
          font-size: 0.58rem;
          text-transform: uppercase;
        }
        .public-profile-grid dd {
          margin: 0.2rem 0 0;
          overflow-wrap: anywhere;
        }
        .public-profile-socials,
        .public-profile-loadouts {
          display: grid;
          gap: 0.55rem;
          margin-top: 1rem;
        }
        .public-profile-socials a,
        .public-profile-loadouts a {
          display: grid;
          gap: 0.2rem;
          border: 1px solid rgba(0,0,0,0.1);
          color: inherit;
          padding: 0.75rem;
          text-decoration: none;
        }
        .public-profile-socials small,
        .public-profile-loadouts small {
          color: rgba(16,16,14,0.46);
          font-size: 0.62rem;
          text-transform: uppercase;
        }
        .public-profile-loadouts b {
          color: blue;
        }
        .public-profile-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.7rem;
          margin-top: 1rem;
        }
        .public-profile-stats strong {
          display: grid;
          gap: 0.3rem;
          border: 1px solid rgba(0,0,0,0.1);
          color: blue;
          font-size: 1.45rem;
          padding: 1rem;
        }
        .public-profile-stats small {
          color: rgba(16,16,14,0.45);
          font-size: 0.58rem;
        }
        .public-profile-share-stats {
          display: grid;
          min-height: 42px;
          place-items: center;
          margin-top: 0.85rem;
          border: 1px solid rgba(22,60,255,0.28);
          background: #163cff;
          color: #fff;
          font-size: 0.68rem;
          font-weight: 950;
          text-decoration: none;
          text-transform: uppercase;
        }
        @media (max-width: 760px) {
          .public-profile-hero,
          .public-profile-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
