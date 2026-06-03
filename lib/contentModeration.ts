const PROFANITY_ERROR = 'Message not sent because it contains insults or harassment. Please rewrite it respectfully.';

const blockedTerms = new Set([
  'asshole',
  'bastard',
  'bitch',
  'connard',
  'connasse',
  'encule',
  'enculer',
  'fdp',
  'fuck',
  'fucker',
  'fucking',
  'kys',
  'merdeux',
  'ntm',
  'pute',
  'retard',
  'salope',
  'slut',
  'tg',
  'whore',
]);

const blockedPhrases = [
  'kill yourself',
  'nique ta mere',
  'ta gueule',
];

function normalizeContent(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[0@]/g, 'o')
    .replace(/[1!|]/g, 'i')
    .replace(/[3]/g, 'e')
    .replace(/[$5]/g, 's')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function validateCommunityText(...values: unknown[]) {
  const normalized = values
    .filter((value): value is string => typeof value === 'string')
    .map(normalizeContent)
    .filter(Boolean);

  for (const text of normalized) {
    const tokens = text.split(/\s+/);
    if (tokens.some((token) => blockedTerms.has(token))) {
      return { error: PROFANITY_ERROR };
    }

    if (blockedPhrases.some((phrase) => text.includes(phrase))) {
      return { error: PROFANITY_ERROR };
    }
  }

  return null;
}
