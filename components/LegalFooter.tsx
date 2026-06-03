import Link from 'next/link';
import type { Locale } from '@/lib/i18n';
import { DEFAULT_LOCALE, withLocalePath } from '@/lib/i18n';

const FOOTER_COPY: Partial<Record<Locale, {
  tagline: string;
  aria: string;
  links: Array<[string, string]>;
}>> & {
  en: {
    tagline: string;
    aria: string;
    links: Array<[string, string]>;
  };
} = {
  en: {
    tagline: 'Warzone tools, loadouts and PC optimization resources.',
    aria: 'Legal',
    links: [
      ['/legal', 'Legal Notice'],
      ['/terms', 'Terms'],
      ['/privacy', 'Privacy'],
      ['/refund', 'Refunds'],
      ['/cancellation', 'Cancellation'],
      ['/billing', 'Billing'],
      ['/disclaimer', 'Disclaimer'],
      ['/acceptable-use', 'Acceptable Use'],
      ['/cookies', 'Cookies'],
      ['/contact', 'Contact'],
    ],
  },
  fr: {
    tagline: 'Outils Warzone, classes meta et ressources d optimisation PC.',
    aria: 'Legal',
    links: [
      ['/legal', 'Mentions legales'],
      ['/terms', 'Conditions'],
      ['/privacy', 'Confidentialite'],
      ['/refund', 'Remboursements'],
      ['/cancellation', 'Annulation'],
      ['/billing', 'Facturation'],
      ['/disclaimer', 'Avertissement'],
      ['/acceptable-use', 'Usage acceptable'],
      ['/cookies', 'Cookies'],
      ['/contact', 'Contact'],
    ],
  },
  es: {
    tagline: 'Herramientas Warzone, clases meta y recursos de optimizacion PC.',
    aria: 'Legal',
    links: [
      ['/legal', 'Aviso legal'],
      ['/terms', 'Terminos'],
      ['/privacy', 'Privacidad'],
      ['/refund', 'Reembolsos'],
      ['/cancellation', 'Cancelacion'],
      ['/billing', 'Facturacion'],
      ['/disclaimer', 'Aviso'],
      ['/acceptable-use', 'Uso aceptable'],
      ['/cookies', 'Cookies'],
      ['/contact', 'Contacto'],
    ],
  },
  de: {
    tagline: 'Warzone-Tools, Loadouts und PC-Optimierung.',
    aria: 'Rechtliches',
    links: [
      ['/legal', 'Impressum'],
      ['/terms', 'Bedingungen'],
      ['/privacy', 'Datenschutz'],
      ['/refund', 'Rückerstattung'],
      ['/cancellation', 'Kündigung'],
      ['/billing', 'Abrechnung'],
      ['/disclaimer', 'Hinweis'],
      ['/acceptable-use', 'Nutzungsregeln'],
      ['/cookies', 'Cookies'],
      ['/contact', 'Kontakt'],
    ],
  },
  it: {
    tagline: 'Strumenti Warzone, loadout e ottimizzazione PC.',
    aria: 'Legale',
    links: [
      ['/legal', 'Note legali'],
      ['/terms', 'Termini'],
      ['/privacy', 'Privacy'],
      ['/refund', 'Rimborsi'],
      ['/cancellation', 'Cancellazione'],
      ['/billing', 'Fatturazione'],
      ['/disclaimer', 'Avviso'],
      ['/acceptable-use', 'Uso accettabile'],
      ['/cookies', 'Cookie'],
      ['/contact', 'Contatto'],
    ],
  },
  pt: {
    tagline: 'Ferramentas Warzone, loadouts e otimização de PC.',
    aria: 'Legal',
    links: [
      ['/legal', 'Aviso legal'],
      ['/terms', 'Termos'],
      ['/privacy', 'Privacidade'],
      ['/refund', 'Reembolsos'],
      ['/cancellation', 'Cancelamento'],
      ['/billing', 'Faturamento'],
      ['/disclaimer', 'Aviso'],
      ['/acceptable-use', 'Uso aceitável'],
      ['/cookies', 'Cookies'],
      ['/contact', 'Contato'],
    ],
  },
  nl: {
    tagline: 'Warzone-tools, loadouts en PC-optimalisatie.',
    aria: 'Juridisch',
    links: [
      ['/legal', 'Juridische info'],
      ['/terms', 'Voorwaarden'],
      ['/privacy', 'Privacy'],
      ['/refund', 'Terugbetalingen'],
      ['/cancellation', 'Annulering'],
      ['/billing', 'Facturatie'],
      ['/disclaimer', 'Disclaimer'],
      ['/acceptable-use', 'Acceptabel gebruik'],
      ['/cookies', 'Cookies'],
      ['/contact', 'Contact'],
    ],
  },
  pl: {
    tagline: 'Narzędzia Warzone, loadouty i optymalizacja PC.',
    aria: 'Prawne',
    links: [
      ['/legal', 'Informacje prawne'],
      ['/terms', 'Warunki'],
      ['/privacy', 'Prywatność'],
      ['/refund', 'Zwroty'],
      ['/cancellation', 'Anulowanie'],
      ['/billing', 'Płatności'],
      ['/disclaimer', 'Zastrzeżenie'],
      ['/acceptable-use', 'Dozwolone użycie'],
      ['/cookies', 'Cookies'],
      ['/contact', 'Kontakt'],
    ],
  },
  ja: {
    tagline: 'Warzoneツール、ロードアウト、PC最適化リソース。',
    aria: '法務',
    links: [
      ['/legal', '法的表示'],
      ['/terms', '利用規約'],
      ['/privacy', 'プライバシー'],
      ['/refund', '返金'],
      ['/cancellation', '解約'],
      ['/billing', '請求'],
      ['/disclaimer', '免責事項'],
      ['/acceptable-use', '利用ルール'],
      ['/cookies', 'Cookie'],
      ['/contact', 'お問い合わせ'],
    ],
  },
};

export default function LegalFooter({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  const copy = FOOTER_COPY[locale] ?? FOOTER_COPY.en;

  return (
    <footer className="legal-footer">
      <div>
        <strong>WZPRO Meta</strong>
        <span>{copy.tagline}</span>
      </div>
      <nav aria-label={copy.aria}>
        {copy.links.map(([href, label]) => (
          <Link key={href} href={withLocalePath(href, locale)}>{label}</Link>
        ))}
      </nav>
    </footer>
  );
}
