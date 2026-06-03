'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ProfileShareActions({
  pseudo,
  url,
  canMessage,
}: {
  pseudo: string;
  url: string;
  canMessage: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [reported, setReported] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(url).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function shareProfile() {
    if (navigator.share) {
      await navigator.share({
        title: `${pseudo} on WZPRO Meta`,
        text: `Check ${pseudo}'s Warzone profile.`,
        url,
      }).catch(() => undefined);
      return;
    }

    await copyLink();
  }

  return (
    <div className="public-profile-actions" aria-label="Profile actions">
      <button type="button" onClick={shareProfile}>Share</button>
      <button type="button" onClick={copyLink}>{copied ? 'Copied' : 'Copy link'}</button>
      {canMessage && <Link href={`/messages/${encodeURIComponent(pseudo)}`}>DM</Link>}
      <Link href={`/community?player=${encodeURIComponent(pseudo)}`}>Invite / LFG</Link>
      <button
        type="button"
        className="is-muted"
        onClick={() => {
          setReported(true);
          window.setTimeout(() => setReported(false), 1800);
        }}
      >
        {reported ? 'Queued' : 'Report'}
      </button>
    </div>
  );
}
