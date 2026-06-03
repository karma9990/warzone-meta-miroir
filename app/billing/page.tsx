import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Billing Terms | WZPRO Meta',
  description: 'Review billing, renewal, invoice and payment terms for WZPRO Meta products.',
};
import LegalPage from '@/components/LegalPage';
import { LEGAL, SUPPORT_EMAIL } from '@/lib/siteConfig';

const updated = 'May 20, 2026';
const supportEmail = SUPPORT_EMAIL;

export default function BillingPage() {
  return (
    <LegalPage
      title="Billing Policy"
      updated={updated}
      intro="This policy explains prices, renewals, taxes, invoices and payment processing for WZPRO Meta."
      sections={[
        {
          title: '1. Payment Processor',
          body: <p>Payments are processed through Polar. Polar may act as Merchant of Record, meaning it can handle payment collection, taxes, invoices, receipts, fraud checks and payment support.</p>,
        },
        {
          title: '2. Prices and Taxes',
          body: <p>Prices are shown on the purchase page and in checkout before payment. Taxes may be calculated at checkout based on your country or region. For consumers, the checkout should show the total price payable before the order is confirmed.</p>,
        },
        {
          title: '3. Subscriptions',
          body: <p>Monthly Pro access renews automatically until cancelled. You can cancel to stop future renewals. Access normally continues until the end of the paid billing period.</p>,
        },
        {
          title: '4. Individual Tools',
          body: <p>Individual tool purchases are monthly digital subscriptions unless otherwise stated at checkout.</p>,
        },
        {
          title: '5. Failed Payments',
          body: <p>If a subscription payment fails, access may be paused or cancelled after retry attempts or processor notifications.</p>,
        },
        {
          title: '6. Billing Support',
          body: <p>For billing questions, contact {supportEmail} with your purchase email and Polar receipt if available.</p>,
        },
        {
          title: '7. Consumer Mediation',
          body: <p>If a consumer billing dispute remains unresolved after contacting support, the customer may contact the designated consumer mediator: {LEGAL.mediatorName}, {LEGAL.mediatorWebsite}.</p>,
        },
      ]}
    />
  );
}
