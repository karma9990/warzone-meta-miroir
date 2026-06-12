import Link from 'next/link';
import type { Metadata } from 'next';
import PasswordResetForm from '@/components/PasswordResetForm';
import { withLocalePath } from '@/lib/i18n';
import { getRequestLocale } from '@/lib/requestLocale';

export const metadata: Metadata = {
  title: 'Reset password | WZPRO Meta',
  description: 'Set a new password for your WZPRO Meta account.',
  robots: { index: false, follow: false },
};

const copy = {
  en: {
    back: 'WZPRO Meta',
    security: 'Account security',
    title: 'Reset password',
    lead: 'Choose a new password for your WZPRO Meta account.',
    updated: 'Password already updated?',
    signIn: 'Sign in',
  },
  fr: {
    back: 'WZPRO Meta',
    security: 'Securite du compte',
    title: 'Reinitialiser le mot de passe',
    lead: 'Choisissez un nouveau mot de passe pour votre compte WZPRO Meta.',
    updated: 'Mot de passe deja mis a jour ?',
    signIn: 'Se connecter',
  },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const [{ token }, locale] = await Promise.all([searchParams, getRequestLocale()]);
  const href = (path: string) => withLocalePath(path, locale);
  const t = locale === 'fr' ? copy.fr : copy.en;

  return (
    <main className="auth-page">
      <section className="auth-panel auth-panel--narrow">
        <div className="auth-form-column">
          <Link className="auth-back" href={href('/')}>{t.back}</Link>
          <div className="auth-heading">
            <span>{t.security}</span>
            <h1>{t.title}</h1>
            <p>{t.lead}</p>
          </div>

          <div className="auth-actions">
            <PasswordResetForm resetToken={token || ''} locale={locale} />
            <p className="email-auth-switch">
              {t.updated} <Link href={href('/sign-in')}>{t.signIn}</Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
