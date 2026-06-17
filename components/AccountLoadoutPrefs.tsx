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
  locale = 'en',
}: {
  loadouts: Loadout[];
  initialFeaturedLoadoutId: string;
  initialFavorites: string[];
  initialNotes: Record<string, string>;
  locale?: string;
}) {
  const copy = locale === 'fr'
    ? {
        saving: 'Sauvegarde...',
        unableSave: 'Sauvegarde impossible.',
        saved: 'Sauvegarde.',
        noLoadouts: 'Aucune classe disponible pour le moment.',
        noFavorite: 'Aucune classe favorite pour le moment.',
        featuredWeapon: 'Arme mise en avant',
        tier: 'Tier',
        favorited: 'En favori',
        favorite: 'Ajouter aux favoris',
        mainLoadout: 'Classe principale',
        setMain: 'Definir principale',
        privateNote: 'Note privee pour cette classe...',
        chooseAnother: 'Choisir une autre arme',
      }
    : {
        saving: 'Saving...',
        unableSave: 'Unable to save.',
        saved: 'Saved.',
        noLoadouts: 'No loadouts available yet.',
        noFavorite: 'No favorite loadout yet.',
        featuredWeapon: 'Featured weapon',
        tier: 'Tier',
        favorited: 'Favorited',
        favorite: 'Favorite',
        mainLoadout: 'Main loadout',
        setMain: 'Set main',
        privateNote: 'Private note for this loadout...',
        chooseAnother: 'Choose another weapon',
      };
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
    setStatus(copy.saving);
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
      setStatus(data.error || copy.unableSave);
      return;
    }
    setFeaturedLoadoutId(data.featuredLoadoutId || '');
    setFavorites(data.favoriteLoadouts);
    setNotes(data.loadoutNotes);
    setStatus(copy.saved);
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
        <p className="account-loadout-status">{copy.noLoadouts}</p>
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
        )) : <p>{copy.noFavorite}</p>}
      </div>

      <article className="account-loadout-featured">
        <div className="account-loadout-featured-head">
          <div>
            <span>{copy.featuredWeapon}</span>
            <Link href={getLoadoutPath(selectedLoadout)}>{selectedLoadout.weapon}</Link>
            <small>{selectedLoadout.category} / {copy.tier} {selectedLoadout.tier}</small>
          </div>
          <button type="button" onClick={() => toggleFavorite(selectedLoadout.id)}>
            {favorites.includes(selectedLoadout.id) ? copy.favorited : copy.favorite}
          </button>
          <button type="button" onClick={() => setMainLoadout(selectedLoadout.id)}>
            {featuredLoadoutId === selectedLoadout.id ? copy.mainLoadout : copy.setMain}
          </button>
        </div>
        <textarea aria-label="Textarea"
          maxLength={1200}
          onBlur={() => saveNote(selectedLoadout.id)}
          onChange={(event) => updateNote(selectedLoadout.id, event.target.value)}
          placeholder={copy.privateNote}
          value={notes[selectedLoadout.id] || ''}
        />
      </article>

      <details className="account-loadout-picker">
        <summary>{copy.chooseAnother}</summary>
        <div>
          {otherLoadouts.map((loadout) => (
            <button key={loadout.id} type="button" onClick={() => setSelectedLoadoutId(loadout.id)}>
              <strong>{loadout.weapon}</strong>
              <small>{loadout.category} / {copy.tier} {loadout.tier}</small>
            </button>
          ))}
        </div>
      </details>
      {status && <p className="account-loadout-status">{status}</p>}
    </div>
  );
}
