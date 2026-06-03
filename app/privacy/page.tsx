import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | WZPRO Meta',
  description: 'Learn how WZPRO Meta collects, uses and protects account and site data.',
};
import LegalPage from '@/components/LegalPage';
import { LEGAL, SUPPORT_EMAIL } from '@/lib/siteConfig';

const updated = 'May 20, 2026';
const supportEmail = SUPPORT_EMAIL;

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated={updated}
      intro="This policy explains what data WZPRO Meta collects, why it is used, and how you can contact us about privacy."
      sections={[
        {
          title: '1. Data Controller',
          body: <p>The data controller is {LEGAL.publisherName}. Privacy requests can be sent to {LEGAL.privacyContact}.</p>,
        },
        {
          title: '2. Information We Collect',
          body: <p>We may collect your email address, username, display name, hashed password, OAuth profile details, purchase status, selected product, access tokens, support messages, newsletter signup details, IP-derived security signals, browser/device details, logs and basic usage events.</p>,
        },
        {
          title: '3. Payments',
          body: <p>Payment data is processed by Polar. We do not store full card numbers. Polar may collect payment, billing, tax and fraud prevention information according to its own privacy terms.</p>,
        },
        {
          title: '4. Purposes and Legal Bases',
          body: <p>We use data to create accounts, provide paid access, send verification and purchase emails, respond to support, secure the service, prevent abuse, maintain accounting records, improve tools, and comply with legal or payment processor requirements. Depending on the context, processing is based on contract performance, legal obligations, legitimate interests, or consent for optional marketing and non-essential cookies.</p>,
        },
        {
          title: '5. Service Providers',
          body: <p>We may share necessary data with service providers such as Supabase for authentication and session handling, Polar for checkout and tax handling, Resend for email delivery, hosting and database providers, OAuth providers selected by the user, analytics providers if enabled, security tooling, and fraud prevention services. We do not sell personal information.</p>,
        },
        {
          title: '6. Retention',
          body: <p>Account and access data is kept while the account or paid access remains active and for a reasonable period afterward for support, security and dispute handling. Accounting, tax and payment records may be kept for the period required by law. Security logs are kept only as long as reasonably needed to detect abuse and protect the service.</p>,
        },
        {
          title: '7. International Transfers',
          body: <p>Some providers may process data outside your country or the European Economic Area. Where required, transfers should rely on appropriate safeguards such as standard contractual clauses or provider data protection terms.</p>,
        },
        {
          title: '8. Your Rights',
          body: <p>You can request access, correction, deletion, restriction, portability or objection to processing, and you can withdraw consent where processing is based on consent. Some records may be retained where required for tax, fraud prevention, dispute handling or legal compliance.</p>,
        },
        {
          title: '9. Marketing Emails',
          body: <p>Newsletter or marketing emails are sent only where the user has requested them or where otherwise allowed by law. Every marketing email should include an unsubscribe method.</p>,
        },
        {
          title: '10. Contact',
          body: <p>Privacy requests can be sent to {supportEmail}. If you are in the European Union and believe your rights have not been respected, you may also contact your local data protection authority.</p>,
        },
      ]}
    />
  );
}
