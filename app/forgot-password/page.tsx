import Link from 'next/link';
import type { Metadata } from 'next';
import ForgotPasswordForm from '@/components/ForgotPasswordForm';
import { withLocalePath } from '@/lib/i18n';
import { getRequestLocale } from '@/lib/requestLocale';

export const metadata: Metadata = {
  title: 'Forgot password | WZPRO Meta',
  description: 'Request a password reset email for your WZPRO Meta account.',
  robots: { index: false, follow: false },
};

const copy = {
  en: {
    back: 'WZPRO Meta',
    recovery: 'Password recovery',
    access: 'Account recovery',
    title: 'Forgot password',
    lead: 'Enter the email linked to your WZPRO Meta account. We will send a secure reset link to your inbox.',
    remembered: 'Remembered it?',
    signIn: 'Sign in',
  },
  fr: {
    back: 'WZPRO Meta',
    recovery: 'Recuperation de mot de passe',
    access: 'Recuperation de compte',
    title: 'Mot de passe oublie',
    lead: 'Entrez l email lie a votre compte WZPRO Meta. Nous enverrons un lien de reinitialisation securise dans votre boite mail.',
    remembered: 'Vous vous en souvenez ?',
    signIn: 'Se connecter',
  },
};

export default async function ForgotPasswordPage() {
  const locale = await getRequestLocale();
  const href = (path: string) => withLocalePath(path, locale);
  const t = locale === 'fr' ? copy.fr : copy.en;

  return (
    <main className="forgot-password-page">
      <section className="forgot-password-panel">
        <div className="sign-in-topline">
          <Link className="auth-back" href={href('/')}>{t.back}</Link>
          <span>{t.recovery}</span>
        </div>

        <div className="forgot-password-layout">
          <div className="forgot-password-copy">
            <span>{t.access}</span>
            <h1>{t.title}</h1>
            <p>{t.lead}</p>
          </div>

          <div className="forgot-password-console">
            <ForgotPasswordForm locale={locale} />
            <p className="email-auth-switch">
              {t.remembered} <Link href={href('/sign-in')}>{t.signIn}</Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
