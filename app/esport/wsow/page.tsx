import { CompetitiveLeaderboardPage } from '@/components/CompetitivePageShell';
import { getCompetitionRows } from '@/lib/competitive-data';
import { getRequestLocale } from '@/lib/requestLocale';

export const metadata = {
  title: 'World Series of Warzone Leaderboards - WZPRO Meta',
  description: 'WSOW competitive leaderboards and event overview.',
};

export default async function WsowPage() {
  const [rows, locale] = await Promise.all([getCompetitionRows('wsow'), getRequestLocale()]);
  const isFr = locale === 'fr';

  return (
    <CompetitiveLeaderboardPage
      active="wsow"
      eyebrow={isFr ? 'Finales Mondiales' : 'Global Finals'}
      title="World Series of Warzone"
      accent={isFr ? 'Classements WSOW' : 'WSOW Leaderboards'}
      description={isFr ? 'Suivez le circuit officiel WSOW : classements clairs, pression d elimination et contexte match-point.' : 'Follow the official WSOW circuit through a WZ Meta lens: clean standings, kill pressure, and match-point context without the heavy broadcast dashboard look.'}
      logoText="WSOW"
      year="2025"
      filters={isFr ? ['Mondial', 'LAN Mondial', 'Finales'] : ['Global', 'Global LAN', 'Finals']}
      format="Match Point"
      status={isFr ? 'Termine' : 'Finished'}
      metricLabel="Kills"
      scoreLabel="Points"
      sourceName="CODMunity WSOW"
      sourceUrl="https://codmunity.gg/wsow"
      stats={[
        { label: isFr ? 'Parties jouees' : 'Games Played', value: '8' },
        { label: isFr ? 'Meilleur joueur' : 'Top Player', value: 'ENKEO' },
        { label: isFr ? 'Equipes suivies' : 'Teams Tracked', value: rows.length.toString() },
      ]}
      rows={rows}
    />
  );
}
