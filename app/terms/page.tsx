import LegalPage from '@/components/LegalPage';
import { LEGAL, SUPPORT_EMAIL } from '@/lib/siteConfig';

const updated = 'May 20, 2026';
const supportEmail = SUPPORT_EMAIL;

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms and Conditions of Sale"
      updated={updated}
      intro="These Terms govern free content, paid Pro access, individual digital tool purchases, account access and Windows optimization resources."
      sections={[
        {
          title: '1. Publisher and Contact',
          body: <p>WZPRO Meta is published by {LEGAL.publisherName}. Legal, billing and support questions can be sent to {supportEmail}. Full publisher and hosting details are available in the Legal Notice.</p>,
        },
        {
          title: '2. Service Description',
          body: <p>WZPRO Meta provides Warzone loadout information, tactical guides, interactive tools, and PC optimization resources. The service is informational and educational. It is not affiliated with Activision, Call of Duty, Warzone, Microsoft, Paddle or any hardware manufacturer.</p>,
        },
        {
          title: '3. Accounts and Access',
          body: <p>Some content may require a paid purchase or subscription. You are responsible for providing a valid email address and keeping private access links confidential. We may suspend access if links are shared, resold, abused, or used to bypass payment controls.</p>,
        },
        {
          title: '4. Prices, Taxes and Checkout',
          body: <p>Prices are displayed before checkout. Taxes may be calculated at checkout based on the customer&apos;s country or region. Payments are processed by Paddle, acting as Merchant of Record where applicable. Paddle may handle invoices, receipts, payment methods, tax collection, fraud checks and payment support.</p>,
        },
        {
          title: '5. Digital Delivery',
          body: <p>Paid products are digital access rights, guides, tools or subscriptions delivered online. Access may be provided immediately after payment confirmation by account entitlement, private link or email.</p>,
        },
        {
          title: '6. Right of Withdrawal for Digital Content',
          body: <p>Where a consumer right of withdrawal applies, you normally have 14 days to withdraw from a distance purchase. However, for digital content supplied without a physical medium, immediate access can begin only after your express consent and acknowledgement that you lose the right of withdrawal once the digital content is made available. If you do not give this acknowledgement, do not complete the purchase.</p>,
        },
        {
          title: '7. Subscriptions and Cancellation',
          body: <p>Monthly Pro access renews automatically until cancelled. Cancellation stops future renewals and access normally continues until the end of the paid billing period unless otherwise stated at checkout or by support.</p>,
        },
        {
          title: '8. Refunds',
          body: <p>Refund handling is described in the Refund Policy. Refunds may be limited after digital content has been delivered, except where applicable law requires otherwise.</p>,
        },
        {
          title: '9. Acceptable Use',
          body: <p>You may not scrape, resell, redistribute, reverse engineer private access systems, share paid access links publicly, or use the service for fraud, abuse, or illegal activity.</p>,
        },
        {
          title: '10. No Guaranteed Results',
          body: <p>Loadout rankings, optimization suggestions, FPS advice, sensitivity recommendations and tactical guides are based on testing, analysis and practical assumptions. We do not guarantee wins, rank gains, FPS gains, latency improvements or specific performance results.</p>,
        },
        {
          title: '11. Consumer Mediation',
          body: <p>If you are a consumer and a dispute remains unresolved after contacting support, you may contact the designated consumer mediator: {LEGAL.mediatorName}, {LEGAL.mediatorWebsite}. These details must be completed with the mediator actually selected by the publisher before commercial launch.</p>,
        },
        {
          title: '12. Changes to the Service',
          body: <p>We may update, remove, restrict or change features as the game, tools, payment systems or platform requirements change. Paid access continues according to the terms shown at checkout and in the applicable policies.</p>,
        },
        {
          title: '13. Contact',
          body: <p>For questions about these Terms, contact us at {supportEmail}.</p>,
        },
      ]}
    />
  );
}
