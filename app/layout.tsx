import type { Metadata } from "next";
import ClientGlassScene from "@/components/ClientGlassScene";
import LegalFooter from "@/components/LegalFooter";
import "./globals.css";
import "./legal-pages.css";
import "./home-priority.css";

export const metadata: Metadata = {
  title: "WZPRO Meta - Warzone Loadout Database",
  description: "Warzone meta loadouts, pro tools, PC optimization and tactical performance guides.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-full flex flex-col">
        <ClientGlassScene backgroundSrc="/generated/operator-full-site-bg.png" />
        <div style={{ position: "relative", zIndex: 1 }}>
          {children}
          <LegalFooter />
        </div>
      </body>
    </html>
  );
}
