import fs from 'fs';
import path from 'path';
import { hasUpstash, upstashCommand } from './upstash';
import { isAllowedProfileImage } from '@/lib/profileValidation';

const PROFILES_FILE = path.join(process.cwd(), 'data', 'profiles.json');
const PROFILE_KEY_PREFIX = 'wz:profile:';
const PROFILE_INDEX_KEY = `${PROFILE_KEY_PREFIX}public`;

export type InputDevice = '' | 'controller' | 'keyboard-mouse';
export type MainPlatform = '' | 'pc' | 'playstation' | 'xbox' | 'battle-net' | 'steam';

export type ProfilePrivacy = {
  publicProfile: boolean;
  email: boolean;
  socials: boolean;
  activisionId: boolean;
  platformId: boolean;
  stats: boolean;
};

export type ProfileStatsEntry = {
  id: string;
  date: string;
  kills: number;
  deaths: number;
  damage: number;
  placement: number;
  won: boolean;
};

export type UserProfile = {
  userId: string;
  email?: string;
  profilePicture: string;
  profileBanner: string;
  publicName: string;
  pseudo: string;
  mobileHudCode: string;
  description: string;
  youtube: string;
  twitch: string;
  kick: string;
  discord: string;
  twitter: string;
  tiktok: string;
  instagram: string;
  otherLink: string;
  inputDevice: InputDevice;
  mainPlatform: MainPlatform;
  activisionId: string;
  platformId: string;
  avatarPositionX: number;
  avatarPositionY: number;
  privacy: ProfilePrivacy;
  featuredLoadoutId: string;
  siteLanguage: string;
  siteTheme: string;
  loadoutDisplayMode: string;
  favoriteLoadouts: string[];
  loadoutNotes: Record<string, string>;
  statsEntries: ProfileStatsEntry[];
  updatedAt: string;
};

export type EditableUserProfile = Omit<UserProfile, 'userId' | 'email' | 'updatedAt'>;

const TEXT_LIMITS: Record<keyof EditableUserProfile, number> = {
  profilePicture: 700_000,
  profileBanner: 700_000,
  publicName: 48,
  pseudo: 48,
  mobileHudCode: 64,
  description: 600,
  youtube: 300,
  twitch: 300,
  kick: 300,
  discord: 300,
  twitter: 300,
  tiktok: 300,
  instagram: 300,
  otherLink: 300,
  inputDevice: 32,
  mainPlatform: 32,
  activisionId: 80,
  platformId: 80,
  avatarPositionX: 8,
  avatarPositionY: 8,
  privacy: 1,
  featuredLoadoutId: 120,
  siteLanguage: 16,
  siteTheme: 16,
  loadoutDisplayMode: 16,
  favoriteLoadouts: 4000,
  loadoutNotes: 20_000,
  statsEntries: 80_000,
};

const URL_FIELDS = new Set<keyof EditableUserProfile>([
  'profilePicture',
  'profileBanner',
  'youtube',
  'twitch',
  'kick',
  'discord',
  'twitter',
  'tiktok',
  'instagram',
  'otherLink',
]);

export const DEFAULT_PROFILE_PRIVACY: ProfilePrivacy = {
  publicProfile: false,
  email: false,
  socials: true,
  activisionId: false,
  platformId: false,
  stats: true,
};

function readLocalProfiles(): UserProfile[] {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Local profile storage is disabled in production. Configure Upstash Redis.');
  }

  try {
    return JSON.parse(fs.readFileSync(PROFILES_FILE, 'utf-8')) as UserProfile[];
  } catch (error) {
    console.error('Failed to read profiles file:', error);
    return [];
  }
}

function writeLocalProfiles(records: UserProfile[]) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Local profile storage is disabled in production. Configure Upstash Redis.');
  }

  fs.writeFileSync(PROFILES_FILE, JSON.stringify(records, null, 2));
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function cleanUrl(value: unknown, maxLength: number) {
  const text = cleanText(value, maxLength);
  if (!text) return '';

  try {
    const url = new URL(text);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : '';
  } catch {
    return '';
  }
}

function cleanProfilePicture(value: unknown) {
  const text = cleanText(value, TEXT_LIMITS.profilePicture);
  return isAllowedProfileImage(text) ? text : '';
}

