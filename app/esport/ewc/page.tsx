import { CompetitiveLeaderboardPage } from '@/components/CompetitivePageShell';
import { getCompetitionRows } from '@/lib/competitive-data';

export const metadata = {
  title: 'Esports World Cup Warzone Leaderboards - WZPRO Meta',
  description: 'EWC Warzone leaderboard and event history.',
};

export default async function EwcPage() {
  const rows = await getCompetitionRows('ewc');

  return (
    <CompetitiveLeaderboardPage
      active="ewc"
      eyebrow="Riyadh LAN"
      title="Esports World Cup Warzone"
      accent="Leaderboards"
      description="A cleaner EWC Warzone snapshot focused on the finished finals: match-point score, kills, top slayer, and the teams that controlled the lobby."
      logoText="EWC"
      year="2025"
      filters={['LAN', 'Finals', 'Final']}
      format="Match Point"
      status="Finished"
      metricLabel="Kills"
      scoreLabel="Points"
      sourceName="CODMunity EWC"
      sourceUrl="https://codmunity.gg/ewc"
      stats={[
        { label: 'Games Played', value: '10' },
        { label: 'Top Slayer', value: 'GROMALOK' },
        { label: 'Teams Tracked', value: rows.length.toString() },
      ]}
      rows={rows}
    />
  );
}
