import type { Metadata } from "next";
import { headers } from "next/headers";
import CommandPalette from "@/components/CommandPalette";
import LegalFooter from "@/components/LegalFooter";
import MonoTechOverlay from "@/components/MonoTechOverlay";
import RuntimeI18n from "@/components/RuntimeI18n";
import ThemeScript from "@/components/ThemeScript";
import ThemeToggle from "@/components/ThemeToggle";
import { LOCALE_HEADER, normalizeLocale } from "@/lib/i18n";
import { SITE_URL } from "@/lib/siteConfig";
import "./globals.css";
import "./legal-pages.css";
import "./home-priority.css";
import "./design-enhancements.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "WZPRO Meta - Warzone Loadout Database",
  description: "Warzone meta loadouts, pro tools, PC optimization and tactical performance guides.",
  applicationName: "WZPRO Meta",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "WZPRO Meta - Warzone Loadout Database",
    description: "Warzone meta loadouts, pro tools, PC optimization and tactical performance guides.",
    url: SITE_URL,
    siteName: "WZPRO Meta",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WZPRO Meta - Warzone Loadout Database",
    description: "Warzone meta loadouts, pro tools, PC optimization and tactical performance guides.",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "WZPRO Meta",
      url: SITE_URL,
      email: "support@wzpro-meta.com",
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "WZPRO Meta",
      url: SITE_URL,
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: ["fr", "en", "es", "de", "pt"],
      description: "Warzone meta loadouts, pro tools, PC optimization and tactical performance guides.",
    },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders = await headers();
  const locale = normalizeLocale(requestHeaders.get(LOCALE_HEADER));
  const nonce = requestHeaders.get("x-nonce") ?? undefined;

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <ThemeScript nonce={nonce} />
        <script
          nonce={nonce}
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <div className="grain-overlay" aria-hidden="true" />
        <MonoTechOverlay />
        <RuntimeI18n locale={locale} />
        <ThemeToggle />
        <CommandPalette />
        <div style={{ position: "relative", zIndex: 1 }}>
          {children}
          <LegalFooter locale={locale} />
        </div>
      </body>
    </html>
  );
}
