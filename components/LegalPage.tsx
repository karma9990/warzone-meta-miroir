import Link from 'next/link';
import type { ReactNode } from 'react';
import { withLocalePath, type Locale } from '@/lib/i18n';
import { getRequestLocale } from '@/lib/requestLocale';

type Section = {
  title: string;
  body: ReactNode;
};

const legalCopy: Record<Locale, {
  back: string;
  kicker: string;
  updated: string;
  aria: string;
  titles: Record<string, string>;
  links: Array<[string, string]>;
}> = {
  en: {
    back: 'BACK TO WZ META',
    kicker: 'LEGAL / WZPRO META',
    updated: 'Last updated',
    aria: 'Legal links',
    titles: {},
    links: [['/legal', 'Legal Notice'], ['/terms', 'Terms'], ['/privacy', 'Privacy'], ['/refund', 'Refund'], ['/cancellation', 'Cancellation'], ['/billing', 'Billing'], ['/disclaimer', 'Disclaimer'], ['/acceptable-use', 'Acceptable Use'], ['/cookies', 'Cookies'], ['/contact', 'Contact']],
  },
  fr: {
    back: 'RETOUR WZ META',
    kicker: 'LEGAL / WZPRO META',
    updated: 'Derniere mise a jour',
    aria: 'Liens legaux',
    titles: { 'Legal Notice': 'Mentions legales', 'Terms of Service': 'Conditions d utilisation', 'Privacy Policy': 'Politique de confidentialite', 'Refund Policy': 'Politique de remboursement', 'Cancellation Policy': 'Politique d annulation', 'Billing Policy': 'Politique de facturation', Disclaimer: 'Avertissement', 'Acceptable Use Policy': 'Politique d usage acceptable', 'Cookie Policy': 'Politique cookies' },
    links: [['/legal', 'Mentions legales'], ['/terms', 'Conditions'], ['/privacy', 'Confidentialite'], ['/refund', 'Remboursement'], ['/cancellation', 'Annulation'], ['/billing', 'Facturation'], ['/disclaimer', 'Avertissement'], ['/acceptable-use', 'Usage acceptable'], ['/cookies', 'Cookies'], ['/contact', 'Contact']],
  },
  es: {
    back: 'VOLVER A WZ META',
    kicker: 'LEGAL / WZPRO META',
    updated: 'Ultima actualizacion',
    aria: 'Enlaces legales',
    titles: { 'Legal Notice': 'Aviso legal', 'Terms of Service': 'Terminos de servicio', 'Privacy Policy': 'Politica de privacidad', 'Refund Policy': 'Politica de reembolso', 'Cancellation Policy': 'Politica de cancelacion', 'Billing Policy': 'Politica de facturacion', Disclaimer: 'Aviso', 'Acceptable Use Policy': 'Politica de uso aceptable', 'Cookie Policy': 'Politica de cookies' },
    links: [['/legal', 'Aviso legal'], ['/terms', 'Terminos'], ['/privacy', 'Privacidad'], ['/refund', 'Reembolso'], ['/cancellation', 'Cancelacion'], ['/billing', 'Facturacion'], ['/disclaimer', 'Aviso'], ['/acceptable-use', 'Uso aceptable'], ['/cookies', 'Cookies'], ['/contact', 'Contacto']],
  },
  de: { back: 'ZURUECK ZU WZ META', kicker: 'RECHTLICH / WZPRO META', updated: 'Zuletzt aktualisiert', aria: 'Rechtliche Links', titles: {}, links: [['/legal', 'Impressum'], ['/terms', 'Bedingungen'], ['/privacy', 'Datenschutz'], ['/refund', 'Rueckerstattung'], ['/cancellation', 'Kuendigung'], ['/billing', 'Abrechnung'], ['/disclaimer', 'Hinweis'], ['/acceptable-use', 'Nutzungsregeln'], ['/cookies', 'Cookies'], ['/contact', 'Kontakt']] },
  it: { back: 'TORNA A WZ META', kicker: 'LEGALE / WZPRO META', updated: 'Ultimo aggiornamento', aria: 'Link legali', titles: {}, links: [['/legal', 'Note legali'], ['/terms', 'Termini'], ['/privacy', 'Privacy'], ['/refund', 'Rimborsi'], ['/cancellation', 'Cancellazione'], ['/billing', 'Fatturazione'], ['/disclaimer', 'Avviso'], ['/acceptable-use', 'Uso accettabile'], ['/cookies', 'Cookie'], ['/contact', 'Contatto']] },
  pt: { back: 'VOLTAR AO WZ META', kicker: 'LEGAL / WZPRO META', updated: 'Ultima atualizacao', aria: 'Links legais', titles: {}, links: [['/legal', 'Aviso legal'], ['/terms', 'Termos'], ['/privacy', 'Privacidade'], ['/refund', 'Reembolso'], ['/cancellation', 'Cancelamento'], ['/billing', 'Faturamento'], ['/disclaimer', 'Aviso'], ['/acceptable-use', 'Uso aceitavel'], ['/cookies', 'Cookies'], ['/contact', 'Contato']] },
  nl: { back: 'TERUG NAAR WZ META', kicker: 'JURIDISCH / WZPRO META', updated: 'Laatst bijgewerkt', aria: 'Juridische links', titles: {}, links: [['/legal', 'Juridische info'], ['/terms', 'Voorwaarden'], ['/privacy', 'Privacy'], ['/refund', 'Terugbetaling'], ['/cancellation', 'Annulering'], ['/billing', 'Facturatie'], ['/disclaimer', 'Disclaimer'], ['/acceptable-use', 'Acceptabel gebruik'], ['/cookies', 'Cookies'], ['/contact', 'Contact']] },
  pl: { back: 'WROC DO WZ META', kicker: 'PRAWNE / WZPRO META', updated: 'Ostatnia aktualizacja', aria: 'Linki prawne', titles: {}, links: [['/legal', 'Informacje prawne'], ['/terms', 'Warunki'], ['/privacy', 'Prywatnosc'], ['/refund', 'Zwrot'], ['/cancellation', 'Anulowanie'], ['/billing', 'Platnosci'], ['/disclaimer', 'Zastrzezenie'], ['/acceptable-use', 'Dozwolone uzycie'], ['/cookies', 'Cookies'], ['/contact', 'Kontakt']] },
  ja: { back: 'WZ METAへ戻る', kicker: '法務 / WZPRO META', updated: '最終更新', aria: '法務リンク', titles: {}, links: [['/legal', '法的表示'], ['/terms', '利用規約'], ['/privacy', 'プライバシー'], ['/refund', '返金'], ['/cancellation', '解約'], ['/billing', '請求'], ['/disclaimer', '免責事項'], ['/acceptable-use', '利用ルール'], ['/cookies', 'Cookie'], ['/contact', 'お問い合わせ']] },
};

export default async function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: string;
  sections: Section[];
}) {
  const locale = await getRequestLocale();
  const copy = legalCopy[locale] ?? legalCopy.en;
  const displayTitle = copy.titles[title] ?? title;

  return (
    <main className="legal-page">
      <div className="legal-back">
        <Link href={withLocalePath('/', locale)}>{copy.back}</Link>
      </div>
      <p className="legal-kicker">{copy.kicker}</p>
      <h1>{displayTitle}</h1>
      <p className="legal-updated">{copy.updated}: {updated}</p>
      <p className="legal-intro">{intro}</p>

      <div className="legal-stack">
        {sections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            <div>{section.body}</div>
          </section>
        ))}
      </div>

      <nav className="legal-nav" aria-label={copy.aria}>
        {copy.links.map(([href, label]) => (
          <Link key={href} href={withLocalePath(href, locale)}>{label}</Link>
        ))}
      </nav>
    </main>
  );
}
