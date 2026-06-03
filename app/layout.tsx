import type { Metadata } from "next";
import { headers } from "next/headers";
import ClientGlassScene from "@/components/ClientGlassScene";
import LegalFooter from "@/components/LegalFooter";
import RuntimeI18n from "@/components/RuntimeI18n";
import { LOCALE_HEADER, normalizeLocale } from "@/lib/i18n";
import { SITE_URL } from "@/lib/siteConfig";
import "./globals.css";
import "./legal-pages.css";
import "./home-priority.css";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders = await headers();
  const locale = normalizeLocale(requestHeaders.get(LOCALE_HEADER));

  return (
    <html lang={locale}>
      <body className="min-h-full flex flex-col">
        <ClientGlassScene backgroundSrc="/generated/operator-full-site-bg.png" />
        <RuntimeI18n locale={locale} />
        <div style={{ position: "relative", zIndex: 1 }}>
          {children}
          <LegalFooter locale={locale} />
        </div>
      </body>
    </html>
  );
}
