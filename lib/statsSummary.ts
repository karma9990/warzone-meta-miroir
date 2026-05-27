import type { ProfileStatsEntry } from '@/lib/profileStore';

function avg(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function getStatsSummary(entries: ProfileStatsEntry[]) {
  const recent = entries.slice(0, 20);
  const wins = recent.filter((entry) => entry.won).length;
  const topTen = recent.filter((entry) => entry.placement > 0 && entry.placement <= 10).length;
  const totalKills = recent.reduce((total, entry) => total + entry.kills, 0);

  return {
    games: recent.length,
    kd: avg(recent.map((entry) => entry.kills / Math.max(1, entry.deaths))),
    damage: avg(recent.map((entry) => entry.damage)),
    kills: avg(recent.map((entry) => entry.kills)),
    winRate: recent.length ? (wins / recent.length) * 100 : 0,
    topTenRate: recent.length ? (topTen / recent.length) * 100 : 0,
    totalKills,
    recent,
  };
}
