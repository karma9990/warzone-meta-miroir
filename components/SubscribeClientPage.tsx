'use client';

import { useState } from 'react';
import LocalizedLink from '@/components/LocalizedLink';

const copy = {
  en: {
    back: 'BACK',
    tag: 'FREE TIER',
    title: 'SUBSCRIBE FREE',
    desc: 'Get meta alerts, patch digests and map updates delivered straight to your inbox. No credit card required.',
    emailLabel: 'EMAIL ADDRESS',
    emailPlaceholder: 'operator@example.com',
    invalidEmail: 'Invalid email address.',
    subscribeError: 'Unable to subscribe right now.',
    perk1: 'Weekly meta newsletter',
    perk2: 'Patch notes digest',
    perk3: 'Resurgence map updates',
    perk4: 'New weapon tier alerts',
    perk5: 'Community tips & tricks',
    joining: 'JOINING...',
    joinBtn: 'JOIN FOR FREE',
    legal: 'By subscribing you agree to receive emails from WZPRO Meta. You can unsubscribe at any time.',
    confirmed: 'SUBSCRIPTION CONFIRMED',
    alreadySub: 'You were already subscribed to the WZPRO Meta free newsletter.',
    nowSub: 'You are now subscribed to the WZPRO Meta free newsletter.',
    checkInbox: 'Check your inbox for the free newsletter summary.',
    openPreview: 'OPEN FREE PREVIEW',
    wantMore: 'Want more?',
    upgrade: 'Upgrade to Pro →',
  },
  fr: {
    back: 'RETOUR',
    tag: 'GRATUIT',
    title: 'S ABONNER GRATUITEMENT',
    desc: 'Recevez les alertes meta, les resumes de patch et les mises a jour de carte directement dans votre boite mail. Aucune carte bancaire requise.',
    emailLabel: 'ADRESSE EMAIL',
    emailPlaceholder: 'operateur@exemple.com',
    invalidEmail: 'Adresse email invalide.',
    subscribeError: 'Impossible de s abonner pour le moment.',
    perk1: 'Newsletter meta hebdomadaire',
    perk2: 'Resume des patch notes',
    perk3: 'Mises a jour des cartes Resurgence',
    perk4: 'Alertes nouvelles armes',
    perk5: 'Astuces communaute',
    joining: 'INSCRIPTION...',
    joinBtn: 'S INSCRIRE GRATUITEMENT',
    legal: 'En vous abonnant, vous acceptez de recevoir des emails de WZPRO Meta. Vous pouvez vous desabonner a tout moment.',
    confirmed: 'ABONNEMENT CONFIRME',
    alreadySub: 'Vous etiez deja abonne a la newsletter gratuite WZPRO Meta.',
    nowSub: 'Vous etes maintenant abonne a la newsletter gratuite WZPRO Meta.',
    checkInbox: 'Verifiez votre boite mail pour le resume de la newsletter.',
    openPreview: 'OUVRIR L APERCU GRATUIT',
    wantMore: 'Vous en voulez plus ?',
    upgrade: 'Passer a Pro →',
  },
  es: {
    back: 'VOLVER',
    tag: 'GRATUITO',
    title: 'SUSCRIBIRSE GRATIS',
    desc: 'Recibe alertas meta, resumenes de parches y actualizaciones de mapas directamente en tu bandeja de entrada. Sin tarjeta de credito.',
    emailLabel: 'DIRECCION DE EMAIL',
    emailPlaceholder: 'operador@ejemplo.com',
    invalidEmail: 'Direccion de email no valida.',
    subscribeError: 'No se pudo suscribir en este momento.',
    perk1: 'Boletin meta semanal',
    perk2: 'Resumen de notas de parche',
    perk3: 'Actualizaciones de mapas Resurgence',
    perk4: 'Alertas de nuevas armas',
    perk5: 'Consejos de la comunidad',
    joining: 'REGISTRANDO...',
    joinBtn: 'REGISTRARSE GRATIS',
    legal: 'Al suscribirte, aceptas recibir correos de WZPRO Meta. Puedes cancelar en cualquier momento.',
    confirmed: 'SUSCRIPCION CONFIRMADA',
    alreadySub: 'Ya estabas suscrito al boletin gratuito de WZPRO Meta.',
    nowSub: 'Ahora estas suscrito al boletin gratuito de WZPRO Meta.',
    checkInbox: 'Revisa tu bandeja de entrada para el resumen del boletin.',
    openPreview: 'ABRIR VISTA PREVIA GRATUITA',
    wantMore: '¿Quieres mas?',
    upgrade: 'Actualizar a Pro →',
  },
};

export default function SubscribePage({ locale = 'en' }: { locale?: string }) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [alreadySubscribed, setAlreadySubscribed] = useState(false);
  const t = (copy as Record<string, typeof copy.en>)[locale] || copy.en;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes('@')) {
      setError(t.invalidEmail);
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
        throw new Error(result.error || t.subscribeError);
      }
      setAlreadySubscribed(Boolean(result.alreadySubscribed));
      setSubmitted(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : t.subscribeError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <main className="sub-main">
        <div className="sub-back">
          <LocalizedLink href="/pro-tools">{t.back}</LocalizedLink>
        </div>

        <div className="sub-tag">{t.tag}</div>
        <h1 className="sub-title">{t.title}</h1>
        <p className="sub-desc">
          {t.desc}
        </p>

        <div className="sub-divider" />

        {submitted ? (
          <div className="sub-success">
            <div className="sub-success-icon">✓</div>
            <div className="sub-success-title">{t.confirmed}</div>
            <p className="sub-success-desc">
              {alreadySubscribed ? t.alreadySub : t.nowSub}<br />
              {t.checkInbox}
            </p>
            <LocalizedLink href="/free-preview" className="sub-cta sub-cta--back">
              {t.openPreview}
            </LocalizedLink>
          </div>
        ) : (
          <form className="sub-form" onSubmit={handleSubmit} noValidate>
            <div className="sub-field">
              <label className="sub-label" htmlFor="email">{t.emailLabel}</label>
              <input
                id="email"
                type="email"
                className="sub-input"
                placeholder={t.emailPlaceholder}
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              {error && <span className="sub-error">{error}</span>}
            </div>

            <ul className="sub-perks">
              <li>{t.perk1}</li>
              <li>{t.perk2}</li>
              <li>{t.perk3}</li>
              <li>{t.perk4}</li>
              <li>{t.perk5}</li>
            </ul>

            <button type="submit" className="sub-cta sub-cta--free" disabled={submitting}>
              {submitting ? t.joining : t.joinBtn}
            </button>

            <p className="sub-legal">
              {t.legal}
            </p>
          </form>
        )}

        <div className="sub-upgrade">
          <span className="sub-upgrade-label">{t.wantMore}</span>
          <LocalizedLink href="/pro-access" className="sub-upgrade-link">
            {t.upgrade}
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
