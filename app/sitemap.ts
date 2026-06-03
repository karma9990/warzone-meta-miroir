import type { MetadataRoute } from "next";
import { getLoadouts } from "@/lib/data";
import { SITE_URL } from "@/lib/siteConfig";

const staticRoutes = [
  "",
  "/pro-tools",
  "/tools-individual",
  "/pro-access",
  "/free-preview",
  "/community",
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
  "/sign-in",
  "/sign-up",
  "/forgot-password",
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
      url: `${SITE_URL}/loadouts/${loadout.id}`,
      lastModified: loadout.updatedAt ? new Date(loadout.updatedAt) : now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