function cleanInputDevice(value: unknown): InputDevice {
  return value === 'controller' || value === 'keyboard-mouse' ? value : '';
}

function cleanMainPlatform(value: unknown): MainPlatform {
  return value === 'pc' || value === 'playstation' || value === 'xbox' || value === 'battle-net' || value === 'steam'
    ? value
    : '';
}

function cleanPercent(value: unknown) {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return 50;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function cleanPrivacy(value: unknown): ProfilePrivacy {
  const input = value && typeof value === 'object' ? value as Partial<ProfilePrivacy> : {};
  return {
    publicProfile: Boolean(input.publicProfile),
    email: Boolean(input.email),
    socials: input.socials === undefined ? DEFAULT_PROFILE_PRIVACY.socials : Boolean(input.socials),
    activisionId: Boolean(input.activisionId),
    platformId: Boolean(input.platformId),
    stats: input.stats === undefined ? DEFAULT_PROFILE_PRIVACY.stats : Boolean(input.stats),
  };
}

function cleanFavoriteLoadouts(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim().slice(0, 120))
    .filter(Boolean)))
    .slice(0, 80);
}

function cleanLoadoutNotes(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const notes: Record<string, string> = {};
  for (const [loadoutId, note] of Object.entries(value)) {
    if (typeof note !== 'string') continue;
    const cleanId = loadoutId.trim().slice(0, 120);
    const cleanNote = note.trim().slice(0, 1200);
    if (cleanId && cleanNote) notes[cleanId] = cleanNote;
  }
  return notes;
}

function cleanStatsEntries(value: unknown): ProfileStatsEntry[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 300).map((entry) => {
    const input = entry && typeof entry === 'object' ? entry as Partial<ProfileStatsEntry> : {};
    const deaths = Math.max(0, Math.min(80, Math.round(Number(input.deaths) || 0)));
    return {
      id: typeof input.id === 'string' && input.id ? input.id.slice(0, 80) : crypto.randomUUID(),
      date: typeof input.date === 'string' ? input.date.slice(0, 32) : new Date().toLocaleDateString('en-GB'),
      kills: Math.max(0, Math.min(100, Math.round(Number(input.kills) || 0))),
      deaths,
      damage: Math.max(0, Math.min(100000, Math.round(Number(input.damage) || 0))),
      placement: Math.max(0, Math.min(200, Math.round(Number(input.placement) || 0))),
      won: Boolean(input.won),
    };
  });
}

export function emptyProfile(input: { userId: string; email?: string; name?: string; picture?: string }): UserProfile {
  return {
    userId: input.userId,
    email: input.email,
    profilePicture: input.picture || '',
    profileBanner: '',
    publicName: input.name || '',
    pseudo: '',
    mobileHudCode: '',
    description: '',
    youtube: '',
    twitch: '',
    kick: '',
    discord: '',
    twitter: '',
    tiktok: '',
    instagram: '',
    otherLink: '',
    inputDevice: '',
    mainPlatform: '',
    activisionId: '',
    platformId: '',
    avatarPositionX: 50,
    avatarPositionY: 50,
    privacy: DEFAULT_PROFILE_PRIVACY,
    featuredLoadoutId: '',
    siteLanguage: 'fr',
    siteTheme: 'system',
    loadoutDisplayMode: 'compact',
    favoriteLoadouts: [],
    loadoutNotes: {},
    statsEntries: [],
    updatedAt: '',
  };
}

