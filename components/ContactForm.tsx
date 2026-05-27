'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';

type SubmitState = 'idle' | 'sending' | 'success' | 'error';

const COOLDOWN_STORAGE_KEY = 'wz-contact-next-send-at';

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function ContactForm({
  user,
}: {
  user: { name: string; email?: string } | null;
}) {
  const [status, setStatus] = useState<SubmitState>('idle');
  const [message, setMessage] = useState('');
  const [cooldownLeft, setCooldownLeft] = useState(0);

  useEffect(() => {
    function syncCooldown() {
      const nextSendAt = Number(window.localStorage.getItem(COOLDOWN_STORAGE_KEY) || '0');
      setCooldownLeft(Math.max(0, Math.ceil((nextSendAt - Date.now()) / 1000)));
    }

    syncCooldown();
    const timer = window.setInterval(syncCooldown, 1000);
    return () => window.clearInterval(timer);
  }, []);

  function startCooldown(seconds: number) {
    window.localStorage.setItem(COOLDOWN_STORAGE_KEY, String(Date.now() + seconds * 1000));
    setCooldownLeft(seconds);
  }

  async function submitContactForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (cooldownLeft > 0) {
      setStatus('error');
      setMessage(`Attendez ${formatCountdown(cooldownLeft)} avant de renvoyer un message.`);
      return;
    }

    setStatus('sending');
    setMessage('');

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      name: formData.get('name'),
      email: formData.get('email'),
      subject: formData.get('subject'),
      requestType: formData.get('requestType'),
      message: formData.get('message'),
      website: formData.get('website'),
    };

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 429 && typeof data.retryAfter === 'number') {
          startCooldown(data.retryAfter);
        }
        setStatus('error');
        setMessage(typeof data.error === 'string' ? data.error : "Impossible d'envoyer le message.");
        return;
      }

      form.reset();
      startCooldown(typeof data.cooldownSeconds === 'number' ? data.cooldownSeconds : 10 * 60);
      setStatus('success');
      setMessage('Message envoye. Vous pourrez renvoyer un message dans 10 minutes.');
    } catch {
      setStatus('error');
      setMessage('Erreur reseau. Reessayez dans quelques instants.');
    }
  }

  if (!user) {
    return (
      <div className="contact-auth-required">
        <p>Connectez-vous a votre compte pour envoyer un message au support.</p>
        <Link href="/sign-in">SE CONNECTER</Link>
      </div>
    );
  }

  return (
    <form className="contact-form" onSubmit={submitContactForm}>
      <div className="contact-form-grid">
        <label>
          Nom
          <input name="name" type="text" autoComplete="name" maxLength={80} defaultValue={user.name} required />
        </label>
        <label>
          Email
          <input
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={254}
            defaultValue={user.email || ''}
            readOnly={Boolean(user.email)}
            required
          />
        </label>
      </div>

      <label>
        Type de demande
        <select name="requestType" defaultValue="support" required>
          <option value="support">Support</option>
          <option value="billing">Paiement / abonnement</option>
          <option value="refund">Remboursement</option>
          <option value="access">Probleme d&apos;acces</option>
          <option value="legal">Legal</option>
          <option value="other">Autre</option>
        </select>
      </label>

      <label>
        Sujet
        <input name="subject" type="text" maxLength={120} required />
      </label>

      <label>
        Message
        <textarea name="message" rows={7} maxLength={3000} required />
      </label>

      <label className="contact-honeypot" aria-hidden="true">
        Website
        <input name="website" type="text" tabIndex={-1} autoComplete="off" />
      </label>

      <button type="submit" disabled={status === 'sending' || cooldownLeft > 0}>
        {status === 'sending' ? 'ENVOI...' : cooldownLeft > 0 ? formatCountdown(cooldownLeft) : 'ENVOYER'}
      </button>

      {cooldownLeft > 0 && (
        <p className="contact-form-cooldown" aria-live="polite">
          Prochain envoi possible dans {formatCountdown(cooldownLeft)}.
        </p>
      )}

      {message && (
        <p className={status === 'success' ? 'contact-form-success' : 'contact-form-error'} aria-live="polite">
          {message}
        </p>
      )}
    </form>
  );
}
