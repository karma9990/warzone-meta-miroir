'use client';

import { useState } from 'react';

type Labels = {
  manage: string;
  loading: string;
  none: string;
  error: string;
  linkLabel: string;
};

export default function ManageSubscriptionButton({
  labels,
  fallbackHref,
  className,
}: {
  labels: Labels;
  fallbackHref: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function openPortal() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/polar-portal', { method: 'POST' });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (res.ok && data.url) {
        window.location.assign(data.url);
        return;
      }
      // 404 = no billing account for this user; anything else = a transient failure.
      setError(res.status === 404 ? labels.none : labels.error);
    } catch {
      setError(labels.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <button type="button" onClick={openPortal} disabled={busy}>
        {busy ? labels.loading : labels.manage}
      </button>
      {error ? (
        <small>
          {error} <a href={fallbackHref}>{labels.linkLabel}</a>
        </small>
      ) : null}
    </div>
  );
}
