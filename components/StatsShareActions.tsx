'use client';

import { useState } from 'react';

export default function StatsShareActions({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function shareStats() {
    if (navigator.share) {
      await navigator.share({
        title: 'WZPRO Meta stats tracker',
        text: 'Check my Warzone stats tracker.',
        url,
      }).catch(() => undefined);
      return;
    }

    await copyLink();
  }

  async function copyLink() {
    await navigator.clipboard.writeText(url).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="stats-share-actions">
      <button type="button" onClick={shareStats}>Share stats</button>
      <button type="button" onClick={copyLink}>{copied ? 'Copied' : 'Copy link'}</button>
    </div>
  );
}
