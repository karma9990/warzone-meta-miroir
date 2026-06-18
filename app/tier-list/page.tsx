import type { Metadata } from 'next';
import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import { getLoadouts, type Tier } from '@/lib/data';
import { calculateMetaScore } from '@/lib/loadoutUtils';
import { getLoadoutPath } from '@/lib/seo';
import { getRequestLocale } from '@/lib/requestLocale';
import { withLocalePath, translateTerm } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Warzone Tier List — WZPRO Meta',
  description: 'Current Warzone weapon tier list (S / A / B / C) with meta scores and the best loadouts.',
};

const TIER_ORDER: Tier[] = ['S', 'A', 'B', 'C'];

// Cache the grouping so we read + score the catalog at most once a minute.
const getTierGroups = unstable_cache(
  async () => {
    const loadouts = await getLoadouts();
    const scored = loadouts.map((loadout) => ({
      id: loadout.id,
      path: getLoadoutPath(loadout),
      weapon: loadout.weapon,
      category: loadout.category,
      playstyle: loadout.playstyle,
      tier: loadout.tier,
      score: calculateMetaScore(loadout),
    }));
    return TIER_ORDER.map((tier) => ({
      tier,
      items: scored.filter((item) => item.tier === tier).sort((a, b) => b.score - a.score),
    })).filter((group) => group.items.length > 0);
  },
  ['tier-list-groups'],
  { revalidate: 60 },
);

export default async function TierListPage() {
  const locale = await getRequestLocale();
  const isFr = locale === 'fr';
  const isEs = locale === 'es';
  const href = (path: string) => withLocalePath(path, locale);
  const t = {
    back: '← WZPRO',
    leaderboard: isFr ? 'Classement' : isEs ? 'Clasificacion' : 'Leaderboard',
    loadouts: isFr ? 'Classes' : isEs ? 'Clases' : 'Loadouts',
    title: 'TIER LIST',
    sub: isFr
      ? 'Classement des armes Warzone par tier, avec score meta et meilleures classes.'
      : isEs
        ? 'Clasificacion de armas de Warzone por tier, con puntuacion meta y mejores clases.'
        : 'Warzone weapons ranked by tier, with meta score and the best loadouts.',
    score: isFr ? 'Score' : isEs ? 'Puntos' : 'Score',
    open: isFr ? 'Voir la classe' : isEs ? 'Ver clase' : 'View loadout',
    empty: isFr ? 'Aucune classe disponible pour le moment.' : isEs ? 'No hay clases disponibles por ahora.' : 'No loadouts available right now.',
  };

  const groups = await getTierGroups();

  return (
    <main className="tl-main">
      <nav className="tl-topbar" aria-label="Navigation">
        <Link className="tl-back" href={href('/')}>{t.back}</Link>
        <Link href={href('/leaderboard')}>{t.leaderboard}</Link>
        <Link href={href('/#all-loadouts')}>{t.loadouts}</Link>
      </nav>

      <header className="tl-head">
        <h1 className="tl-title">{t.title}</h1>
        <p className="tl-sub">{t.sub}</p>
      </header>

      {groups.length === 0 ? (
        <p className="tl-empty">{t.empty}</p>
      ) : (
        groups.map((group) => (
          <section key={group.tier} className="tl-tier" data-tier={group.tier}>
            <div className="tl-tier-badge" aria-hidden="true">{group.tier}</div>
            <ul className="tl-grid">
              {group.items.map((item) => (
                <li key={item.id} className="tl-card">
                  <div className="tl-card-head">
                    <strong>{item.weapon}</strong>
                    <span className="tl-score">{item.score}</span>
                  </div>
                  <p className="tl-meta">
                    {translateTerm(item.category, locale)} / {translateTerm(item.playstyle, locale)}
                  </p>
                  <Link className="tl-open" href={href(item.path)}>{t.open}</Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <style>{`
        .tl-main {
          width: min(1080px, calc(100% - 2rem));
          margin: 0 auto;
          padding: 1.5rem 0 4rem;
          font-family: var(--tm-mono, monospace);
        }
        .tl-topbar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 1.25rem;
          padding: 0.75rem 0;
          border-bottom: 1px solid var(--tm-line, rgba(16,16,14,0.18));
        }
        .tl-topbar a {
          font-size: 0.68rem;
          font-weight: 900;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          text-decoration: none;
          color: var(--tm-muted, rgba(16,16,14,0.7));
        }
        .tl-topbar a:hover { color: var(--tm-blue, #163cff); }
        .tl-topbar .tl-back { color: var(--tm-ink); margin-right: auto; }
        .tl-head { margin: 1.5rem 0 1.5rem; }
        .tl-title {
          margin: 0;
          font-size: clamp(2rem, 6vw, 3.4rem);
          letter-spacing: 0.08em;
          line-height: 1;
          color: var(--tm-ink);
        }
        .tl-sub {
          margin: 0.6rem 0 0;
          font-size: 0.8rem;
          line-height: 1.6;
          color: var(--tm-muted, rgba(16,16,14,0.7));
          max-width: 720px;
        }
        .tl-empty {
          font-size: 0.82rem;
          color: var(--tm-muted, rgba(16,16,14,0.7));
          border: 1px solid var(--tm-line, rgba(16,16,14,0.18));
          padding: 1.5rem;
        }
        .tl-tier {
          display: grid;
          grid-template-columns: 64px minmax(0, 1fr);
          gap: 1rem;
          margin-bottom: 1.25rem;
          align-items: start;
        }
        .tl-tier-badge {
          display: grid;
          place-items: center;
          height: 64px;
          font-size: 2rem;
          font-weight: 950;
          color: #fff;
          background: var(--tm-blue, #163cff);
        }
        .tl-tier[data-tier="S"] .tl-tier-badge { background: #ff4655; }
        .tl-tier[data-tier="A"] .tl-tier-badge { background: #ff9f1c; }
        .tl-tier[data-tier="B"] .tl-tier-badge { background: #2dc6c6; }
        .tl-tier[data-tier="C"] .tl-tier-badge { background: #7a7f8a; }
        .tl-grid {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1px;
          border: 1px solid var(--tm-line, rgba(16,16,14,0.18));
          background: var(--tm-line, rgba(16,16,14,0.18));
        }
        .tl-card {
          display: grid;
          gap: 0.5rem;
          padding: 0.9rem;
          background: var(--tm-paper, #efeee8);
        }
        .tl-card-head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 0.5rem;
        }
        .tl-card-head strong {
          font-size: 0.92rem;
          color: var(--tm-ink);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .tl-score {
          font-size: 1rem;
          font-weight: 950;
          color: var(--tm-blue, #163cff);
        }
        .tl-meta {
          margin: 0;
          font-size: 0.64rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--tm-muted, rgba(16,16,14,0.6));
          line-height: 1.4;
        }
        .tl-open {
          justify-self: start;
          margin-top: 0.2rem;
          font-size: 0.58rem;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          text-decoration: none;
          color: var(--tm-blue, #163cff);
        }
        .tl-open:hover { text-decoration: underline; text-underline-offset: 3px; }
        @media (max-width: 560px) {
          .tl-tier { grid-template-columns: 48px minmax(0, 1fr); gap: 0.7rem; }
          .tl-tier-badge { height: 48px; font-size: 1.5rem; }
        }
      `}</style>
    </main>
  );
}
