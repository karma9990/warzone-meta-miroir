'use client';

import { useState } from 'react';
import LocalizedLink from '@/components/LocalizedLink';

const frText = {
  invalidEmail: 'Adresse email invalide.',
  consentRequired: 'Confirmez l acces numerique immediat et la renonciation au droit de retractation.',
  paymentError: 'Le paiement n est pas configure.',
  whatYouGet: 'Ce que vous obtenez aujourd hui',
  whatYouGetTitle: 'Un chemin concret, pas juste une liste de conseils.',
  whatYouGetDesc: 'Chaque module relie un probleme concret a une decision: quelle sensibilite tester, quel combat prendre, quel spawn choisir et quel reglage corriger avant de lancer.',
  cancelAnytime: 'Annulez a tout moment. Aucun frais cache.',
  byContinuing: 'En continuant, vous acceptez les',
  emailLabel: 'ADRESSE EMAIL',
  emailPlaceholder: 'operateur@exemple.com',
  securePayment: 'PAIEMENT SECURISE',
  securePaymentDesc: 'Un paiement securise Polar s ouvrira. Les taxes sont calculees automatiquement selon votre pays.',
  consent: 'Je demande un acces immediat a cet abonnement numerique et reconnais que je perds mon droit de retractation une fois l acces delivre.',
  openingPayment: 'OUVERTURE DU PAIEMENT...',
  continuePayment: 'CONTINUER VERS LE PAIEMENT →',
  back: 'RETOUR',
  notReady: 'Pas encore pret ?',
  freePlan: 'Commencer avec le plan gratuit →',
  proofs: [
    ['Apercu avant achat', 'Vous pouvez voir les modules, les resultats attendus et des extraits gratuits avant de payer.'],
    ['Tout au meme endroit', 'Visee, mouvement, meta, spawns, mental et optimisation sont regroupes dans un seul parcours.'],
    ['Sans engagement long', 'Abonnement mensuel, resiliez selon la politique affichee avant le paiement.'],
  ],
  faq: [
    ['Est-ce que je paie avant de voir le contenu ?', 'Non. La page Outils Pro montre deja les modules et apercus. Pro debloque le parcours complet et les futures mises a jour.'],
    ['A qui cela s adresse-t-il ?', 'Aux joueurs Warzone qui veulent gagner du temps sur les reglages, classes, rotations et preparation de session.'],
    ['Comment le paiement est-il gere ?', 'Un paiement securise Polar s ouvre avec les taxes calculees automatiquement pour votre pays.'],
  ],
  perks: [
    'Tout le contenu Gratuit',
    'Les 6 Outils Pro — acces anticipe',
    'Nouveaux outils avant la sortie publique',
    'Analyse des tendances meta',
    'Guides prioritaires de spawn et rotation',
    'Decryptages de classes exclusifs',
    'Canal de feedback direct',
  ],
};

const enText = {
  invalidEmail: 'Invalid email address.',
  consentRequired: 'Confirm immediate digital access and withdrawal acknowledgement.',
  paymentError: 'Payment checkout is not configured.',
  whatYouGet: 'What you get today',
  whatYouGetTitle: 'An actionable path, not just a list of tips.',
  whatYouGetDesc: 'Each module connects a concrete problem to a decision: which sensitivity to test, which fight to take, which spawn to choose, and which setting to fix before queueing.',
  cancelAnytime: 'Cancel anytime. No hidden fees.',
  byContinuing: 'By continuing, you agree to the',
  emailLabel: 'EMAIL ADDRESS',
  emailPlaceholder: 'operator@example.com',
  securePayment: 'SECURE PAYMENT',
  securePaymentDesc: 'A secure Polar checkout will open. Taxes are calculated automatically based on your country.',
  consent: 'I request immediate access to this digital subscription and acknowledge that I lose my withdrawal right once access is delivered.',
  openingPayment: 'OPENING PAYMENT...',
  continuePayment: 'CONTINUE TO PAYMENT →',
  back: 'BACK',
  notReady: 'Not ready yet?',
  freePlan: 'Start with the free plan →',
  proofs: [
    ['Preview before purchase', 'You can see the modules, expected outcomes and free excerpts before paying.'],
    ['Everything in one place', 'Aim, movement, meta, spawns, mindset and optimization are grouped into one access path.'],
    ['No long commitment', 'Monthly subscription, cancellable according to the policy shown before checkout.'],
  ],
  faq: [
    ['Do I pay before seeing the content?', 'No. The Pro Tools page already shows modules and previews. Pro unlocks the full path and future updates.'],
    ['Who is this for?', 'Warzone players who want to save time on settings, loadouts, rotations and session prep.'],
    ['How is payment handled?', 'A secure Polar checkout opens with taxes calculated automatically for your country.'],
  ],
  perks: [
    'Everything in Free',
    'All 6 Pro Tools — early access',
    'New tools before public release',
    'Meta trend analysis',
    'Priority spawn & rotation guides',
    'Exclusive loadout breakdowns',
    'Direct feedback channel',
  ],
};

