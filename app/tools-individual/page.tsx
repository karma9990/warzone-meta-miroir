'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { absoluteUrl } from '@/lib/siteConfig';

const PADDLE_CLIENT_TOKEN = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
const PADDLE_ENV = process.env.NEXT_PUBLIC_PADDLE_ENV;
const PUBLIC_PRICE_IDS = {
  'aim-tools': process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_AIM_TOOLS || 'pri_01kr6tsvfsekx29tp80smcx1as',
  'next-meta': process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_NEXT_META || 'pri_01kr6txq3xhypkxn588r0y99xj',
  'pro-movement': process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_PRO_MOVEMENT || 'pri_01kr6tzyymcvbfa1yztpnnnk2r',
  'how-to-be-a-pro': process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_HOW_TO_BE_A_PRO || 'pri_01kr6v1g040h0712s2wty8k8q0',
  'pro-spawn': process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_PRO_SPAWN || 'pri_01kr6v2y405g71trjncsjjaqz3',
  'pro-opti': process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_PRO_OPTI || 'pri_01kr6v4613d1x1gaj4qe1kytfj',
};

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Paddle: any;
  }
}

const TOOLS = [
  {
    id: 'aim-tools',
    name: 'Aim Tools',
    tag: 'PRECISION',
    desc: 'Sensitivity tuning, ADS multipliers, dead zone calibration, crosshair placement and recoil pattern guides.',
    price: '9 €',
    priceId: PUBLIC_PRICE_IDS['aim-tools'],
  },
  {
    id: 'next-meta',
    name: 'Next Meta',
    tag: 'INTEL',
    desc: 'Weapons, equipment and perk shifts gathered into practical meta notes.',
    price: '9 €',
    priceId: PUBLIC_PRICE_IDS['next-meta'],
  },
  {
    id: 'pro-movement',
    name: 'Pro Movement',
    tag: 'MECHANICS',
    desc: 'Slide cancel, corner peeking, high ground control and rotation timing — core mechanics used by every pro.',
    price: '9 €',
    priceId: PUBLIC_PRICE_IDS['pro-movement'],
  },
  {
    id: 'how-to-be-a-pro',
    name: 'How To Be A Pro',
    tag: 'MINDSET',
    desc: 'The system behind consistent improvement — habits, session structure, teammate selection and mental reset.',
    price: '9 €',
    priceId: PUBLIC_PRICE_IDS['how-to-be-a-pro'],
  },
  {
    id: 'pro-spawn',
    name: 'Pro Spawn',
    tag: 'MAP CONTROL',
    desc: 'Dominant spawn zones on Rebirth Island and Haven — the exact positions that control the match flow.',
    price: '9 €',
    priceId: PUBLIC_PRICE_IDS['pro-spawn'],
  },
  {
    id: 'pro-opti',
    name: 'Pro Opti',
    tag: 'PERFORMANCE',
    desc: 'Settings, hardware and software optimisations to reduce input lag and maximise your frame rate.',
    price: '9 €',
    priceId: PUBLIC_PRICE_IDS['pro-opti'],
  },
];

type PaddleCheckoutEvent = {
  name?: string;
  data?: {
    id?: string;
    transaction_id?: string;
    transactionId?: string;
    transaction?: { id?: string };
  };
};

type SessionUser = {
  sub: string;
  provider: 'google' | 'battlenet' | 'apple' | 'email';
  name: string;
  email?: string;
};

function getCheckoutTransactionId(event: PaddleCheckoutEvent) {
  return event.data?.transaction_id
    ?? event.data?.transactionId
    ?? event.data?.transaction?.id
    ?? (event.data?.id?.startsWith('txn_') ? event.data.id : '');
}

function isSafeRelativePath(value: string) {
  return value.startsWith('/') && !value.startsWith('//') && !value.includes('\\');
}

