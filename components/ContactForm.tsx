'use client';

import LocalizedLink from '@/components/LocalizedLink';
import { useEffect, useState, type FormEvent } from 'react';

type SubmitState = 'idle' | 'sending' | 'success' | 'error';

const COOLDOWN_STORAGE_KEY = 'wz-contact-next-send-at';

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function getInitialCooldownLeft() {
  if (typeof window === 'undefined') return 0;
  const nextSendAt = Number(window.localStorage.getItem(COOLDOWN_STORAGE_KEY) || '0');
  return Math.max(0, Math.ceil((nextSendAt - Date.now()) / 1000));
}

export default function ContactForm({
  user,
}: {
  user: { name: string; email?: string } | null;
}) {
  const [status, setStatus] = useState<SubmitState>('idle');
  const [message, setMessage] = useState('');
  const [cooldownLeft, setCooldownLeft] = useState(getInitialCooldownLeft);

  useEffect(() => {
    function syncCooldown() {
      const nextSendAt = Number(window.localStorage.getItem(COOLDOWN_STORAGE_KEY) || '0');
      setCooldownLeft(Math.max(0, Math.ceil((nextSendAt - Date.now()) / 1000)));
    }

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
      setMessage(`Wait ${formatCountdown(cooldownLeft)} before sending another message.`);
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
        setMessage(typeof data.error === 'string' ? data.error : 'Unable to send the message.');
        return;
      }

      form.reset();
      startCooldown(typeof data.cooldownSeconds === 'number' ? data.cooldownSeconds : 10 * 60);
      setStatus('success');
      setMessage('Message sent. You can send another message in 10 minutes.');
    } catch {
      setStatus('error');
      setMessage('Network error. Try again in a few moments.');
    }
  }

  if (!user) {
    return (
      <div className="contact-auth-required">
        <p>Sign in to your account to send a support message.</p>
        <LocalizedLink href="/sign-in">SIGN IN</LocalizedLink>
      </div>
    );
  }

  return (
    <form className="contact-form" onSubmit={submitContactForm}>
      <div className="contact-form-grid">
        <label>
          Name
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
        Request type
        <select name="requestType" defaultValue="support" required>
          <option value="support">Support</option>
          <option value="billing">Billing / subscription</option>
          <option value="refund">Refund</option>
          <option value="access">Access issue</option>
          <option value="legal">Legal</option>
          <option value="other">Other</option>
        </select>
      </label>

      <label>
        Subject
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
        {status === 'sending' ? 'SENDING...' : cooldownLeft > 0 ? formatCountdown(cooldownLeft) : 'SEND'}
      </button>

      {cooldownLeft > 0 && (
        <p className="contact-form-cooldown" aria-live="polite">
          Next send available in {formatCountdown(cooldownLeft)}.
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
