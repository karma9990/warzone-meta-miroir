'use client';

import { useState } from 'react';
import type { CompanionDevice } from '@/lib/companionDeviceStore';

function formatDate(value: string) {
  if (!value) return 'Jamais';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function CompanionDeviceList({ initialDevices }: { initialDevices: CompanionDevice[] }) {
  const [devices, setDevices] = useState(initialDevices);

  async function revoke(deviceId: string) {
    const response = await fetch('/api/companion/device/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId }),
    });
    if (response.ok) {
      setDevices((current) => current.map((device) => device.deviceId === deviceId ? { ...device, revoked: true } : device));
    }
  }

  return (
    <div className="account-companion-devices">
      {devices.length === 0 ? (
        <p>Aucun appareil compagnon connecte.</p>
      ) : devices.map((device) => (
        <article key={device.deviceId} className={device.revoked ? 'is-revoked' : ''}>
          <div>
            <strong>{device.deviceName}</strong>
            <small>
              {device.revoked ? 'Revoque' : `Derniere activite : ${formatDate(device.lastSeenAt)}`}
            </small>
          </div>
          <button type="button" onClick={() => revoke(device.deviceId)} disabled={device.revoked}>
            {device.revoked ? 'Revoque' : 'Revoquer'}
          </button>
        </article>
      ))}
    </div>
  );
}
