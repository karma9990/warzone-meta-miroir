'use client';

import Link from 'next/link';
import { useState } from 'react';

type AuthIntent = 'signin' | 'signup';
type ProviderStatus = {
  google: boolean;
  battlenet: boolean;
  apple: boolean;
};

export default function SupabaseOAuthButtons({
  intent,
  nextPath = '/',
  initialProviders = { google: true, battlenet: false, apple: false },
}: {
  intent: AuthIntent;
  nextPath?: string;
  initialProviders?: ProviderStatus;
}) {
  const [providers] = useState<ProviderStatus>(initialProviders);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function signInWithGoogle() {
    setStatus('loading');
    setMessage('');

    try {
      const params = new URLSearchParams();
      if (intent === 'signup') params.set('intent', 'signup');
      if (nextPath !== '/') params.set('next', nextPath);
      window.location.href = `/api/oauth/google${params.size ? `?${params.toString()}` : ''}`;
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Google sign-in failed.');
    }
  }

  const copy = intent === 'signup' ? 'Sign up' : 'Sign in';
  const battleNetParams = new URLSearchParams();
  if (intent === 'signup') battleNetParams.set('intent', 'signup');
  if (nextPath !== '/') battleNetParams.set('next', nextPath);
  const battleNetHref = `/api/oauth/battlenet${battleNetParams.size ? `?${battleNetParams.toString()}` : ''}`;

  return (
    <>
      {providers.google && (
        <button type="button" onClick={signInWithGoogle} disabled={status === 'loading'}>
          <b>G</b>
          <span>{status === 'loading' ? 'Opening Google...' : `${copy} with Google`}</span>
        </button>
      )}
      {providers.battlenet ? (
        <Link href={battleNetHref}>
          <b>BN</b>
          <span>{copy} with Battle.net</span>
        </Link>
      ) : (
        <button className="auth-provider-muted" type="button" disabled aria-disabled="true">
          <b>BN</b>
          <span>Battle.net coming soon</span>
        </button>
      )}
      {!providers.google && (
        <button className="auth-provider-muted" type="button" disabled aria-disabled="true">
          <b>G</b>
          <span>Google coming soon</span>
        </button>
      )}
      {message && <p className={status === 'error' ? 'email-auth-error' : 'email-auth-success'}>{message}</p>}
      {/*
        Apple OAuth is intentionally hidden until the app has a working Apple Services ID,
        private key and verified callback URL.
      */}
      {false && (
        <button type="button" disabled>
          <b>A</b>
          <span>{copy} with Apple</span>
        </button>
      )}
    </>
  );
}
