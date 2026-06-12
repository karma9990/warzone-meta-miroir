'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Loadout } from '@/lib/data';
import { getLoadoutPath } from '@/lib/seo';

export default function AccountLoadoutPrefs({
  loadouts,
  initialFeaturedLoadoutId,
  initialFavorites,
  initialNotes,
}: {
  loadouts: Loadout[];
  initialFeaturedLoadoutId: string;
  initialFavorites: string[];
  initialNotes: Record<string, string>;
}) {
  const [favorites, setFavorites] = useState(initialFavorites);
  const [featuredLoadoutId, setFeaturedLoadoutId] = useState(initialFeaturedLoadoutId);
  const [notes, setNotes] = useState(initialNotes);
  const [status, setStatus] = useState('');
  const [selectedLoadoutId, setSelectedLoadoutId] = useState(() => initialFavorites[0] || loadouts[0]?.id || '');

  const favoriteLoadouts = useMemo(() => (
    loadouts.filter((loadout) => favorites.includes(loadout.id))
  ), [favorites, loadouts]);
  const selectedLoadout = useMemo(() => (
    loadouts.find((loadout) => loadout.id === selectedLoadoutId) || loadouts[0] || null
  ), [loadouts, selectedLoadoutId]);
  const otherLoadouts = useMemo(() => (
    loadouts.filter((loadout) => loadout.id !== selectedLoadout?.id).slice(0, 24)
  ), [loadouts, selectedLoadout]);

  async function save(nextFavorites: string[], nextNotes: Record<string, string>, nextFeaturedLoadoutId = featuredLoadoutId) {
    setStatus('Saving...');
    const res = await fetch('/api/account/loadout-prefs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        featuredLoadoutId: nextFeaturedLoadoutId,
        favoriteLoadouts: nextFavorites,
        loadoutNotes: nextNotes,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error || 'Unable to save.');
      return;
    }
    setFeaturedLoadoutId(data.featuredLoadoutId || '');
    setFavorites(data.favoriteLoadouts);
    setNotes(data.loadoutNotes);
    setStatus('Saved.');
  }

  function toggleFavorite(loadoutId: string) {
    const next = favorites.includes(loadoutId)
      ? favorites.filter((id) => id !== loadoutId)
      : [loadoutId, ...favorites];
    setFavorites(next);
    void save(next, notes);
  }

  function updateNote(loadoutId: string, value: string) {
    setNotes((current) => ({ ...current, [loadoutId]: value }));
  }

  function saveNote(loadoutId: string) {
    const next = { ...notes };
    if (!next[loadoutId]?.trim()) delete next[loadoutId];
    void save(favorites, next);
  }

  function setMainLoadout(loadoutId: string) {
    setFeaturedLoadoutId(loadoutId);
    void save(favorites, notes, loadoutId);
  }

  if (!selectedLoadout) {
    return (
      <div className="account-loadout-prefs">
        <p className="account-loadout-status">No loadouts available yet.</p>
      </div>
    );
  }

  return (
    <div className="account-loadout-prefs">
      <div className="account-favorites">
        {favoriteLoadouts.length > 0 ? favoriteLoadouts.map((loadout) => (
          <Link key={loadout.id} href={getLoadoutPath(loadout)}>
            <span>{loadout.tier}</span>
            <strong>{loadout.weapon}</strong>
          </Link>
        )) : <p>No favorite loadout yet.</p>}
      </div>

      <article className="account-loadout-featured">
        <div className="account-loadout-featured-head">
          <div>
            <span>Featured weapon</span>
            <Link href={getLoadoutPath(selectedLoadout)}>{selectedLoadout.weapon}</Link>
            <small>{selectedLoadout.category} / Tier {selectedLoadout.tier}</small>
          </div>
          <button type="button" onClick={() => toggleFavorite(selectedLoadout.id)}>
            {favorites.includes(selectedLoadout.id) ? 'Favorited' : 'Favorite'}
          </button>
          <button type="button" onClick={() => setMainLoadout(selectedLoadout.id)}>
            {featuredLoadoutId === selectedLoadout.id ? 'Main loadout' : 'Set main'}
          </button>
        </div>
        <textarea aria-label="Textarea"
          maxLength={1200}
          onBlur={() => saveNote(selectedLoadout.id)}
          onChange={(event) => updateNote(selectedLoadout.id, event.target.value)}
          placeholder="Private note for this loadout..."
          value={notes[selectedLoadout.id] || ''}
        />
      </article>

      <details className="account-loadout-picker">
        <summary>Choose another weapon</summary>
        <div>
          {otherLoadouts.map((loadout) => (
            <button key={loadout.id} type="button" onClick={() => setSelectedLoadoutId(loadout.id)}>
              <strong>{loadout.weapon}</strong>
              <small>{loadout.category} / Tier {loadout.tier}</small>
            </button>
          ))}
        </div>
      </details>
      {status && <p className="account-loadout-status">{status}</p>}
    </div>
  );
}
