import Link from 'next/link';
import type { Metadata } from 'next';
import PasswordResetForm from '@/components/PasswordResetForm';
import { withLocalePath } from '@/lib/i18n';
import { getRequestLocale } from '@/lib/requestLocale';

export const metadata: Metadata = {
  title: 'Reset password | WZPRO Meta',
  description: 'Set a new password for your WZPRO Meta account.',
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const [{ token }, locale] = await Promise.all([searchParams, getRequestLocale()]);
  const href = (path: string) => withLocalePath(path, locale);

  return (
    <main className="auth-page">
      <section className="auth-panel auth-panel--narrow">
        <div className="auth-form-column">
          <Link className="auth-back" href={href('/')}>WZPRO Meta</Link>
          <div className="auth-heading">
            <span>Account security</span>
            <h1>Reset password</h1>
            <p>Choose a new password for your WZPRO Meta account.</p>
          </div>

          <div className="auth-actions">
            <PasswordResetForm resetToken={token || ''} />
            <p className="email-auth-switch">
              Password already updated? <Link href={href('/sign-in')}>Sign in</Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
