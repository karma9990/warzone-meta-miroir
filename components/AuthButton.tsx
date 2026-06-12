'use client';

import { useState } from 'react';
import LocalizedLink from '@/components/LocalizedLink';
import { useCurrentLocale } from '@/lib/useCurrentLocale';

type User = {
  name: string;
  provider: 'google' | 'battlenet' | 'apple' | 'email';
};

export default function AuthButton({ initialUser = null }: { initialUser?: User | null }) {
  const [user, setUser] = useState<User | null>(initialUser);
  const locale = useCurrentLocale();
  const copy = locale === 'fr'
    ? { signIn: 'Connexion', signUp: 'Inscription', account: 'Ouvrir le compte', signOut: 'Deconnexion', exit: 'Sortir' }
    : locale === 'es'
      ? { signIn: 'Iniciar sesion', signUp: 'Crear cuenta', account: 'Abrir cuenta', signOut: 'Cerrar sesion', exit: 'Salir' }
      : { signIn: 'Sign in', signUp: 'Sign up', account: 'Open account', signOut: 'Sign out', exit: 'Exit' };

  async function signOut() {
    await fetch('/api/session', { method: 'DELETE' });
    setUser(null);
  }

  if (!user) {
    const signInUrl = `/${locale || 'fr'}/sign-in`;
    const signUpUrl = `/${locale || 'fr'}/sign-up`;

    return (
      <div className="auth-chip-group">
        <button className="auth-chip" type="button" onClick={() => { window.location.href = signInUrl; }}>
          {copy.signIn}
        </button>
        <button className="auth-chip is-primary" type="button" onClick={() => { window.location.href = signUpUrl; }}>
          {copy.signUp}
        </button>
      </div>
    );
  }

  return (
    <div className="auth-chip-group is-session">
      <LocalizedLink className="auth-chip is-user" href="/account" title={copy.account}>
        <span>{user.name}</span>
        <small>{user.provider === 'google' ? 'Google' : user.provider === 'battlenet' ? 'Battle.net' : user.provider === 'apple' ? 'Apple' : 'Email'}</small>
      </LocalizedLink>
      <button className="auth-chip" type="button" onClick={signOut} title={copy.signOut}>
        {copy.exit}
      </button>
    </div>
  );
}
