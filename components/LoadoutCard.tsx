'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import StatBar from './StatBar';
import type { Loadout } from '@/lib/data';
import { getLoadoutSlug } from '@/lib/loadoutUtils';

const IMAGE_SOURCES = [
  (slug: string) => `/assets/weapons/wzstats/${slug}.avif`,
  (slug: string) => `/assets/weapons/${slug}.avif`,
  (slug: string) => `/assets/weapons/${slug}.webp`,
  (slug: string) => `/assets/weapons/${slug}.png`,
];

interface LoadoutCardProps {
  loadout: Loadout;
  metaScore: number;
  confidence?: string;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export default function LoadoutCard({ loadout, metaScore, confidence = 'Meta watch', isFavorite = false, onToggleFavorite }: LoadoutCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const slug = getLoadoutSlug(loadout);
  const imageSrc = IMAGE_SOURCES[imageIndex](slug);
  const topStats = useMemo(() => {
    return [
      ['Damage', loadout.stats.damage],
      ['Range', loadout.stats.range],
      ['Mobility', loadout.stats.mobility],
      ['Control', loadout.stats.control],
    ];
  }, [loadout.stats]);

  async function copyLoadout() {
    const shareText = [
      `${loadout.weapon} (${loadout.category} / ${loadout.playstyle})`,
      `Tier ${loadout.tier} - Meta score ${metaScore}`,
      ...loadout.attachments.map((attachment) => `${attachment.slot}: ${attachment.name}`),
      loadout.notes ? `Note: ${loadout.notes}` : '',
    ].filter(Boolean).join('\n');

    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <article className="loadout-card" id={`loadout-${loadout.id}`}>
      <button className="loadout-summary" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
        <span className="tier-chip">{loadout.tier}</span>
        <span className="weapon-art">
          <Image
            src={imageSrc}
            alt=""
            width={160}
            height={80}
            unoptimized
            onError={() => setImageIndex((current) => current < IMAGE_SOURCES.length - 1 ? current + 1 : current)}
          />
        </span>
        <span className="loadout-title">
          <strong>{loadout.weapon}</strong>
          <small>{loadout.category} / {loadout.playstyle}</small>
        </span>
        <span className="loadout-score">
          <strong>{metaScore}</strong>
          <small>Meta</small>
        </span>
      </button>
      <div className="loadout-card-tools">
        <span>{confidence}</span>
        {onToggleFavorite && (
          <button type="button" onClick={onToggleFavorite} aria-pressed={isFavorite}>
            {isFavorite ? 'Saved' : 'Save'}
          </button>
        )}
      </div>

      <div className="quick-stats">
        {topStats.map(([label, value]) => (
          <span key={label}>
            <small>{label}</small>
            <strong>{value}</strong>
          </span>
        ))}
      </div>

      {expanded && (
        <div className="loadout-details">
          <div className="attachment-panel">
            <div className="mini-heading">Attachments</div>
            <div className="attachment-list">
              {loadout.attachments.map((attachment) => (
                <div key={`${attachment.slot}-${attachment.name}`}>
                  <span>{attachment.slot}</span>
                  <strong>{attachment.name}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="stat-panel">
            <div className="mini-heading">Performance</div>
            <StatBar label="Damage" value={loadout.stats.damage} />
            <StatBar label="Range" value={loadout.stats.range} />
            <StatBar label="Mobility" value={loadout.stats.mobility} />
            <StatBar label="Control" value={loadout.stats.control} />
          </div>

          {loadout.advanced && (
            <div className="advanced-panel">
              <div className="mini-heading">Advanced data</div>
              <span><small>TTK close</small><strong>{loadout.advanced.ttkClose ? `${loadout.advanced.ttkClose} ms` : 'N/A'}</strong></span>
              <span><small>ADS</small><strong>{loadout.advanced.ads ? `${loadout.advanced.ads} ms` : 'N/A'}</strong></span>
              <span><small>Velocity</small><strong>{loadout.advanced.bulletVelocity ? `${loadout.advanced.bulletVelocity} m/s` : 'N/A'}</strong></span>
              <span><small>Reload</small><strong>{loadout.advanced.reload ? `${loadout.advanced.reload} ms` : 'N/A'}</strong></span>
            </div>
          )}

          {(loadout.strengths?.length || loadout.weaknesses?.length) && (
            <div className="loadout-pros-cons">
              {loadout.strengths?.length ? (
                <div>
                  <div className="mini-heading">Strengths</div>
                  {loadout.strengths.slice(0, 3).map((item) => <span key={item}>{item}</span>)}
                </div>
              ) : null}
              {loadout.weaknesses?.length ? (
                <div>
                  <div className="mini-heading">Weaknesses</div>
                  {loadout.weaknesses.slice(0, 3).map((item) => <span key={item}>{item}</span>)}
                </div>
              ) : null}
            </div>
          )}

          {loadout.notes && <p className="loadout-note">{loadout.notes}</p>}
          <div className="loadout-actions">
            <Link className="loadout-detail-link" href={`/loadouts/${loadout.id}`}>
              Open build
            </Link>
            <button type="button" onClick={copyLoadout}>{copied ? 'Copied' : 'Copy'}</button>
          </div>
          <small className="updated-at">Updated {loadout.updatedAt}</small>
        </div>
      )}
    </article>
  );
}
