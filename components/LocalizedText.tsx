'use client';

import type { Locale } from '@/lib/i18n';
import { useCurrentLocale } from '@/lib/useCurrentLocale';

type LocalizedTextProps = {
  values: Partial<Record<Locale, string>> & { en: string };
};

export default function LocalizedText({ values }: LocalizedTextProps) {
  const locale = useCurrentLocale();

  return <>{values[locale] ?? values.en}</>;
}
