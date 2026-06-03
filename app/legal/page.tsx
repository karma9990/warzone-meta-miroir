import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Legal Notice | WZPRO Meta',
  description: 'Read WZPRO Meta legal notice, publisher information and contact details.',
};
import LegalPage from '@/components/LegalPage';
import { LEGAL, SUPPORT_EMAIL } from '@/lib/siteConfig';

const updated = 'May 20, 2026';

export default function LegalNoticePage() {
  return (
    <LegalPage
      title="Legal Notice"
      updated={updated}
      intro="This page identifies the publisher, hosting provider, publication contact and consumer dispute channels for WZPRO Meta."
      sections={[
        {
          title: '1. Site Publisher',
          body: (
            <p>
              Publisher: {LEGAL.publisherName}. Status: {LEGAL.publisherStatus}. Registered address: {LEGAL.publisherAddress}. Registration: {LEGAL.publisherRegistration}.
            </p>
          ),
        },
        {
          title: '2. Publication Director',
          body: <p>Publication director: {LEGAL.publicationDirector}.</p>,
        },
        {
          title: '3. Contact',
          body: <p>Legal, support and privacy requests can be sent to {SUPPORT_EMAIL}.</p>,
        },
        {
          title: '4. Hosting Provider',
          body: <p>Host: {LEGAL.hostName}. Host address: {LEGAL.hostAddress}.</p>,
        },
        {
          title: '5. Consumer Mediation',
          body: (
            <p>
              If you are a consumer and a dispute cannot be resolved after contacting support, you may contact the designated consumer mediator: {LEGAL.mediatorName}, {LEGAL.mediatorWebsite}. These details must be replaced with the mediator actually selected by the publisher before public commercial launch.
            </p>
          ),
        },
        {
          title: '6. Intellectual Property and Third-Party Marks',
          body: <p>WZPRO Meta is independent and is not affiliated with Activision, Call of Duty, Warzone, Microsoft, NVIDIA, AMD, Intel, Polar or other third parties mentioned on the site. Third-party names remain the property of their respective owners.</p>,
        },
      ]}
    />
  );
}
