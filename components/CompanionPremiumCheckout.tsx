'use client';

import { useState } from 'react';

export default function CompanionPremiumCheckout() {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function startCheckout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    if (!consent) {
      setError('Confirm immediate digital access before continuing.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      const response = await fetch('/api/polar-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productKey: 'pro', email }),
      });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) {
        throw new Error(result.error || 'Payment is unavailable right now.');
      }
      window.location.assign(result.url);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Payment is unavailable right now.');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={startCheckout} style={{ display: 'grid', gap: 12, maxWidth: 520 }}>
      <label style={{ display: 'grid', gap: 6 }}>
        <span>WZPRO account email</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="ton@email.com"
          required
          style={{ minHeight: 44, padding: '0 12px' }}
        />
      </label>
      <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          style={{ marginTop: 4 }}
        />
        <span>I request immediate digital access and acknowledge that I lose my right of withdrawal once access is delivered.</span>
      </label>
      {error ? <p style={{ color: '#b00020', margin: 0 }}>{error}</p> : null}
      <button type="submit" disabled={submitting} style={{ minHeight: 44 }}>
        {submitting ? 'Opening checkout...' : 'Pay for Premium with Polar'}
      </button>
    </form>
  );
}
