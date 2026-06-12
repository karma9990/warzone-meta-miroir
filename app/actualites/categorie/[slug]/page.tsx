import { notFound, redirect } from 'next/navigation';
import { withLocalePath } from '@/lib/i18n';
import { getRequestLocale } from '@/lib/requestLocale';
import { NEWS_CATEGORIES } from '../../NewsCategoryPage';

export default async function LegacyNewsCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const [locale, { slug }] = await Promise.all([getRequestLocale(), params]);
  if (!NEWS_CATEGORIES.some((entry) => entry.slug === slug)) notFound();
  redirect(withLocalePath(`/actualites/${slug}`, locale));
}
