import HomeClient from '@/components/HomeClient';
import { getLoadouts } from '@/lib/data';
import { LOCALE_HEADER, getHomeUiCopy, localizeSiteContent, normalizeLocale } from '@/lib/i18n';
import { getPublicProfiles } from '@/lib/profileStore';
import { getSiteContent } from '@/lib/siteContent';
import { getSiteControls } from '@/lib/siteControls';
import { getStatsSummary } from '@/lib/statsSummary';
import { getUserSession } from '@/lib/userAuth';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'WZPRO Meta - Warzone loadouts, meta weapons and pro tools',
  description: 'Find the best Warzone loadouts, compare meta weapons, track patch changes and use Pro Tools for aim, movement, spawns and PC optimization.',
};

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [requestHeaders, query, loadouts, rawSiteContent, siteControls, profiles, user] = await Promise.all([
    headers(),
    searchParams,
    getLoadouts(),
    getSiteContent(),
    getSiteControls(),
    getPublicProfiles(),
    getUserSession(),
  ]);
  const compareA = typeof query?.compareA === 'string' ? query.compareA : undefined;
  const compareB = typeof query?.compareB === 'string' ? query.compareB : undefined;
  const locale = normalizeLocale(requestHeaders.get(LOCALE_HEADER));
  const siteContent = localizeSiteContent(rawSiteContent, locale);
  const loadoutById = new Map(loadouts.map((loadout) => [loadout.id, loadout]));
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

  return (
    <HomeClient
      loadouts={loadouts}
      profiles={searchableProfiles}
      copy={siteContent.home}
      controls={siteControls}
      uiCopy={getHomeUiCopy(locale)}
      locale={locale}
      initialCompareA={compareA}
      initialCompareB={compareB}
      initialUser={user}
    />
  );
}
