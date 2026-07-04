import { getStatsSummary } from '@/lib/statsSummary';
import type { ProfileStatsEntry } from '@/lib/profileStore';

export type CoachTrend = 'up' | 'down' | 'flat';

export type CoachReport = {
  hasData: boolean;
  games: number;
  kd: number;
  kdTrend: CoachTrend;
  winRate: number;
  topTenRate: number;
  kills: number;
  damage: number;
  /** Stable tip codes, mapped to localized copy by the UI. */
  tips: string[];
};

function round(value: number, digits = 0): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

// Weekly-style coaching report derived from the player's imported games.
// Stats-based (no video analysis): compares the recent window with the previous one.
export function buildCoachReport(entries: ProfileStatsEntry[]): CoachReport {
  const list = Array.isArray(entries) ? entries : [];
  const all = getStatsSummary(list);
  const recent = getStatsSummary(list.slice(0, 10));
  const previous = getStatsSummary(list.slice(10, 20));

  let kdTrend: CoachTrend = 'flat';
  if (previous.games >= 3 && recent.games >= 3) {
    if (recent.kd > previous.kd + 0.1) kdTrend = 'up';
    else if (recent.kd < previous.kd - 0.1) kdTrend = 'down';
  }

  const tips: string[] = [];
  if (all.kd < 1) tips.push('lowKd');
  if (kdTrend === 'down') tips.push('kdDown');
  if (all.winRate < 15) tips.push('lowWin');
  if (all.kills > 0 && all.damage / Math.max(1, all.kills) > 350) tips.push('damageNoFinish');
  if (all.topTenRate < 30) tips.push('earlyDeath');
  if (kdTrend === 'up') tips.push('improving');
  if (!tips.length) tips.push('consistent');

  return {
    hasData: all.games > 0,
    games: all.games,
    kd: round(all.kd, 2),
    kdTrend,
    winRate: round(all.winRate),
    topTenRate: round(all.topTenRate),
    kills: round(all.kills, 1),
    damage: round(all.damage),
    tips: tips.slice(0, 3),
  };
}
