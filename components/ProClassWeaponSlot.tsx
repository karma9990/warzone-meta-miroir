'use client';

import { useState } from 'react';
import Image from 'next/image';

interface ProWeapon {
  name: string;
  image: string;
  attachments: string;
}

export default function ProClassWeaponSlot({ weapon, index }: { weapon: ProWeapon; index: number }) {
  const [open, setOpen] = useState(false);
  const hasContent = weapon?.name || weapon?.image;

  return (
    <div
      className={`pro-class-card-slot pro-class-card-weapon${open ? ' is-open' : ''}`}
      onClick={() => hasContent && setOpen(!open)}
      role={hasContent ? 'button' : undefined}
      tabIndex={hasContent ? 0 : undefined}
      onKeyDown={(e) => { if (hasContent && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setOpen(!open); } }}
    >
      {weapon?.image ? (
        <Image src={weapon.image} alt={weapon.name || ''} width={160} height={80} sizes="160px" />
      ) : (
        <span>{`ARME ${index}`}</span>
      )}
      {weapon?.name && <span className="pro-class-card-weapon-name">{weapon.name}</span>}
      {hasContent && (
        <span className="pro-class-card-toggle">{open ? '▼' : '▶'}</span>
      )}
      {open && weapon?.attachments && (
        <div className="pro-class-card-attachments">
          <span>{weapon.attachments}</span>
        </div>
      )}
    </div>
  );
}
