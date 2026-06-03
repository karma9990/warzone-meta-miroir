import Link from 'next/link';
import type { Metadata } from 'next';
import ForgotPasswordForm from '@/components/ForgotPasswordForm';
import { withLocalePath } from '@/lib/i18n';
import { getRequestLocale } from '@/lib/requestLocale';

export const metadata: Metadata = {
  title: 'Forgot password | WZPRO Meta',
  description: 'Request a password reset email for your WZPRO Meta account.',
};

export default async function ForgotPasswordPage() {
  const locale = await getRequestLocale();
  const href = (path: string) => withLocalePath(path, locale);

  return (
    <main className="forgot-password-page">
      <section className="forgot-password-panel">
        <div className="sign-in-topline">
          <Link className="auth-back" href={href('/')}>WZPRO Meta</Link>
          <span>Password recovery</span>
        </div>

        <div className="forgot-password-layout">
          <div className="forgot-password-copy">
            <span>Account recovery</span>
            <h1>Forgot password</h1>
            <p>Enter the email linked to your WZPRO Meta account. We will send a secure reset link to your inbox.</p>
          </div>

          <div className="forgot-password-console">
            <ForgotPasswordForm />
            <p className="email-auth-switch">
              Remembered it? <Link href={href('/sign-in')}>Sign in</Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
