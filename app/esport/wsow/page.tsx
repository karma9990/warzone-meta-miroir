import { CompetitiveLeaderboardPage } from '@/components/CompetitivePageShell';
import { getCompetitionRows } from '@/lib/competitive-data';

export const metadata = {
  title: 'World Series of Warzone Leaderboards - WZPRO Meta',
  description: 'WSOW competitive leaderboards and event overview.',
};

export default async function WsowPage() {
  const rows = await getCompetitionRows('wsow');

  return (
    <CompetitiveLeaderboardPage
      active="wsow"
      eyebrow="Global Finals"
      title="World Series of Warzone"
      accent="WSOW Leaderboards"
      description="Follow the official WSOW circuit through a WZ Meta lens: clean standings, kill pressure, and match-point context without the heavy broadcast dashboard look."
      logoText="WSOW"
      year="2025"
      filters={['Global', 'Global LAN', 'Finals']}
      format="Match Point"
      status="Finished"
      metricLabel="Kills"
      scoreLabel="Points"
      sourceName="CODMunity WSOW"
      sourceUrl="https://codmunity.gg/wsow"
      stats={[
        { label: 'Games Played', value: '8' },
        { label: 'Top Player', value: 'ENKEO' },
        { label: 'Teams Tracked', value: rows.length.toString() },
      ]}
      rows={rows}
    />
  );
}
