import Link from 'next/link';
import PaddleClaimForm from '@/components/PaddleClaimForm';

export default function PaymentSuccessPage() {
  return (
    <>
      <main className="ps-main">
        <div className="ps-icon">✓</div>
        <p className="ps-tag">PAYMENT CONFIRMED</p>
        <h1 className="ps-title">ACCESS GRANTED</h1>
        <p className="ps-desc">
          Your payment was successful. Access stays active while the subscription is active.
          Sign in with the purchase email, or open access with the Paddle transaction ID.
        </p>

        <div className="ps-divider" />

        <div className="ps-steps">
          <div className="ps-step">
            <span className="ps-step-num">01</span>
            <p className="ps-step-text">Use the same email address used at checkout</p>
          </div>
          <div className="ps-step">
            <span className="ps-step-num">02</span>
            <p className="ps-step-text">Paste the Paddle transaction ID if access did not open automatically</p>
          </div>
          <div className="ps-step">
            <span className="ps-step-num">03</span>
            <p className="ps-step-text">Sign in with the same email to keep monthly access active</p>
          </div>
        </div>

        <PaddleClaimForm />

        <div className="ps-actions">
          <Link href="/pro-tools" className="ps-btn ps-btn--ghost">Back to Pro Tools</Link>
          <Link href="/" className="ps-btn ps-btn--ghost">Home</Link>
        </div>
      </main>

      <style>{`
        .ps-main {
          max-width: 520px;
          margin: 0 auto;
          padding: 6rem 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 1rem;
        }

        .ps-icon {
          width: 4rem;
          height: 4rem;
          border: 2px solid rgba(0,0,0,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: monospace;
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }

        .ps-tag {
          font-family: var(--font-mono, monospace);
          font-size: 0.6rem;
          letter-spacing: 0.22em;
          opacity: 0.4;
          margin: 0;
        }

        .ps-title {
          font-family: var(--font-mono, monospace);
          font-size: clamp(2rem, 5vw, 3rem);
          letter-spacing: 0.1em;
          line-height: 1;
          margin: 0;
        }

        .ps-desc {
          font-family: var(--font-mono, monospace);
          font-size: 0.78rem;
          line-height: 1.75;
          opacity: 0.6;
          margin: 0;
          max-width: 420px;
        }

        .ps-divider {
          width: 100%;
          border: none;
          border-top: 1px solid rgba(0,0,0,0.12);
          margin: 0.5rem 0;
        }

        .ps-steps {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 1px;
          background: rgba(0,0,0,0.1);
          border: 1px solid rgba(0,0,0,0.1);
        }

        .ps-step {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          padding: 1rem 1.25rem;
          background: rgba(245,245,240,0.8);
        }

        .ps-step-num {
          font-family: var(--font-mono, monospace);
          font-size: 0.6rem;
          letter-spacing: 0.15em;
          opacity: 0.35;
          flex-shrink: 0;
        }

        .ps-step-text {
          font-family: var(--font-mono, monospace);
          font-size: 0.72rem;
          line-height: 1.5;
          opacity: 0.7;
          margin: 0;
          text-align: left;
        }

        .ps-actions {
          display: flex;
          gap: 1rem;
          margin-top: 0.5rem;
        }

        .ps-btn {
          font-family: var(--font-mono, monospace);
          font-size: 0.65rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          text-decoration: none;
          padding: 0.75rem 1.25rem;
          transition: opacity 0.15s;
        }

        .ps-btn:hover { opacity: 0.7; }

        .ps-btn--ghost {
          background: rgba(0,0,0,0.06);
          color: inherit;
        }

        .claim-form {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding: 1rem;
          border: 1px solid rgba(0,0,0,0.12);
          box-sizing: border-box;
        }

        .claim-row {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          text-align: left;
        }

        .claim-label {
          font-family: var(--font-mono, monospace);
          font-size: 0.55rem;
          letter-spacing: 0.16em;
          opacity: 0.42;
        }

        .claim-input {
          font-family: var(--font-mono, monospace);
          font-size: 0.72rem;
          padding: 0.75rem 0.85rem;
          border: 1px solid rgba(0,0,0,0.16);
          background: rgba(245,245,240,0.76);
          color: inherit;
          outline: none;
        }

        .claim-input:focus { border-color: blue; }

        .claim-status {
          font-family: var(--font-mono, monospace);
          font-size: 0.62rem;
          line-height: 1.5;
          color: red;
          margin: 0;
          text-align: left;
        }

        .claim-btn {
          min-height: 42px;
          border: none;
          background: blue;
          color: white;
          font-family: var(--font-mono, monospace);
          font-size: 0.65rem;
          letter-spacing: 0.14em;
          cursor: pointer;
        }

        .claim-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
      `}</style>
    </>
  );
}
