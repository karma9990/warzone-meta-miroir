import type { MetadataRoute } from "next";
import { getLoadouts } from "@/lib/data";
import { SUPPORTED_LOCALES, withLocalePath } from "@/lib/i18n";
import { getLoadoutPath } from "@/lib/seo";
import { SITE_URL } from "@/lib/siteConfig";

const staticRoutes = [
  "",
  "/pro-tools",
  "/tools-individual",
  "/quiz",
  "/meta-trends",
  "/builds",
  "/pro-access",
  "/free-preview",
  "/community",
  "/lfg",
  "/leaderboard",
  "/tier-list",
  "/ai-classes",
  "/pro-classe",
  "/actualites",
  "/actualites/meta",
  "/actualites/patch-notes",
  "/patchnote",
  "/actualites/esport",
  "/actualites/evenements",
  "/set-up",
  "/esport",
  "/esport/calendar",
  "/esport/ewc",
  "/esport/pullze-check",
  "/esport/references",
  "/esport/resurgence-series",
  "/esport/top-250",
  "/esport/wsow",
  "/subscribe",
  "/contact",
  "/companion",
  "/companion/premium",
  "/download",
  "/legal",
  "/privacy",
  "/terms",
  "/billing",
  "/cancellation",
  "/refund",
  "/cookies",
  "/disclaimer",
  "/acceptable-use",
];

function absolutePath(path: string) {
  return `${SITE_URL}${path}`;
}

function localizedUrl(route: string, locale: string) {
  return absolutePath(withLocalePath(route || "/", locale as (typeof SUPPORTED_LOCALES)[number]));
}

function alternatesFor(route: string) {
  return {
    languages: {
      "x-default": absolutePath(route || "/"),
      ...Object.fromEntries(SUPPORTED_LOCALES.map((locale) => [locale, localizedUrl(route, locale)])),
    },
  };
}

function localizedEntries(
  route: string,
  entry: Omit<MetadataRoute.Sitemap[number], "url" | "alternates">,
): MetadataRoute.Sitemap {
  const alternates = alternatesFor(route);

  return [
    {
      url: absolutePath(route || "/"),
      ...entry,
      alternates,
    },
    ...SUPPORTED_LOCALES.map((locale) => ({
      url: localizedUrl(route, locale),
      ...entry,
      alternates,
    })),
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const loadouts = await getLoadouts();

  return [
    ...staticRoutes.flatMap((route) =>
      localizedEntries(route, {
        lastModified: now,
        changeFrequency: route === "" ? "daily" as const : "weekly" as const,
        priority: route === "" ? 1 : 0.7,
      }),
    ),
    ...loadouts.flatMap((loadout) => {
      const route = getLoadoutPath(loadout);
      return localizedEntries(route, {
        lastModified: loadout.updatedAt ? new Date(loadout.updatedAt) : now,
        changeFrequency: loadout.tier === "S" || loadout.tier === "A" ? "daily" as const : "weekly" as const,
        priority: loadout.tier === "S" ? 0.95 : loadout.tier === "A" ? 0.9 : 0.8,
      });
    }),
  ];
}
