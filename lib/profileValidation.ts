const MAX_PROFILE_IMAGE_DATA_URL_LENGTH = 700_000;

const BLOCKED_PROFILE_TERMS = [
  'bitch',
  'connard',
  'encule',
  'enculé',
  'faggot',
  'hitler',
  'merde',
  'nazi',
  'negro',
  'nigga',
  'nigger',
  'pute',
  'retard',
  'salope',
  'slut',
  'whore',
];

const PROFILE_NAME_PATTERN = /^[\p{L}\p{N} ._\-[\]#]{2,48}$/u;

function normalizeProfileText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
}

function containsBlockedTerm(value: string) {
  const normalized = normalizeProfileText(value);
  return BLOCKED_PROFILE_TERMS.some((term) => normalized.includes(normalizeProfileText(term)));
}

export function getProfileNameError(label: string, value: string) {
  const text = value.trim();
  if (!text) return '';
  if (!PROFILE_NAME_PATTERN.test(text)) {
    return `${label} must be 2-48 characters and only use letters, numbers, spaces, dots, underscores, hyphens, brackets or #.`;
  }
  if (containsBlockedTerm(text)) {
    return `${label} contains a blocked word.`;
  }
  return '';
}

export function isAllowedProfileImage(value: string) {
  if (!value) return true;

  if (value.startsWith('data:image/')) {
    return (
      value.length <= MAX_PROFILE_IMAGE_DATA_URL_LENGTH &&
      /^data:image\/(png|jpeg|jpg|webp|gif);base64,[a-z0-9+/]+=*$/i.test(value)
    );
  }

  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function getProfilePictureError(value: string) {
  return isAllowedProfileImage(value)
    ? ''
    : 'Profile picture must be a valid image URL or an uploaded PNG, JPG, WEBP or GIF under 500 KB.';
}

export function getProfileModerationError(input: { publicName?: string; pseudo?: string; profilePicture?: string }) {
  return (
    getProfileNameError('Public name', input.publicName || '') ||
    getProfileNameError('Pseudo', input.pseudo || '') ||
    getProfilePictureError(input.profilePicture || '')
  );
}

export { MAX_PROFILE_IMAGE_DATA_URL_LENGTH };
