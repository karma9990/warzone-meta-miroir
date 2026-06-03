'use client';

import { useState } from 'react';
import LocalizedLink from '@/components/LocalizedLink';

type Mode = 'signup' | 'signin';

export default function EmailSignInForm({
  initialMode = 'signup',
  allowSwitch = true,
  redirectTo = '/',
}: {
  initialMode?: Mode;
  allowSwitch?: boolean;
  redirectTo?: string;
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
      const cleanEmail = email.trim().toLowerCase();
      const cleanDisplayName = displayName.trim();

      if (mode === 'signup') {
        if (password !== confirmPassword) {
          setStatus('error');
          setMessage('Passwords do not match.');
          return;
        }

        const res = await fetch('/api/email-auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            username,
            displayName: cleanDisplayName,
            password,
            confirmPassword,
          }),
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(typeof data.error === 'string' ? data.error : 'Account creation failed.');
        }

        setStatus('sent');
        setMessage('Account created. Check your inbox to verify your email.');
        return;
      }

      const res = await fetch('/api/email-auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Authentication failed.');
      }

      const separator = redirectTo.includes('?') ? '&' : '?';
      window.location.href = `${redirectTo}${separator}signed_in=1`;
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

      {mode === 'signin' && (
        <LocalizedLink className="email-auth-forgot" href="/forgot-password">
          Forgot password?
        </LocalizedLink>
      )}

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
