'use client';

import { useState } from 'react';

type CompanionFeatureTabsProps = {
  freeLabel: string;
  freeTitle: string;
  freeDescription: string;
  proLabel: string;
  proTitle: string;
  proDescription: string;
  proCheckoutEmail: string;
  proCheckoutLabel: string;
  proCheckoutLoadingLabel: string;
  proCheckoutError: string;
};

export default function CompanionFeatureTabs({
  freeLabel,
  freeTitle,
  freeDescription,
  proLabel,
  proTitle,
  proDescription,
  proCheckoutEmail,
  proCheckoutLabel,
  proCheckoutLoadingLabel,
  proCheckoutError,
}: CompanionFeatureTabsProps) {
  const [active, setActive] = useState<'free' | 'pro'>('free');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const content = active === 'free'
    ? { title: freeTitle, description: freeDescription }
    : { title: proTitle, description: proDescription };

  async function startPremiumCheckout() {
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/polar-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productKey: 'companion-premium', email: proCheckoutEmail }),
      });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) {
        throw new Error(result.error || proCheckoutError);
      }
      window.location.assign(result.url);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : proCheckoutError);
      setSubmitting(false);
    }
  }

  return (
    <div className="account-companion-tabs">
      <div className="account-companion-feature-row" aria-label="Companion feature modes">
        <button type="button" className={active === 'free' ? 'is-active' : ''} onClick={() => setActive('free')}>
          {freeLabel}
        </button>
        <button type="button" className={active === 'pro' ? 'is-active' : ''} onClick={() => setActive('pro')}>
          {proLabel}
        </button>
      </div>
      <div className="account-companion-highlight">
        <b>{content.title}</b>
        <small>{content.description}</small>
        {active === 'pro' ? (
          <>
            <button
              type="button"
              className="account-companion-checkout"
              onClick={startPremiumCheckout}
              disabled={submitting}
            >
              {submitting ? proCheckoutLoadingLabel : proCheckoutLabel}
            </button>
            {error ? <small className="is-error">{error}</small> : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
