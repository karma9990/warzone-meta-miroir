'use client';

import Link from 'next/link';
import { withLocalePath, type Locale } from '@/lib/i18n';
import { useCurrentLocale } from '@/lib/useCurrentLocale';

type CompetitiveNavProps = {
  active?: 'top250' | 'calendar' | 'wsow' | 'resurgence' | 'ewc' | 'pullze';
};

type IconName = 'trophy' | 'calendar' | 'wsow' | 'wrs' | 'ewc' | 'pulse';

const items: Array<{
  key: NonNullable<CompetitiveNavProps['active']>;
  label: Record<Locale, string> & { en: string };
  href: string;
  icon: IconName;
}> = [
  { key: 'top250', label: { en: 'TOP 250', fr: 'TOP 250', es: 'TOP 250', de: 'TOP 250', it: 'TOP 250', pt: 'TOP 250', nl: 'TOP 250', pl: 'TOP 250', ja: 'TOP 250' }, href: '/esport/top-250', icon: 'trophy' },
  { key: 'calendar', label: { en: 'Calendar', fr: 'Calendrier', es: 'Agenda', de: 'Kalender', it: 'Programma', pt: 'Agenda', nl: 'Kalender', pl: 'Kalendarz', ja: 'カレンダー' }, href: '/esport/calendar', icon: 'calendar' },
  { key: 'wsow', label: { en: 'World Series of Warzone', fr: 'World Series of Warzone', es: 'World Series of Warzone', de: 'World Series of Warzone', it: 'World Series of Warzone', pt: 'World Series of Warzone', nl: 'World Series of Warzone', pl: 'World Series of Warzone', ja: 'World Series of Warzone' }, href: '/esport/wsow', icon: 'wsow' },
  { key: 'resurgence', label: { en: 'Resurgence Series', fr: 'Series Resurgence', es: 'Series Resurgence', de: 'Resurgence-Serie', it: 'Serie Resurgence', pt: 'Serie Resurgence', nl: 'Resurgence Series', pl: 'Seria Resurgence', ja: 'リサージェンスシリーズ' }, href: '/esport/resurgence-series', icon: 'wrs' },
  { key: 'ewc', label: { en: 'Esports World Cup', fr: 'Coupe du Monde Esport', es: 'Copa Mundial Esport', de: 'Esports World Cup', it: 'Coppa del Mondo Esport', pt: 'Copa do Mundo Esport', nl: 'Esports World Cup', pl: 'Puchar Swiata Esport', ja: 'Esports World Cup' }, href: '/esport/ewc', icon: 'ewc' },
  { key: 'pullze', label: { en: 'Pullze Check', fr: 'Verification Pullze', es: 'Revision Pullze', de: 'Pullze Check', it: 'Controllo Pullze', pt: 'Verificacao Pullze', nl: 'Pullze Check', pl: 'Kontrola Pullze', ja: 'Pullzeチェック' }, href: '/esport/pullze-check', icon: 'pulse' },
];

const navCopy: Record<Locale, { aria: string; kicker: string }> = {
  en: { aria: 'Competitive navigation', kicker: 'Competitive' },
  fr: { aria: 'Navigation competition', kicker: 'Competition' },
  es: { aria: 'Navegacion competitiva', kicker: 'Competitivo' },
  de: { aria: 'Wettkampf Navigation', kicker: 'Wettkampf' },
  it: { aria: 'Navigazione competitiva', kicker: 'Competitivo' },
  pt: { aria: 'Navegacao competitiva', kicker: 'Competitivo' },
  nl: { aria: 'Competitieve navigatie', kicker: 'Competitief' },
  pl: { aria: 'Nawigacja rywalizacji', kicker: 'Rywalizacja' },
  ja: { aria: '競技ナビゲーション', kicker: '競技' },
};

function CompetitiveIcon({ name }: { name: IconName }) {
  if (name === 'trophy') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 4h8v3.5c0 3.2-1.5 5.4-4 6.3-2.5-.9-4-3.1-4-6.3V4Z" />
        <path d="M8 6H4v2.2c0 2.1 1.5 3.6 3.7 3.8M16 6h4v2.2c0 2.1-1.5 3.6-3.7 3.8M12 14v3M8.5 20h7M10 17h4" />
      </svg>
    );
  }

  if (name === 'calendar') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 5h14v15H5V5Z" />
        <path d="M8 3v4M16 3v4M5 9h14M8 13h3M13 13h3M8 16h3" />
      </svg>
    );
  }

  if (name === 'pulse') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 3h10l-2 18H5L7 3Z" />
        <path d="M9 8h5M8.5 12h4.5" />
      </svg>
    );
  }

  return (
    <span className="competitive-mark" aria-hidden="true">
      {name === 'wsow' ? 'WS' : name === 'wrs' ? 'WRS' : 'EWC'}
    </span>
  );
}

export default function CompetitiveNav({ active }: CompetitiveNavProps) {
  const locale = useCurrentLocale();
  const copy = navCopy[locale] ?? navCopy.en;

  return (
    <aside className="competitive-nav" aria-label={copy.aria}>
      <p className="competitive-kicker">{copy.kicker}</p>
      <nav>
        {items.map((item) => (
          <Link
            key={item.key}
            href={withLocalePath(item.href, locale)}
            className={active === item.key ? 'is-active' : undefined}
            aria-current={active === item.key ? 'page' : undefined}
          >
            <span className="competitive-icon">
              <CompetitiveIcon name={item.icon} />
            </span>
            <span>{item.label[locale] ?? item.label.en}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
