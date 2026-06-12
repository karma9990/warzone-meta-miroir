import { CompetitiveLeaderboardPage } from '@/components/CompetitivePageShell';
import { getCompetitionRows } from '@/lib/competitive-data';
import { getRequestLocale } from '@/lib/requestLocale';

export const metadata = {
  title: 'Pullze Check Ladder Leaderboards - WZPRO Meta',
  description: 'Pullze Check Ladder leaderboard and insight analysis.',
};

export default async function PullzeCheckPage() {
  const [rows, locale] = await Promise.all([getCompetitionRows('pcl'), getRequestLocale()]);
  const isFr = locale === 'fr';

  return (
    <CompetitiveLeaderboardPage
      active="pullze"
      eyebrow={isFr ? 'Ligue Customs' : 'Customs League'}
      title="Pullze Check Ladder"
      accent={isFr ? 'Classements' : 'Leaderboards'}
      description={isFr ? 'Suivez la Pullze Check Ladder : classements lisibles, contexte trio, eliminations et scoring customs.' : 'Follow the Pullze Check Ladder league with a WZ Meta presentation: readable standings, player trio context, kills, and regular-customs scoring.'}
      logoText="PCL"
      filters={isFr ? ['Saison 2', 'Phase de groupe', 'B vs C'] : ['Season 2', 'Group Stage', 'B vs C']}
      format="Regular Customs"
      status={isFr ? 'Termine' : 'Finished'}
      metricLabel="Kills"
      scoreLabel="Points"
      sourceName="CODMunity PCL"
      sourceUrl="https://codmunity.gg/pcl"
      stats={[
        { label: isFr ? 'Parties jouees' : 'Games Played', value: '8' },
        { label: isFr ? 'Meilleur slayer' : 'Top Slayer', value: 'GRIMEY' },
        { label: isFr ? 'Equipes suivies' : 'Teams Tracked', value: rows.length.toString() },
      ]}
      rows={rows}
    />
  );
}
