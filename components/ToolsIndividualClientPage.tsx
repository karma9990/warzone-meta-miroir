'use client';

import { useState } from 'react';
import Link from 'next/link';
import { withLocalePath } from '@/lib/i18n';
import { GENERATED_PAGE_PACKS, getProToolsPageCopy } from '@/lib/pageCopy';
import { useCurrentLocale } from '@/lib/useCurrentLocale';

const TOOLS = [
  {
    id: 'aim-tools',
    name: 'Aim Tools',
    tag: 'PRECISION',
    desc: 'Sensitivity tuning, ADS multipliers, dead zone calibration, crosshair placement and recoil pattern guides.',
    price: '9 €',
  },
  {
    id: 'next-meta',
    name: 'Next Meta',
    tag: 'INTEL',
    desc: 'Weapons, equipment and perk shifts gathered into practical meta notes.',
    price: '9 €',
  },
  {
    id: 'pro-movement',
    name: 'Pro Movement',
    tag: 'MECHANICS',
    desc: 'Slide cancel, corner peeking, high ground control and rotation timing — core mechanics used by every pro.',
    price: '9 €',
  },
  {
    id: 'how-to-be-a-pro',
    name: 'How To Be A Pro',
    tag: 'MINDSET',
    desc: 'The system behind consistent improvement — habits, session structure, teammate selection and mental reset.',
    price: '9 €',
  },
  {
    id: 'pro-spawn',
    name: 'Pro Spawn',
    tag: 'MAP CONTROL',
    desc: 'Dominant spawn zones on Rebirth Island and Haven — the exact positions that control the match flow.',
    price: '9 €',
  },
  {
    id: 'pro-opti',
    name: 'Pro Opti',
    tag: 'PERFORMANCE',
    desc: 'Settings, hardware and software optimisations to reduce input lag and maximise your frame rate.',
    price: '9 €',
  },
];

type SessionUser = {
  sub: string;
  provider: 'google' | 'battlenet' | 'apple' | 'email';
  name: string;
  email?: string;
};