const esText = {
  invalidEmail: 'Direccion de email no valida.',
  consentRequired: 'Confirma el acceso digital inmediato y la renuncia al derecho de desistimiento.',
  paymentError: 'El pago no esta configurado.',
  whatYouGet: 'Lo que obtienes hoy',
  whatYouGetTitle: 'Un camino concreto, no solo una lista de consejos.',
  whatYouGetDesc: 'Cada modulo conecta un problema concreto con una decision.',
  cancelAnytime: 'Cancela en cualquier momento. Sin cargos ocultos.',
  byContinuing: 'Al continuar, aceptas los',
  emailLabel: 'DIRECCION DE EMAIL',
  emailPlaceholder: 'operador@ejemplo.com',
  securePayment: 'PAGO SEGURO',
  securePaymentDesc: 'Se abrira un pago seguro de Polar. Los impuestos se calculan automaticamente segun tu pais.',
  consent: 'Solicito acceso inmediato a esta suscripcion digital y reconozco que pierdo mi derecho de desistimiento una vez entregado el acceso.',
  openingPayment: 'ABRIENDO PAGO...',
  continuePayment: 'CONTINUAR AL PAGO →',
  back: 'VOLVER',
  notReady: '¿No estas listo aun?',
  freePlan: 'Comenzar con el plan gratuito →',
  proofs: [
    ['Vista previa antes de comprar', 'Puedes ver los modulos, resultados esperados y extractos gratuitos antes de pagar.'],
    ['Todo en un solo lugar', 'Apuntado, movimiento, meta, spawns, mentalidad y optimizacion agrupados en un solo camino.'],
    ['Sin compromiso largo', 'Suscripcion mensual, cancelable segun la politica mostrada antes del pago.'],
  ],
  faq: [
    ['¿Pago antes de ver el contenido?', 'No. La pagina de Herramientas Pro ya muestra modulos y vistas previas. Pro desbloquea el camino completo.'],
    ['¿Para quien es esto?', 'Para jugadores de Warzone que quieren ahorrar tiempo en configuraciones, loadouts y rotaciones.'],
    ['¿Como se gestiona el pago?', 'Se abre un pago seguro de Polar con los impuestos calculados automaticamente.'],
  ],
  perks: [
    'Todo el contenido Gratuito',
    'Las 6 Herramientas Pro — acceso anticipado',
    'Nuevas herramientas antes del lanzamiento',
    'Analisis de tendencias meta',
    'Guias prioritarias de spawn y rotacion',
    'Desgloses exclusivos de loadouts',
    'Canal de feedback directo',
  ],
};

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
  proofs: enText.proofs.map(([title, body]) => ({ title, body })),
  cta: 'GET STARTED - 50 EUR / MONTH',
};

const FR_PRO_COPY: ProAccessCopy = {
  backLabel: '<- RETOUR',
  badge: 'LE PLUS POPULAIRE',
  tag: 'NIVEAU PRO',
  title: 'OBTENIR L ACCES PRO',
  description: 'Accedez a tous les Outils Pro en un seul endroit, avec des analyses de classes, des guides de rotation et une analyse pratique de Warzone.',
  price: '50 EUR',
  period: '/ mois - sans engagement',
  proofs: frText.proofs.map(([title, body]) => ({ title, body })),
  cta: 'COMMENCER - 50 EUR / MOIS',
};

