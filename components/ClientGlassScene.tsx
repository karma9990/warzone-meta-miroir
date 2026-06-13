'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { stripLocale } from '@/lib/i18n';

const GlassScene = dynamic(() => import('./GlassScene'), { ssr: false });
const HEAVY_SCENE_EXCLUDED_PATHS = [
  '/account',
  '/ai-classes',
  '/community',
  '/forgot-password',
  '/messages',
  '/payment-success',
  '/pro-access',
  '/pro-tools',
  '/reset-password',
  '/sign-in',
  '/sign-up',
  '/subscribe',
  '/tools-individual',
];

export default function ClientGlassScene({ backgroundSrc }: { backgroundSrc: string }) {
  const pathname = usePathname();
  const activePathname = stripLocale(pathname ?? '/').pathname;

  if (HEAVY_SCENE_EXCLUDED_PATHS.some((path) => activePathname === path || activePathname.startsWith(`${path}/`))) {
    return null;
  }

  return <GlassScene backgroundSrc={backgroundSrc} />;
}
