import { CompetitiveLeaderboardPage } from '@/components/CompetitivePageShell';
import { getCompetitionRows } from '@/lib/competitive-data';
import { getRequestLocale } from '@/lib/requestLocale';

export const metadata = {
  title: 'Esports World Cup Warzone Leaderboards - WZPRO Meta',
  description: 'EWC Warzone leaderboard and event history.',
};

export default async function EwcPage() {
  const [rows, locale] = await Promise.all([getCompetitionRows('ewc'), getRequestLocale()]);
  const isFr = locale === 'fr';

  return (
    <CompetitiveLeaderboardPage
      active="ewc"
      eyebrow={isFr ? 'LAN Riyadh' : 'Riyadh LAN'}
      title="Esports World Cup Warzone"
      accent={isFr ? 'Classements' : 'Leaderboards'}
      description={isFr ? 'Un apercu plus propre de l EWC Warzone axe sur les finales : score match-point, eliminations, meilleur slayer et les equipes qui ont domine.' : 'A cleaner EWC Warzone snapshot focused on the finished finals: match-point score, kills, top slayer, and the teams that controlled the lobby.'}
      logoText="EWC"
      year="2025"
      filters={isFr ? ['LAN', 'Finales', 'Finale'] : ['LAN', 'Finals', 'Final']}
      format="Match Point"
      status={isFr ? 'Termine' : 'Finished'}
      metricLabel="Kills"
      scoreLabel="Points"
      sourceName="CODMunity EWC"
      sourceUrl="https://codmunity.gg/ewc"
      stats={[
        { label: isFr ? 'Parties jouees' : 'Games Played', value: '10' },
        { label: isFr ? 'Meilleur slayer' : 'Top Slayer', value: 'GROMALOK' },
        { label: isFr ? 'Equipes suivies' : 'Teams Tracked', value: rows.length.toString() },
      ]}
      rows={rows}
    />
  );
}
