'use client';

import { FormEvent, useMemo, useState } from 'react';
import type { UserProfile } from '@/lib/profileStore';
import { getProfileModerationError } from '@/lib/profileValidation';

type ProfileForm = Omit<UserProfile, 'userId' | 'email' | 'updatedAt'>;

const inputDeviceOptions = [
  ['', 'Select device'],
  ['controller', 'Controller'],
  ['keyboard-mouse', 'Keyboard + mouse'],
] as const;

const platformOptions = [
  ['', 'Select platform'],
  ['pc', 'PC'],
  ['playstation', 'PlayStation'],
  ['xbox', 'Xbox'],
  ['battle-net', 'Battle.net'],
  ['steam', 'Steam'],
] as const;

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'WZ';
}

export default function AccountProfileForm({ profile }: { profile: UserProfile }) {
  const [form, setForm] = useState<ProfileForm>({
    profilePicture: profile.profilePicture,
    publicName: profile.publicName,
    pseudo: profile.pseudo,
    mobileHudCode: profile.mobileHudCode,
    description: profile.description,
    youtube: profile.youtube,
    twitch: profile.twitch,
    kick: profile.kick,
    discord: profile.discord,
    twitter: profile.twitter,
    tiktok: profile.tiktok,
    instagram: profile.instagram,
    otherLink: profile.otherLink,
    inputDevice: profile.inputDevice,
    mainPlatform: profile.mainPlatform,
    activisionId: profile.activisionId,
    platformId: profile.platformId,
    avatarPositionX: profile.avatarPositionX,
    avatarPositionY: profile.avatarPositionY,
    privacy: profile.privacy,
    favoriteLoadouts: profile.favoriteLoadouts,
    loadoutNotes: profile.loadoutNotes,
    statsEntries: profile.statsEntries,
  });
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const previewName = useMemo(() => form.pseudo || 'WZ Player', [form.pseudo]);

  function updateField<Key extends keyof ProfileForm>(key: Key, value: ProfileForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function selectProfilePicture(file: File | null) {
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) {
      setStatus('error');
      setMessage('Choose a PNG, JPG, WEBP or GIF image.');
      return;
    }

    if (file.size > 500_000) {
      setStatus('error');
      setMessage('Profile picture must be under 500 KB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      updateField('profilePicture', result);
      setStatus('idle');
      setMessage('Profile picture ready. Save to keep it.');
    };
    reader.onerror = () => {
      setStatus('error');
      setMessage('Unable to read this image.');
    };
    reader.readAsDataURL(file);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const profileFields: Partial<ProfileForm> = { ...form, publicName: form.pseudo };
    const moderationError = getProfileModerationError(profileFields);
    if (moderationError) {
      setStatus('error');
      setMessage(moderationError);
      return;
    }

    setStatus('saving');
    setMessage('');
    delete profileFields.favoriteLoadouts;
    delete profileFields.loadoutNotes;
    delete profileFields.statsEntries;

    const res = await fetch('/api/account/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileFields),
    });
    const data = await res.json();

    if (!res.ok) {
      setStatus('error');
      setMessage(data.error || 'Unable to save profile.');
      return;
    }

    setForm({
      profilePicture: data.profile.profilePicture,
      publicName: data.profile.publicName,
      pseudo: data.profile.pseudo,
      mobileHudCode: data.profile.mobileHudCode,
      description: data.profile.description,
      youtube: data.profile.youtube,
      twitch: data.profile.twitch,
      kick: data.profile.kick,
      discord: data.profile.discord,
      twitter: data.profile.twitter,
      tiktok: data.profile.tiktok,
      instagram: data.profile.instagram,
      otherLink: data.profile.otherLink,
      inputDevice: data.profile.inputDevice,
      mainPlatform: data.profile.mainPlatform,
      activisionId: data.profile.activisionId,
      platformId: data.profile.platformId,
      avatarPositionX: data.profile.avatarPositionX,
      avatarPositionY: data.profile.avatarPositionY,
      privacy: data.profile.privacy,
      favoriteLoadouts: data.profile.favoriteLoadouts,
      loadoutNotes: data.profile.loadoutNotes,
      statsEntries: data.profile.statsEntries,
    });
    setStatus('saved');
    setMessage('Profile saved.');
  }

  return (
    <form className="account-profile-form" onSubmit={save}>
      <section className="account-edit-block">
        <div className="account-edit-head">
          <h2>General details</h2>
        </div>
        <div className="account-general-grid">
          <div className="account-avatar-card">
            {form.profilePicture ? (
              <i
                style={{
                  backgroundImage: `url(${form.profilePicture})`,
                  backgroundPosition: `${form.avatarPositionX}% ${form.avatarPositionY}%`,
                }}
                aria-hidden="true"
              />
            ) : (
              <span>{initials(previewName)}</span>
            )}
            <strong>{previewName}</strong>
          </div>
          <label>
            Profile picture
            <input
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(event) => selectProfilePicture(event.target.files?.[0] || null)}
              type="file"
            />
          </label>
          <label>
            Profile picture URL
            <input
              value={form.profilePicture.startsWith('data:image/') ? '' : form.profilePicture}
              onChange={(event) => updateField('profilePicture', event.target.value)}
              placeholder={form.profilePicture.startsWith('data:image/') ? 'Local image selected' : 'https://...'}
              type="url"
            />
          </label>
          <label>
            Pseudo
            <input maxLength={48} value={form.pseudo} onChange={(event) => updateField('pseudo', event.target.value)} />
          </label>
        </div>
        {form.profilePicture && (
          <div className="account-avatar-crop">
            <label>
              Avatar horizontal crop
              <input
                max="100"
                min="0"
                onChange={(event) => updateField('avatarPositionX', Number(event.target.value))}
                type="range"
                value={form.avatarPositionX}
              />
            </label>
            <label>
              Avatar vertical crop
              <input
                max="100"
                min="0"
                onChange={(event) => updateField('avatarPositionY', Number(event.target.value))}
                type="range"
                value={form.avatarPositionY}
              />
            </label>
          </div>
        )}
        <label>
          Description
          <textarea value={form.description} onChange={(event) => updateField('description', event.target.value)} />
        </label>
      </section>

      <section className="account-edit-block">
        <div className="account-edit-head">
          <h2>Social links</h2>
          <p>Enter direct links, full URLs only.</p>
        </div>
        <div className="account-two-col">
          <label>
            Youtube channel
            <input value={form.youtube} onChange={(event) => updateField('youtube', event.target.value)} placeholder="https://youtube.com/..." type="url" />
          </label>
          <label>
            Twitch channel
            <input value={form.twitch} onChange={(event) => updateField('twitch', event.target.value)} placeholder="https://twitch.tv/..." type="url" />
          </label>
          <label>
            Kick channel
            <input value={form.kick} onChange={(event) => updateField('kick', event.target.value)} placeholder="https://kick.com/..." type="url" />
          </label>
          <label>
            Discord server
            <input value={form.discord} onChange={(event) => updateField('discord', event.target.value)} placeholder="https://discord.gg/..." type="url" />
          </label>
          <label>
            Twitter channel
            <input value={form.twitter} onChange={(event) => updateField('twitter', event.target.value)} placeholder="https://x.com/..." type="url" />
          </label>
          <label>
            Tiktok channel
            <input value={form.tiktok} onChange={(event) => updateField('tiktok', event.target.value)} placeholder="https://tiktok.com/..." type="url" />
          </label>
          <label>
            Instagram channel
            <input value={form.instagram} onChange={(event) => updateField('instagram', event.target.value)} placeholder="https://instagram.com/..." type="url" />
          </label>
          <label>
            Other link
            <input value={form.otherLink} onChange={(event) => updateField('otherLink', event.target.value)} placeholder="https://..." type="url" />
          </label>
        </div>
      </section>

      <section className="account-edit-block">
        <div className="account-edit-head">
          <h2>Other details</h2>
          <p>These fields can be displayed on public profiles later.</p>
        </div>
        <div className="account-two-col">
          <label>
            Input device
            <select value={form.inputDevice} onChange={(event) => updateField('inputDevice', event.target.value as ProfileForm['inputDevice'])}>
              {inputDeviceOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>
            Main platform
            <select value={form.mainPlatform} onChange={(event) => updateField('mainPlatform', event.target.value as ProfileForm['mainPlatform'])}>
              {platformOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>
            Activision ID
            <input
              value={form.activisionId}
              onChange={(event) => updateField('activisionId', event.target.value)}
              placeholder="Pseudo#1234567"
            />
          </label>
          <label>
            Battle.net / Steam / PSN / Xbox ID
            <input
              value={form.platformId}
              onChange={(event) => updateField('platformId', event.target.value)}
              placeholder="ID du compte de ta plateforme"
            />
          </label>
        </div>
      </section>

      <section className="account-edit-block">
        <div className="account-edit-head">
          <h2>Public profile</h2>
          <p>
            {form.pseudo && form.privacy.publicProfile
              ? `/profile/${form.pseudo}`
              : 'Add a pseudo and enable public profile to appear in search.'}
          </p>
        </div>
        <div className="account-privacy-grid">
          {([
            ['socials', 'Show social links'],
            ['stats', 'Show tracker stats'],
            ['activisionId', 'Show Activision ID'],
            ['platformId', 'Show platform account ID'],
            ['email', 'Show email'],
          ] as const).map(([key, label]) => (
            <label key={key} className="account-toggle">
              <input
                checked={form.privacy[key]}
                onChange={(event) => updateField('privacy', { ...form.privacy, [key]: event.target.checked })}
                type="checkbox"
              />
              {label}
            </label>
          ))}
        </div>
      </section>

      <div className="account-profile-actions">
        <div className="account-profile-action-buttons">
          <button type="submit" disabled={status === 'saving'}>{status === 'saving' ? 'Saving...' : 'Save profile'}</button>
          <button
            className={`account-public-switch ${form.privacy.publicProfile ? 'is-public' : 'is-private'}`}
            onClick={() => updateField('privacy', { ...form.privacy, publicProfile: !form.privacy.publicProfile })}
            type="button"
          >
            {form.privacy.publicProfile ? 'Switch to private' : 'Switch to public'}
          </button>
        </div>
        {message && <p className={status === 'error' ? 'is-error' : undefined}>{message}</p>}
      </div>
    </form>
  );
}
