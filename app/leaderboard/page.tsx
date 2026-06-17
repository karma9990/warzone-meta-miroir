import type { Metadata } from 'next';
import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import { getPublicProfiles } from '@/lib/profileStore';
import { getStatsSummary } from '@/lib/statsSummary';
import { getRequestLocale } from '@/lib/requestLocale';
import { withLocalePath } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Leaderboard — WZPRO Meta',
  description: 'Top Warzone players ranked by K/D from their imported games.',
};

const MIN_GAMES = 3;
const MAX_ROWS = 100;

// Locale-independent ranking, cached so the heavy "read every public profile +
// compute stats" work runs at most once a minute, not on every request/locale.
const getRankedPlayers = unstable_cache(
  async () => {
    const profiles = await getPublicProfiles();
    return profiles
      .filter(
        (profile) =>
          profile.privacy.publicProfile &&
          profile.privacy.stats &&
          Boolean(profile.pseudo) &&
          profile.statsEntries.length >= MIN_GAMES,
      )
      .map((profile) => {
        const summary = getStatsSummary(profile.statsEntries);
        return {
          userId: profile.userId,
          pseudo: profile.pseudo,
          picture: profile.profilePicture,
          avatarX: profile.avatarPositionX,
          avatarY: profile.avatarPositionY,
          platform: profile.mainPlatform ? profile.mainPlatform.replace('-', ' ') : '',
          kd: summary.kd,
          games: summary.games,
          winRate: Math.round(summary.winRate),
        };
      })
      .sort((a, b) => b.kd - a.kd || b.games - a.games)
      .slice(0, MAX_ROWS);
  },
  ['leaderboard-ranked'],
  { revalidate: 60 },
);

