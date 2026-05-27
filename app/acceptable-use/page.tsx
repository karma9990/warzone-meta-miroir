import LegalPage from '@/components/LegalPage';
import { SUPPORT_EMAIL } from '@/lib/siteConfig';

const updated = 'May 16, 2026';
const supportEmail = SUPPORT_EMAIL;

export default function AcceptableUsePage() {
  return (
    <LegalPage
      title="Acceptable Use Policy"
      updated={updated}
      intro="This policy protects WZPRO Meta, paid users and platform partners from abuse."
      sections={[
        {
          title: 'Allowed Use',
          body: <p>You may use WZPRO Meta for personal gameplay improvement, research, PC optimization, loadout planning and tactical education.</p>,
        },
        {
          title: 'Prohibited Use',
          body: <p>You may not resell access, share private access links, scrape paid content, bypass payment systems, attack the service, use automated abuse, impersonate others, or use the service for illegal activity.</p>,
        },
        {
          title: 'Security',
          body: <p>Do not attempt to bypass authentication, modify access tokens, exploit endpoints or interfere with payment and webhook systems.</p>,
        },
        {
          title: 'Enforcement',
          body: <p>We may suspend or revoke access for abuse, fraud, chargeback abuse, link sharing or violation of this policy.</p>,
        },
        {
          title: 'Contact',
          body: <p>Report abuse or security issues to {supportEmail}.</p>,
        },
      ]}
    />
  );
}
