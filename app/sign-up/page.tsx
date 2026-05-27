import Link from 'next/link';
import EmailSignInForm from '@/components/EmailSignInForm';
import SupabaseOAuthButtons from '@/components/SupabaseOAuthButtons';

const errorCopy: Record<string, string> = {
  provider: 'This login provider is not available.',
  google_config: 'Google login is not configured yet.',
  battlenet_config: 'Battle.net login is not configured yet.',
  apple_config: 'Apple login is not configured yet.',
  state: 'The sign-in request expired. Try again.',
  token: 'The provider did not return a valid access token.',
  profile: 'The provider profile could not be loaded.',
  google_email_unverified: 'Google did not confirm a verified email for this account.',
  email_token: 'This email verification link is invalid or expired.',
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <Link className="auth-back" href="/">WZPRO Meta</Link>
        <div className="auth-heading">
          <span>Account access</span>
          <h1>Create an account</h1>
          <p>Use email/password or continue with a verified OAuth provider.</p>
        </div>

        {error && (
          <div className="auth-error">
            {errorCopy[error] || 'Sign-up failed. Try again.'}
          </div>
        )}

        <div className="auth-actions">
          <EmailSignInForm initialMode="signup" allowSwitch={false} />
          <p className="email-auth-switch">
            You already have an account? <Link href="/sign-in">Sign in</Link>
          </p>
          <div className="auth-separator">Or</div>
          <SupabaseOAuthButtons intent="signup" />
        </div>

        <p className="auth-note">
          Email, Google and Apple use Supabase Auth. Battle.net remains on the legacy OAuth bridge.
        </p>
      </section>
    </main>
  );
}
