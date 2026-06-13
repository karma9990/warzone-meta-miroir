'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { withLocalePath } from '@/lib/i18n';
import { useCurrentLocale } from '@/lib/useCurrentLocale';

type Item = {
  id: string;
  label: string;
  group: string;
  path: string;
  meta?: string;
  keywords?: string;
};

type LoadoutLite = {
  id: string;
  weapon: string;
  weaponId?: string;
  category: string;
  tier: string;
};

const PLACEHOLDER = {
  en: 'Search loadouts, tools, pages…',
  fr: 'Rechercher classes, outils, pages…',
  es: 'Buscar clases, herramientas, paginas…',
};

const GROUPS = {
  pages: { en: 'Pages', fr: 'Pages', es: 'Paginas' },
  loadouts: { en: 'Loadouts', fr: 'Classes', es: 'Clases' },
  tools: { en: 'Tools', fr: 'Outils', es: 'Herramientas' },
};

const EMPTY = { en: 'No results', fr: 'Aucun resultat', es: 'Sin resultados' };
const HINT = { en: 'to open', fr: 'pour ouvrir', es: 'para abrir' };

function staticItems(lang: 'en' | 'fr' | 'es'): Item[] {
  const pages = GROUPS.pages[lang];
  const tools = GROUPS.tools[lang];
  return [
    { id: 'home', label: lang === 'fr' ? 'Accueil' : lang === 'es' ? 'Inicio' : 'Home', group: pages, path: '/' },
    { id: 'quiz', label: lang === 'fr' ? 'Trouve ta classe (Quiz)' : lang === 'es' ? 'Encuentra tu clase (Quiz)' : 'Find your loadout (Quiz)', group: pages, path: '/quiz', keywords: 'quiz finder reco' },
    { id: 'all-loadouts', label: lang === 'fr' ? 'Toutes les classes' : lang === 'es' ? 'Todas las clases' : 'All loadouts', group: pages, path: '/#all-loadouts' },
    { id: 'meta-trends', label: lang === 'fr' ? 'Tendances meta' : lang === 'es' ? 'Tendencias meta' : 'Meta trends', group: pages, path: '/meta-trends', keywords: 'trend graph history buff nerf alerts' },
    { id: 'builds', label: lang === 'fr' ? 'Builds communaute' : lang === 'es' ? 'Builds comunidad' : 'Community builds', group: pages, path: '/builds', keywords: 'community vote leaderboard share' },
    { id: 'ai-classes', label: 'IA WZPRO', group: pages, path: '/ai-classes', keywords: 'ai coach chat' },
    { id: 'pro-classe', label: lang === 'fr' ? 'Classes Pro' : lang === 'es' ? 'Clases Pro' : 'Pro Classes', group: pages, path: '/pro-classe' },
    { id: 'set-up', label: 'Set-up', group: pages, path: '/set-up', keywords: 'pc console settings reglages' },
    { id: 'esport', label: 'Esport', group: pages, path: '/esport' },
    { id: 'tournois', label: lang === 'fr' ? 'Tournois' : lang === 'es' ? 'Torneos' : 'Tournaments', group: pages, path: '/tournois' },
    { id: 'actualites', label: lang === 'fr' ? 'Actualites' : lang === 'es' ? 'Noticias' : 'News', group: pages, path: '/actualites' },
    { id: 'community', label: lang === 'fr' ? 'Communaute' : lang === 'es' ? 'Comunidad' : 'Community', group: pages, path: '/community' },
    { id: 'pro-tools', label: lang === 'fr' ? 'Pro Tools' : 'Pro Tools', group: tools, path: '/pro-tools', keywords: 'ttk recoil sensitivity fov movement zone' },
    { id: 'tools-individual', label: lang === 'fr' ? 'Outils individuels' : lang === 'es' ? 'Herramientas individuales' : 'Individual tools', group: tools, path: '/tools-individual' },
  ];
}

