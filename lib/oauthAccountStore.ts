import fs from 'fs';
import path from 'path';
import type { OAuthProvider, UserSession } from '@/lib/userAuth';

const OAUTH_USERS_FILE = path.join(process.cwd(), 'data', 'oauth-users.json');
const OAUTH_USERS_KEY_PREFIX = 'wz:user:oauth:';

export type StoredOAuthUser = {
  id: string;
  provider: OAuthProvider;
  providerSub: string;
  email?: string;
  name: string;
  picture?: string;
  battletag?: string;
  createdAt: string;
  lastSignedInAt: string;
};

function hasUpstash() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function upstash(command: unknown[]) {
  const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([command]),
  });

  if (!res.ok) {
    throw new Error('OAuth account storage request failed.');
  }

  const data = await res.json() as Array<{ result: unknown }>;
  return data[0]?.result;
}

function getOAuthUserKey(provider: OAuthProvider, providerSub: string) {
  return `${provider}:${providerSub}`;
}

function readLocalUsers(): StoredOAuthUser[] {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Local OAuth account storage is disabled in production. Configure Upstash Redis.');
  }
  try {
    return JSON.parse(fs.readFileSync(OAUTH_USERS_FILE, 'utf-8')) as StoredOAuthUser[];
  } catch {
    return [];
  }
}

function writeLocalUsers(users: StoredOAuthUser[]) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Local OAuth account storage is disabled in production. Configure Upstash Redis.');
  }
  fs.writeFileSync(OAUTH_USERS_FILE, JSON.stringify(users, null, 2));
}

export async function getOAuthUser(provider: OAuthProvider, providerSub: string): Promise<StoredOAuthUser | null> {
  const key = getOAuthUserKey(provider, providerSub);

  if (hasUpstash()) {
    const value = await upstash(['GET', `${OAUTH_USERS_KEY_PREFIX}${key}`]);
    return typeof value === 'string' ? JSON.parse(value) as StoredOAuthUser : null;
  }

  return readLocalUsers().find((user) => getOAuthUserKey(user.provider, user.providerSub) === key) || null;
}

export async function saveOAuthUser(user: StoredOAuthUser) {
  if (hasUpstash()) {
    await upstash(['SET', `${OAUTH_USERS_KEY_PREFIX}${getOAuthUserKey(user.provider, user.providerSub)}`, JSON.stringify(user)]);
    return;
  }

  const users = readLocalUsers();
  const index = users.findIndex((entry) => (
    getOAuthUserKey(entry.provider, entry.providerSub) === getOAuthUserKey(user.provider, user.providerSub)
  ));
  if (index >= 0) {
    users[index] = user;
  } else {
    users.push(user);
  }
  writeLocalUsers(users);
}

export async function recordOAuthSignIn(user: UserSession) {
  if (user.provider === 'email') {
    return { account: null, isNew: false };
  }

  const existing = await getOAuthUser(user.provider, user.sub);
  const now = new Date().toISOString();
  const account: StoredOAuthUser = {
    id: existing?.id || `${user.provider}:${user.sub}`,
    provider: user.provider,
    providerSub: user.sub,
    email: user.email,
    name: user.name,
    picture: user.picture,
    battletag: user.battletag,
    createdAt: existing?.createdAt || now,
    lastSignedInAt: now,
  };

  await saveOAuthUser(account);
  return { account, isNew: !existing };
}