export default function ToolsIndividualPage() {
  const [paddleReady, setPaddleReady] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [emailFor, setEmailFor] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [user, setUser] = useState<SessionUser | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [digitalConsent, setDigitalConsent] = useState(false);
  const [claimingAccess, setClaimingAccess] = useState(false);
  const latestCheckoutEmail = useRef('');
  const claimedTransactions = useRef(new Set<string>());

  useEffect(() => {
    let alive = true;

    fetch('/api/session')
      .then((res) => res.json())
      .then((data) => {
        if (alive) setUser(data.user || null);
      })
      .catch(() => {
        if (alive) setUser(null);
      })
      .finally(() => {
        if (alive) setSessionChecked(true);
      });

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (paddleReady && window.Paddle && PADDLE_CLIENT_TOKEN) {
      if (PADDLE_ENV === 'sandbox') {
        window.Paddle.Environment.set('sandbox');
      }
      window.Paddle.Initialize({
        token: PADDLE_CLIENT_TOKEN,
        async eventCallback(event: PaddleCheckoutEvent) {
          if (event.name === 'checkout.closed') {
            setBuying(null);
            setClaimingAccess(false);
            return;
          }
          if (event.name !== 'checkout.completed') return;

          const transactionId = getCheckoutTransactionId(event);
          if (!transactionId || claimedTransactions.current.has(transactionId)) return;
          claimedTransactions.current.add(transactionId);

          setClaimingAccess(true);
          try {
            const res = await fetch('/api/paddle-claim', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                transactionId,
                email: latestCheckoutEmail.current,
              }),
            });
            const result = await res.json() as { accessUrl?: string; error?: string };
            if (!res.ok || !result.accessUrl) {
              throw new Error(result.error || 'Access claim failed.');
            }
            if (!isSafeRelativePath(result.accessUrl)) {
              throw new Error('Invalid access redirect.');
            }
            window.location.href = result.accessUrl;
          } catch (error) {
            setEmailError(error instanceof Error ? error.message : 'Access claim failed.');
            setBuying(null);
            setClaimingAccess(false);
          }
        },
      });
    }
  }, [paddleReady]);

  function handleBuy(toolId: string) {
    if (!sessionChecked) return;
    if (!user) {
      setEmailError('Sign in before buying a tool.');
      return;
    }

    setEmailFor(toolId);
    setEmail(user.email || '');
    setEmailError('');
    setDigitalConsent(false);
  }

  function handleEmailSubmit(e: React.FormEvent, tool: typeof TOOLS[0]) {
    e.preventDefault();
    if (!user) { setEmailError('Sign in before buying a tool.'); return; }
    if (!email.includes('@')) { setEmailError('Invalid email address.'); return; }
    if (!digitalConsent) { setEmailError('Confirm immediate digital access and withdrawal acknowledgement.'); return; }
    if (!PADDLE_CLIENT_TOKEN || !window.Paddle) { setEmailError('Payment checkout is not configured.'); return; }
    setEmailFor(null);
    setBuying(tool.id);
    latestCheckoutEmail.current = email;
    window.Paddle.Checkout.open({
      items: [{ priceId: tool.priceId, quantity: 1 }],
      customer: { email },
      customData: { email, toolId: tool.id },
      settings: { successUrl: absoluteUrl('/payment-success') },
      checkout: { url: absoluteUrl('/tools-individual') },
    });
  }

  return (
    <>
      <Script
        src="https://cdn.paddle.com/paddle/v2/paddle.js"
        onLoad={() => setPaddleReady(true)}
      />

      <main className="ti-main">
        <div className="ti-back">
          <Link href="/pro-tools">← BACK TO TOOLS</Link>
        </div>

        <div className="ti-tag">PICK & CHOOSE</div>
        <h1 className="ti-title">BUY INDIVIDUAL TOOLS</h1>
        <p className="ti-desc">
          {claimingAccess
            ? 'Payment confirmed. Opening your tool access...'
            : 'Pick only what you need. Monthly access for each selected tool.'}
        </p>

        <div className="ti-divider" />

        <div className="ti-grid">
          {TOOLS.map((tool) => (
            <div key={tool.id} className="ti-card">
              <div className="ti-card-header">
                <span className="ti-card-tag">{tool.tag}</span>
                <span className="ti-card-price">{tool.price}</span>
              </div>
              <h2 className="ti-card-name">{tool.name}</h2>
              <p className="ti-card-desc">{tool.desc}</p>
              {emailFor === tool.id ? (
                <form onSubmit={(e) => handleEmailSubmit(e, tool)} className="ti-email-form">
                  <span className="ti-account-note">
                    Buying as {user?.name || 'your account'}
                  </span>
                  <input
                    type="email"
                    className="ti-email-input"
                    placeholder={user?.email ? 'Account email' : 'Billing email'}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    readOnly={Boolean(user?.email)}
                    autoFocus
                    required
                  />
                  {emailError && <span className="ti-email-error">{emailError}</span>}
                  <label className="ti-consent">
                    <input
                      type="checkbox"
                      checked={digitalConsent}
                      onChange={event => setDigitalConsent(event.target.checked)}
                      required
                    />
                    <span>I request immediate digital access and acknowledge that I lose my withdrawal right once access is delivered.</span>
                  </label>
                  <button type="submit" className="ti-card-btn" disabled={!paddleReady || !PADDLE_CLIENT_TOKEN}>CONFIRM & PAY →</button>
                  <button type="button" className="ti-cancel-btn" onClick={() => setEmailFor(null)}>Cancel</button>
                </form>
              ) : (
                <button
                  className="ti-card-btn"
                  onClick={() => handleBuy(tool.id)}
                  disabled={buying === tool.id || !sessionChecked || !paddleReady || !PADDLE_CLIENT_TOKEN}
                >
                  {buying === tool.id ? 'OPENING…' : `GET ${tool.name.toUpperCase()} — ${tool.price}`}
                </button>
              )}
            </div>
          ))}
        </div>

        {sessionChecked && !user && (
          <div className="ti-login-required">
            <p>Create or open your account before buying a tool. Your purchase will be attached to that account automatically.</p>
            <div>
              <Link href="/sign-in">Sign in</Link>
              <Link href="/sign-up">Sign up</Link>
            </div>
          </div>
        )}

        <div className="ti-upsell">
          <p className="ti-upsell-text">Need everything? Pro gives you all 6 tools for <strong>50 € / month</strong>.</p>
          <Link href="/pro-access" className="ti-upsell-link">Get Pro access →</Link>
        </div>

        <p className="ti-legal">
          Purchases are monthly digital subscriptions unless checkout states otherwise. By continuing, you agree to the <Link href="/terms">Terms</Link>, <Link href="/privacy">Privacy Policy</Link>, <Link href="/billing">Billing Policy</Link>, <Link href="/cancellation">Cancellation Policy</Link> and <Link href="/refund">Refund Policy</Link>.
        </p>
      </main>

      <style>{`
        .ti-main {
          max-width: 860px;
          margin: 0 auto;
          padding: 5rem 2rem 6rem;
        }

        .ti-back a {
          font-family: var(--font-mono, monospace);
          font-size: 0.65rem;
          letter-spacing: 0.18em;
          opacity: 0.45;
          text-decoration: none;
          transition: opacity 0.15s;
          color: inherit;
        }

        .ti-back a:hover { opacity: 0.9; }

        .ti-tag {
          font-family: var(--font-mono, monospace);
          font-size: 0.6rem;
          letter-spacing: 0.22em;
          opacity: 0.4;
          margin-top: 3rem;
          margin-bottom: 0.5rem;
        }

        .ti-title {
          font-family: var(--font-mono, monospace);
          font-size: clamp(1.8rem, 5vw, 3rem);
          letter-spacing: 0.1em;
          line-height: 1;
          margin: 0 0 1rem;
        }

        .ti-desc {
          font-family: var(--font-mono, monospace);
          font-size: 0.8rem;
          line-height: 1.7;
          opacity: 0.6;
          margin: 0;
        }

        .ti-divider {
          border: none;
          border-top: 1px solid rgba(0,0,0,0.15);
          margin: 2.5rem 0;
        }

        .ti-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 1px;
          background: rgba(0,0,0,0.12);
          border: 1px solid rgba(0,0,0,0.12);
          margin-bottom: 3rem;
        }

        .ti-card {
          background: rgba(240,240,235,0.7);
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .ti-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .ti-card-tag {
          font-family: var(--font-mono, monospace);
          font-size: 0.55rem;
          letter-spacing: 0.2em;
          opacity: 0.4;
        }

        .ti-card-price {
          font-family: var(--font-mono, monospace);
          font-size: 1.1rem;
          font-weight: 700;
          color: blue;
          letter-spacing: 0.05em;
        }

        .ti-card-name {
          font-family: var(--font-mono, monospace);
          font-size: 1rem;
          letter-spacing: 0.08em;
          margin: 0;
          line-height: 1.2;
        }

        .ti-card-desc {
          font-family: var(--font-mono, monospace);
          font-size: 0.7rem;
          line-height: 1.65;
          opacity: 0.55;
          margin: 0;
          flex: 1;
        }

        .ti-card-btn {
          margin-top: auto;
          padding: 0.75rem 1rem;
          font-family: var(--font-mono, monospace);
          font-size: 0.62rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          background: blue;
          color: white;
          border: none;
          cursor: pointer;
          transition: opacity 0.15s;
          width: 100%;
        }

        .ti-card-btn:hover:not(:disabled) { opacity: 0.8; }
        .ti-card-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .ti-upsell {
          border: 1px solid rgba(0,0,0,0.1);
          padding: 1.25rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          background: rgba(0,0,0,0.02);
        }

        .ti-upsell-text {
          font-family: var(--font-mono, monospace);
          font-size: 0.72rem;
          opacity: 0.65;
          margin: 0;
          line-height: 1.5;
        }

        .ti-upsell-link {
          font-family: var(--font-mono, monospace);
          font-size: 0.7rem;
          letter-spacing: 0.1em;
          color: blue;
          text-decoration: none;
          white-space: nowrap;
          transition: opacity 0.15s;
        }

        .ti-upsell-link:hover { opacity: 0.7; }

        .ti-legal {
          margin: 1.5rem 0 0;
          font-family: var(--font-mono, monospace);
          font-size: 0.62rem;
          line-height: 1.7;
          opacity: 0.48;
        }

        .ti-legal a {
          color: inherit;
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .ti-email-form {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .ti-email-input {
          font-family: var(--font-mono, monospace);
          font-size: 0.72rem;
          padding: 0.65rem 0.75rem;
          border: 1px solid rgba(0,0,0,0.2);
          background: rgba(255,255,255,0.7);
          outline: none;
          color: inherit;
        }

        .ti-email-input:focus { border-color: blue; }

        .ti-email-input[readonly] {
          opacity: 0.72;
          cursor: default;
        }

        .ti-account-note {
          font-family: var(--font-mono, monospace);
          font-size: 0.58rem;
          line-height: 1.45;
          opacity: 0.52;
        }

        .ti-email-error {
          font-family: var(--font-mono, monospace);
          font-size: 0.6rem;
          color: red;
        }

        .ti-consent {
          display: grid;
          grid-template-columns: 0.9rem 1fr;
          gap: 0.5rem;
          align-items: start;
          font-family: var(--font-mono, monospace);
          font-size: 0.58rem;
          line-height: 1.45;
          opacity: 0.62;
        }

        .ti-consent input {
          width: 0.9rem;
          height: 0.9rem;
          margin: 0.1rem 0 0;
          accent-color: blue;
        }

        .ti-cancel-btn {
          background: transparent;
          border: none;
          font-family: var(--font-mono, monospace);
          font-size: 0.6rem;
          opacity: 0.4;
          cursor: pointer;
          text-align: left;
          padding: 0;
        }

        .ti-cancel-btn:hover { opacity: 0.8; }

        .ti-login-required {
          border: 1px solid rgba(0,0,255,0.18);
          padding: 1.25rem 1.5rem;
          margin: -1rem 0 3rem;
          background: rgba(0,0,255,0.04);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .ti-login-required p {
          font-family: var(--font-mono, monospace);
          font-size: 0.72rem;
          line-height: 1.55;
          opacity: 0.68;
          margin: 0;
        }

        .ti-login-required div {
          display: flex;
          gap: 0.75rem;
          flex-shrink: 0;
        }

        .ti-login-required a {
          font-family: var(--font-mono, monospace);
          font-size: 0.65rem;
          letter-spacing: 0.1em;
          color: blue;
          text-decoration: none;
          text-transform: uppercase;
        }

        @media (max-width: 620px) {
          .ti-login-required {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>
    </>
  );
}
