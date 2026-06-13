'use client';

import { useState } from 'react';
import type { Locale } from '@/lib/i18n';

type Props = {
  weaponId: string;
  weapon: string;
  locale: Locale;
};

type Status = 'idle' | 'loading' | 'watching' | 'error';

const COPY = {
  en: {
    label: 'Get patch alerts',
    hint: (weapon: string) => `Email me when ${weapon} changes tier.`,
    placeholder: 'you@email.com',
    submit: 'Watch',
    done: 'You will be notified.',
    error: 'Could not save. Try again.',
  },
  fr: {
    label: 'Alertes de patch',
    hint: (weapon: string) => `Previens-moi quand ${weapon} change de tier.`,
    placeholder: 'toi@email.com',
    submit: 'Suivre',
    done: 'Tu seras prevenu.',
    error: 'Echec. Reessaie.',
  },
  es: {
    label: 'Alertas de parche',
    hint: (weapon: string) => `Avisame cuando ${weapon} cambie de tier.`,
    placeholder: 'tu@email.com',
    submit: 'Seguir',
    done: 'Te avisaremos.',
    error: 'Fallo. Intenta de nuevo.',
  },
};

export default function WeaponWatchButton({ weaponId, weapon, locale }: Props) {
  const lang = locale === 'fr' ? 'fr' : locale === 'es' ? 'es' : 'en';
  const t = COPY[lang];
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/weapon-watch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), weaponId }),
      });
      setStatus(res.ok ? 'watching' : 'error');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="watch-box">
      <span className="watch-label">{t.label}</span>
      <p className="watch-hint">{t.hint(weapon)}</p>
      {status === 'watching' ? (
        <p className="watch-done">✓ {t.done}</p>
      ) : (
        <form className="watch-form" onSubmit={submit}>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.currentTarget.value)}
            placeholder={t.placeholder}
            aria-label={t.placeholder}
          />
          <button type="submit" disabled={status === 'loading'}>{t.submit}</button>
        </form>
      )}
      {status === 'error' && <p className="watch-error">{t.error}</p>}

      <style>{`
        .watch-box { margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid rgba(16,16,14,0.12); }
        .watch-label { display: block; color: #163cff; font-size: 0.72rem; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
        .watch-hint { margin: 0.4rem 0 0.7rem; font-size: 0.74rem; color: rgba(16,16,14,0.6); line-height: 1.5; }
        .watch-form { display: flex; gap: 0.4rem; }
        .watch-form input { flex: 1; min-width: 0; border: 1px solid rgba(16,16,14,0.2); background: transparent; color: inherit; font: inherit; font-size: 0.8rem; padding: 0.5rem 0.6rem; }
        .watch-form button { border: 1px solid #163cff; background: #163cff; color: #fff; cursor: pointer; font: inherit; font-size: 0.7rem; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; padding: 0 0.9rem; }
        .watch-form button:disabled { opacity: 0.6; cursor: default; }
        .watch-done { margin: 0; color: #1f8f4d; font-size: 0.8rem; font-weight: 800; }
        .watch-error { margin: 0.5rem 0 0; color: #c0392b; font-size: 0.74rem; }
        :global(:root[data-theme="dark"]) .watch-hint { color: rgba(255,255,255,0.6); }
        :global(:root[data-theme="dark"]) .watch-form input { border-color: rgba(255,255,255,0.22); }
      `}</style>
    </div>
  );
}
