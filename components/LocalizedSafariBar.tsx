'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { getHomeUiCopy, withLocalePath } from '@/lib/i18n';
import { useCurrentLocale } from '@/lib/useCurrentLocale';

type LocalizedSafariBarProps = {
  active?: 'pro-tools' | 'loadouts' | 'quiz' | 'meta-trends' | 'builds' | 'ai-classes' | 'set-up' | 'esport' | 'community' | 'actualites' | 'pro-classe' | 'tournois' | 'createur';
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
  const [search, setSearch] = useState('');
  const href = (path: string) => withLocalePath(path, locale);
  const searchAction = href('/');

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = search.trim();
    const url = new URL(searchAction, window.location.origin);
    if (term) url.searchParams.set('q', term);
    url.hash = 'all-loadouts';
    window.location.assign(url.toString());
  }

  const links = [
    ['pro-tools', href('/pro-tools'), copy.proTools],
    ['loadouts', href('/#all-loadouts'), copy.loadouts],
    ['ai-classes', href('/ai-classes'), 'IA WZPRO'],
    ['pro-classe', href('/pro-classe'), locale === 'fr' ? 'Classes Pro' : locale === 'es' ? 'Clases Pro' : 'Pro Classes'],
    ['set-up', href('/set-up'), copy.setUp],
    ['esport', href('/esport'), copy.esport],
    ['tournois', href('/tournois'), locale === 'fr' ? 'Tournois' : locale === 'es' ? 'Torneos' : 'Tournaments'],
    ['actualites', href('/actualites'), locale === 'fr' ? 'Actualites' : locale === 'es' ? 'Noticias' : 'News'],
    ['createur', href('/createur'), locale === 'fr' ? 'Createur' : locale === 'es' ? 'Creador' : 'Creator'],
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
      <form className="safari-search-form" action={searchAction} method="get" onSubmit={submitSearch}>
        <label>
        <span>{copy.search}</span>
          <input
            name="q"
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder={searchPlaceholder ?? copy.searchPlaceholder}
            type="search"
          />
        </label>
      </form>
      <div className="nav-readout" aria-hidden="true">
        {readout.map((line) => <span key={line}>{line}</span>)}
      </div>
    </div>
  );
}
