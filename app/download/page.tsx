import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPage from '@/components/LegalPage';
import { SUPPORT_EMAIL } from '@/lib/siteConfig';

export const metadata: Metadata = {
  title: 'Download WZPRO Companion | WZPRO Meta',
  description: 'Download the Windows installer for WZPRO Companion.',
};

const updated = 'June 14, 2026';
const installerUrl = '/downloads/WZPRO-Companion-Setup.exe';

export default function CompanionDownloadPage() {
  return (
    <LegalPage
      title="Download WZPRO Companion"
      updated={updated}
      intro="Download the Windows installer for WZPRO Companion."
      sections={[
        {
          title: 'Windows installer',
          body: (
            <p>
              <Link href={installerUrl}>Download WZPRO Companion Setup.exe</Link>
            </p>
          ),
        },
        {
          title: 'Direct package URL',
          body: <p>Use https://wzprometa.com/downloads/WZPRO-Companion-Setup.exe as the direct package URL for Microsoft Partner Center.</p>,
        },
        {
          title: 'Requirements',
          body: <p>Windows 10 version 1903 or later, Windows 11 recommended, 64-bit processor, 4 GB RAM, internet connection and a WZPRO account.</p>,
        },
        {
          title: 'Documentation',
          body: (
            <p>
              Installation and usage documentation is available on the <Link href="/companion">WZPRO Companion documentation page</Link>.
            </p>
          ),
        },
        {
          title: 'Support',
          body: <p>Support requests can be sent to {SUPPORT_EMAIL}.</p>,
        },
      ]}
    />
  );
}
