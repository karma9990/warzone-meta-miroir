'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

const GlassScene = dynamic(() => import('./GlassScene'), { ssr: false });

export default function ClientGlassScene({ backgroundSrc }: { backgroundSrc: string }) {
  const pathname = usePathname();

  if (pathname?.startsWith('/pro-tools') || pathname?.startsWith('/community')) {
    return null;
  }

  return <GlassScene backgroundSrc={backgroundSrc} />;
}
