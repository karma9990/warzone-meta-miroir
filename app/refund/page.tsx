import LegalPage from '@/components/LegalPage';
import { SUPPORT_EMAIL } from '@/lib/siteConfig';

const updated = 'May 20, 2026';
const supportEmail = SUPPORT_EMAIL;

export default function RefundPage() {
  return (
    <LegalPage
      title="Refund Policy"
      updated={updated}
      intro="This policy explains how refunds work for WZPRO Meta subscriptions and individual digital tools."
      sections={[
        {
          title: '1. Digital Product Notice',
          body: <p>WZPRO Meta sells digital access to tools, guides and optimization resources. Access may begin immediately after purchase only after the customer acknowledges immediate digital delivery and the resulting loss of the withdrawal right where applicable.</p>,
        },
        {
          title: '2. Refund Requests',
          body: <p>If you purchased by mistake, were charged incorrectly, or cannot access the tool you paid for, contact support within 14 days of purchase. Include the purchase email, product name and a short explanation.</p>,
        },
        {
          title: '3. Eligible Refunds',
          body: <p>Refunds may be approved for duplicate payments, technical access failures we cannot resolve, accidental purchases reported promptly, or billing errors.</p>,
        },
        {
          title: '4. Non-Refundable Cases',
          body: <p>Refunds may be refused when access was successfully delivered and substantially used, when access links were shared or abused, or when the request is based only on expected game performance, FPS gains, rank gains or match results.</p>,
        },
        {
          title: '5. Statutory Rights',
          body: <p>Nothing in this policy limits mandatory consumer rights that cannot legally be excluded. If a mandatory right applies in your country, we will handle the request according to that law.</p>,
        },
        {
          title: '6. Subscriptions',
          body: <p>Subscriptions can be cancelled to prevent future renewal. Cancellation does not automatically refund already delivered subscription periods unless required by law or approved by support.</p>,
        },
        {
          title: '7. Contact',
          body: <p>Refund requests can be sent to {supportEmail}. Paddle may also assist with payment-related refund handling where it acts as Merchant of Record.</p>,
        },
      ]}
    />
  );
}
