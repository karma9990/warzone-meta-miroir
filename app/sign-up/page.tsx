import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Account | WZPRO Meta',
  description: 'Create a WZPRO Meta account for saved loadouts, pro access and private notes.',
};
import Link from 'next/link';
import EmailSignInForm from '@/components/EmailSignInForm';
import SupabaseOAuthButtons from '@/components/SupabaseOAuthButtons';
import { withLocalePath } from '@/lib/i18n';
import { getRequestLocale } from '@/lib/requestLocale';

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

function getOAuthProviderStatus() {
  return {
    google: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    ),
    battlenet: Boolean(process.env.BATTLE_NET_CLIENT_ID && process.env.BATTLE_NET_CLIENT_SECRET),
    apple: false,
  };
}

function safeNextPath(value?: string) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return '/';
  }

  return value;
}

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const [{ error, next }, locale] = await Promise.all([searchParams, getRequestLocale()]);
  const href = (path: string) => withLocalePath(path, locale);
  const nextPath = safeNextPath(next);

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-form-column">
            <Link className="auth-back" href={href('/')}>WZPRO Meta</Link>
            <div className="auth-heading">
              <span>Account access</span>
              <h1>Create an account</h1>
              <p>Start a WZPRO profile for saved loadouts, Pro access and private performance notes.</p>
            </div>

            {error && (
              <div className="auth-error">
                {errorCopy[error] || 'Sign-up failed. Try again.'}
              </div>
            )}

            <div className="auth-actions">
              <EmailSignInForm initialMode="signup" allowSwitch={false} redirectTo={nextPath} />
              <p className="email-auth-switch">
                You already have an account? <Link href={href(`/sign-in${nextPath !== '/' ? `?next=${encodeURIComponent(nextPath)}` : ''}`)}>Sign in</Link>
              </p>
              <div className="auth-separator">Or</div>
              <SupabaseOAuthButtons intent="signup" nextPath={nextPath} initialProviders={getOAuthProviderStatus()} />
            </div>

            <p className="auth-note">
              Secure sign-up with email, Google or Battle.net. You control profile visibility and saved account data.
            </p>
          </div>

          <aside className="auth-intel" aria-label="Account features">
            <div className="auth-intel-radar">
              <span>SYNC</span>
              <strong>06</strong>
              <small>PRO TOOLS</small>
            </div>
            <div className="auth-intel-copy">
              <span>Account loadout</span>
              <h2>Build once. Reopen before every lobby.</h2>
              <p>Your account keeps favorites, tool access and profile settings tied together.</p>
            </div>
            <dl className="auth-feature-grid">
              <div>
                <dt>Favorites</dt>
                <dd>Mark the weapons you actually run.</dd>
              </div>
              <div>
                <dt>Private notes</dt>
                <dd>Keep recoil, perk and squad notes synced.</dd>
              </div>
              <div>
                <dt>Battle.net</dt>
                <dd>Use your platform identity when configured.</dd>
              </div>
              <div>
                <dt>Billing</dt>
                <dd>Link Pro access to your account.</dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>
    </main>
  );
}
