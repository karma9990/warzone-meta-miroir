import HomeClient from '@/components/HomeClient';
import { getLoadouts } from '@/lib/data';
import { LOCALE_HEADER, getHomeUiCopy, localizeSiteContent, normalizeLocale } from '@/lib/i18n';
import { getProfile, getPublicProfiles } from '@/lib/profileStore';
import { getSiteContent } from '@/lib/siteContent';
import { getSiteControls } from '@/lib/siteControls';
import { getStatsSummary } from '@/lib/statsSummary';
import { getUserSession } from '@/lib/userAuth';
import { CURRENT_WARZONE_SEASON } from '@/lib/seo';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: `Meta Warzone ${CURRENT_WARZONE_SEASON} - meilleures classes et loadouts | WZPRO Meta`,
  description: `Toutes les meilleures classes Warzone ${CURRENT_WARZONE_SEASON}: armes meta, accessoires, TTK, mises a jour de patch, comparateur et outils pro.`,
  keywords: [
    `Warzone ${CURRENT_WARZONE_SEASON} meta loadout`,
    'meilleure classe Warzone',
    'meilleures classes Warzone',
    'accessoires Warzone meta',
    'Warzone pro tools',
  ],
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
  const initialQuery = typeof query?.q === 'string' ? query.q : undefined;
  const locale = normalizeLocale(requestHeaders.get(LOCALE_HEADER));
  const profile = user ? await getProfile(user.sub) : null;
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
      initialQuery={initialQuery}
      initialAccountFavorites={profile?.favoriteLoadouts ?? []}
      initialUser={user}
    />
  );
}
