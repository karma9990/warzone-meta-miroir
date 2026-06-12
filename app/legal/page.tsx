import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Legal Notice | WZPRO Meta',
  description: 'Read WZPRO Meta legal notice, publisher information and contact details.',
};
import LegalPage from '@/components/LegalPage';
import { LEGAL, SUPPORT_EMAIL } from '@/lib/siteConfig';
import { getRequestLocale } from '@/lib/requestLocale';

const updated = 'May 20, 2026';

const copy = {
  en: {
    title: 'Legal Notice',
    intro: 'This page identifies the publisher, hosting provider, publication contact and consumer dispute channels for WZPRO Meta.',
    s1: '1. Site Publisher',
    s1Body: (p: string, s: string, a: string, r: string) => `Publisher: ${p}. Status: ${s}. Registered address: ${a}. Registration: ${r}.`,
    s2: '2. Publication Director',
    s2Body: (d: string) => `Publication director: ${d}.`,
    s3: '3. Contact',
    s3Body: (e: string) => `Legal, support and privacy requests can be sent to ${e}.`,
    s4: '4. Hosting Provider',
    s4Body: (h: string, a: string) => `Host: ${h}. Host address: ${a}.`,
    s5: '5. Consumer Mediation',
    s5Body: (m: string, w: string) => `If you are a consumer and a dispute cannot be resolved after contacting support, you may contact the designated consumer mediator: ${m}, ${w}. These details must be replaced with the mediator actually selected by the publisher before public commercial launch.`,
    s6: '6. Intellectual Property and Third-Party Marks',
    s6Body: 'WZPRO Meta is independent and is not affiliated with Activision, Call of Duty, Warzone, Microsoft, NVIDIA, AMD, Intel, Polar or other third parties mentioned on the site. Third-party names remain the property of their respective owners.',
  },
  fr: {
    title: 'Mentions Legales',
    intro: 'Cette page identifie l editeur, l hebergeur, le contact de publication et les canaux de mediation pour WZPRO Meta.',
    s1: '1. Editeur du site',
    s1Body: (p: string, s: string, a: string, r: string) => `Editeur : ${p}. Statut : ${s}. Siege social : ${a}. Immatriculation : ${r}.`,
    s2: '2. Directeur de la publication',
    s2Body: (d: string) => `Directeur de la publication : ${d}.`,
    s3: '3. Contact',
    s3Body: (e: string) => `Les demandes juridiques, de support et de confidentialite peuvent etre envoyees a ${e}.`,
    s4: '4. Hebergeur',
    s4Body: (h: string, a: string) => `Hebergeur : ${h}. Adresse de l hebergeur : ${a}.`,
    s5: '5. Mediation des consommateurs',
    s5Body: (m: string, w: string) => `Si vous etes un consommateur et qu un litige ne peut etre resolu apres avoir contacte le support, vous pouvez contacter le mediateur designe : ${m}, ${w}. Ces informations doivent etre remplacees par le mediateur effectivement selectionne par l editeur avant le lancement commercial public.`,
    s6: '6. Propriete intellectuelle et marques tierces',
    s6Body: 'WZPRO Meta est independant et n est pas affilie a Activision, Call of Duty, Warzone, Microsoft, NVIDIA, AMD, Intel, Polar ou autres tiers mentionnes sur le site. Les noms de tiers restent la propriete de leurs detenteurs respectifs.',
  },
  es: {
    title: 'Aviso Legal',
    intro: 'Esta pagina identifica al editor, proveedor de alojamiento, contacto de publicacion y canales de mediacion para WZPRO Meta.',
    s1: '1. Editor del sitio',
    s1Body: (p: string, s: string, a: string, r: string) => `Editor: ${p}. Estatus: ${s}. Direccion registrada: ${a}. Registro: ${r}.`,
    s2: '2. Director de publicacion',
    s2Body: (d: string) => `Director de publicacion: ${d}.`,
    s3: '3. Contacto',
    s3Body: (e: string) => `Las solicitudes legales, de soporte y privacidad pueden enviarse a ${e}.`,
    s4: '4. Proveedor de alojamiento',
    s4Body: (h: string, a: string) => `Alojamiento: ${h}. Direccion del alojamiento: ${a}.`,
    s5: '5. Mediacion de consumo',
    s5Body: (m: string, w: string) => `Si eres consumidor y un conflicto no puede resolverse tras contactar con soporte, puedes contactar al mediador designado: ${m}, ${w}.`,
    s6: '6. Propiedad intelectual y marcas de terceros',
    s6Body: 'WZPRO Meta es independiente y no esta afiliado a Activision, Call of Duty, Warzone, Microsoft, NVIDIA, AMD, Intel, Polar u otros terceros mencionados en el sitio. Los nombres de terceros siguen siendo propiedad de sus respectivos titulares.',
  },
};

export default async function LegalNoticePage() {
  const locale = await getRequestLocale();
  const t = (copy as Record<string, typeof copy.en>)[locale] || copy.en;

  return (
    <LegalPage
      title={t.title}
      updated={updated}
      intro={t.intro}
      sections={[
        {
          title: t.s1,
          body: <p>{t.s1Body(LEGAL.publisherName, LEGAL.publisherStatus, LEGAL.publisherAddress, LEGAL.publisherRegistration)}</p>,
        },
        { title: t.s2, body: <p>{t.s2Body(LEGAL.publicationDirector)}</p> },
        { title: t.s3, body: <p>{t.s3Body(SUPPORT_EMAIL)}</p> },
        { title: t.s4, body: <p>{t.s4Body(LEGAL.hostName, LEGAL.hostAddress)}</p> },
        { title: t.s5, body: <p>{t.s5Body(LEGAL.mediatorName, LEGAL.mediatorWebsite)}</p> },
        { title: t.s6, body: <p>{t.s6Body}</p> },
      ]}
    />
  );
}
