'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';

export type ProToolsNavItem = {
  id: string;
  num: string;
  label: string;
  tag: string;
};

type ProToolsShellProps = {
  sections: ProToolsNavItem[];
  children: ReactNode;
  copy?: {
    ariaJump: string;
    ariaToc: string;
    index: string;
    access: string;
    plans: string;
    catalog: string;
  };
  toolsHref?: string;
};

const ACCESS_ID = 'access';

const DEFAULT_COPY = {
  ariaJump: 'Jump to module',
  ariaToc: 'Table of contents',
  index: 'Fld index',
  access: 'ACCESS',
  plans: 'PLANS',
  catalog: 'Open tool catalog',
};

export default function ProToolsShell({ sections, children, copy = DEFAULT_COPY, toolsHref = '/tools-individual' }: ProToolsShellProps) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? '');

  useEffect(() => {
    const ids = [...sections.map((s) => s.id), ACCESS_ID];
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-28% 0px -58% 0px', threshold: [0, 0.15, 0.4, 0.65] }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  return (
    <>
      <nav className="ptv2-jump" aria-label={copy.ariaJump}>
        {sections.map((s) => (
          <a key={s.id} href={`#${s.id}`} className={activeId === s.id ? 'is-active' : ''}>
            {s.num} {s.tag}
          </a>
        ))}
        <a href={`#${ACCESS_ID}`} className={activeId === ACCESS_ID ? 'is-active' : ''}>
          {copy.access}
        </a>
      </nav>

      <div className="ptv2-shell">
        <aside className="ptv2-rail" aria-label={copy.ariaToc}>
          <div className="ptv2-rail-panel">
            <p className="ptv2-rail-kicker">{copy.index}</p>
            <ul className="ptv2-rail-list">
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className={`ptv2-rail-link${activeId === s.id ? ' is-active' : ''}`}
                    aria-current={activeId === s.id ? 'true' : undefined}
                  >
                    <span className="ptv2-rail-num">{s.num}</span>
                    <span>
                      <span className="ptv2-rail-label">{s.label}</span>
                      <span className="ptv2-rail-tag">{s.tag}</span>
                    </span>
                  </a>
                </li>
              ))}
              <li>
                <a
                  href={`#${ACCESS_ID}`}
                  className={`ptv2-rail-link${activeId === ACCESS_ID ? ' is-active' : ''}`}
                  aria-current={activeId === ACCESS_ID ? 'true' : undefined}
                >
                  <span className="ptv2-rail-num">+</span>
                  <span>
                    <span className="ptv2-rail-label">{copy.access}</span>
                    <span className="ptv2-rail-tag">{copy.plans}</span>
                  </span>
                </a>
              </li>
            </ul>
            <Link href={toolsHref} className="ptv2-rail-cta">
              {copy.catalog}
            </Link>
          </div>
        </aside>

        <div className="ptv2-stream">{children}</div>
      </div>
    </>
  );
}
