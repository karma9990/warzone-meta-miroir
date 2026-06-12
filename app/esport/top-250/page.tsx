import { CompetitiveLeaderboardPage } from '@/components/CompetitivePageShell';
import { getTop250Rows } from '@/lib/competitive-data';
import { getRequestLocale } from '@/lib/requestLocale';

export const metadata = {
  title: 'Warzone Ranked Top 250 - WZPRO Meta',
  description: 'Warzone Ranked Top 250 leaderboard snapshot for competitive tracking.',
};

export default async function Top250Page() {
  const [rows, locale] = await Promise.all([getTop250Rows(), getRequestLocale()]);
  const filledRows = rows.filter((row) => !row.unavailable);
  const highestSr = filledRows.find((row) => row.rank === 1)?.points || 0;
  const isFr = locale === 'fr';

  const labels = isFr ? {
    eyebrow: 'Partie Classee',
    title: 'Warzone Classee -',
    accent: 'Top 250',
    description: 'Parcourez chaque place du Top 250 pour Warzone Partie Classee. Les entrees remplies proviennent des donnees publiques CODMunity.',
    filters: ['2026', 'Saison 3', 'Resurgence'],
    tabs: ['Resurgence', 'Multijoueur'],
    format: 'Partie Classee',
    status: 'Snapshot API publique',
    metricLabel: 'Variation SR',
    scoreLabel: 'SR Total',
    sourceName: 'CODMunity Top 250',
    sourceNote: `${filledRows.length} joueurs exposes par les donnees publiques CODMunity, affiches sur les 250 places.`,
    stats: [
      { label: 'Places', value: '250' },
      { label: 'Entrees publiques', value: filledRows.length.toString() },
      { label: 'Meilleur SR', value: highestSr.toLocaleString('fr') },
    ],
  } : {
    eyebrow: 'Ranked Play',
    title: 'Warzone Ranked -',
    accent: 'Top 250 Leaderboard',
    description: 'Browse every Top 250 rank slot for Warzone Ranked Play. Filled rows come from CODMunity public data; unavailable slots are shown explicitly instead of pretending the profile exists.',
    filters: ['2026', 'Season 3', 'Resurgence'],
    tabs: ['Resurgence', 'Multiplayer'],
    format: 'Ranked Play',
    status: 'Public API snapshot',
    metricLabel: 'SR var',
    scoreLabel: 'Total SR',
    sourceName: 'CODMunity Top 250',
    sourceNote: `${filledRows.length} named players exposed by CODMunity public data, rendered across all 250 rank slots.`,
    stats: [
      { label: 'Rank Slots', value: '250' },
      { label: 'Public Entries', value: filledRows.length.toString() },
      { label: 'Highest SR', value: highestSr.toLocaleString('en-US') },
    ],
  };

  return (
    <CompetitiveLeaderboardPage
      active="top250"
      eyebrow={labels.eyebrow}
      title={labels.title}
      accent={labels.accent}
      description={labels.description}
      logoText="250"
      filters={labels.filters}
      tabs={labels.tabs}
      format={labels.format}
      status={labels.status}
      metricLabel={labels.metricLabel}
      scoreLabel={labels.scoreLabel}
      sourceName={labels.sourceName}
      sourceUrl="https://codmunity.gg/top-250"
      sourceNote={labels.sourceNote}
      stats={labels.stats}
      rows={rows}
    />
  );
}
