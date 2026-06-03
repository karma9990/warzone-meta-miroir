'use client';

import { useState } from 'react';
import LocalizedLink from '@/components/LocalizedLink';

export default function SubscribePage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [alreadySubscribed, setAlreadySubscribed] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes('@')) {
      setError('Invalid email address.');
      return;
    }
    setError('');
    setSubmitting(true);
    setAlreadySubscribed(false);

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const result = await res.json() as { alreadySubscribed?: boolean; error?: string };
      if (!res.ok && res.status !== 202) {
        throw new Error(result.error || 'Unable to subscribe right now.');
      }
      setAlreadySubscribed(Boolean(result.alreadySubscribed));
      setSubmitted(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to subscribe right now.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <main className="sub-main">
        <div className="sub-back">
          <LocalizedLink href="/pro-tools">BACK</LocalizedLink>
        </div>

        <div className="sub-tag">FREE TIER</div>
        <h1 className="sub-title">SUBSCRIBE FREE</h1>
        <p className="sub-desc">
          Get meta alerts, patch digests and map updates delivered straight to your inbox. No credit card required.
        </p>

        <div className="sub-divider" />

        {submitted ? (
          <div className="sub-success">
            <div className="sub-success-icon">✓</div>
            <div className="sub-success-title">SUBSCRIPTION CONFIRMED</div>
            <p className="sub-success-desc">
              {alreadySubscribed
                ? 'You were already subscribed to the WZPRO Meta free newsletter.'
                : 'You are now subscribed to the WZPRO Meta free newsletter.'}<br />
              Check your inbox for the free newsletter summary.
            </p>
            <LocalizedLink href="/free-preview" className="sub-cta sub-cta--back">
              OPEN FREE PREVIEW
            </LocalizedLink>
          </div>
        ) : (
          <form className="sub-form" onSubmit={handleSubmit} noValidate>
            <div className="sub-field">
              <label className="sub-label" htmlFor="email">EMAIL ADDRESS</label>
              <input
                id="email"
                type="email"
                className="sub-input"
                placeholder="operator@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              {error && <span className="sub-error">{error}</span>}
            </div>

            <ul className="sub-perks">
              <li>Weekly meta newsletter</li>
              <li>Patch notes digest</li>
              <li>Resurgence map updates</li>
              <li>New weapon tier alerts</li>
              <li>Community tips & tricks</li>
            </ul>

            <button type="submit" className="sub-cta sub-cta--free" disabled={submitting}>
              {submitting ? 'JOINING...' : 'JOIN FOR FREE'}
            </button>

            <p className="sub-legal">
              By subscribing you agree to receive emails from WZPRO Meta.
              You can unsubscribe at any time.
            </p>
          </form>
        )}

        <div className="sub-upgrade">
          <span className="sub-upgrade-label">Want more?</span>
          <LocalizedLink href="/pro-access" className="sub-upgrade-link">
            Upgrade to Pro →
          </LocalizedLink>
        </div>
      </main>

      <style>{`
        .sub-main {
          max-width: 520px;
          margin: 0 auto;
          padding: 5rem 2rem 6rem;
        }

        .sub-back a {
          font-family: var(--font-mono, monospace);
          font-size: 0.65rem;
          letter-spacing: 0.18em;
          opacity: 0.45;
          text-decoration: none;
          transition: opacity 0.15s;
          color: inherit;
        }

        .sub-back a:hover { opacity: 0.9; }

        .sub-tag {
          font-family: var(--font-mono, monospace);
          font-size: 0.6rem;
          letter-spacing: 0.22em;
          opacity: 0.4;
          margin-top: 3rem;
          margin-bottom: 0.5rem;
        }

        .sub-title {
          font-family: var(--font-mono, monospace);
          font-size: clamp(1.8rem, 5vw, 3rem);
          letter-spacing: 0.1em;
          line-height: 1;
          margin: 0 0 1rem;
        }

        .sub-desc {
          font-family: var(--font-mono, monospace);
          font-size: 0.8rem;
          line-height: 1.7;
          opacity: 0.6;
          margin: 0;
        }

        .sub-divider {
          border: none;
          border-top: 1px solid rgba(0,0,0,0.15);
          margin: 2.5rem 0;
        }

        .sub-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .sub-field {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .sub-label {
          font-family: var(--font-mono, monospace);
          font-size: 0.6rem;
          letter-spacing: 0.2em;
          opacity: 0.45;
        }

        .sub-input {
          font-family: var(--font-mono, monospace);
          font-size: 0.8rem;
          padding: 0.85rem 1rem;
          border: 1px solid rgba(0,0,0,0.18);
          background: rgba(240,240,235,0.6);
          outline: none;
          transition: border-color 0.15s;
          color: inherit;
        }

        .sub-input:focus {
          border-color: blue;
        }

        .sub-error {
          font-family: var(--font-mono, monospace);
          font-size: 0.65rem;
          color: red;
          letter-spacing: 0.1em;
        }

        .sub-perks {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          border: 1px solid rgba(0,0,0,0.1);
          padding: 1.25rem 1.5rem;
          background: rgba(0,0,0,0.03);
        }

        .sub-perks li {
          font-family: var(--font-mono, monospace);
          font-size: 0.72rem;
          opacity: 0.7;
          padding-left: 1rem;
          position: relative;
        }

        .sub-perks li::before {
          content: '—';
          position: absolute;
          left: 0;
          opacity: 0.4;
        }

        .sub-cta {
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
        }

        .sub-cta:hover { opacity: 0.8; }

        .sub-cta--free {
          background: rgba(0,0,0,0.85);
          color: white;
        }

        .sub-cta--back {
          background: rgba(0,0,0,0.08);
          color: inherit;
        }

        .sub-legal {
          font-family: var(--font-mono, monospace);
          font-size: 0.6rem;
          opacity: 0.35;
          line-height: 1.6;
          text-align: center;
          margin: 0;
        }

        .sub-success {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          text-align: center;
          padding: 2rem 0;
        }

        .sub-success-icon {
          font-size: 2rem;
          width: 3.5rem;
          height: 3.5rem;
          border: 2px solid rgba(0,0,0,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-mono, monospace);
        }

        .sub-success-title {
          font-family: var(--font-mono, monospace);
          font-size: 1rem;
          letter-spacing: 0.15em;
        }

        .sub-success-desc {
          font-family: var(--font-mono, monospace);
          font-size: 0.75rem;
          line-height: 1.7;
          opacity: 0.6;
          margin: 0;
        }

        .sub-upgrade {
          margin-top: 3rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(0,0,0,0.1);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .sub-upgrade-label {
          font-family: var(--font-mono, monospace);
          font-size: 0.7rem;
          opacity: 0.45;
        }

        .sub-upgrade-link {
          font-family: var(--font-mono, monospace);
          font-size: 0.7rem;
          letter-spacing: 0.1em;
          color: blue;
          text-decoration: none;
          transition: opacity 0.15s;
        }

        .sub-upgrade-link:hover { opacity: 0.7; }
      `}</style>
    </>
  );
}
