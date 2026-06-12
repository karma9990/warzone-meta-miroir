import Link from 'next/link';
import { EsportChrome } from '@/components/CompetitivePageShell';
import { getWrsPageData } from '@/lib/competitive-data';
import WrsEventControls from '@/components/WrsEventControls';
import LocalizedText from '@/components/LocalizedText';
import { withLocalePath, type Locale } from '@/lib/i18n';
import { getRequestLocale } from '@/lib/requestLocale';

export const metadata = {
  title: 'Warzone Resurgence Series Leaderboards - WZPRO Meta',
  description: 'WRS live leaderboard and match point scoring.',
};

const formatNumber = (value: number) => (
  Number.isInteger(value) ? value.toString() : value.toFixed(1)
);

const views = [
  { id: 'live', labelEn: 'LIVE VIEW', labelFr: 'VUE LIVE' },
  { id: 'overview', labelEn: 'Overview', labelFr: 'Apercu' },
  { id: 'detailed', labelEn: 'Detailed view', labelFr: 'Vue detaillee' },
  { id: 'maps', labelEn: 'Maps', labelFr: 'Cartes' },
  { id: 'players', labelEn: 'Player Stats', labelFr: 'Stats joueurs' },
  { id: 'teams', labelEn: 'Team Stats', labelFr: 'Stats equipes' },
  { id: 'guns', labelEn: 'Guns & loadouts', labelFr: 'Armes et classes' },
];

function viewHref(
  selected: Awaited<ReturnType<typeof getWrsPageData>>['selected'],
  view: string,
  locale: Locale,
) {
  const params = new URLSearchParams();

  if (selected.year?.value) params.set('year', selected.year.value);
  if (selected.stage?.value) params.set('stage', selected.stage.value);
  if (selected.phase?.value) params.set('phase', selected.phase.value);
  if (selected.event?.value) params.set('event', selected.event.value);
  if (view !== 'live') params.set('view', view);

  return withLocalePath(`/esport/resurgence-series?${params.toString()}`, locale);
}

