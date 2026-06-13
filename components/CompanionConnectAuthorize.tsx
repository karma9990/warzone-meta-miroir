'use client';

import { useState } from 'react';

export default function CompanionConnectAuthorize({ code, deviceName }: { code: string; deviceName: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function authorize() {
    setStatus('loading');
    setMessage('');
    const response = await fetch('/api/companion/device/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus('error');
      setMessage(data.error || 'Autorisation impossible.');
      return;
    }
    setStatus('done');
    setMessage('Appareil connecte. Tu peux retourner sur WZPRO Companion.');
  }

  return (
    <div className="companion-connect-card">
      <span>WZPRO COMPANION</span>
      <h1>Autoriser cet appareil ?</h1>
      <p>
        L app compagnon demande a connecter <strong>{deviceName}</strong> a ton compte WZPRO.
      </p>
      <code>{code}</code>
      <button type="button" onClick={authorize} disabled={status === 'loading' || status === 'done'}>
        {status === 'done' ? 'Autorise' : status === 'loading' ? 'Autorisation...' : 'Autoriser'}
      </button>
      {message && <small className={status === 'error' ? 'is-error' : ''}>{message}</small>}
    </div>
  );
}
