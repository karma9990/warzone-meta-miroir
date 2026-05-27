import LegalPage from '@/components/LegalPage';
import { SUPPORT_EMAIL } from '@/lib/siteConfig';

const updated = 'May 20, 2026';
const supportEmail = SUPPORT_EMAIL;

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      updated={updated}
      intro="This policy explains how cookies and similar technologies may be used on WZPRO Meta."
      sections={[
        {
          title: '1. Essential Cookies',
          body: <p>Essential cookies or local storage may be used for security, session handling, access control, checkout flow, preferences and technical operation of the site.</p>,
        },
        {
          title: '2. Payment Cookies',
          body: <p>Paddle checkout may use cookies or similar technologies for payment processing, fraud prevention, tax calculation and checkout operation.</p>,
        },
        {
          title: '3. Analytics',
          body: <p>If analytics are enabled, cookies or similar identifiers may be used to understand site performance, feature usage and errors. Non-essential analytics or marketing trackers should be loaded only after consent unless they are configured to qualify for a legal consent exemption.</p>,
        },
        {
          title: '4. Consent Choices',
          body: <p>Where consent is required, the site must let users accept, refuse, and later change their choices with the same level of ease. Refusal must not prevent access to content unless a lawful alternative is provided.</p>,
        },
        {
          title: '5. Your Browser Controls',
          body: <p>You can block or delete cookies through your browser settings. Some checkout, login or access features may stop working if essential cookies are disabled.</p>,
        },
        {
          title: '6. Contact',
          body: <p>Cookie questions can be sent to {supportEmail}.</p>,
        },
      ]}
    />
  );
}
