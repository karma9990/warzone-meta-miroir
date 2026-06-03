'use client';

import { useState } from 'react';
export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('sending');
    setMessage('');

    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Unable to send the reset email right now.');
      }

      setStatus('sent');
      setMessage('Reset email sent. Check your inbox for the secure link.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to send the reset email right now.');
    }
  }

  return (
    <form className="email-auth-form forgot-password-form" onSubmit={submit}>
      <label htmlFor="forgot-email-auth">Your email *</label>
      <input
        id="forgot-email-auth"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Enter your account email"
        required
      />

      <button type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending reset email...' : 'Send reset email'}
      </button>

      {message && <p className={status === 'error' ? 'email-auth-error' : 'email-auth-success'}>{message}</p>}
    </form>
  );
}
