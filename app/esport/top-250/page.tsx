import { CompetitiveLeaderboardPage } from '@/components/CompetitivePageShell';
import { getTop250Rows } from '@/lib/competitive-data';

export const metadata = {
  title: 'Warzone Ranked Top 250 - WZPRO Meta',
  description: 'Warzone Ranked Top 250 leaderboard snapshot for competitive tracking.',
};

export default async function Top250Page() {
  const rows = await getTop250Rows();
  const filledRows = rows.filter((row) => !row.unavailable);
  const highestSr = filledRows.find((row) => row.rank === 1)?.points || 0;

  return (
    <CompetitiveLeaderboardPage
      active="top250"
      eyebrow="Ranked Play"
      title="Warzone Ranked -"
      accent="Top 250 Leaderboard"
      description="Browse every Top 250 rank slot for Warzone Ranked Play. Filled rows come from CODMunity public data; unavailable slots are shown explicitly instead of pretending the profile exists."
      logoText="250"
      filters={['2026', 'Season 3', 'Resurgence']}
      tabs={['Resurgence', 'Multiplayer']}
      format="Ranked Play"
      status="Public API snapshot"
      metricLabel="SR var"
      scoreLabel="Total SR"
      sourceName="CODMunity Top 250"
      sourceUrl="https://codmunity.gg/top-250"
      sourceNote={`${filledRows.length} named players exposed by CODMunity public data, rendered across all 250 rank slots.`}
      stats={[
        { label: 'Rank Slots', value: '250' },
        { label: 'Public Entries', value: filledRows.length.toString() },
        { label: 'Highest SR', value: highestSr.toLocaleString('en-US') },
      ]}
      rows={rows}
    />
  );
}
