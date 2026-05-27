import LegalPage from '@/components/LegalPage';
import { SUPPORT_EMAIL } from '@/lib/siteConfig';

const updated = 'May 16, 2026';
const supportEmail = SUPPORT_EMAIL;

export default function CancellationPage() {
  return (
    <LegalPage
      title="Cancellation Policy"
      updated={updated}
      intro="This policy explains how subscription cancellation works for WZPRO Meta Pro access."
      sections={[
        {
          title: '1. Cancel Anytime',
          body: <p>Monthly Pro access can be cancelled at any time. Cancellation stops future renewals but does not automatically refund the current paid period.</p>,
        },
        {
          title: '2. Access After Cancellation',
          body: <p>Unless otherwise stated by checkout or support, Pro access normally remains active until the end of the billing period already paid for.</p>,
        },
        {
          title: '3. How to Request Cancellation',
          body: <p>Use the cancellation link provided by Paddle when available, or contact {supportEmail} with the email used for purchase.</p>,
        },
        {
          title: '4. Refunds',
          body: <p>Cancellation and refund are separate processes. See the Refund Policy for refund eligibility.</p>,
        },
      ]}
    />
  );
}
