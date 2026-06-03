import fs from 'fs';
import path from 'path';
import { hasUpstash, upstashCommand } from './upstash';
import { getUserByEmail } from '@/lib/accountStore';
import type { OAuthProvider, UserSession } from '@/lib/userAuth';

const OAUTH_USERS_FILE = path.join(process.cwd(), 'data', 'oauth-users.json');
const OAUTH_USERS_KEY_PREFIX = 'wz:user:oauth:';
const OAUTH_EMAIL_KEY_PREFIX = 'wz:user:oauth-email:';

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

function getOAuthUserKey(provider: OAuthProvider, providerSub: string) {
  return `${provider}:${providerSub}`;
}

function normalizeEmail(email?: string) {
  return email?.trim().toLowerCase() || '';
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
    const value = await upstashCommand(['GET', `${OAUTH_USERS_KEY_PREFIX}${key}`]);
    return typeof value === 'string' ? JSON.parse(value) as StoredOAuthUser : null;
  }

  return readLocalUsers().find((user) => getOAuthUserKey(user.provider, user.providerSub) === key) || null;
}

export async function getOAuthUserByEmail(email: string): Promise<StoredOAuthUser | null> {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) return null;

  if (hasUpstash()) {
    const key = await upstashCommand(['GET', `${OAUTH_EMAIL_KEY_PREFIX}${cleanEmail}`]);
    if (typeof key !== 'string') return null;

    const value = await upstashCommand(['GET', `${OAUTH_USERS_KEY_PREFIX}${key}`]);
    return typeof value === 'string' ? JSON.parse(value) as StoredOAuthUser : null;
  }

  return readLocalUsers().find((user) => normalizeEmail(user.email) === cleanEmail) || null;
}

export async function saveOAuthUser(user: StoredOAuthUser) {
  if (hasUpstash()) {
    const key = getOAuthUserKey(user.provider, user.providerSub);
    await upstashCommand(['SET', `${OAUTH_USERS_KEY_PREFIX}${key}`, JSON.stringify(user)]);
    const email = normalizeEmail(user.email);
    if (email) {
      await upstashCommand(['SET', `${OAUTH_EMAIL_KEY_PREFIX}${email}`, key]);
    }
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
    return { account: null, isNew: false, sessionUser: user };
  }

  const existing = await getOAuthUser(user.provider, user.sub);
  const email = normalizeEmail(user.email);
  const emailAccount = email ? await getUserByEmail(email) : null;
  const now = new Date().toISOString();
  const account: StoredOAuthUser = {
    id: emailAccount?.id || existing?.id || `${user.provider}:${user.sub}`,
    provider: user.provider,
    providerSub: user.sub,
    email,
    name: user.name,
    picture: user.picture,
    battletag: user.battletag,
    createdAt: existing?.createdAt || now,
    lastSignedInAt: now,
  };

  await saveOAuthUser(account);
  return {
    account,
    isNew: !existing,
    sessionUser: {
      ...user,
      sub: account.id,
      email: email || user.email,
    },
  };
}
