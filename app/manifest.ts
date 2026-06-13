import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WZPRO Meta",
    short_name: "WZ Meta",
    description: "Warzone loadouts, meta weapons, pro tools and competitive guides.",
    start_url: "/",
    display: "standalone",
    background_color: "#efeee8",
    theme_color: "#163cff",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "48x48",
        type: "image/x-icon",
      },
      {
        src: "/brand/wazonepro-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/wazonepro-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
