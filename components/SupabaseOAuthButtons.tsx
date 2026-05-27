'use client';

import Link from 'next/link';
import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type AuthIntent = 'signin' | 'signup';

export default function SupabaseOAuthButtons({ intent }: { intent: AuthIntent }) {
  const [error, setError] = useState('');
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'apple' | null>(null);

  async function signInWithProvider(provider: 'google' | 'apple') {
    setError('');
    setLoadingProvider(provider);

    try {
      const supabase = createSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=/`;
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          queryParams: provider === 'google' ? { prompt: 'select_account' } : undefined,
        },
      });

      if (authError) throw authError;
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'OAuth sign-in failed.');
      setLoadingProvider(null);
    }
  }

  const copy = intent === 'signup' ? 'Sign up' : 'Sign in';

  return (
    <>
      <button type="button" onClick={() => signInWithProvider('google')} disabled={Boolean(loadingProvider)}>
        <b>G</b>
        <span>{loadingProvider === 'google' ? 'Opening Google...' : `${copy} with Google`}</span>
      </button>
      <button type="button" onClick={() => signInWithProvider('apple')} disabled={Boolean(loadingProvider)}>
        <b>A</b>
        <span>{loadingProvider === 'apple' ? 'Opening Apple...' : `${copy} with Apple`}</span>
      </button>
      <Link href={`/api/oauth/battlenet${intent === 'signup' ? '?intent=signup' : ''}`}>
        <b>BN</b>
        <span>{copy} with Battle.net</span>
      </Link>
      {error && <p className="email-auth-error">{error}</p>}
    </>
  );
}
