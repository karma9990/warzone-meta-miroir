import type { Loadout } from './data';
import { calculateMetaScore } from './loadoutUtils';
import { absoluteUrl } from './siteConfig';

export const CURRENT_WARZONE_SEASON = 'Saison 04';
export const CURRENT_WARZONE_SEASON_EN = 'Season 04';

export function getLoadoutPathSegment(loadout: Loadout) {
  return loadout.weaponId || loadout.id;
}

export function getLoadoutPath(loadout: Loadout) {
  return `/loadouts/${getLoadoutPathSegment(loadout)}`;
}

export function getLoadoutCanonicalUrl(loadout: Loadout) {
  return absoluteUrl(getLoadoutPath(loadout));
}

export function findLoadoutByRouteId(loadouts: Loadout[], routeId: string) {
  return loadouts.find((entry) => entry.id === routeId || entry.weaponId === routeId);
}

export function getLoadoutSeoTitle(loadout: Loadout) {
  return `Meilleure classe ${loadout.weapon} Warzone ${CURRENT_WARZONE_SEASON} | WZPRO Meta`;
}

export function getLoadoutSeoDescription(loadout: Loadout) {
  const score = calculateMetaScore(loadout);
  const attachments = loadout.attachments.map((attachment) => attachment.name).slice(0, 5).join(', ');
  return `Classe ${loadout.weapon} Warzone mise a jour pour la ${CURRENT_WARZONE_SEASON}: accessoires ${attachments}, tier ${loadout.tier}, score meta ${score}, TTK et conseils de patch.`;
}

export function getLoadoutKeywords(loadout: Loadout) {
  return [
    `meilleure classe ${loadout.weapon} Warzone`,
    `classe ${loadout.weapon} ${CURRENT_WARZONE_SEASON}`,
    `${loadout.weapon} meta loadout Warzone`,
    `accessoires ${loadout.weapon}`,
    `Warzone ${CURRENT_WARZONE_SEASON_EN} meta loadout`,
    ...loadout.attachments.map((attachment) => `accessoire ${attachment.name}`),
  ];
}

export function getLoadoutJsonLd(loadout: Loadout) {
  const score = calculateMetaScore(loadout);

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: getLoadoutSeoTitle(loadout),
    description: getLoadoutSeoDescription(loadout),
    url: getLoadoutCanonicalUrl(loadout),
    dateModified: loadout.updatedAt,
    datePublished: loadout.updatedAt,
    author: {
      '@type': 'Organization',
      name: 'WZPRO Meta',
    },
    publisher: {
      '@type': 'Organization',
      name: 'WZPRO Meta',
    },
    about: [
      loadout.weapon,
      loadout.category,
      loadout.playstyle,
      `Warzone ${CURRENT_WARZONE_SEASON}`,
    ],
    articleSection: 'Warzone loadouts',
    keywords: getLoadoutKeywords(loadout).join(', '),
    mainEntity: {
      '@type': 'ItemList',
      name: `Accessoires ${loadout.weapon}`,
      itemListElement: loadout.attachments.map((attachment, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: `${attachment.slot}: ${attachment.name}`,
      })),
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: score,
      bestRating: 100,
      worstRating: 0,
      ratingCount: 1,
    },
  };
}
