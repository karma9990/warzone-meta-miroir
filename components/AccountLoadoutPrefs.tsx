'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Loadout } from '@/lib/data';

export default function AccountLoadoutPrefs({
  loadouts,
  initialFavorites,
  initialNotes,
}: {
  loadouts: Loadout[];
  initialFavorites: string[];
  initialNotes: Record<string, string>;
}) {
  const [favorites, setFavorites] = useState(initialFavorites);
  const [notes, setNotes] = useState(initialNotes);
  const [status, setStatus] = useState('');

  const favoriteLoadouts = useMemo(() => (
    loadouts.filter((loadout) => favorites.includes(loadout.id))
  ), [favorites, loadouts]);

  async function save(nextFavorites: string[], nextNotes: Record<string, string>) {
    setStatus('Saving...');
    const res = await fetch('/api/account/loadout-prefs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ favoriteLoadouts: nextFavorites, loadoutNotes: nextNotes }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error || 'Unable to save.');
      return;
    }
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

  return (
    <div className="account-loadout-prefs">
      <div className="account-favorites">
        {favoriteLoadouts.length > 0 ? favoriteLoadouts.map((loadout) => (
          <Link key={loadout.id} href={`/loadouts/${loadout.id}`}>
            <span>{loadout.tier}</span>
            <strong>{loadout.weapon}</strong>
          </Link>
        )) : <p>No favorite loadout yet.</p>}
      </div>

      <div className="account-loadout-pref-list">
        {loadouts.slice(0, 18).map((loadout) => (
          <article key={loadout.id}>
            <div>
              <button type="button" onClick={() => toggleFavorite(loadout.id)}>
                {favorites.includes(loadout.id) ? 'Favorited' : 'Favorite'}
              </button>
              <Link href={`/loadouts/${loadout.id}`}>{loadout.weapon}</Link>
              <small>{loadout.category} / Tier {loadout.tier}</small>
            </div>
            <textarea
              maxLength={1200}
              onBlur={() => saveNote(loadout.id)}
              onChange={(event) => updateNote(loadout.id, event.target.value)}
              placeholder="Private note for this loadout..."
              value={notes[loadout.id] || ''}
            />
          </article>
        ))}
      </div>
      {status && <p className="account-loadout-status">{status}</p>}
    </div>
  );
}
