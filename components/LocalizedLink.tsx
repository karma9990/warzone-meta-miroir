'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';
import { withLocalePath } from '@/lib/i18n';
import { useCurrentLocale } from '@/lib/useCurrentLocale';

type LocalizedLinkProps = Omit<ComponentProps<typeof Link>, 'href'> & {
  href: string;
};

export default function LocalizedLink({ href, ...props }: LocalizedLinkProps) {
  const locale = useCurrentLocale();

  return <Link href={withLocalePath(href, locale)} {...props} />;
}