export default async function ResurgenceSeriesPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; stage?: string; phase?: string; event?: string; view?: string }>;
}) {
  const [query, locale] = await Promise.all([searchParams, getRequestLocale()]);
  const isFr = locale === 'fr';
  const activeView = views.some((view) => view.id === query.view) ? query.view || 'live' : 'live';
  const data = await getWrsPageData(query);
  const selectedEvent = data.selected.event;
  const eventStatus = selectedEvent?.active ? (isFr ? 'En direct' : 'Live Event') : (isFr ? 'Termine' : 'Finished');

  return (
    <EsportChrome active="resurgence">
      <main className="competitive-page">
        <header className="competitive-hero">
          <div>
            <p>{isFr ? 'En direct' : 'Live Event'}</p>
            <h1>Warzone Resurgence Series <span>{isFr ? 'Classements WRS' : 'WRS Leaderboards'}</span></h1>
            <small>
              {isFr ? 'Hub de suivi WRS : classements match-point, scoring live par carte, totaux equipe, eliminations, morts, K/D et pression de placement pour les finales LAN.' : 'Welcome to the WRS tracking hub: match-point standings, live map scoring, team totals, kills, deaths, K/D, and placement pressure for the LAN Finals.'}
            </small>
          </div>
          <div className="competitive-logo">WRS</div>
        </header>

        <div className="competitive-actions">
          <button type="button" className="is-primary">
            <LocalizedText values={{ en: 'Event Leaderboards', fr: 'Classements evenement', es: 'Clasificaciones del evento', de: 'Event-Ranglisten', it: 'Classifiche evento', pt: 'Rankings do evento', nl: 'Eventranglijsten', pl: 'Rankingi wydarzenia', ja: 'イベントランキング' }} />
          </button>
          <Link href={withLocalePath('/esport/calendar', locale)}>
            <LocalizedText values={{ en: 'Calendar', fr: 'Calendrier', es: 'Agenda', de: 'Kalender', it: 'Programma', pt: 'Agenda', nl: 'Kalender', pl: 'Kalendarz', ja: 'カレンダー' }} />
          </Link>
          <span>{data.filters[0]}</span>
        </div>

        <section className="competitive-board">
          <WrsEventControls
            stages={data.stages}
            phases={data.phases}
            events={data.events}
            selected={data.selected}
          />

          <div className="competitive-filters wrs-search-row">
            <label>
              <input aria-label="Search a player" placeholder="Search a player..." />
            </label>
          </div>

          <div className="competitive-tabs">
            <div>
                {views.map((view) => (
                <Link
                  key={view.id}
                  className={activeView === view.id ? 'is-live' : undefined}
                  href={viewHref(data.selected, view.id, locale)}
                >
                  {isFr ? view.labelFr : view.labelEn}
                </Link>
              ))}
            </div>
            <p>{isFr ? 'Format' : 'Format'}: <strong>{selectedEvent?.format || 'Match Point'}</strong> <span>{eventStatus}</span></p>
          </div>

          {activeView === 'live' && (
            <div className="competitive-live-strip">
              <span />
              Automated live view. Data follows CODMunity public WRS scoring and refreshes from server cache.
              <button type="button">{isFr ? 'Plein ecran' : 'Full Screen'}</button>
            </div>
          )}

          {(activeView === 'live' || activeView === 'overview') && (
            <div className="competitive-stat-grid">
              <article><span>{isFr ? 'Parties jouees' : 'Games Played'}</span><strong>{data.gamesPlayed}</strong></article>
              <article><span>{isFr ? 'Meilleur slayer' : 'Top Slayer'}</span><strong>{data.topSlayer}</strong></article>
              <article><span>{isFr ? 'Meilleur slayer equipe' : 'Top Team Slayer'}</span><strong>{data.topTeamSlayer}</strong></article>
              <article><span>Match Point</span><strong>{data.matchpointThreshold}</strong></article>
              <article><span>{isFr ? 'Gagnant' : 'Winner Flag'}</span><strong>{data.winner}</strong></article>
              <article><span>{isFr ? 'Equipes suivies' : 'Teams Tracked'}</span><strong>{data.teams.length}</strong></article>
            </div>
          )}

          {activeView === 'live' && (
            <div className="wrs-grid">
              <div className="wrs-live-wrap">
                <div className="wrs-vertical-label">{isFr ? 'Classement' : 'Scoreboard'}</div>
                <section className="wrs-panel">
                  <header>
                    <h2>{isFr ? 'Classement Live' : 'Live Leaderboard'}</h2>
                    <span>Points</span>
                  </header>
                  <div className="wrs-live-list">
                    {data.teams.map((team) => (
                      <article key={team.name} className={`wrs-live-row${team.isWinner ? ' is-winner' : ''}`}>
                        <span className="wrs-rank">{team.rank}</span>
                        <div>
                          <strong>{team.name}</strong>
                          <small>{team.players}</small>
                        </div>
                        <div className="wrs-points">
                          {formatNumber(team.points)}
                          <span>{team.kills} kills</span>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              </div>

              <section className="wrs-panel">
                <header>
                  <h2>{isFr ? 'Scoring Live par Carte' : 'Live Map Scoring'}</h2>
                  <span>{isFr ? 'Carte' : 'Map'} {data.mapNumber}</span>
                </header>
                <table className="wrs-table">
                  <thead>
                    <tr>
                      <th>{isFr ? 'Equipe' : 'Team'}</th>
                      <th>{isFr ? 'Statut' : 'Status'}</th>
                      <th>{isFr ? 'Placement' : 'Placement'}</th>
                      <th>Kills</th>
                      <th>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.teams.map((team) => (
                      <tr key={`${team.name}-map`}>
                        <td>{team.name}</td>
                        <td><span className="wrs-status">{team.mapStatus}</span></td>
                        <td>{team.mapPlacement}</td>
                        <td>{team.mapKills}</td>
                        <td>{formatNumber(team.mapPoints)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </div>
          )}

          {(activeView === 'detailed' || activeView === 'overview') && (
          <section className="wrs-detail-grid" aria-label="WRS team details">
            {data.teams.slice(0, 8).map((team) => (
              <article className="wrs-detail-card" key={`${team.name}-detail`}>
                <strong>{team.name}</strong>
                <p>{team.players}</p>
                <dl>
                  <dt>{isFr ? 'Total kills' : 'Total kills'}</dt><dd>{team.kills}</dd>
                  <dt>{isFr ? 'Total morts' : 'Total deaths'}</dt><dd>{team.deaths}</dd>
                  <dt>K / D</dt><dd>{team.kd.toFixed(1)}</dd>
                  <dt>{isFr ? 'Moy kills' : 'Avg kills'}</dt><dd>{team.avgKills.toFixed(1)}</dd>
                  <dt>{isFr ? 'Moy placement' : 'Avg placement'}</dt><dd>{team.avgPlacement.toFixed(1)}</dd>
                </dl>
              </article>
            ))}
          </section>
          )}

          {activeView === 'maps' && (
            <section className="wrs-panel">
              <header>
                <h2>{isFr ? 'Cartes' : 'Maps'}</h2>
                <span>{data.mapStats.length} {isFr ? 'jouees' : 'played'}</span>
              </header>
              <table className="wrs-table">
                <thead>
                  <tr>
                    <th>{isFr ? 'Carte' : 'Map'}</th>
                    <th>{isFr ? 'Meilleure equipe' : 'Top team'}</th>
                    <th>{isFr ? 'Placement' : 'Placement'}</th>
                    <th>Kills</th>
                    <th>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {data.mapStats.map((map) => (
                    <tr key={map.map}>
                      <td>{isFr ? 'Carte' : 'Map'} {map.map}</td>
                      <td>{map.topTeam}</td>
                      <td>{map.winnerPlacement}</td>
                      <td>{map.topKills}</td>
                      <td>{formatNumber(map.topScore)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {activeView === 'players' && (
            <section className="wrs-panel">
              <header>
                <h2>{isFr ? 'Stats Joueurs' : 'Player Stats'}</h2>
                <span>Kills</span>
              </header>
              <table className="wrs-table">
                <thead>
                  <tr>
                    <th>{isFr ? 'Joueur' : 'Player'}</th>
                    <th>{isFr ? 'Equipe' : 'Team'}</th>
                    <th>Kills</th>
                    <th>{isFr ? 'Morts' : 'Deaths'}</th>
                    <th>K / D</th>
                    <th>{isFr ? 'Arme' : 'Weapon'}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.playerStats.slice(0, 48).map((player) => (
                    <tr key={`${player.team}-${player.name}`}>
                      <td>{player.name}</td>
                      <td>{player.team}</td>
                      <td>{player.kills}</td>
                      <td>{player.deaths}</td>
                      <td>{player.kd.toFixed(1)}</td>
                      <td>{player.favoriteWeapon}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {activeView === 'teams' && (
            <section className="wrs-panel">
              <header>
                <h2>{isFr ? 'Stats Equipes' : 'Team Stats'}</h2>
                <span>{isFr ? 'Totaux' : 'Totals'}</span>
              </header>
              <table className="wrs-table">
                <thead>
                  <tr>
                    <th>{isFr ? 'Equipe' : 'Team'}</th>
                    <th>{isFr ? 'Joueurs' : 'Players'}</th>
                    <th>Kills</th>
                    <th>{isFr ? 'Morts' : 'Deaths'}</th>
                    <th>K / D</th>
                    <th>{isFr ? 'Placement moy' : 'Avg Place'}</th>
                    <th>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {data.teams.map((team) => (
                    <tr key={`${team.name}-team-stats`}>
                      <td>{team.name}</td>
                      <td>{team.players}</td>
                      <td>{team.kills}</td>
                      <td>{team.deaths}</td>
                      <td>{team.kd.toFixed(1)}</td>
                      <td>{team.avgPlacement.toFixed(1)}</td>
                      <td>{formatNumber(team.points)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {activeView === 'guns' && (
            <section className="wrs-panel">
              <header>
                <h2>{isFr ? 'Armes et Classes' : 'Guns & Loadouts'}</h2>
                <span>{isFr ? 'Kills par arme' : 'Weapon kills'}</span>
              </header>
              <table className="wrs-table">
                <thead>
                  <tr>
                    <th>{isFr ? 'Arme' : 'Weapon'}</th>
                    <th>{isFr ? 'Classe' : 'Class'}</th>
                    <th>Kills</th>
                  </tr>
                </thead>
                <tbody>
                  {data.weaponStats.map((weapon) => (
                    <tr key={weapon.name}>
                      <td>{weapon.name}</td>
                      <td>{weapon.category}</td>
                      <td>{weapon.kills}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {activeView === 'overview' && (
          <section className="wrs-overall-grid" aria-label={isFr ? 'Stats globales WRS' : 'WRS overall stats'}>
            <article className="wrs-panel">
              <header>
                <h2>{isFr ? 'Meilleurs Slayers' : 'Overall Top Slayers'}</h2>
                <span>Kills</span>
              </header>
              <table className="wrs-overall-table">
                <thead>
                  <tr>
                    <th>{isFr ? 'Joueur' : 'Player'}</th>
                    <th>Kills</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topSlayers.map((player) => (
                    <tr key={player.name}>
                      <td>{player.name}</td>
                      <td>{player.kills}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>

            <article className="wrs-panel">
              <header>
                <h2>{isFr ? 'Meilleures Equipes en Kills' : 'Overall Top Team Kills'}</h2>
                <span>Kills</span>
              </header>
              <table className="wrs-overall-table">
                <thead>
                  <tr>
                    <th>{isFr ? 'Equipe' : 'Team'}</th>
                    <th>Kills</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topTeamKills.map((team) => (
                    <tr key={team.name}>
                      <td>{team.name}</td>
                      <td>{team.kills}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          </section>
          )}

          <div className="competitive-source">
            <span>WRS page rebuilt from CODMunity public scoring and competition data, including match-point leaderboard values.</span>
            <Link href="https://codmunity.gg/wrs">Source: CODMunity WRS</Link>
          </div>
        </section>
      </main>
    </EsportChrome>
  );
}
