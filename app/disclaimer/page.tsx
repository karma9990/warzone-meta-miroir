import LegalPage from '@/components/LegalPage';
import { SUPPORT_EMAIL } from '@/lib/siteConfig';

const updated = 'May 16, 2026';
const supportEmail = SUPPORT_EMAIL;

export default function DisclaimerPage() {
  return (
    <LegalPage
      title="Performance and Optimization Disclaimer"
      updated={updated}
      intro="This disclaimer applies to all WZPRO Meta optimization tools, PC tuning instructions, settings guides and gameplay recommendations."
      sections={[
        {
          title: '1. No Guaranteed Results',
          body: <p>FPS, latency, input delay, aiming performance, win rate and ranking outcomes depend on hardware, drivers, network, operating system state, game patches and user behavior. We do not guarantee specific results.</p>,
        },
        {
          title: '2. Windows Optimizer Safety',
          body: <p>Windows optimization tools can change system settings. Apply changes progressively, create a restore point or VM snapshot first, reboot between groups of changes, and use Restore if something behaves incorrectly.</p>,
        },
        {
          title: '3. User Responsibility',
          body: <p>You are responsible for deciding whether a tweak is appropriate for your PC. Do not apply advanced settings if you do not understand the impact or cannot restore the system.</p>,
        },
        {
          title: '4. Third-Party Names',
          body: <p>WZPRO Meta is not affiliated with Activision, Call of Duty, Warzone, Microsoft, NVIDIA, AMD, Intel, Paddle or other third parties mentioned on the site.</p>,
        },
        {
          title: '5. Contact',
          body: <p>Questions about optimization safety can be sent to {supportEmail}.</p>,
        },
      ]}
    />
  );
}
