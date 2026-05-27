import { CompetitiveLeaderboardPage } from '@/components/CompetitivePageShell';
import { getCompetitionRows } from '@/lib/competitive-data';

export const metadata = {
  title: 'Pullze Check Ladder Leaderboards - WZPRO Meta',
  description: 'Pullze Check Ladder leaderboard and insight analysis.',
};

export default async function PullzeCheckPage() {
  const rows = await getCompetitionRows('pcl');

  return (
    <CompetitiveLeaderboardPage
      active="pullze"
      eyebrow="Customs League"
      title="Pullze Check Ladder"
      accent="Leaderboards"
      description="Follow the Pullze Check Ladder league with a WZ Meta presentation: readable standings, player trio context, kills, and regular-customs scoring."
      logoText="PCL"
      filters={['Season 2', 'Group Stage', 'B vs C']}
      format="Regular Customs"
      status="Finished"
      metricLabel="Kills"
      scoreLabel="Points"
      sourceName="CODMunity PCL"
      sourceUrl="https://codmunity.gg/pcl"
      stats={[
        { label: 'Games Played', value: '8' },
        { label: 'Top Slayer', value: 'GRIMEY' },
        { label: 'Teams Tracked', value: rows.length.toString() },
      ]}
      rows={rows}
    />
  );
}
