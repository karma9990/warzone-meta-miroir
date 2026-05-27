import Link from 'next/link';
import { EsportChrome } from '@/components/CompetitivePageShell';
import { getWrsPageData } from '@/lib/competitive-data';
import WrsEventControls from '@/components/WrsEventControls';

export const metadata = {
  title: 'Warzone Resurgence Series Leaderboards - WZPRO Meta',
  description: 'WRS live leaderboard and match point scoring.',
};

const formatNumber = (value: number) => (
  Number.isInteger(value) ? value.toString() : value.toFixed(1)
);

const views = [
  { id: 'live', label: 'LIVE VIEW' },
  { id: 'overview', label: 'Overview' },
  { id: 'detailed', label: 'Detailed view' },
  { id: 'maps', label: 'Maps' },
  { id: 'players', label: 'Player Stats' },
  { id: 'teams', label: 'Team Stats' },
  { id: 'guns', label: 'Guns & loadouts' },
];

function viewHref(
  selected: Awaited<ReturnType<typeof getWrsPageData>>['selected'],
  view: string,
) {
  const params = new URLSearchParams();

  if (selected.year?.value) params.set('year', selected.year.value);
  if (selected.stage?.value) params.set('stage', selected.stage.value);
  if (selected.phase?.value) params.set('phase', selected.phase.value);
  if (selected.event?.value) params.set('event', selected.event.value);
  if (view !== 'live') params.set('view', view);

  return `/esport/resurgence-series?${params.toString()}`;
}

export default async function ResurgenceSeriesPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; stage?: string; phase?: string; event?: string; view?: string }>;
}) {
  const query = await searchParams;
  const activeView = views.some((view) => view.id === query.view) ? query.view || 'live' : 'live';
  const data = await getWrsPageData(query);
  const selectedEvent = data.selected.event;
  const eventStatus = selectedEvent?.active ? 'Live Event' : 'Finished';

  return (
    <EsportChrome active="resurgence">
      <main className="competitive-page">
        <header className="competitive-hero">
          <div>
            <p>Live Event</p>
            <h1>Warzone Resurgence Series <span>WRS Leaderboards</span></h1>
            <small>
              Welcome to the WRS tracking hub: match-point standings, live map scoring,
              team totals, kills, deaths, K/D, and placement pressure for the LAN Finals.
            </small>
          </div>
          <div className="competitive-logo">WRS</div>
        </header>

        <div className="competitive-actions">
          <button className="is-primary">Event Leaderboards</button>
          <Link href="/esport/calendar">Calendar</Link>
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
              <input placeholder="Search a player..." />
            </label>
          </div>

          <div className="competitive-tabs">
            <div>
              {views.map((view) => (
                <Link
                  key={view.id}
                  className={activeView === view.id ? 'is-live' : undefined}
                  href={viewHref(data.selected, view.id)}
                >
                  {view.label}
                </Link>
              ))}
            </div>
            <p>Format: <strong>{selectedEvent?.format || 'Match Point'}</strong> <span>{eventStatus}</span></p>
          </div>

          {activeView === 'live' && (
            <div className="competitive-live-strip">
              <span />
              Automated live view. Data follows CODMunity public WRS scoring and refreshes from server cache.
              <button>Full Screen</button>
            </div>
          )}

          {(activeView === 'live' || activeView === 'overview') && (
            <div className="competitive-stat-grid">
              <article><span>Games Played</span><strong>{data.gamesPlayed}</strong></article>
              <article><span>Top Slayer</span><strong>{data.topSlayer}</strong></article>
              <article><span>Top Team Slayer</span><strong>{data.topTeamSlayer}</strong></article>
              <article><span>Match Point</span><strong>{data.matchpointThreshold}</strong></article>
              <article><span>Winner Flag</span><strong>{data.winner}</strong></article>
              <article><span>Teams Tracked</span><strong>{data.teams.length}</strong></article>
            </div>
          )}

          {activeView === 'live' && (
            <div className="wrs-grid">
              <div className="wrs-live-wrap">
                <div className="wrs-vertical-label">Scoreboard</div>
                <section className="wrs-panel">
                  <header>
                    <h2>Live Leaderboard</h2>
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
                  <h2>Live Map Scoring</h2>
                  <span>Map {data.mapNumber}</span>
                </header>
                <table className="wrs-table">
                  <thead>
                    <tr>
                      <th>Team</th>
                      <th>Status</th>
                      <th>Placement</th>
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
                  <dt>Total kills</dt><dd>{team.kills}</dd>
                  <dt>Total deaths</dt><dd>{team.deaths}</dd>
                  <dt>K / D</dt><dd>{team.kd.toFixed(1)}</dd>
                  <dt>Avg kills</dt><dd>{team.avgKills.toFixed(1)}</dd>
                  <dt>Avg placement</dt><dd>{team.avgPlacement.toFixed(1)}</dd>
                </dl>
              </article>
            ))}
          </section>
          )}

          {activeView === 'maps' && (
            <section className="wrs-panel">
              <header>
                <h2>Maps</h2>
                <span>{data.mapStats.length} played</span>
              </header>
              <table className="wrs-table">
                <thead>
                  <tr>
                    <th>Map</th>
                    <th>Top team</th>
                    <th>Placement</th>
                    <th>Kills</th>
                    <th>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {data.mapStats.map((map) => (
                    <tr key={map.map}>
                      <td>Map {map.map}</td>
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
                <h2>Player Stats</h2>
                <span>Kills</span>
              </header>
              <table className="wrs-table">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Team</th>
                    <th>Kills</th>
                    <th>Deaths</th>
                    <th>K / D</th>
                    <th>Weapon</th>
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
                <h2>Team Stats</h2>
                <span>Totals</span>
              </header>
              <table className="wrs-table">
                <thead>
                  <tr>
                    <th>Team</th>
                    <th>Players</th>
                    <th>Kills</th>
                    <th>Deaths</th>
                    <th>K / D</th>
                    <th>Avg Place</th>
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
                <h2>Guns & Loadouts</h2>
                <span>Weapon kills</span>
              </header>
              <table className="wrs-table">
                <thead>
                  <tr>
                    <th>Weapon</th>
                    <th>Class</th>
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
          <section className="wrs-overall-grid" aria-label="WRS overall stats">
            <article className="wrs-panel">
              <header>
                <h2>Overall Top Slayers</h2>
                <span>Kills</span>
              </header>
              <table className="wrs-overall-table">
                <thead>
                  <tr>
                    <th>Player</th>
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
                <h2>Overall Top Team Kills</h2>
                <span>Kills</span>
              </header>
              <table className="wrs-overall-table">
                <thead>
                  <tr>
                    <th>Team</th>
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