export default function ProAccessPage({ initialCopy, locale = 'en' }: { initialCopy?: ProAccessCopy; locale?: string }) {
  const [step, setStep] = useState<'info' | 'form'>('info');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [digitalConsent, setDigitalConsent] = useState(false);
  const isFr = locale === 'fr';
  const isEs = locale === 'es';
  const t = isFr ? frText : isEs ? esText : enText;
  const defaultCopy = isFr ? FR_PRO_COPY : DEFAULT_PRO_COPY;
  const copy = { ...defaultCopy, ...initialCopy };
  const proofs = isEs ? esText.proofs.map(([title, body]) => ({ title, body })) : isFr ? frText.proofs.map(([title, body]) => ({ title, body })) : enText.proofs.map(([title, body]) => ({ title, body }));
  const faq = isEs ? esText.faq : isFr ? frText.faq : enText.faq;

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes('@')) {
      setError(t.invalidEmail);
      return;
    }
    if (!digitalConsent) {
      setError(t.consentRequired);
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
        throw new Error(result.error || t.paymentError);
      }
      window.location.assign(result.url);
    } catch (error) {
      setError(error instanceof Error ? error.message : t.paymentError);
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
              {proofs.map(({ title, body }) => (
                <article key={title}>
                  <span>{title}</span>
                  <p>{body}</p>
                </article>
              ))}
            </div>

            <ul className="pro-perks">
              {t.perks.map((perk) => (
                <li key={perk}><span className="pro-perk-label">{perk}</span></li>
              ))}
            </ul>

            <div className="pro-preview-panel">
              <span>{t.whatYouGet}</span>
              <strong>{t.whatYouGetTitle}</strong>
              <p>{t.whatYouGetDesc}</p>
            </div>

            <button type="button" className="pro-cta pro-cta--main" onClick={() => setStep('form')}>
              {copy.cta}
            </button>

            <p className="pro-legal">
              {t.cancelAnytime} {t.byContinuing} <LocalizedLink href="/terms">Terms</LocalizedLink>, <LocalizedLink href="/privacy">Privacy Policy</LocalizedLink>, <LocalizedLink href="/billing">Billing Policy</LocalizedLink>, <LocalizedLink href="/cancellation">Cancellation Policy</LocalizedLink> and <LocalizedLink href="/refund">Refund Policy</LocalizedLink>.
            </p>

            <div className="pro-faq">
              {faq.map(([question, answer]) => (
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
              <label className="pro-label" htmlFor="pro-email">{t.emailLabel}</label>
              <input
                id="pro-email"
                type="email"
                className="pro-input"
                placeholder={t.emailPlaceholder}
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              {error && <span className="pro-error">{error}</span>}
            </div>

            <div className="pro-payment-note">
              <span className="pro-payment-tag">{t.securePayment}</span>
              <p className="pro-payment-desc">
                {t.securePaymentDesc}
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
                {t.consent}
              </span>
            </label>

            <button type="submit" className="pro-cta pro-cta--main" disabled={submitting}>
              {submitting ? t.openingPayment : t.continuePayment}
            </button>

            <button type="button" className="pro-cta pro-cta--ghost" onClick={() => setStep('info')}>
              {t.back}
            </button>
          </form>
        )}

        <div className="pro-downgrade">
          <span className="pro-downgrade-label">{t.notReady}</span>
          <LocalizedLink href="/subscribe" className="pro-downgrade-link">
            {t.freePlan}
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
          display: flex;
          margin-top: 2.5rem;
          margin-bottom: 0.75rem;
        }

        .pro-badge {
          font-family: var(--font-mono, monospace);
          font-size: 0.58rem;
          letter-spacing: 0.2em;
          padding: 0.3rem 0.55rem;
          border: 1px solid rgba(22,60,255,0.3);
          color: #163cff;
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
          font-size: clamp(1.8rem, 5vw, 2.8rem);
          letter-spacing: 0.1em;
          line-height: 1;
          margin: 0 0 1rem;
        }

        .pro-desc {
          font-family: var(--font-mono, monospace);
          font-size: 0.8rem;
          line-height: 1.7;
          opacity: 0.6;
          margin: 0;
        }

        .pro-price-block {
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
          margin-top: 1.5rem;
        }

        .pro-price {
          font-family: var(--font-mono, monospace);
          font-size: 1.5rem;
          font-weight: 950;
        }

        .pro-period {
          font-family: var(--font-mono, monospace);
          font-size: 0.7rem;
          opacity: 0.45;
        }

        .pro-divider {
          border: none;
          border-top: 1px solid rgba(0,0,0,0.15);
          margin: 2.5rem 0;
        }

        .pro-proof-grid {
          display: grid;
          gap: 1px;
          border: 1px solid rgba(0,0,0,0.1);
          background: rgba(0,0,0,0.1);
          margin-bottom: 1.5rem;
        }

        .pro-proof-grid article {
          display: grid;
          gap: 0.4rem;
          background: rgba(240,240,235,0.7);
          padding: 1rem;
        }

        .pro-proof-grid span {
          font-family: var(--font-mono, monospace);
          font-size: 0.7rem;
          font-weight: 950;
          color: #163cff;
        }

        .pro-proof-grid p {
          font-family: var(--font-mono, monospace);
          font-size: 0.72rem;
          line-height: 1.55;
          opacity: 0.62;
          margin: 0;
        }

        .pro-perks {
          list-style: none;
          margin: 0 0 1.5rem;
          padding: 1.25rem 1.5rem;
          border: 1px solid rgba(22,60,255,0.18);
          background: rgba(22,60,255,0.03);
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }

        .pro-perk-label {
          font-family: var(--font-mono, monospace);
          font-size: 0.72rem;
          opacity: 0.7;
          padding-left: 1rem;
          position: relative;
        }

        .pro-perk-label::before {
          content: '+';
          position: absolute;
          left: 0;
          color: #163cff;
          font-weight: 950;
        }

        .pro-preview-panel {
          display: grid;
          gap: 0.6rem;
          padding: 1rem;
          border: 1px solid rgba(22,60,255,0.25);
          background: rgba(22,60,255,0.03);
          margin-bottom: 1.5rem;
        }

        .pro-preview-panel span {
          font-family: var(--font-mono, monospace);
          font-size: 0.58rem;
          letter-spacing: 0.16em;
          color: #163cff;
          font-weight: 950;
        }

        .pro-preview-panel strong {
          font-family: var(--font-mono, monospace);
          font-size: 0.8rem;
          line-height: 1.4;
        }

        .pro-preview-panel p {
          font-family: var(--font-mono, monospace);
          font-size: 0.7rem;
          line-height: 1.6;
          opacity: 0.58;
          margin: 0;
        }

        .pro-cta {
          display: block;
          width: 100%;
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

        .pro-cta:hover { opacity: 0.8; }

        .pro-cta--main {
          background: #163cff;
          color: white;
        }

        .pro-cta--ghost {
          background: rgba(0,0,0,0.08);
          color: inherit;
          margin-top: 0.5rem;
        }

        .pro-legal {
          font-family: var(--font-mono, monospace);
          font-size: 0.6rem;
          opacity: 0.35;
          line-height: 1.6;
          text-align: center;
          margin: 1.25rem 0;
        }

        .pro-legal a {
          color: inherit;
        }

        .pro-faq {
          display: grid;
          gap: 1px;
          border: 1px solid rgba(0,0,0,0.1);
          background: rgba(0,0,0,0.1);
        }

        .pro-faq details {
          background: rgba(240,240,235,0.7);
        }

        .pro-faq summary {
          cursor: pointer;
          font-family: var(--font-mono, monospace);
          font-size: 0.72rem;
          font-weight: 950;
          padding: 0.85rem 1rem;
          list-style-position: inside;
        }

        .pro-faq p {
          font-family: var(--font-mono, monospace);
          font-size: 0.68rem;
          line-height: 1.6;
          opacity: 0.58;
          margin: 0;
          padding: 0 1rem 1rem;
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

        .pro-input:focus { border-color: #163cff; }

        .pro-error {
          font-family: var(--font-mono, monospace);
          font-size: 0.65rem;
          color: red;
          letter-spacing: 0.1em;
        }

        .pro-payment-note {
          display: grid;
          gap: 0.5rem;
          padding: 0.75rem;
          border: 1px solid rgba(0,0,0,0.08);
          background: rgba(0,0,0,0.02);
        }

        .pro-payment-tag {
          font-family: var(--font-mono, monospace);
          font-size: 0.58rem;
          letter-spacing: 0.2em;
          color: #163cff;
          font-weight: 950;
        }

        .pro-payment-desc {
          font-family: var(--font-mono, monospace);
          font-size: 0.68rem;
          line-height: 1.55;
          opacity: 0.55;
          margin: 0;
        }

        .pro-consent {
          display: flex;
          gap: 0.6rem;
          align-items: baseline;
          cursor: pointer;
          font-family: var(--font-mono, monospace);
          font-size: 0.65rem;
          opacity: 0.5;
          line-height: 1.5;
        }

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
          color: #163cff;
          text-decoration: none;
          transition: opacity 0.15s;
        }

        .pro-downgrade-link:hover { opacity: 0.7; }
      `}</style>
    </>
  );
}
