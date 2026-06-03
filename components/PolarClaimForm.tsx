'use client';

import { useState } from 'react';

function isSafeRelativePath(value: string) {
  return value.startsWith('/') && !value.startsWith('//') && !value.includes('\\');
}

export default function PolarClaimForm() {
  const [checkoutId, setCheckoutId] = useState(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('checkout_id') || '';
  });
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/polar-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkoutId, email }),
      });
      const result = await res.json() as { accessUrl?: string; error?: string };
      if (!res.ok || !result.accessUrl) {
        throw new Error(result.error || 'Unable to open access.');
      }
      if (!isSafeRelativePath(result.accessUrl)) {
        throw new Error('Invalid access redirect.');
      }
      window.location.assign(result.accessUrl);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to open access.');
      setSubmitting(false);
    }
  }

  return (
    <form className="claim-form" onSubmit={handleSubmit}>
      <div className="claim-row">
        <label className="claim-label" htmlFor="claim-transaction">CHECKOUT ID</label>
        <input
          id="claim-transaction"
          className="claim-input"
          value={checkoutId}
          onChange={event => setCheckoutId(event.target.value)}
          placeholder="Polar checkout id"
          required
        />
      </div>
      <div className="claim-row">
        <label className="claim-label" htmlFor="claim-email">PURCHASE EMAIL</label>
        <input
          id="claim-email"
          className="claim-input"
          type="email"
          value={email}
          onChange={event => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
        />
      </div>
      {status && <p className="claim-status">{status}</p>}
      <button className="claim-btn" type="submit" disabled={submitting}>
        {submitting ? 'OPENING ACCESS...' : 'OPEN ACCESS'}
      </button>
    </form>
  );
}
