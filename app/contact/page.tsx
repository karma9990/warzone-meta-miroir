import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Support | WZPRO Meta',
  description: 'Contact WZPRO Meta for support, billing questions, access issues and legal notices.',
};
import LegalPage from '@/components/LegalPage';
import ContactForm from '@/components/ContactForm';
import { LEGAL, SUPPORT_EMAIL } from '@/lib/siteConfig';
import { getUserSession } from '@/lib/userAuth';
import { getRequestLocale } from '@/lib/requestLocale';

const updated = 'May 20, 2026';
const supportEmail = SUPPORT_EMAIL;

export const dynamic = 'force-dynamic';

const copy = {
  en: {
    title: 'Contact and Support',
    intro: 'Use this page for support, refund requests, billing questions, access problems and legal notices.',
    s1: 'Contact Form',
    s2: 'Support Email',
    s2Body: (e: string) => `You can also contact us directly: ${e}`,
    s3: 'Response Time',
    s3Body: 'We aim to respond within 2 business days. During launch, payment processor reviews or major updates, response times may be longer.',
    s4: 'For Faster Support',
    s4Body: 'Include your purchase email, product purchased, screenshot of the issue if relevant, browser/device, and a short description of what happened.',
    s5: 'Payment Support',
    s5Body: 'If the issue is about a Polar transaction, include the Polar receipt or transaction email so we can identify the purchase faster.',
    s6: 'Consumer Mediation',
    s6Body: (m: string, w: string) => `If you are a consumer and a dispute cannot be resolved after contacting support, you may contact the designated mediator: ${m}, ${w}.`,
  },
  fr: {
    title: 'Contact et Support',
    intro: 'Utilisez cette page pour le support, les demandes de remboursement, les questions de facturation, les problemes d acces et les avis juridiques.',
    s1: 'Formulaire de contact',
    s2: 'Email de support',
    s2Body: (e: string) => `Vous pouvez aussi nous contacter directement : ${e}`,
    s3: 'Delai de reponse',
    s3Body: 'Nous visons a repondre sous 2 jours ouvres. Pendant le lancement, les revisions de processeur de paiement ou les mises a jour majeures, les delais peuvent etre plus longs.',
    s4: 'Pour un support plus rapide',
    s4Body: 'Incluez votre email d achat, le produit achete, une capture d ecran du probleme si pertinent, le navigateur/appareil et une courte description de ce qui s est passe.',
    s5: 'Support de paiement',
    s5Body: 'Si le probleme concerne une transaction Polar, incluez le recu Polar ou l email de transaction pour que nous puissions identifier l achat plus rapidement.',
    s6: 'Mediation des consommateurs',
    s6Body: (m: string, w: string) => `Si vous etes un consommateur et qu un litige ne peut etre resolu apres avoir contacte le support, vous pouvez contacter le mediateur designe : ${m}, ${w}.`,
  },
  es: {
    title: 'Contacto y Soporte',
    intro: 'Usa esta pagina para soporte, solicitudes de reembolso, preguntas de facturacion, problemas de acceso y avisos legales.',
    s1: 'Formulario de contacto',
    s2: 'Email de soporte',
    s2Body: (e: string) => `Tambien puedes contactarnos directamente: ${e}`,
    s3: 'Tiempo de respuesta',
    s3Body: 'Nuestro objetivo es responder en 2 dias habiles. Durante el lanzamiento, revisiones del procesador de pagos o actualizaciones importantes, los tiempos pueden ser mas largos.',
    s4: 'Para un soporte mas rapido',
    s4Body: 'Incluye tu email de compra, producto comprado, captura de pantalla del problema si es relevante, navegador/dispositivo y una breve descripcion de lo sucedido.',
    s5: 'Soporte de pago',
    s5Body: 'Si el problema es sobre una transaccion de Polar, incluye el recibo de Polar o el email de la transaccion para que podamos identificar la compra mas rapido.',
    s6: 'Mediacion de consumo',
    s6Body: (m: string, w: string) => `Si eres consumidor y un conflicto no puede resolverse tras contactar con soporte, puedes contactar al mediador designado: ${m}, ${w}.`,
  },
};

export default async function ContactPage() {
  const [user, locale] = await Promise.all([getUserSession(), getRequestLocale()]);
  const t = (copy as Record<string, typeof copy.en>)[locale] || copy.en;

  return (
    <LegalPage
      title={t.title}
      updated={updated}
      intro={t.intro}
      sections={[
        { title: t.s1, body: <ContactForm user={user ? { name: user.name, email: user.email } : null} /> },
        { title: t.s2, body: <p>{t.s2Body(supportEmail)}</p> },
        { title: t.s3, body: <p>{t.s3Body}</p> },
        { title: t.s4, body: <p>{t.s4Body}</p> },
        { title: t.s5, body: <p>{t.s5Body}</p> },
        { title: t.s6, body: <p>{t.s6Body(LEGAL.mediatorName, LEGAL.mediatorWebsite)}</p> },
      ]}
    />
  );
}