export function sanitizeProfile(input: Partial<EditableUserProfile>): EditableUserProfile {
  const cleaned = {} as EditableUserProfile;

  for (const key of Object.keys(TEXT_LIMITS) as Array<keyof EditableUserProfile>) {
    if (key === 'inputDevice') {
      cleaned[key] = cleanInputDevice(input[key]);
    } else if (key === 'mainPlatform') {
      cleaned[key] = cleanMainPlatform(input[key]);
    } else if (key === 'avatarPositionX' || key === 'avatarPositionY') {
      cleaned[key] = cleanPercent(input[key]);
    } else if (key === 'privacy') {
      cleaned[key] = cleanPrivacy(input[key]);
    } else if (key === 'favoriteLoadouts') {
      cleaned[key] = cleanFavoriteLoadouts(input[key]);
    } else if (key === 'loadoutNotes') {
      cleaned[key] = cleanLoadoutNotes(input[key]);
    } else if (key === 'statsEntries') {
      cleaned[key] = cleanStatsEntries(input[key]);
    } else if (key === 'profilePicture' || key === 'profileBanner') {
      cleaned[key] = cleanProfilePicture(input[key]);
    } else if (URL_FIELDS.has(key)) {
      cleaned[key] = cleanUrl(input[key], TEXT_LIMITS[key]);
    } else {
      cleaned[key] = cleanText(input[key], TEXT_LIMITS[key]);
    }
  }

  return cleaned;
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
  if (hasUpstash()) {
    const value = await upstashCommand(['GET', `${PROFILE_KEY_PREFIX}${userId}`]);
    return typeof value === 'string' ? normalizeStoredProfile(JSON.parse(value) as UserProfile) : null;
  }

  const profile = readLocalProfiles().find((record) => record.userId === userId) || null;
  return profile ? normalizeStoredProfile(profile) : null;
}

export async function getProfileByPseudo(pseudo: string): Promise<UserProfile | null> {
  const cleanPseudo = pseudo.trim().toLowerCase();
  if (!cleanPseudo) return null;

  if (hasUpstash()) {
    const userId = await upstashCommand(['GET', `${PROFILE_KEY_PREFIX}pseudo:${cleanPseudo}`]);
    return typeof userId === 'string' ? getProfile(userId) : null;
  }

  return readLocalProfiles().map(normalizeStoredProfile).find((record) => record.pseudo.toLowerCase() === cleanPseudo) || null;
}

export async function getPublicProfiles(): Promise<UserProfile[]> {
  if (hasUpstash()) {
    const userIds = await upstashCommand(['SMEMBERS', PROFILE_INDEX_KEY]);
    if (!Array.isArray(userIds)) return [];

    const profiles = await Promise.all(
      userIds
        .filter((userId): userId is string => typeof userId === 'string')
        .map((userId) => getProfile(userId)),
    );

    return profiles
      .filter((profile): profile is UserProfile => Boolean(profile?.pseudo && profile.privacy.publicProfile))
      .sort((a, b) => a.pseudo.localeCompare(b.pseudo));
  }

  return readLocalProfiles()
    .map(normalizeStoredProfile)
    .filter((record) => Boolean(record.pseudo && record.privacy.publicProfile))
    .sort((a, b) => a.pseudo.localeCompare(b.pseudo));
}

function normalizeStoredProfile(profile: UserProfile): UserProfile {
  return {
    ...emptyProfile({ userId: profile.userId, email: profile.email }),
    ...profile,
    avatarPositionX: cleanPercent(profile.avatarPositionX),
    avatarPositionY: cleanPercent(profile.avatarPositionY),
    privacy: cleanPrivacy(profile.privacy),
    favoriteLoadouts: cleanFavoriteLoadouts(profile.favoriteLoadouts),
    loadoutNotes: cleanLoadoutNotes(profile.loadoutNotes),
    statsEntries: cleanStatsEntries(profile.statsEntries),
  };
}

export async function saveProfile(input: {
  userId: string;
  email?: string;
  profile: EditableUserProfile;
}) {
  const record: UserProfile = {
    userId: input.userId,
    email: input.email,
    ...sanitizeProfile(input.profile),
    updatedAt: new Date().toISOString(),
  };

  if (hasUpstash()) {
    await upstashCommand(['SET', `${PROFILE_KEY_PREFIX}${record.userId}`, JSON.stringify(record)]);
    if (record.pseudo) {
      await upstashCommand(['SET', `${PROFILE_KEY_PREFIX}pseudo:${record.pseudo.toLowerCase()}`, record.userId]);
    }

    if (record.pseudo && record.privacy.publicProfile) {
      await upstashCommand(['SADD', PROFILE_INDEX_KEY, record.userId]);
    } else {
      await upstashCommand(['SREM', PROFILE_INDEX_KEY, record.userId]);
    }
    return record;
  }

  const records = readLocalProfiles();
  const index = records.findIndex((entry) => entry.userId === record.userId);
  if (index >= 0) {
    records[index] = record;
  } else {
    records.push(record);
  }
  writeLocalProfiles(records);
  return record;
}
