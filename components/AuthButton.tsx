'use client';

import { useState } from 'react';
import LocalizedLink from '@/components/LocalizedLink';

type User = {
  name: string;
  provider: 'google' | 'battlenet' | 'apple' | 'email';
};

export default function AuthButton({ initialUser = null }: { initialUser?: User | null }) {
  const [user, setUser] = useState<User | null>(initialUser);

  async function signOut() {
    await fetch('/api/session', { method: 'DELETE' });
    setUser(null);
  }

  if (!user) {
    return (
      <div className="auth-chip-group">
        <LocalizedLink className="auth-chip" href="/sign-in">
          Sign in
        </LocalizedLink>
        <LocalizedLink className="auth-chip is-primary" href="/sign-up">
          Sign up
        </LocalizedLink>
      </div>
    );
  }

  return (
    <div className="auth-chip-group is-session">
      <LocalizedLink className="auth-chip is-user" href="/account" title="Open account">
        <span>{user.name}</span>
        <small>{user.provider === 'google' ? 'Google' : user.provider === 'battlenet' ? 'Battle.net' : user.provider === 'apple' ? 'Apple' : 'Email'}</small>
      </LocalizedLink>
      <button className="auth-chip" type="button" onClick={signOut} title="Sign out">
        Exit
      </button>
    </div>
  );
}
