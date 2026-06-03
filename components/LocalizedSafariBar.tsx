'use client';

import Link from 'next/link';
import { getHomeUiCopy, withLocalePath } from '@/lib/i18n';
import { useCurrentLocale } from '@/lib/useCurrentLocale';

type LocalizedSafariBarProps = {
  active?: 'pro-tools' | 'loadouts' | 'set-up' | 'esport' | 'community';
  searchPlaceholder?: string;
  readout?: string[];
};

export default function LocalizedSafariBar({
  active,
  searchPlaceholder,
  readout = ['WZPRO // META', 'STATUS: LIVE', 'TRACKING: ACTIVE'],
}: LocalizedSafariBarProps) {
  const locale = useCurrentLocale();
  const copy = getHomeUiCopy(locale);
  const href = (path: string) => withLocalePath(path, locale);

  const links = [
    ['pro-tools', href('/pro-tools'), copy.proTools],
    ['loadouts', href('/#all-loadouts'), copy.loadouts],
    ['set-up', href('/set-up'), copy.setUp],
    ['esport', href('/esport'), copy.esport],
    ['community', href('/community'), copy.community],
  ] as const;

  return (
    <div className="safari-bar">
      <Link className="brand-pill" href={href('/')}>
        <b>WZ</b>
        <span>Meta</span>
      </Link>
      <nav>
        {links.map(([key, url, label]) => (
          <Link key={key} href={url} aria-current={active === key ? 'page' : undefined}>
            {label}
          </Link>
        ))}
      </nav>
      <label>
        <span>{copy.search}</span>
        <input placeholder={searchPlaceholder ?? copy.searchPlaceholder} />
      </label>
      <div className="nav-readout" aria-hidden="true">
        {readout.map((line) => <span key={line}>{line}</span>)}
      </div>
    </div>
  );
}
