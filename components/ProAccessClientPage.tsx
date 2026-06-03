'use client';

import { useState } from 'react';
import LocalizedLink from '@/components/LocalizedLink';

const proProofs = [
  ['Preview before purchase', 'You can see the modules, expected outcomes and free excerpts before paying.'],
  ['Everything in one place', 'Aim, movement, meta, spawns, mindset and optimization are grouped into one access path.'],
  ['No long commitment', 'Monthly subscription, cancellable according to the policy shown before checkout.'],
];

const proFaq = [
  ['Do I pay before seeing the content?', 'No. The Pro Tools page already shows modules and previews. Pro unlocks the full path and future updates.'],
  ['Who is this for?', 'Warzone players who want to save time on settings, loadouts, rotations and session prep.'],
  ['How is payment handled?', 'A secure Polar checkout opens with taxes calculated automatically for your country.'],
];

type ProProof = { title: string; body: string };

export type ProAccessCopy = {
  backLabel: string;
  badge: string;
  tag: string;
  title: string;
  description: string;
  price: string;
  period: string;
  proofs: ProProof[];
  cta: string;
};

const DEFAULT_PRO_COPY: ProAccessCopy = {
  backLabel: '<- BACK',
  badge: 'MOST POPULAR',
  tag: 'PRO TIER',
  title: 'GET PRO ACCESS',
  description: 'Access every Pro Tool in one place, with loadout breakdowns, rotation guides and practical Warzone analysis.',
  price: '50 EUR',
  period: '/ month - no commitment',
  proofs: proProofs.map(([title, body]) => ({ title, body })),
  cta: 'GET STARTED - 50 EUR / MONTH',
};