function normalize(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export default function CommandPalette() {
  const locale = useCurrentLocale();
  const lang: 'en' | 'fr' | 'es' = locale === 'fr' ? 'fr' : locale === 'es' ? 'es' : 'en';
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [loadouts, setLoadouts] = useState<LoadoutLite[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Global open/close shortcut.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (open) {
          setOpen(false);
        } else {
          setQuery('');
          setActive(0);
          setOpen(true);
        }
      } else if (event.key === 'Escape') {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Lazy-load the loadout index on first open.
  useEffect(() => {
    if (!open || loadouts) return;
    let cancelled = false;
    fetch('/api/loadouts')
      .then((response) => (response.ok ? response.json() : []))
      .then((data: LoadoutLite[]) => {
        if (!cancelled) setLoadouts(Array.isArray(data) ? data : []);
      })
      .catch(() => { if (!cancelled) setLoadouts([]); });
    return () => { cancelled = true; };
  }, [open, loadouts]);

  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 20);
      document.body.style.overflow = 'hidden';
      return () => { window.clearTimeout(id); document.body.style.overflow = ''; };
    }
    document.body.style.overflow = '';
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const base = staticItems(lang);
    const loadoutItems: Item[] = (loadouts ?? []).map((loadout) => ({
      id: `loadout-${loadout.id}`,
      label: loadout.weapon,
      group: GROUPS.loadouts[lang],
      path: `/loadouts/${loadout.weaponId || loadout.id}`,
      meta: `${loadout.category} · ${loadout.tier}`,
      keywords: `${loadout.category} ${loadout.tier}`,
    }));
    return [...base, ...loadoutItems];
  }, [lang, loadouts]);

  const results = useMemo<Item[]>(() => {
    const q = normalize(query.trim());
    if (!q) return items.slice(0, 8);
    return items
      .filter((item) => normalize(`${item.label} ${item.group} ${item.keywords ?? ''}`).includes(q))
      .slice(0, 20);
  }, [items, query]);

  const go = useCallback((item: Item) => {
    setOpen(false);
    router.push(withLocalePath(item.path, locale));
  }, [router, locale]);

  function onInputKey(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((value) => Math.min(value + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((value) => Math.max(value - 1, 0));
    } else if (event.key === 'Enter' && results[active]) {
      event.preventDefault();
      go(results[active]);
    }
  }

  useEffect(() => {
    const node = listRef.current?.querySelector('[data-active="true"]');
    node?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  return (
    <div className="cmdk-overlay" role="dialog" aria-modal="true" aria-label="Command menu" onMouseDown={() => setOpen(false)}>
      <div className="cmdk-panel" onMouseDown={(event) => event.stopPropagation()}>
        <input
          ref={inputRef}
          className="cmdk-input"
          value={query}
          onChange={(event) => {
            setQuery(event.currentTarget.value);
            setActive(0);
          }}
          onKeyDown={onInputKey}
          placeholder={PLACEHOLDER[lang]}
          aria-label={PLACEHOLDER[lang]}
          type="text"
          autoComplete="off"
          spellCheck={false}
        />
        <div className="cmdk-list" ref={listRef}>
          {results.length === 0 ? (
            <p className="cmdk-empty">{EMPTY[lang]}</p>
          ) : (
            results.map((item, index) => {
              const prev = results[index - 1];
              const showGroup = !prev || prev.group !== item.group;
              return (
                <div key={item.id}>
                  {showGroup && <span className="cmdk-group">{item.group}</span>}
                  <button
                    type="button"
                    className="cmdk-item"
                    data-active={index === active}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => go(item)}
                  >
                    <span className="cmdk-label">{item.label}</span>
                    {item.meta && <span className="cmdk-meta">{item.meta}</span>}
                  </button>
                </div>
              );
            })
          )}
        </div>
        <div className="cmdk-foot">
          <kbd>↑</kbd><kbd>↓</kbd> <span>{lang === 'fr' ? 'naviguer' : lang === 'es' ? 'navegar' : 'navigate'}</span>
          <kbd>↵</kbd> <span>{HINT[lang]}</span>
          <kbd>esc</kbd> <span>{lang === 'fr' ? 'fermer' : lang === 'es' ? 'cerrar' : 'close'}</span>
        </div>
      </div>

      <style>{`
        .cmdk-overlay { position: fixed; inset: 0; z-index: 2000; display: flex; align-items: flex-start; justify-content: center; padding: 12vh 1rem 1rem; background: rgba(10,10,8,0.45); backdrop-filter: blur(4px); }
        .cmdk-panel { width: min(640px, 100%); border: 1px solid rgba(22,60,255,0.4); background: var(--theme-panel, rgba(245,244,239,0.98)); color: var(--tm-ink, #10100e); font-family: var(--font-mono, monospace); box-shadow: 0 24px 80px rgba(10,10,8,0.4); display: flex; flex-direction: column; max-height: 70vh; }
        .cmdk-input { border: none; border-bottom: 1px solid rgba(16,16,14,0.14); background: transparent; color: inherit; font: inherit; font-size: 1rem; padding: 1.1rem 1.2rem; outline: none; }
        .cmdk-list { overflow-y: auto; padding: 0.5rem; }
        .cmdk-group { display: block; padding: 0.6rem 0.6rem 0.3rem; font-size: 0.62rem; font-weight: 900; letter-spacing: 0.16em; text-transform: uppercase; color: #163cff; }
        .cmdk-item { width: 100%; display: flex; align-items: center; gap: 0.8rem; border: none; background: transparent; color: inherit; cursor: pointer; font: inherit; text-align: left; padding: 0.6rem 0.7rem; }
        .cmdk-item[data-active="true"] { background: rgba(22,60,255,0.1); }
        .cmdk-label { font-size: 0.9rem; letter-spacing: 0.01em; }
        .cmdk-meta { margin-left: auto; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; color: rgba(16,16,14,0.5); }
        .cmdk-empty { padding: 1.4rem 0.7rem; color: rgba(16,16,14,0.5); font-size: 0.85rem; }
        .cmdk-foot { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; padding: 0.7rem 1rem; border-top: 1px solid rgba(16,16,14,0.12); font-size: 0.66rem; color: rgba(16,16,14,0.5); }
        .cmdk-foot kbd { border: 1px solid rgba(16,16,14,0.2); border-radius: 3px; padding: 0.05rem 0.35rem; font-family: inherit; font-size: 0.62rem; }
        .cmdk-foot span { margin-right: 0.6rem; }
        :global(:root[data-theme="dark"]) .cmdk-meta, :global(:root[data-theme="dark"]) .cmdk-empty, :global(:root[data-theme="dark"]) .cmdk-foot { color: rgba(255,255,255,0.55); }
        :global(:root[data-theme="dark"]) .cmdk-foot kbd { border-color: rgba(255,255,255,0.24); }
      `}</style>
    </div>
  );
}
