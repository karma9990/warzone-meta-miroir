'use client';

import { useRouter } from 'next/navigation';

export default function AccountActions() {
  const router = useRouter();

  async function signOut() {
    await fetch('/api/session', { method: 'DELETE' });
    router.push('/sign-in');
    router.refresh();
  }

  return (
    <button className="account-action account-action--ghost" type="button" onClick={signOut}>
      Sign out
    </button>
  );
}
