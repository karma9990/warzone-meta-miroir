'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'wzpro-theme';

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';

  try {
    const savedTheme = window.localStorage.getItem(STORAGE_KEY);
    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
  } catch {
    return 'light';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const isDark = theme === 'dark';

  function toggleTheme() {
    const nextTheme: Theme = isDark ? 'light' : 'dark';
    setTheme(nextTheme);
    applyTheme(nextTheme);

    try {
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch {
      // Theme still changes for the current page view.
    }
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={isDark ? 'Activer le mode clair' : 'Activer le mode sombre'}
      aria-pressed={isDark}
      suppressHydrationWarning
      title={isDark ? 'Mode clair' : 'Mode sombre'}
      onClick={toggleTheme}
    >
      <span className="theme-toggle-sun" aria-hidden="true" />
      <span className="theme-toggle-moon" aria-hidden="true" />
    </button>
  );
}
