'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type Mode = 'signup' | 'signin';

export default function EmailSignInForm({
  initialMode = 'signup',
  allowSwitch = true,
}: {
  initialMode?: Mode;
  allowSwitch?: boolean;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('sending');
    setMessage('');

    try {
      const supabase = createSupabaseBrowserClient();
      const cleanEmail = email.trim().toLowerCase();
      const cleanDisplayName = displayName.trim();

      if (mode === 'signup') {
        if (password !== confirmPassword) {
          setStatus('error');
          setMessage('Passwords do not match.');
          return;
        }

        const { error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              username: username.trim().toLowerCase(),
              display_name: cleanDisplayName || username.trim(),
            },
          },
        });

        if (error) throw error;

        setStatus('sent');
        setMessage('Account created. Check your inbox to verify your email.');
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) throw error;
      window.location.href = '/?signed_in=1';
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Authentication failed.');
    }
  }

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setStatus('idle');
    setMessage('');
  }

  return (
    <form className="email-auth-form" onSubmit={submit}>
      <label htmlFor="email-auth">Your email *</label>
      <input
        id="email-auth"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Enter your email"
        required
      />

      {mode === 'signup' && (
        <>
          <label htmlFor="username-auth">Your username *</label>
          <input
            id="username-auth"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Enter your username"
            autoComplete="username"
            required
          />

          <label htmlFor="display-auth">Your display name *</label>
          <input
            id="display-auth"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Enter your display name"
            required
          />
        </>
      )}

      <label htmlFor="password-auth">Your password *</label>
      <input
        id="password-auth"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Enter your password"
        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
        required
      />

      {mode === 'signup' && (
        <>
          <label htmlFor="confirm-password-auth">Confirm your password *</label>
          <input
            id="confirm-password-auth"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Confirm your password"
            autoComplete="new-password"
            required
          />
        </>
      )}

      <button type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending...' : mode === 'signup' ? 'Sign up with email' : 'Sign in with email'}
      </button>

      {allowSwitch && (
        <p className="email-auth-switch">
          {mode === 'signup' ? 'You already have an account?' : 'No account yet?'}
          {' '}
          <button type="button" onClick={() => switchMode(mode === 'signup' ? 'signin' : 'signup')}>
            {mode === 'signup' ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      )}

      {message && <p className={status === 'error' ? 'email-auth-error' : 'email-auth-success'}>{message}</p>}
    </form>
  );
}