export default function ProAccessPage({ initialCopy = DEFAULT_PRO_COPY }: { initialCopy?: ProAccessCopy }) {
  const [step, setStep] = useState<'info' | 'form'>('info');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [digitalConsent, setDigitalConsent] = useState(false);
  const copy = initialCopy;

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes('@')) {
      setError('Invalid email address.');
      return;
    }
    if (!digitalConsent) {
      setError('Confirm immediate digital access and withdrawal acknowledgement.');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/polar-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productKey: 'pro', email }),
      });
      const result = await res.json() as { url?: string; error?: string };
      if (!res.ok || !result.url) {
        throw new Error(result.error || 'Payment checkout is not configured.');
      }
      window.location.assign(result.url);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Payment checkout is not configured.');
      setSubmitting(false);
    }
  }

  return (
    <>
      <main className="pro-main">
        <div className="pro-back">
          <LocalizedLink href="/pro-tools">{copy.backLabel}</LocalizedLink>
        </div>

        <div className="pro-badge-row">
          <span className="pro-badge">{copy.badge}</span>
        </div>
        <div className="pro-tag">{copy.tag}</div>
        <h1 className="pro-title">{copy.title}</h1>
        <p className="pro-desc">
          {copy.description}
        </p>

        <div className="pro-price-block">
          <span className="pro-price">{copy.price}</span>
          <span className="pro-period">{copy.period}</span>
        </div>

        <div className="pro-divider" />

        {step === 'info' && (
          <>
            <div className="pro-proof-grid">
              {copy.proofs.map(({ title, body }) => (
                <article key={title}>
                  <span>{title}</span>
                  <p>{body}</p>
                </article>
              ))}
            </div>

            <ul className="pro-perks">
              <li><span className="pro-perk-label">Everything in Free</span></li>
              <li><span className="pro-perk-label">All 6 Pro Tools — early access</span></li>
              <li><span className="pro-perk-label">New tools before public release</span></li>
              <li><span className="pro-perk-label">Meta trend analysis</span></li>
              <li><span className="pro-perk-label">Priority spawn & rotation guides</span></li>
              <li><span className="pro-perk-label">Exclusive loadout breakdowns</span></li>
              <li><span className="pro-perk-label">Direct feedback channel</span></li>
            </ul>

            <div className="pro-preview-panel">
              <span>What you get today</span>
              <strong>An actionable path, not just a list of tips.</strong>
              <p>Each module connects a concrete problem to a decision: which sensitivity to test, which fight to take, which spawn to choose, and which setting to fix before queueing.</p>
            </div>

            <button type="button" className="pro-cta pro-cta--main" onClick={() => setStep('form')}>
              {copy.cta}
            </button>

            <p className="pro-legal">
              Cancel anytime. No hidden fees.
              By continuing, you agree to the <LocalizedLink href="/terms">Terms</LocalizedLink>, <LocalizedLink href="/privacy">Privacy Policy</LocalizedLink>, <LocalizedLink href="/billing">Billing Policy</LocalizedLink>, <LocalizedLink href="/cancellation">Cancellation Policy</LocalizedLink> and <LocalizedLink href="/refund">Refund Policy</LocalizedLink>.
            </p>

            <div className="pro-faq">
              {proFaq.map(([question, answer]) => (
                <details key={question}>
                  <summary>{question}</summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </>
        )}

        {step === 'form' && (
          <form className="pro-form" onSubmit={handleStart} noValidate>
            <div className="pro-field">
              <label className="pro-label" htmlFor="pro-email">EMAIL ADDRESS</label>
              <input
                id="pro-email"
                type="email"
                className="pro-input"
                placeholder="operator@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              {error && <span className="pro-error">{error}</span>}
            </div>

            <div className="pro-payment-note">
              <span className="pro-payment-tag">SECURE PAYMENT</span>
              <p className="pro-payment-desc">
                A secure Polar checkout will open. Taxes are calculated automatically based on your country.
              </p>
            </div>

            <label className="pro-consent">
              <input
                type="checkbox"
                checked={digitalConsent}
                onChange={e => setDigitalConsent(e.target.checked)}
                required
              />
              <span>
                I request immediate access to this digital subscription and acknowledge that I lose my withdrawal right once access is delivered.
              </span>
            </label>

            <button type="submit" className="pro-cta pro-cta--main" disabled={submitting}>
              {submitting ? 'OPENING PAYMENT...' : 'CONTINUE TO PAYMENT →'}
            </button>

            <button type="button" className="pro-cta pro-cta--ghost" onClick={() => setStep('info')}>
              BACK
            </button>
          </form>
        )}

        <div className="pro-downgrade">
          <span className="pro-downgrade-label">Not ready yet?</span>
          <LocalizedLink href="/subscribe" className="pro-downgrade-link">
            Start with the free plan →
          </LocalizedLink>
        </div>
      </main>

      <style>{`
        .pro-main {
          max-width: 520px;
          margin: 0 auto;
          padding: 5rem 2rem 6rem;
        }

        .pro-back a {
          font-family: var(--font-mono, monospace);
          font-size: 0.65rem;
          letter-spacing: 0.18em;
          opacity: 0.45;
          text-decoration: none;
          transition: opacity 0.15s;
          color: inherit;
        }

        .pro-back a:hover { opacity: 0.9; }

        .pro-badge-row {
          margin-top: 2.5rem;
          margin-bottom: 0.75rem;
        }

        .pro-badge {
          background: blue;
          color: white;
          font-family: var(--font-mono, monospace);
          font-size: 0.55rem;
          letter-spacing: 0.18em;
          padding: 0.2rem 0.6rem;
        }

        .pro-tag {
          font-family: var(--font-mono, monospace);
          font-size: 0.6rem;
          letter-spacing: 0.22em;
          opacity: 0.4;
          margin-bottom: 0.5rem;
        }

        .pro-title {
          font-family: var(--font-mono, monospace);
          font-size: clamp(1.8rem, 5vw, 3rem);
          letter-spacing: 0.1em;
          line-height: 1;
          margin: 0 0 1rem;
        }

        .pro-desc {
          font-family: var(--font-mono, monospace);
          font-size: 0.8rem;
          line-height: 1.7;
          opacity: 0.6;
          margin: 0 0 1.5rem;
        }

        .pro-price-block {
          display: flex;
          align-items: baseline;
          gap: 0.6rem;
        }

        .pro-price {
          font-family: var(--font-mono, monospace);
          font-size: 2.5rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: blue;
        }

        .pro-period {
          font-family: var(--font-mono, monospace);
          font-size: 0.75rem;
          opacity: 0.45;
        }

        .pro-divider {
          border: none;
          border-top: 1px solid rgba(0,0,0,0.15);
          margin: 2rem 0;
        }

        .pro-perks {
          list-style: none;
          margin: 0 0 2rem;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0;
          border: 1px solid rgba(0,0,255,0.12);
        }

        .pro-perks li {
          font-family: var(--font-mono, monospace);
          font-size: 0.75rem;
          padding: 0.7rem 1.25rem;
          border-bottom: 1px solid rgba(0,0,0,0.07);
          position: relative;
          padding-left: 2rem;
        }

        .pro-perks li:last-child { border-bottom: none; }

        .pro-perks li::before {
          content: '→';
          position: absolute;
          left: 0.75rem;
          opacity: 0.35;
          font-size: 0.65rem;
        }

        .pro-perk-label { opacity: 0.8; }

        .pro-proof-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1px;
          margin-bottom: 1.5rem;
          border: 1px solid rgba(0,0,0,0.1);
          background: rgba(0,0,0,0.1);
        }

        .pro-proof-grid article {
          padding: 0.9rem 1rem;
          background: rgba(240,240,235,0.72);
        }

        .pro-proof-grid span,
        .pro-preview-panel span {
          display: block;
          color: blue;
          font-family: var(--font-mono, monospace);
          font-size: 0.58rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .pro-proof-grid p,
        .pro-preview-panel p,
        .pro-faq p {
          margin: 0;
          font-family: var(--font-mono, monospace);
          font-size: 0.68rem;
          line-height: 1.6;
          opacity: 0.62;
        }

        .pro-preview-panel {
          margin: 0 0 1.5rem;
          padding: 1rem 1.15rem;
          border: 1px solid rgba(0,0,255,0.16);
          background: rgba(0,0,255,0.035);
        }

        .pro-preview-panel strong {
          display: block;
          margin: 0.4rem 0 0.5rem;
          font-family: var(--font-mono, monospace);
          font-size: 0.95rem;
          line-height: 1.25;
          text-transform: uppercase;
        }

        .pro-faq {
          display: grid;
          gap: 1px;
          margin-top: 1.5rem;
          border: 1px solid rgba(0,0,0,0.1);
          background: rgba(0,0,0,0.1);
        }

        .pro-faq details {
          background: rgba(240,240,235,0.74);
        }

        .pro-faq summary {
          cursor: pointer;
          padding: 0.85rem 1rem;
          font-family: var(--font-mono, monospace);
          font-size: 0.68rem;
          font-weight: 800;
          text-transform: uppercase;
        }

        .pro-faq p {
          padding: 0 1rem 0.95rem;
        }

        .pro-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .pro-field {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .pro-label {
          font-family: var(--font-mono, monospace);
          font-size: 0.6rem;
          letter-spacing: 0.2em;
          opacity: 0.45;
        }

        .pro-input {
          font-family: var(--font-mono, monospace);
          font-size: 0.8rem;
          padding: 0.85rem 1rem;
          border: 1px solid rgba(0,0,0,0.18);
          background: rgba(240,240,235,0.6);
          outline: none;
          transition: border-color 0.15s;
          color: inherit;
        }

        .pro-input:focus { border-color: blue; }

        .pro-error {
          font-family: var(--font-mono, monospace);
          font-size: 0.65rem;
          color: red;
          letter-spacing: 0.1em;
        }

        .pro-payment-note {
          border: 1px solid rgba(0,0,0,0.1);
          padding: 1rem 1.25rem;
          background: rgba(0,0,0,0.02);
        }

        .pro-payment-tag {
          font-family: var(--font-mono, monospace);
          font-size: 0.55rem;
          letter-spacing: 0.2em;
          opacity: 0.4;
          display: block;
          margin-bottom: 0.35rem;
        }

        .pro-payment-desc {
          font-family: var(--font-mono, monospace);
          font-size: 0.72rem;
          line-height: 1.6;
          opacity: 0.6;
          margin: 0;
        }

        .pro-consent {
          display: grid;
          grid-template-columns: 1rem 1fr;
          gap: 0.65rem;
          align-items: start;
          font-family: var(--font-mono, monospace);
          font-size: 0.65rem;
          line-height: 1.55;
          opacity: 0.62;
        }

        .pro-consent input {
          width: 1rem;
          height: 1rem;
          margin: 0.12rem 0 0;
          accent-color: blue;
        }

        .pro-cta {
          display: block;
          text-align: center;
          padding: 0.9rem 1rem;
          font-family: var(--font-mono, monospace);
          font-size: 0.72rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          border: none;
          cursor: pointer;
          transition: opacity 0.15s;
          text-decoration: none;
          width: 100%;
          box-sizing: border-box;
        }

        .pro-cta:hover { opacity: 0.8; }

        .pro-cta--main {
          background: blue;
          color: white;
        }

        .pro-cta--ghost {
          background: rgba(0,0,0,0.06);
          color: inherit;
        }

        .pro-legal {
          font-family: var(--font-mono, monospace);
          font-size: 0.6rem;
          opacity: 0.35;
          line-height: 1.6;
          text-align: center;
          margin: 0;
        }

        .pro-legal a {
          color: inherit;
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .pro-confirm {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.25rem;
          text-align: center;
        }

        .pro-confirm-icon {
          font-size: 1.5rem;
          width: 3.5rem;
          height: 3.5rem;
          border: 2px solid blue;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-mono, monospace);
          color: blue;
        }

        .pro-confirm-title {
          font-family: var(--font-mono, monospace);
          font-size: 1rem;
          letter-spacing: 0.15em;
        }

        .pro-confirm-desc {
          font-family: var(--font-mono, monospace);
          font-size: 0.75rem;
          line-height: 1.7;
          opacity: 0.6;
          margin: 0;
        }

        .pro-confirm-summary {
          width: 100%;
          border: 1px solid rgba(0,0,0,0.12);
          text-align: left;
        }

        .pro-confirm-row {
          display: flex;
          justify-content: space-between;
          padding: 0.65rem 1rem;
          border-bottom: 1px solid rgba(0,0,0,0.07);
          font-family: var(--font-mono, monospace);
          font-size: 0.72rem;
        }

        .pro-confirm-row:last-child { border-bottom: none; }

        .pro-confirm-row span:first-child { opacity: 0.45; }

        .pro-downgrade {
          margin-top: 3rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(0,0,0,0.1);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .pro-downgrade-label {
          font-family: var(--font-mono, monospace);
          font-size: 0.7rem;
          opacity: 0.45;
        }

        .pro-downgrade-link {
          font-family: var(--font-mono, monospace);
          font-size: 0.7rem;
          letter-spacing: 0.1em;
          color: inherit;
          text-decoration: none;
          opacity: 0.55;
          transition: opacity 0.15s;
        }

        .pro-downgrade-link:hover { opacity: 0.9; }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 560px) {
          .pro-main {
            max-width: none;
            width: 100%;
            overflow: hidden;
            padding: 4rem 1.5rem 5rem;
            box-sizing: border-box;
          }

          .pro-title {
            max-width: 100%;
            font-size: clamp(1.45rem, 8vw, 2rem);
            letter-spacing: 0.04em;
            line-height: 1.08;
            overflow-wrap: anywhere;
            white-space: normal;
          }

          .pro-desc,
          .pro-proof-grid p,
          .pro-preview-panel p,
          .pro-faq p,
          .pro-legal,
          .pro-downgrade {
            max-width: 100%;
            overflow-wrap: anywhere;
            white-space: normal;
          }

          .pro-desc {
            font-size: 0.74rem;
          }

          .pro-price-block,
          .pro-downgrade {
            align-items: flex-start;
            flex-direction: column;
          }

          .pro-period {
            line-height: 1.5;
          }
        }
      `}</style>
    </>
  );
}
