'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type User = {
  name: string;
  provider: 'google' | 'battlenet' | 'apple' | 'email';
};

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    fetch('/api/session')
      .then((res) => res.json())
      .then((data) => {
        if (alive) setUser(data.user);
      })
      .catch(() => {
        if (alive) setUser(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  async function signOut() {
    await fetch('/api/session', { method: 'DELETE' });
    setUser(null);
  }

  if (loading) {
    return <span className="auth-chip is-loading">Account</span>;
  }

  if (!user) {
    return (
      <div className="auth-chip-group">
        <Link className="auth-chip" href="/sign-in">
          Sign in
        </Link>
        <Link className="auth-chip is-primary" href="/sign-up">
          Sign up
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-chip-group is-session">
      <Link className="auth-chip is-user" href="/account" title="Open account">
        <span>{user.name}</span>
        <small>{user.provider === 'google' ? 'Google' : user.provider === 'battlenet' ? 'Battle.net' : user.provider === 'apple' ? 'Apple' : 'Email'}</small>
      </Link>
      <button className="auth-chip" type="button" onClick={signOut} title="Sign out">
        Exit
      </button>
    </div>
  );
}