export default function ToolsIndividualPage({ initialUser = null }: { initialUser?: SessionUser | null }) {
  const locale = useCurrentLocale();
  const copy = getProToolsPageCopy(locale);
  const pack = GENERATED_PAGE_PACKS[locale];
  const href = (target: string) => withLocalePath(target, locale);
  const tools = TOOLS.map((tool) => ({
    ...tool,
    name: copy.modulesCopy[tool.id]?.label ?? tool.name,
    tag: copy.modulesCopy[tool.id]?.tag.toUpperCase() ?? tool.tag,
    desc: copy.modulesCopy[tool.id]?.preview ?? tool.desc,
  }));
  const premiumCard = {
    id: 'companion-premium',
    name: locale === 'es' ? 'App Premium' : locale === 'fr' ? 'Application Premium' : 'App Premium',
    tag: 'PREMIUM',
    desc:
      locale === 'es'
        ? 'Acceso completo a la app WZPRO Companion: overlay en partida, seguimiento en tiempo real y todas las funciones premium.'
        : locale === 'fr'
          ? "Acces complet a l'application WZPRO Companion : overlay en partie, suivi en temps reel et toutes les fonctions premium."
          : 'Full access to the WZPRO Companion app: in-game overlay, real-time tracking and every premium feature.',
    price: '9 €',
  };
  const gridCards = [premiumCard, ...tools];
  const [buying, setBuying] = useState<string | null>(null);
  const [emailFor, setEmailFor] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [user] = useState<SessionUser | null>(initialUser);
  const sessionChecked = true;
  const [digitalConsent, setDigitalConsent] = useState(false);

  async function handleBuy(toolId: string) {
    if (!sessionChecked) return;
    if (!user) {
      setEmailError('Sign in before buying a tool.');
      return;
    }

    const userEmail = user.email || email;
    if (!userEmail.includes('@')) {
      setEmailFor(toolId);
      return;
    }

    setBuying(toolId);
    setEmailError('');

    try {
      const res = await fetch('/api/polar-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productKey: toolId, email: userEmail }),
      });
      const result = await res.json() as { url?: string; error?: string };
      if (!res.ok || !result.url) {
        throw new Error(result.error || 'Payment checkout is not configured.');
      }
      window.location.assign(result.url);
    } catch (error) {
      setEmailError(error instanceof Error ? error.message : 'Payment checkout is not configured.');
      setBuying(null);
    }
  }

  return (
    <>
      <main className="ti-main">
        <div className="ti-back">
          <Link href={href('/pro-tools')}>{locale === 'es' ? '< VOLVER A HERRAMIENTAS' : locale === 'fr' ? '< RETOUR AUX OUTILS' : pack ? `< ${pack.viewTools.toUpperCase()}` : '< BACK TO TOOLS'}</Link>
        </div>

        <div className="ti-tag">{locale === 'es' ? 'ELIGE TU MODULO' : locale === 'fr' ? 'CHOISIS TON OUTIL' : pack ? pack.catalog : 'PICK & CHOOSE'}</div>
        <h1 className="ti-title">{locale === 'es' ? 'COMPRAR HERRAMIENTAS INDIVIDUALES' : locale === 'fr' ? 'ACHETER DES OUTILS INDIVIDUELS' : pack ? pack.catalog : 'BUY INDIVIDUAL TOOLS'}</h1>
        <p className="ti-desc">
          {locale === 'es' ? 'Elige solo lo que necesitas. Acceso mensual para cada herramienta seleccionada.' : locale === 'fr' ? 'Choisis seulement ce dont tu as besoin. Acces mensuel pour chaque outil selectionne.' : pack ? pack.catalogLead : 'Pick only what you need. Monthly access for each selected tool.'}
        </p>

        <div className="ti-divider" />

        <div className="ti-grid">
          {gridCards.map((tool) => (
            <div key={tool.id} className="ti-card">
              <div className="ti-card-header">
                <span className="ti-card-tag">{tool.tag}</span>
                <span className="ti-card-price">{tool.price}</span>
              </div>
              <h2 className="ti-card-name">{tool.name}</h2>
              <p className="ti-card-desc">{tool.desc}</p>
              {emailFor === tool.id ? (
                <form onSubmit={(e) => { e.preventDefault(); handleBuy(tool.id); }} className="ti-email-form">
                  <span className="ti-account-note">
                    {locale === 'es' ? `Comprando como ${user?.name || 'tu cuenta'}` : locale === 'fr' ? `Achat avec ${user?.name || 'ton compte'}` : `Buying as ${user?.name || 'your account'}`}
                  </span>
                  <input aria-label="Input"
                    type="email"
                    className="ti-email-input"
                    placeholder={user?.email ? (locale === 'es' ? 'Email de cuenta' : locale === 'fr' ? 'Email du compte' : 'Account email') : (locale === 'es' ? 'Email de facturacion' : locale === 'fr' ? 'Email de facturation' : 'Billing email')}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    readOnly={Boolean(user?.email)}
                    required
                  />
                  {emailError && <span className="ti-email-error">{emailError}</span>}
                  <label className="ti-consent">
                    <input aria-label="Input"
                      type="checkbox"
                      checked={digitalConsent}
                      onChange={event => setDigitalConsent(event.target.checked)}
                      required
                    />
                    <span>{locale === 'es' ? 'Solicito acceso digital inmediato y reconozco que pierdo mi derecho de desistimiento una vez entregado el acceso.' : locale === 'fr' ? 'Je demande l acces numerique immediat et reconnais perdre mon droit de retractation une fois l acces livre.' : 'I request immediate digital access and acknowledge that I lose my withdrawal right once access is delivered.'}</span>
                  </label>
                  <button type="submit" className="ti-card-btn" disabled={buying === tool.id}>{locale === 'es' ? 'CONFIRMAR Y PAGAR >' : locale === 'fr' ? 'CONFIRMER ET PAYER >' : 'CONFIRM & PAY >'}</button>
                  <button type="button" className="ti-cancel-btn" onClick={() => setEmailFor(null)}>{locale === 'es' ? 'Cancelar' : locale === 'fr' ? 'Annuler' : 'Cancel'}</button>
                </form>
              ) : tool.id === 'companion-premium' ? (
                <button
                  type="button"
                  className="ti-card-btn"
                  onClick={() => handleBuy(tool.id)}
                  disabled={buying === tool.id}
                >
                  {`${locale === 'es' ? 'OBTENER' : locale === 'fr' ? 'OBTENIR' : 'GET'} ${tool.name.toUpperCase()} - ${tool.price}`}
                </button>
              ) : (
                <Link
                  href={href('/pro-access')}
                  className="ti-card-btn"
                >
                  {`${locale === 'es' ? 'OBTENER' : locale === 'fr' ? 'OBTENIR' : 'GET'} ${tool.name.toUpperCase()} - ${tool.price}`}
                </Link>
              )}
            </div>
          ))}
        </div>

        {sessionChecked && !user && (
          <div className="ti-login-required">
            <p>{locale === 'es' ? 'Crea o abre tu cuenta antes de comprar una herramienta. La compra se asociara automaticamente a esa cuenta.' : locale === 'fr' ? 'Cree ou ouvre ton compte avant d acheter un outil. L achat sera rattache automatiquement a ce compte.' : 'Create or open your account before buying a tool. Your purchase will be attached to that account automatically.'}</p>
            <div>
              <Link href={href('/sign-in')}>{locale === 'es' ? 'Iniciar sesion' : locale === 'fr' ? 'Connexion' : 'Sign in'}</Link>
              <Link href={href('/sign-up')}>{locale === 'es' ? 'Crear cuenta' : locale === 'fr' ? 'Inscription' : 'Sign up'}</Link>
            </div>
          </div>
        )}

        <div className="ti-upsell">
          <p className="ti-upsell-text">{locale === 'es' ? 'Necesitas todo? Pro te da las 6 herramientas por ' : locale === 'fr' ? 'Besoin de tout? Pro te donne les 6 outils pour ' : 'Need everything? Pro gives you all 6 tools for '}<strong>50 EUR / {locale === 'es' ? 'mes' : locale === 'fr' ? 'mois' : 'month'}</strong>.</p>
          <Link href={href('/pro-access')} className="ti-upsell-link">{copy.plans.getPro} &gt;</Link>
        </div>

        <p className="ti-legal">
          {locale === 'es' ? 'Las compras son suscripciones digitales mensuales salvo indicacion contraria en checkout. Al continuar, aceptas ' : locale === 'fr' ? 'Les achats sont des abonnements numeriques mensuels sauf indication contraire au paiement. En continuant, tu acceptes ' : 'Purchases are monthly digital subscriptions unless checkout states otherwise. By continuing, you agree to the '}<Link href={href('/terms')}>{locale === 'es' ? 'Terminos' : locale === 'fr' ? 'Conditions' : 'Terms'}</Link>, <Link href={href('/privacy')}>{locale === 'es' ? 'Privacidad' : locale === 'fr' ? 'Confidentialite' : 'Privacy Policy'}</Link>, <Link href={href('/billing')}>{locale === 'es' ? 'Facturacion' : locale === 'fr' ? 'Facturation' : 'Billing Policy'}</Link>, <Link href={href('/cancellation')}>{locale === 'es' ? 'Cancelacion' : locale === 'fr' ? 'Annulation' : 'Cancellation Policy'}</Link> {locale === 'es' ? 'y ' : locale === 'fr' ? 'et ' : 'and '}<Link href={href('/refund')}>{locale === 'es' ? 'Reembolsos' : locale === 'fr' ? 'Remboursements' : 'Refund Policy'}</Link>.
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