export default async function LeaderboardPage() {
  const locale = await getRequestLocale();
  const isFr = locale === 'fr';
  const isEs = locale === 'es';
  const href = (path: string) => withLocalePath(path, locale);
  const t = {
    back: isFr ? '← WZPRO' : '← WZPRO',
    community: isFr ? 'Communaute' : isEs ? 'Comunidad' : 'Community',
    loadouts: isFr ? 'Classes' : isEs ? 'Clases' : 'Loadouts',
    title: isFr ? 'CLASSEMENT' : isEs ? 'CLASIFICACION' : 'LEADERBOARD',
    sub: isFr
      ? 'Top joueurs classes par K/D, depuis leurs parties importees via WZPRO Companion.'
      : isEs
        ? 'Mejores jugadores por K/D, desde sus partidas importadas con WZPRO Companion.'
        : 'Top players ranked by K/D, from games imported with WZPRO Companion.',
    games: isFr ? 'parties' : isEs ? 'partidas' : 'games',
    win: isFr ? 'victoire' : isEs ? 'victoria' : 'win',
    empty: isFr
      ? 'Pas encore assez de joueurs publics avec des stats. Connecte WZPRO Companion et rends ton profil public pour apparaitre ici.'
      : isEs
        ? 'Aun no hay suficientes jugadores publicos con estadisticas. Conecta WZPRO Companion y haz tu perfil publico para aparecer aqui.'
        : 'Not enough public players with stats yet. Connect WZPRO Companion and make your profile public to appear here.',
    minGames: isFr
      ? `Minimum ${MIN_GAMES} parties importees. Mise a jour en continu.`
      : isEs
        ? `Minimo ${MIN_GAMES} partidas importadas. Actualizado en continuo.`
        : `Minimum ${MIN_GAMES} imported games. Continuously updated.`,
  };

  const ranked = await getRankedPlayers();

  return (
    <main className="lb-main">
      <nav className="lb-topbar" aria-label="Navigation">
        <Link className="lb-back" href={href('/')}>{t.back}</Link>
        <Link href={href('/community')}>{t.community}</Link>
        <Link href={href('/#all-loadouts')}>{t.loadouts}</Link>
      </nav>

      <header className="lb-head">
        <h1 className="lb-title">{t.title}</h1>
        <p className="lb-sub">{t.sub}</p>
        <p className="lb-note">{t.minGames}</p>
      </header>

      {ranked.length === 0 ? (
        <p className="lb-empty">{t.empty}</p>
      ) : (
        <ol className="lb-list">
          {ranked.map((row, index) => (
            <li key={row.userId} className="lb-row" data-rank={index + 1}>
              <span className="lb-rank">{String(index + 1).padStart(2, '0')}</span>
              <span className="lb-avatar" aria-hidden="true">
                {row.picture ? (
                  <i
                    style={{
                      backgroundImage: `url(${row.picture})`,
                      backgroundPosition: `${row.avatarX}% ${row.avatarY}%`,
                    }}
                  />
                ) : (
                  <b>{row.pseudo.slice(0, 2).toUpperCase()}</b>
                )}
              </span>
              <Link className="lb-name" href={href(`/profile/${encodeURIComponent(row.pseudo)}`)}>
                <strong>{row.pseudo}</strong>
                {row.platform ? <small>{row.platform}</small> : null}
              </Link>
              <span className="lb-stat lb-kd">
                <b>{row.kd.toFixed(2)}</b>
                <small>K/D</small>
              </span>
              <span className="lb-stat">
                <b>{row.games}</b>
                <small>{t.games}</small>
              </span>
              <span className="lb-stat">
                <b>{row.winRate}%</b>
                <small>{t.win}</small>
              </span>
            </li>
          ))}
        </ol>
      )}

      <style>{`
        .lb-main {
          width: min(1080px, calc(100% - 2rem));
          margin: 0 auto;
          padding: 1.5rem 0 2rem;
        }
        .lb-topbar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 1.25rem;
          padding: 0.75rem 0;
          border-bottom: 1px solid var(--tm-line, rgba(16,16,14,0.18));
          font-family: var(--tm-mono, monospace);
        }
        .lb-topbar a {
          font-size: 0.68rem;
          font-weight: 900;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          text-decoration: none;
          color: var(--tm-muted, rgba(16,16,14,0.7));
        }
        .lb-topbar a:hover { color: var(--tm-blue, #163cff); }
        .lb-topbar .lb-back { color: var(--tm-ink); margin-right: auto; }
        .lb-head { margin: 1.5rem 0 1.25rem; }
        .lb-title {
          margin: 0;
          font-family: var(--tm-mono, monospace);
          font-size: clamp(2rem, 6vw, 3.4rem);
          letter-spacing: 0.08em;
          line-height: 1;
          color: var(--tm-ink);
        }
        .lb-sub {
          margin: 0.6rem 0 0;
          font-family: var(--tm-mono, monospace);
          font-size: 0.8rem;
          line-height: 1.6;
          color: var(--tm-muted, rgba(16,16,14,0.7));
          max-width: 720px;
        }
        .lb-note {
          margin: 0.35rem 0 0;
          font-family: var(--tm-mono, monospace);
          font-size: 0.62rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--tm-blue, #163cff);
        }
        .lb-empty {
          font-family: var(--tm-mono, monospace);
          font-size: 0.82rem;
          line-height: 1.6;
          color: var(--tm-muted, rgba(16,16,14,0.7));
          border: 1px solid var(--tm-line, rgba(16,16,14,0.18));
          padding: 1.5rem;
        }
        .lb-list {
          list-style: none;
          margin: 0 0 4rem;
          padding: 0;
          display: grid;
          gap: 1px;
          border: 1px solid var(--tm-line, rgba(16,16,14,0.18));
          background: var(--tm-line, rgba(16,16,14,0.18));
          font-family: var(--tm-mono, monospace);
        }
        .lb-row {
          display: grid;
          grid-template-columns: 44px 44px minmax(0, 1fr) repeat(3, 78px);
          align-items: center;
          gap: 0.75rem;
          padding: 0.7rem 1rem;
          background: var(--tm-paper, #efeee8);
        }
        .lb-row[data-rank="1"] .lb-rank { color: #ffcc00; }
        .lb-row[data-rank="2"] .lb-rank { color: #c0c6d0; }
        .lb-row[data-rank="3"] .lb-rank { color: #cd7f32; }
        .lb-rank {
          font-size: 1rem;
          font-weight: 950;
          color: var(--tm-blue, #163cff);
          text-align: center;
        }
        .lb-avatar {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          overflow: hidden;
          border: 1px solid var(--tm-line, rgba(16,16,14,0.18));
          background: var(--tm-paper, #efeee8);
        }
        .lb-avatar i {
          width: 100%;
          height: 100%;
          background-size: cover;
          background-repeat: no-repeat;
        }
        .lb-avatar b {
          font-size: 0.72rem;
          font-weight: 900;
          color: var(--tm-ink);
        }
        .lb-name {
          min-width: 0;
          display: grid;
          gap: 0.1rem;
          color: var(--tm-ink);
          text-decoration: none;
        }
        .lb-name strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 0.92rem;
        }
        .lb-name small {
          font-size: 0.58rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--tm-muted, rgba(16,16,14,0.6));
        }
        .lb-name:hover strong { color: var(--tm-blue, #163cff); }
        .lb-stat {
          display: grid;
          gap: 0.1rem;
          text-align: right;
        }
        .lb-stat b { font-size: 0.92rem; color: var(--tm-ink); }
        .lb-stat small {
          font-size: 0.54rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--tm-muted, rgba(16,16,14,0.6));
        }
        .lb-kd b { color: var(--tm-blue, #163cff); }
        @media (max-width: 640px) {
          .lb-row { grid-template-columns: 34px 36px minmax(0, 1fr) 64px; }
          .lb-row .lb-stat:not(.lb-kd) { display: none; }
        }
      `}</style>
    </main>
  );
}
