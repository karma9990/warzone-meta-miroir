import type { MetadataRoute } from "next";
import { getLoadouts } from "@/lib/data";
import { getLoadoutPath } from "@/lib/seo";
import { SITE_URL } from "@/lib/siteConfig";

const staticRoutes = [
  "",
  "/pro-tools",
  "/tools-individual",
  "/pro-access",
  "/free-preview",
  "/community",
  "/ai-classes",
  "/pro-classe",
  "/actualites",
  "/actualites/meta",
  "/actualites/patch-notes",
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const loadouts = await getLoadouts();

  return [
    ...staticRoutes.map((route) => ({
      url: `${SITE_URL}${route}`,
      lastModified: now,
      changeFrequency: route === "" ? "daily" as const : "weekly" as const,
      priority: route === "" ? 1 : 0.7,
    })),
    ...loadouts.map((loadout) => ({
      url: `${SITE_URL}${getLoadoutPath(loadout)}`,
      lastModified: loadout.updatedAt ? new Date(loadout.updatedAt) : now,
      changeFrequency: loadout.tier === "S" || loadout.tier === "A" ? "daily" as const : "weekly" as const,
      priority: loadout.tier === "S" ? 0.95 : loadout.tier === "A" ? 0.9 : 0.8,
    })),
  ];
}
