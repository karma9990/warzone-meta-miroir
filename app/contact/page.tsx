import LegalPage from '@/components/LegalPage';
import ContactForm from '@/components/ContactForm';
import { LEGAL, SUPPORT_EMAIL } from '@/lib/siteConfig';
import { getUserSession } from '@/lib/userAuth';

const updated = 'May 20, 2026';
const supportEmail = SUPPORT_EMAIL;

export const dynamic = 'force-dynamic';

export default async function ContactPage() {
  const user = await getUserSession();

  return (
    <LegalPage
      title="Contact and Support"
      updated={updated}
      intro="Use this page for support, refund requests, billing questions, access problems and legal notices."
      sections={[
        {
          title: 'Contact Form',
          body: <ContactForm user={user ? { name: user.name, email: user.email } : null} />,
        },
        {
          title: 'Support Email',
          body: <p>You can also contact us directly: {supportEmail}</p>,
        },
        {
          title: 'Response Time',
          body: <p>We aim to respond within 2 business days. During launch, payment processor reviews or major updates, response times may be longer.</p>,
        },
        {
          title: 'For Faster Support',
          body: <p>Include your purchase email, product purchased, screenshot of the issue if relevant, browser/device, and a short description of what happened.</p>,
        },
        {
          title: 'Payment Support',
          body: <p>If the issue is about a Paddle transaction, include the Paddle receipt or transaction email so we can identify the purchase faster.</p>,
        },
        {
          title: 'Consumer Mediation',
          body: <p>If you are a consumer and a dispute cannot be resolved after contacting support, you may contact the designated mediator: {LEGAL.mediatorName}, {LEGAL.mediatorWebsite}.</p>,
        },
      ]}
    />
  );
}
