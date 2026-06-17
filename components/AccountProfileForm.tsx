'use client';

import { FormEvent, useMemo, useState } from 'react';
import type { UserProfile } from '@/lib/profileStore';
import { getProfileModerationError } from '@/lib/profileValidation';
import { useCurrentLocale } from '@/lib/useCurrentLocale';

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

const languageOptions = [
  ['fr', 'Francais'],
  ['en', 'English'],
] as const;

const themeOptions = [
  ['system', 'System'],
  ['light', 'Light'],
  ['dark', 'Dark'],
] as const;

const loadoutDisplayOptions = [
  ['compact', 'Compact'],
  ['detailed', 'Detailed'],
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
  const locale = useCurrentLocale();
  const isFr = locale === 'fr';
  const t = isFr ? {
    general: 'Details generaux',
    profilePicture: 'Photo de profil',
    profilePictureUrl: 'URL de la photo de profil',
    localImage: 'Image locale selectionnee',
    description: 'Description',
    profileBanner: 'Banniere du profil',
    bannerHelp: 'Affichee en haut de votre profil public.',
    bannerImage: 'Image de banniere',
    bannerImageUrl: 'URL de l image de banniere',
    socials: 'Liens sociaux',
    socialsHelp: 'Entre des liens directs, uniquement des URL completes.',
    youtube: 'Chaine YouTube',
    twitch: 'Chaine Twitch',
    kick: 'Chaine Kick',
    discord: 'Serveur Discord',
    twitter: 'Compte X / Twitter',
    tiktok: 'Compte TikTok',
    instagram: 'Compte Instagram',
    otherLink: 'Autre lien',
    otherDetails: 'Autres details',
    otherHelp: 'Ces champs pourront etre affiches plus tard sur les profils publics.',
    inputDevice: 'Peripherique',
    mainPlatform: 'Plateforme principale',
    sitePreferences: 'Preferences du site',
    siteHelp: 'Parametres d affichage par defaut du compte.',
    language: 'Langue',
    theme: 'Theme',
    loadoutDisplay: 'Affichage des classes',
    mainPublicLoadout: 'ID de la classe publique principale',
    selectedFromLoadouts: 'Selectionnee depuis la section classes',
    publicProfile: 'Profil public',
    publicHint: 'Ajoutez un pseudo et activez le profil public pour apparaitre dans la recherche.',
    showSocials: 'Afficher les liens sociaux',
    showStats: 'Afficher les stats du tracker',
    showActivision: 'Afficher l ID Activision',
    showPlatform: 'Afficher l ID de plateforme',
    showEmail: 'Afficher l email',
    saving: 'Sauvegarde...',
    saveProfile: 'Sauvegarder le profil',
    switchPrivate: 'Passer en prive',
    switchPublic: 'Passer en public',
    imageType: 'Choisissez une image PNG, JPG, WEBP ou GIF.',
    imageSize: 'L image doit faire moins de 500 Ko.',
    imageReady: 'Image prete. Sauvegardez pour la conserver.',
    imageReadError: 'Impossible de lire cette image.',
    saveError: 'Impossible de sauvegarder le profil.',
    profileSaved: 'Profil sauvegarde.',
    selectDevice: 'Choisir un peripherique',
    controller: 'Manette',
    keyboardMouse: 'Clavier + souris',
    selectPlatform: 'Choisir une plateforme',
    system: 'Systeme',
    light: 'Clair',
    dark: 'Sombre',
    compact: 'Compact',
    detailed: 'Detaille',
  } : {
    general: 'General details',
    profilePicture: 'Profile picture',
    profilePictureUrl: 'Profile picture URL',
    localImage: 'Local image selected',
    description: 'Description',
    profileBanner: 'Profile banner',
    bannerHelp: 'Displayed at the top of your public profile.',
    bannerImage: 'Banner image',
    bannerImageUrl: 'Banner image URL',
    socials: 'Social links',
    socialsHelp: 'Enter direct links, full URLs only.',
    youtube: 'Youtube channel',
    twitch: 'Twitch channel',
    kick: 'Kick channel',
    discord: 'Discord server',
    twitter: 'Twitter channel',
    tiktok: 'Tiktok channel',
    instagram: 'Instagram channel',
    otherLink: 'Other link',
    otherDetails: 'Other details',
    otherHelp: 'These fields can be displayed on public profiles later.',
    inputDevice: 'Input device',
    mainPlatform: 'Main platform',
    sitePreferences: 'Site preferences',
    siteHelp: 'Default account display settings.',
    language: 'Language',
    theme: 'Theme',
    loadoutDisplay: 'Loadout display',
    mainPublicLoadout: 'Main public loadout ID',
    selectedFromLoadouts: 'Selected from loadouts section',
    publicProfile: 'Public profile',
    publicHint: 'Add a pseudo and enable public profile to appear in search.',
    showSocials: 'Show social links',
    showStats: 'Show tracker stats',
    showActivision: 'Show Activision ID',
    showPlatform: 'Show platform account ID',
    showEmail: 'Show email',
    saving: 'Saving...',
    saveProfile: 'Save profile',
    switchPrivate: 'Switch to private',
    switchPublic: 'Switch to public',
    imageType: 'Choose a PNG, JPG, WEBP or GIF image.',
    imageSize: 'Image must be under 500 KB.',
    imageReady: 'Image ready. Save to keep it.',
    imageReadError: 'Unable to read this image.',
    saveError: 'Unable to save profile.',
    profileSaved: 'Profile saved.',
    selectDevice: 'Select device',
    controller: 'Controller',
    keyboardMouse: 'Keyboard + mouse',
    selectPlatform: 'Select platform',
    system: 'System',
    light: 'Light',
    dark: 'Dark',
    compact: 'Compact',
    detailed: 'Detailed',
  };
  const [form, setForm] = useState<ProfileForm>({
    profilePicture: profile.profilePicture,
    profileBanner: profile.profileBanner,
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
    featuredLoadoutId: profile.featuredLoadoutId,
    siteLanguage: profile.siteLanguage,
    siteTheme: profile.siteTheme,
    loadoutDisplayMode: profile.loadoutDisplayMode,
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

  function selectProfileImage(file: File | null, field: 'profilePicture' | 'profileBanner') {
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) {
      setStatus('error');
      setMessage(t.imageType);
      return;
    }

    if (file.size > 500_000) {
      setStatus('error');
      setMessage(t.imageSize);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      updateField(field, result);
      setStatus('idle');
      setMessage(t.imageReady);
    };
    reader.onerror = () => {
      setStatus('error');
      setMessage(t.imageReadError);
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
      setMessage(data.error || t.saveError);
      return;
    }

    setForm({
      profilePicture: data.profile.profilePicture,
      profileBanner: data.profile.profileBanner,
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
      featuredLoadoutId: data.profile.featuredLoadoutId,
      siteLanguage: data.profile.siteLanguage,
      siteTheme: data.profile.siteTheme,
      loadoutDisplayMode: data.profile.loadoutDisplayMode,
      favoriteLoadouts: data.profile.favoriteLoadouts,
      loadoutNotes: data.profile.loadoutNotes,
      statsEntries: data.profile.statsEntries,
    });
    setStatus('saved');
    setMessage(t.profileSaved);
  }

  return (
    <form className="account-profile-form" onSubmit={save}>
      <section className="account-edit-block">
        <div className="account-edit-head">
          <h2>{t.general}</h2>
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
            {t.profilePicture}
            <input
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(event) => selectProfileImage(event.target.files?.[0] || null, 'profilePicture')}
              type="file"
            />
          </label>
          <label>
            {t.profilePictureUrl}
            <input
              value={form.profilePicture.startsWith('data:image/') ? '' : form.profilePicture}
              onChange={(event) => updateField('profilePicture', event.target.value)}
              placeholder={form.profilePicture.startsWith('data:image/') ? t.localImage : 'https://...'}
              type="url"
            />
          </label>
          <label>
            Pseudo
            <input maxLength={48} value={form.pseudo} onChange={(event) => updateField('pseudo', event.target.value)} />
          </label>
        </div>
        <label>
          {t.description}
          <textarea value={form.description} onChange={(event) => updateField('description', event.target.value)} />
        </label>
      </section>

      <section className="account-edit-block">
        <div className="account-edit-head">
          <h2>{t.profileBanner}</h2>
          <p>{t.bannerHelp}</p>
        </div>
        <div
          className="account-banner-preview"
          style={form.profileBanner ? { backgroundImage: `url(${form.profileBanner})` } : undefined}
        >
          <span>{previewName}</span>
        </div>
        <div className="account-two-col">
          <label>
            {t.bannerImage}
            <input
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(event) => selectProfileImage(event.target.files?.[0] || null, 'profileBanner')}
              type="file"
            />
          </label>
          <label>
            {t.bannerImageUrl}
            <input
              value={form.profileBanner.startsWith('data:image/') ? '' : form.profileBanner}
              onChange={(event) => updateField('profileBanner', event.target.value)}
              placeholder={form.profileBanner.startsWith('data:image/') ? t.localImage : 'https://...'}
              type="url"
            />
          </label>
        </div>
      </section>

      <section className="account-edit-block">
        <div className="account-edit-head">
          <h2>{t.socials}</h2>
          <p>{t.socialsHelp}</p>
        </div>
        <div className="account-two-col">
          <label>
            {t.youtube}
            <input value={form.youtube} onChange={(event) => updateField('youtube', event.target.value)} placeholder="https://youtube.com/..." type="url" />
          </label>
          <label>
            {t.twitch}
            <input value={form.twitch} onChange={(event) => updateField('twitch', event.target.value)} placeholder="https://twitch.tv/..." type="url" />
          </label>
          <label>
            {t.kick}
            <input value={form.kick} onChange={(event) => updateField('kick', event.target.value)} placeholder="https://kick.com/..." type="url" />
          </label>
          <label>
            {t.discord}
            <input value={form.discord} onChange={(event) => updateField('discord', event.target.value)} placeholder="https://discord.gg/..." type="url" />
          </label>
          <label>
            {t.twitter}
            <input value={form.twitter} onChange={(event) => updateField('twitter', event.target.value)} placeholder="https://x.com/..." type="url" />
          </label>
          <label>
            {t.tiktok}
            <input value={form.tiktok} onChange={(event) => updateField('tiktok', event.target.value)} placeholder="https://tiktok.com/..." type="url" />
          </label>
          <label>
            {t.instagram}
            <input value={form.instagram} onChange={(event) => updateField('instagram', event.target.value)} placeholder="https://instagram.com/..." type="url" />
          </label>
          <label>
            {t.otherLink}
            <input value={form.otherLink} onChange={(event) => updateField('otherLink', event.target.value)} placeholder="https://..." type="url" />
          </label>
        </div>
      </section>

      <section className="account-edit-block">
        <div className="account-edit-head">
          <h2>{t.otherDetails}</h2>
          <p>{t.otherHelp}</p>
        </div>
        <div className="account-two-col">
          <label>
            {t.inputDevice}
            <select value={form.inputDevice} onChange={(event) => updateField('inputDevice', event.target.value as ProfileForm['inputDevice'])}>
              <option value="">{t.selectDevice}</option>
              <option value="controller">{t.controller}</option>
              <option value="keyboard-mouse">{t.keyboardMouse}</option>
            </select>
          </label>
          <label>
            {t.mainPlatform}
            <select value={form.mainPlatform} onChange={(event) => updateField('mainPlatform', event.target.value as ProfileForm['mainPlatform'])}>
              <option value="">{t.selectPlatform}</option>
              {platformOptions.slice(1).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
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
          <h2>{t.sitePreferences}</h2>
          <p>{t.siteHelp}</p>
        </div>
        <div className="account-two-col">
          <label>
            {t.language}
            <select value={form.siteLanguage} onChange={(event) => updateField('siteLanguage', event.target.value)}>
              {languageOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>
            {t.theme}
            <select value={form.siteTheme} onChange={(event) => updateField('siteTheme', event.target.value)}>
              <option value="system">{t.system}</option>
              <option value="light">{t.light}</option>
              <option value="dark">{t.dark}</option>
            </select>
          </label>
          <label>
            {t.loadoutDisplay}
            <select value={form.loadoutDisplayMode} onChange={(event) => updateField('loadoutDisplayMode', event.target.value)}>
              <option value="compact">{t.compact}</option>
              <option value="detailed">{t.detailed}</option>
            </select>
          </label>
          <label>
            {t.mainPublicLoadout}
            <input
              value={form.featuredLoadoutId}
              onChange={(event) => updateField('featuredLoadoutId', event.target.value)}
              placeholder={t.selectedFromLoadouts}
            />
          </label>
        </div>
      </section>

      <section className="account-edit-block">
        <div className="account-edit-head">
          <h2>{t.publicProfile}</h2>
          <p>
            {form.pseudo && form.privacy.publicProfile
              ? `/profile/${form.pseudo}`
              : t.publicHint}
          </p>
        </div>
        <div className="account-privacy-grid">
          {([
            ['socials', t.showSocials],
            ['stats', t.showStats],
            ['activisionId', t.showActivision],
            ['platformId', t.showPlatform],
            ['email', t.showEmail],
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
          <button type="submit" disabled={status === 'saving'}>{status === 'saving' ? t.saving : t.saveProfile}</button>
          <button
            className={`account-public-switch ${form.privacy.publicProfile ? 'is-public' : 'is-private'}`}
            onClick={() => updateField('privacy', { ...form.privacy, publicProfile: !form.privacy.publicProfile })}
            type="button"
          >
            {form.privacy.publicProfile ? t.switchPrivate : t.switchPublic}
          </button>
        </div>
        {message && <p className={status === 'error' ? 'is-error' : undefined}>{message}</p>}
      </div>
    </form>
  );
}
