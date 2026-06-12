'use client';

import { useState } from 'react';

const copy = {
  en: {
    missingToken: 'This reset link is missing or expired. Request a new password reset email.',
    shortPassword: 'Use at least 8 characters for the new password.',
    mismatch: 'Passwords do not match.',
    openLink: 'Open the reset link from your email before choosing a new password.',
    updateFailed: 'Password update failed.',
    updated: 'Password updated. You can go back to your account.',
    newPassLabel: 'New password *',
    newPassPlaceholder: 'Enter your new password',
    confirmLabel: 'Confirm new password *',
    confirmPlaceholder: 'Confirm your new password',
    updating: 'Updating...',
    updateBtn: 'Update password',
  },
  fr: {
    missingToken: 'Ce lien de reinitialisation est manquant ou a expire. Demandez un nouvel email.',
    shortPassword: 'Utilisez au moins 8 caracteres pour le nouveau mot de passe.',
    mismatch: 'Les mots de passe ne correspondent pas.',
    openLink: 'Ouvrez le lien de reinitialisation depuis votre email avant de choisir un nouveau mot de passe.',
    updateFailed: 'Echec de mise a jour du mot de passe.',
    updated: 'Mot de passe mis a jour. Vous pouvez retourner a votre compte.',
    newPassLabel: 'Nouveau mot de passe *',
    newPassPlaceholder: 'Entrez votre nouveau mot de passe',
    confirmLabel: 'Confirmer le nouveau mot de passe *',
    confirmPlaceholder: 'Confirmez votre nouveau mot de passe',
    updating: 'Mise a jour...',
    updateBtn: 'Mettre a jour le mot de passe',
  },
};

export default function PasswordResetForm({ resetToken = '', locale = 'en' }: { resetToken?: string; locale?: string }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const recoveryStatus = resetToken ? 'ready' : 'missing';
  const t = locale === 'fr' ? copy.fr : copy.en;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('sending');
    setMessage('');

    if (password.length < 8) {
      setStatus('error');
      setMessage(t.shortPassword);
      return;
    }

    if (password !== confirmPassword) {
      setStatus('error');
      setMessage(t.mismatch);
      return;
    }

    try {
      if (recoveryStatus !== 'ready') {
        throw new Error(t.openLink);
      }

      const res = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : t.updateFailed);
      }

      setStatus('sent');
      setMessage(t.updated);
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : t.updateFailed);
    }
  }

  return (
    <form className="email-auth-form" onSubmit={submit}>
      {recoveryStatus === 'missing' && (
        <p className="email-auth-error">{t.missingToken}</p>
      )}

      <label htmlFor="new-password-auth">{t.newPassLabel}</label>
      <input
        id="new-password-auth"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder={t.newPassPlaceholder}
        autoComplete="new-password"
        required
      />

      <label htmlFor="confirm-new-password-auth">{t.confirmLabel}</label>
      <input
        id="confirm-new-password-auth"
        type="password"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        placeholder={t.confirmPlaceholder}
        autoComplete="new-password"
        required
      />

      <button type="submit" disabled={status === 'sending' || recoveryStatus === 'missing'}>
        {status === 'sending' ? t.updating : t.updateBtn}
      </button>

      {message && <p className={status === 'error' ? 'email-auth-error' : 'email-auth-success'}>{message}</p>}
    </form>
  );
}
