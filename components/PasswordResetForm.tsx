'use client';

import { useState } from 'react';

export default function PasswordResetForm({ resetToken = '' }: { resetToken?: string }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const recoveryStatus = resetToken ? 'ready' : 'missing';
  const missingTokenMessage = 'This reset link is missing or expired. Request a new password reset email.';

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('sending');
    setMessage('');

    if (password.length < 8) {
      setStatus('error');
      setMessage('Use at least 8 characters for the new password.');
      return;
    }

    if (password !== confirmPassword) {
      setStatus('error');
      setMessage('Passwords do not match.');
      return;
    }

    try {
      if (recoveryStatus !== 'ready') {
        throw new Error('Open the reset link from your email before choosing a new password.');
      }

      const res = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Password update failed.');
      }

      setStatus('sent');
      setMessage('Password updated. You can go back to your account.');
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Password update failed.');
    }
  }

  return (
    <form className="email-auth-form" onSubmit={submit}>
      {recoveryStatus === 'missing' && (
        <p className="email-auth-error">{missingTokenMessage}</p>
      )}

      <label htmlFor="new-password-auth">New password *</label>
      <input
        id="new-password-auth"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Enter your new password"
        autoComplete="new-password"
        required
      />

      <label htmlFor="confirm-new-password-auth">Confirm new password *</label>
      <input
        id="confirm-new-password-auth"
        type="password"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        placeholder="Confirm your new password"
        autoComplete="new-password"
        required
      />

      <button type="submit" disabled={status === 'sending' || recoveryStatus === 'missing'}>
        {status === 'sending' ? <>Updating&hellip;</> : 'Update password'}
      </button>

      {message && <p className={status === 'error' ? 'email-auth-error' : 'email-auth-success'}>{message}</p>}
    </form>
  );
}
