import Link from 'next/link';
import type { Metadata } from 'next';
import EmailSignInForm from '@/components/EmailSignInForm';
import SupabaseOAuthButtons from '@/components/SupabaseOAuthButtons';
import { withLocalePath } from '@/lib/i18n';
import { getRequestLocale } from '@/lib/requestLocale';

export const metadata: Metadata = {
  title: 'Sign in | WZPRO Meta',
  description: 'Sign in to save Warzone loadouts, manage your WZPRO Meta account and access purchased tools.',
};

const errorCopy: Record<string, string> = {
  provider: 'This login provider is not available.',
  google_config: 'Google login is not configured yet.',
  battlenet_config: 'Battle.net login is not configured yet.',
  apple_config: 'Apple login is not configured yet.',
  state: 'The sign-in request expired. Try again.',
  token: 'The provider did not return a valid access token.',
  profile: 'The provider profile could not be loaded.',
  google_email_unverified: 'Google did not confirm a verified email for this account.',
  email_token: 'This email sign-in link is invalid or expired.',
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

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const [{ error, next }, locale] = await Promise.all([searchParams, getRequestLocale()]);
  const href = (path: string) => withLocalePath(path, locale);
  const nextPath = safeNextPath(next);

  return (
    <main className="sign-in-page">
      <section className="sign-in-panel">
        <div className="sign-in-layout">
          <div className="sign-in-form-column">
            <div className="sign-in-topline">
              <Link className="auth-back" href={href('/')}>WZPRO Meta</Link>
              <span>Account gateway</span>
            </div>

            <div className="sign-in-copy">
              <span>Account access</span>
              <h1>Sign in</h1>
              <p>Reconnect to your WZPRO Meta account with email, Google or Battle.net.</p>
            </div>

            {error && (
              <div className="auth-error">
                {errorCopy[error] || 'Sign-in failed. Try again.'}
              </div>
            )}

            <div className="auth-actions sign-in-actions">
              <EmailSignInForm initialMode="signin" allowSwitch={false} redirectTo={nextPath} />
              <p className="email-auth-switch">
                No account yet? <Link href={href(`/sign-up${nextPath !== '/' ? `?next=${encodeURIComponent(nextPath)}` : ''}`)}>Sign up</Link>
              </p>
              <div className="auth-separator">Or</div>
              <SupabaseOAuthButtons intent="signin" nextPath={nextPath} initialProviders={getOAuthProviderStatus()} />
            </div>

            <p className="auth-note sign-in-note">
              Your profile, favorites, loadout notes and access stay linked to one WZPRO account.
            </p>
          </div>

          <aside className="sign-in-side" aria-label="Account benefits">
            <div className="sign-in-side-header">
              <span>Why sign in</span>
              <h2>Your Warzone workspace follows you.</h2>
              <p>Keep the useful parts of WZPRO attached to your profile instead of rebuilding them every session.</p>
            </div>

            <div className="sign-in-side-grid">
              <div>
                <span>01</span>
                <strong>Saved loadouts</strong>
                <p>Favorite builds and private notes synced to your account.</p>
              </div>
              <div>
                <span>02</span>
                <strong>Patch watch</strong>
                <p>Return to the latest checked meta board faster.</p>
              </div>
              <div>
                <span>03</span>
                <strong>Pro access</strong>
                <p>Purchased tools unlocked from the same account.</p>
              </div>
              <div>
                <span>04</span>
                <strong>Profile</strong>
                <p>Public stats stay under your control.</p>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
