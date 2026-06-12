'use client';

import { useState } from 'react';
import LocalizedLink from '@/components/LocalizedLink';

type Mode = 'signup' | 'signin';

const copy = {
  en: {
    emailLabel: 'Your email *',
    emailPlaceholder: 'Enter your email',
    usernameLabel: 'Your username *',
    usernamePlaceholder: 'Enter your username',
    displayNameLabel: 'Your display name *',
    displayNamePlaceholder: 'Enter your display name',
    passwordLabel: 'Your password *',
    passwordPlaceholder: 'Enter your password',
    confirmLabel: 'Confirm your password *',
    confirmPlaceholder: 'Confirm your password',
    sending: 'Sending...',
    signUpBtn: 'Sign up with email',
    signInBtn: 'Sign in with email',
    forgot: 'Forgot password?',
    haveAccount: 'You already have an account?',
    noAccount: 'No account yet?',
    signIn: 'Sign in',
    signUp: 'Sign up',
    passwordsMismatch: 'Passwords do not match.',
    creationFailed: 'Account creation failed.',
    created: 'Account created. Check your inbox to verify your email.',
    authFailed: 'Authentication failed.',
  },
  fr: {
    emailLabel: 'Votre email *',
    emailPlaceholder: 'Entrez votre email',
    usernameLabel: 'Votre pseudo *',
    usernamePlaceholder: 'Entrez votre pseudo',
    displayNameLabel: 'Votre nom affiche *',
    displayNamePlaceholder: 'Entrez votre nom affiche',
    passwordLabel: 'Votre mot de passe *',
    passwordPlaceholder: 'Entrez votre mot de passe',
    confirmLabel: 'Confirmez votre mot de passe *',
    confirmPlaceholder: 'Confirmez votre mot de passe',
    sending: 'Envoi...',
    signUpBtn: 'S inscrire avec email',
    signInBtn: 'Se connecter avec email',
    forgot: 'Mot de passe oublie ?',
    haveAccount: 'Vous avez deja un compte ?',
    noAccount: 'Pas encore de compte ?',
    signIn: 'Se connecter',
    signUp: 'S inscrire',
    passwordsMismatch: 'Les mots de passe ne correspondent pas.',
    creationFailed: 'Echec de creation du compte.',
    created: 'Compte cree. Verifiez votre boite mail pour confirmer votre email.',
    authFailed: 'Echec d authentification.',
  },
  es: {
    emailLabel: 'Tu email *',
    emailPlaceholder: 'Introduce tu email',
    usernameLabel: 'Tu nombre de usuario *',
    usernamePlaceholder: 'Introduce tu nombre de usuario',
    displayNameLabel: 'Tu nombre publico *',
    displayNamePlaceholder: 'Introduce tu nombre publico',
    passwordLabel: 'Tu contrasena *',
    passwordPlaceholder: 'Introduce tu contrasena',
    confirmLabel: 'Confirma tu contrasena *',
    confirmPlaceholder: 'Confirma tu contrasena',
    sending: 'Enviando...',
    signUpBtn: 'Registrarse con email',
    signInBtn: 'Iniciar sesion con email',
    forgot: '¿Olvidaste tu contrasena?',
    haveAccount: '¿Ya tienes una cuenta?',
    noAccount: '¿No tienes cuenta?',
    signIn: 'Iniciar sesion',
    signUp: 'Registrarse',
    passwordsMismatch: 'Las contrasenas no coinciden.',
    creationFailed: 'Error al crear la cuenta.',
    created: 'Cuenta creada. Revisa tu bandeja de entrada para verificar tu email.',
    authFailed: 'Error de autenticacion.',
  },
};

export default function EmailSignInForm({
  initialMode = 'signup',
  allowSwitch = true,
  redirectTo = '/',
  locale = 'en',
}: {
  initialMode?: Mode;
  allowSwitch?: boolean;
  redirectTo?: string;
  locale?: string;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const t = (copy as Record<string, typeof copy.en>)[locale] || copy.en;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('sending');
    setMessage('');

    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanDisplayName = displayName.trim();

      if (mode === 'signup') {
        if (password !== confirmPassword) {
          setStatus('error');
          setMessage(t.passwordsMismatch);
          return;
        }

        const res = await fetch('/api/email-auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            username,
            displayName: cleanDisplayName,
            password,
            confirmPassword,
          }),
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(typeof data.error === 'string' ? data.error : t.creationFailed);
        }

        setStatus('sent');
        setMessage(t.created);
        return;
      }

      const res = await fetch('/api/email-auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : t.authFailed);
      }

      const separator = redirectTo.includes('?') ? '&' : '?';
      window.location.href = `${redirectTo}${separator}signed_in=1`;
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : t.authFailed);
    }
  }

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setStatus('idle');
    setMessage('');
  }

  return (
    <form className="email-auth-form" onSubmit={submit}>
      <label htmlFor="email-auth">{t.emailLabel}</label>
      <input
        id="email-auth"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder={t.emailPlaceholder}
        required
      />

      {mode === 'signup' && (
        <>
          <label htmlFor="username-auth">{t.usernameLabel}</label>
          <input
            id="username-auth"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder={t.usernamePlaceholder}
            autoComplete="username"
            required
          />

          <label htmlFor="display-auth">{t.displayNameLabel}</label>
          <input
            id="display-auth"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder={t.displayNamePlaceholder}
            required
          />
        </>
      )}

      <label htmlFor="password-auth">{t.passwordLabel}</label>
      <input
        id="password-auth"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder={t.passwordPlaceholder}
        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
        required
      />

      {mode === 'signup' && (
        <>
          <label htmlFor="confirm-password-auth">{t.confirmLabel}</label>
          <input
            id="confirm-password-auth"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder={t.confirmPlaceholder}
            autoComplete="new-password"
            required
          />
        </>
      )}

      <button type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? t.sending : mode === 'signup' ? t.signUpBtn : t.signInBtn}
      </button>

      {mode === 'signin' && (
        <LocalizedLink className="email-auth-forgot" href="/forgot-password">
          {t.forgot}
        </LocalizedLink>
      )}

      {allowSwitch && (
        <p className="email-auth-switch">
          {mode === 'signup' ? t.haveAccount : t.noAccount}
          {' '}
          <button type="button" onClick={() => switchMode(mode === 'signup' ? 'signin' : 'signup')}>
            {mode === 'signup' ? t.signIn : t.signUp}
          </button>
        </p>
      )}

      {message && <p className={status === 'error' ? 'email-auth-error' : 'email-auth-success'}>{message}</p>}
    </form>
  );
}
