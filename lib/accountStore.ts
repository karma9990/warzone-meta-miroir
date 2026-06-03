import fs from 'fs';
import path from 'path';
import { hasUpstash, upstashCommand } from './upstash';

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');
const USERS_KEY_PREFIX = 'wz:user:email:';

export type StoredUser = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  passwordHash: string;
  createdAt: string;
  emailVerifiedAt?: string;
};

function readLocalUsers(): StoredUser[] {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Local account storage is disabled in production. Configure Upstash Redis.');
  }
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8')) as StoredUser[];
  } catch {
    return [];
  }
}

function writeLocalUsers(users: StoredUser[]) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Local account storage is disabled in production. Configure Upstash Redis.');
  }
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

export async function getUserByEmail(email: string): Promise<StoredUser | null> {
  if (hasUpstash()) {
    const value = await upstashCommand(['GET', `${USERS_KEY_PREFIX}${email}`]);
    return typeof value === 'string' ? JSON.parse(value) as StoredUser : null;
  }

  return readLocalUsers().find((user) => user.email === email) || null;
}

export async function saveUser(user: StoredUser) {
  if (hasUpstash()) {
    await upstashCommand(['SET', `${USERS_KEY_PREFIX}${user.email}`, JSON.stringify(user)]);
    return;
  }

  const users = readLocalUsers();
  const index = users.findIndex((entry) => entry.email === user.email);
  if (index >= 0) {
    users[index] = user;
  } else {
    users.push(user);
  }
  writeLocalUsers(users);
}
