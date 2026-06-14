import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPage from '@/components/LegalPage';
import { SUPPORT_EMAIL } from '@/lib/siteConfig';

export const metadata: Metadata = {
  title: 'WZPRO Companion Documentation | WZPRO Meta',
  description: 'Installation, account connection and support documentation for WZPRO Companion.',
};

const updated = 'June 14, 2026';

export default function CompanionDocumentationPage() {
  return (
    <LegalPage
      title="WZPRO Companion Documentation"
      updated={updated}
      intro="WZPRO Companion is the desktop companion application for WZPRO Meta. It connects a WZPRO account, runs locally on Windows and imports Warzone end-of-game statistics."
      sections={[
        {
          title: '1. Download',
          body: (
            <p>
              Download the Windows installer from <Link href="/download">the WZPRO Companion download page</Link>.
            </p>
          ),
        },
        {
          title: '2. Installation',
          body: <p>Run the installer, follow the setup steps, then launch WZPRO Companion from the Start menu or desktop shortcut if one was created.</p>,
        },
        {
          title: '3. Account connection',
          body: <p>On first launch, select your language, click Connect WZPRO, then authorize the temporary device code in your browser. The app opens the main companion interface after authorization.</p>,
        },
        {
          title: '4. What the app installs',
          body: <p>The installer deploys WZPRO Companion, a local Node.js runtime and OCR dependencies used by the companion engine. It does not install drivers, browser extensions, Windows services, miners or bundled third-party software.</p>,
        },
        {
          title: '5. Network access',
          body: <p>The app connects to wzprometa.com companion API endpoints after the user authorizes the device. An internet connection and a WZPRO account are required.</p>,
        },
        {
          title: '6. Silent install parameters',
          body: <p>Installer parameters for managed deployment: /VERYSILENT /SUPPRESSMSGBOXES /NORESTART.</p>,
        },
        {
          title: '7. Support',
          body: <p>Support requests can be sent to {SUPPORT_EMAIL}. Privacy information is available at https://wzprometa.com/privacy.</p>,
        },
      ]}
    />
  );
}
