import HomeClient from '@/components/HomeClient';
import { getLoadouts } from '@/lib/data';
import { getPublicProfiles } from '@/lib/profileStore';
import { getStatsSummary } from '@/lib/statsSummary';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'WZPRO Meta - Warzone loadouts, meta weapons and pro tools',
  description: 'Find the best Warzone loadouts, compare meta weapons, track patch changes and use Pro Tools for aim, movement, spawns and PC optimization.',
};

export default async function HomePage() {
  const loadouts = getLoadouts();
  const loadoutById = new Map(loadouts.map((loadout) => [loadout.id, loadout]));
  const profiles = await getPublicProfiles();
  const searchableProfiles = profiles.map((profile) => {
    const summary = getStatsSummary(profile.statsEntries);
    const favoriteWeapons = profile.favoriteLoadouts
      .map((loadoutId) => loadoutById.get(loadoutId)?.weapon)
      .filter((weapon): weapon is string => Boolean(weapon))
      .slice(0, 3);

    return {
      pseudo: profile.pseudo,
      publicName: profile.publicName,
      profilePicture: profile.profilePicture,
      avatarPositionX: profile.avatarPositionX,
      avatarPositionY: profile.avatarPositionY,
      mainPlatform: profile.mainPlatform,
      inputDevice: profile.inputDevice,
      favoriteWeapons,
      stats: profile.privacy.stats && summary.games > 0
        ? {
            games: summary.games,
            kd: summary.kd,
            kills: summary.kills,
            winRate: summary.winRate,
          }
        : null,
      updatedAt: profile.updatedAt,
    };
  });

  return <HomeClient loadouts={loadouts} profiles={searchableProfiles} />;
}
