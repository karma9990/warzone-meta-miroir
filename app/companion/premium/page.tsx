import type { Metadata } from 'next';
import Link from 'next/link';
import CompanionPremiumCheckout from '@/components/CompanionPremiumCheckout';
import LegalPage from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'WZPRO Companion Premium | WZPRO Meta',
  description: 'Unlock optional premium modules for WZPRO Companion, including planned automatic clips and best-of game reviews.',
};

const updated = 'June 14, 2026';

export default function CompanionPremiumPage() {
  return (
    <LegalPage
      title="WZPRO Companion Premium"
      updated={updated}
      intro="WZPRO Companion remains free for stat tracking. Premium is an optional site purchase for desktop modules such as automatic clips, game highlights and richer review tools."
      sections={[
        {
          title: '1. What Premium unlocks',
          body: (
            <p>
              Premium access is planned for WZPRO Companion modules like Highlights Pro: a local clips folder, automatic kill/death clip capture and a best-of recap after a game.
            </p>
          ),
        },
        {
          title: '2. How access works',
          body: (
            <p>
              The desktop app opens this page when a player wants Premium. Payment and account access stay on wzprometa.com, so the .exe does not handle card details.
            </p>
          ),
        },
        {
          title: '3. Clip folder',
          body: (
            <p>
              In the Premium tab of WZPRO Companion, choose the folder where clips should be saved on your PC. The selected folder is stored locally on the device.
            </p>
          ),
        },
        {
          title: '4. Get Premium',
          body: (
            <>
              <p>
                Start checkout below with Polar. You can also open the full <Link href="/pro-access">WZPRO Meta Pro Access page</Link>. Free stat tracking stays available without Premium.
              </p>
              <CompanionPremiumCheckout />
            </>
          ),
        },
      ]}
    />
  );
}
