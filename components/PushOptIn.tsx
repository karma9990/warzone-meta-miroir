'use client';

import { useEffect, useState } from 'react';
import type { Locale } from '@/lib/i18n';

type Props = { locale: Locale };
type State = 'checking' | 'unsupported' | 'disabled' | 'ready' | 'subscribing' | 'subscribed' | 'denied' | 'error';

const COPY = {
  en: { title: 'Meta push alerts', hint: 'Get a browser notification when a weapon is buffed or nerfed.', enable: 'Enable notifications', subscribed: '✓ Notifications enabled', denied: 'Notifications are blocked in your browser.', unsupported: 'Your browser does not support push notifications.', error: 'Something went wrong. Try again.' },
  fr: { title: 'Alertes push meta', hint: 'Recois une notification navigateur quand une arme est buff ou nerf.', enable: 'Activer les notifications', subscribed: '✓ Notifications activees', denied: 'Les notifications sont bloquees dans ton navigateur.', unsupported: 'Ton navigateur ne supporte pas les notifications push.', error: 'Une erreur est survenue. Reessaie.' },
  es: { title: 'Alertas push meta', hint: 'Recibe una notificacion del navegador cuando un arma sube o baja.', enable: 'Activar notificaciones', subscribed: '✓ Notificaciones activadas', denied: 'Las notificaciones estan bloqueadas en tu navegador.', unsupported: 'Tu navegador no soporta notificaciones push.', error: 'Algo salio mal. Intenta de nuevo.' },
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export default function PushOptIn({ locale }: Props) {
  const lang = locale === 'fr' ? 'fr' : locale === 'es' ? 'es' : 'en';
  const t = COPY[lang];
  const [state, setState] = useState<State>('checking');
  const [publicKey, setPublicKey] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
      if (!supported) { if (!cancelled) setState('unsupported'); return; }
      try {
        const res = await fetch('/api/push/subscribe');
        const data = await res.json();
        if (cancelled) return;
        if (!data.enabled || !data.publicKey) { setState('disabled'); return; }
        setPublicKey(data.publicKey);

        const registration = await navigator.serviceWorker.getRegistration();
        const existing = await registration?.pushManager.getSubscription();
        if (Notification.permission === 'denied') setState('denied');
        else if (existing) setState('subscribed');
        else setState('ready');
      } catch {
        if (!cancelled) setState('error');
      }
    })();

    return () => { cancelled = true; };
  }, []);

  async function enable() {
    setState('subscribing');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setState('denied'); return; }

      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });
      setState(res.ok ? 'subscribed' : 'error');
    } catch {
      setState('error');
    }
  }

  if (state === 'checking' || state === 'disabled') return null;

  return (
    <div className="push-box">
      <span className="push-title">{t.title}</span>
      <p className="push-hint">{t.hint}</p>
      {state === 'subscribed' ? (
        <p className="push-done">{t.subscribed}</p>
      ) : state === 'unsupported' ? (
        <p className="push-note">{t.unsupported}</p>
      ) : state === 'denied' ? (
        <p className="push-note">{t.denied}</p>
      ) : (
        <button type="button" className="push-btn" onClick={enable} disabled={state === 'subscribing'}>
          {t.enable}
        </button>
      )}
      {state === 'error' && <p className="push-note">{t.error}</p>}

      <style>{`
        .push-box { border: 1px solid rgba(22,60,255,0.28); background: var(--theme-panel, rgba(239,238,232,0.82)); padding: 1.1rem 1.2rem; margin: 1.5rem 0; }
        .push-title { display: block; color: #163cff; font-size: 0.72rem; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; }
        .push-hint { margin: 0.4rem 0 0.8rem; font-size: 0.8rem; color: rgba(16,16,14,0.6); line-height: 1.5; }
        .push-btn { border: 1px solid #163cff; background: #163cff; color: #fff; cursor: pointer; font: inherit; font-size: 0.72rem; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; padding: 0.6rem 1.1rem; }
        .push-btn:disabled { opacity: 0.6; cursor: default; }
        .push-done { margin: 0; color: #1f8f4d; font-size: 0.82rem; font-weight: 800; }
        .push-note { margin: 0.6rem 0 0; font-size: 0.76rem; color: rgba(16,16,14,0.55); }
        :global(:root[data-theme="dark"]) .push-hint, :global(:root[data-theme="dark"]) .push-note { color: rgba(255,255,255,0.6); }
      `}</style>
    </div>
  );
}
