'use client';

import { useRouter } from 'next/navigation';
import { withLocalePath } from '@/lib/i18n';
import { useCurrentLocale } from '@/lib/useCurrentLocale';

export default function AccountActions() {
  const router = useRouter();
  const locale = useCurrentLocale();

  async function signOut() {
    await fetch('/api/session', { method: 'DELETE' });
    router.push(withLocalePath('/sign-in', locale));
    router.refresh();
  }

  return (
    <button className="account-action account-action--ghost" type="button" onClick={signOut}>
      {locale === 'fr' ? 'Se deconnecter' : 'Sign out'}
    </button>
  );
}
