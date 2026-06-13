import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteConfig";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/messages", "/account", "/billing", "/companion", "/pro-access", "/payment-success"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
