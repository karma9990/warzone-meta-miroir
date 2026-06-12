'use client';

import { useState } from 'react';

const copy = {
  en: {
    emailLabel: 'Your email *',
    emailPlaceholder: 'Enter your account email',
    sending: 'Sending reset email...',
    sendBtn: 'Send reset email',
    sendFailed: 'Unable to send the reset email right now.',
    sent: 'Reset email sent. Check your inbox for the secure link.',
  },
  fr: {
    emailLabel: 'Votre email *',
    emailPlaceholder: 'Entrez l email de votre compte',
    sending: 'Envoi de l email de reinitialisation...',
    sendBtn: 'Envoyer l email de reinitialisation',
    sendFailed: 'Impossible d envoyer l email de reinitialisation.',
    sent: 'Email de reinitialisation envoye. Verifiez votre boite mail.',
  },
};

export default function ForgotPasswordForm({ locale = 'en' }: { locale?: string }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const t = locale === 'fr' ? copy.fr : copy.en;

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
        throw new Error(typeof data.error === 'string' ? data.error : t.sendFailed);
      }

      setStatus('sent');
      setMessage(t.sent);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : t.sendFailed);
    }
  }

  return (
    <form className="email-auth-form forgot-password-form" onSubmit={submit}>
      <label htmlFor="forgot-email-auth">{t.emailLabel}</label>
      <input
        id="forgot-email-auth"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder={t.emailPlaceholder}
        required
      />

      <button type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? t.sending : t.sendBtn}
      </button>

      {message && <p className={status === 'error' ? 'email-auth-error' : 'email-auth-success'}>{message}</p>}
    </form>
  );
}
