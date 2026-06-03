import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data');
const BACKUP_DIR = path.join(ROOT, 'data', 'migration-backups');
const APPLY = process.argv.includes('--apply');

const PREFIXES = {
  emailUser: 'wz:user:email:',
  oauthUser: 'wz:user:oauth:',
  oauthEmail: 'wz:user:oauth-email:',
  profile: 'wz:profile:',
  entitlements: 'wz:entitlements:',
  entitlementTools: 'wz:entitlements:tools:',
  community: 'wz:community:posts',
  message: 'wz:messages:',
  messageInbox: 'wz:messages:inbox:',
  profilePublic: 'wz:profile:public',
};

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const rawLine of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index < 0) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] ||= value;
  }
}

loadEnvFile(path.join(ROOT, '.env.local'));

const hasUpstash = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(value, null, 2));
}

function backupJson(name, value) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(path.join(BACKUP_DIR, `${stamp}-${name}`), JSON.stringify(value, null, 2));
}

async function upstash(command) {
  const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([command]),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Upstash request failed for ${command[0]} ${command[1] || ''}`);
  const data = await res.json();
  return data[0]?.result;
}

async function upstashPipeline(commands) {
  if (!commands.length) return [];
  const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Upstash pipeline request failed.');
  return res.json();
}

async function scanKeys(pattern) {
  let cursor = '0';
  const keys = [];
  do {
    const result = await upstash(['SCAN', cursor, 'MATCH', pattern, 'COUNT', 200]);
    cursor = String(result?.[0] ?? '0');
    if (Array.isArray(result?.[1])) keys.push(...result[1].filter((key) => typeof key === 'string'));
  } while (cursor !== '0');
  return keys;
}

function groupDuplicateIds(emailUsers, oauthUsers, profiles = []) {
  const byEmail = new Map();

  for (const user of emailUsers) {
    const email = normalizeEmail(user.email);
    if (!email || !user.id) continue;
    const group = byEmail.get(email) || { email, ids: new Set(), emailUser: null, oauthUsers: [] };
    group.ids.add(user.id);
    group.emailUser = user;
    byEmail.set(email, group);
  }

  for (const user of oauthUsers) {
    const email = normalizeEmail(user.email);
    if (!email || !user.id) continue;
    const group = byEmail.get(email) || { email, ids: new Set(), emailUser: null, oauthUsers: [] };
    group.ids.add(user.id);
    group.oauthUsers.push(user);
    byEmail.set(email, group);
  }

  for (const profile of profiles) {
    const email = normalizeEmail(profile.email);
    if (!email || !profile.userId) continue;
    const group = byEmail.get(email) || { email, ids: new Set(), emailUser: null, oauthUsers: [], profiles: [] };
    group.ids.add(profile.userId);
    group.profiles = group.profiles || [];
    group.profiles.push(profile);
    byEmail.set(email, group);
  }

  const idMap = new Map();
  const groups = [];
  for (const group of byEmail.values()) {
    if (group.ids.size < 2) continue;
    const latestProfile = (group.profiles || [])
      .slice()
      .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))[0];
    const canonicalId = group.emailUser?.id || latestProfile?.userId || Array.from(group.ids)[0];
    const oldIds = Array.from(group.ids).filter((id) => id !== canonicalId);
    for (const oldId of oldIds) idMap.set(oldId, canonicalId);
    groups.push({ email: group.email, canonicalId, oldIds });
  }
  return { idMap, groups };
}

function remapId(value, idMap) {
  return idMap.get(value) || value;
}

function mergeProfiles(records, idMap) {
  const byId = new Map();
  const canonicalIds = new Set(idMap.values());
  const orderedRecords = records.slice().sort((a, b) => {
    const aCanonical = canonicalIds.has(a.userId) && !idMap.has(a.userId);
    const bCanonical = canonicalIds.has(b.userId) && !idMap.has(b.userId);
    return Number(bCanonical) - Number(aCanonical);
  });

  for (const raw of orderedRecords) {
    const profile = { ...raw, userId: remapId(raw.userId, idMap) };
    const existing = byId.get(profile.userId);
    if (!existing) {
      byId.set(profile.userId, profile);
      continue;
    }

    const merged = { ...existing };
    for (const [key, value] of Object.entries(profile)) {
      if (key === 'userId') continue;
      if (Array.isArray(value)) {
        merged[key] = Array.from(new Set([...(merged[key] || []), ...value]));
      } else if (value && typeof value === 'object') {
        merged[key] = { ...(merged[key] || {}), ...value };
      } else if ((merged[key] === '' || merged[key] === undefined || merged[key] === null) && value) {
        merged[key] = value;
      }
    }
    merged.updatedAt = new Date().toISOString();
    byId.set(profile.userId, merged);
  }
  return Array.from(byId.values());
}

function mergeEntitlements(records, idMap) {
  const byId = new Map();
  for (const raw of records) {
    const record = { ...raw, userId: remapId(raw.userId, idMap) };
    const existing = byId.get(record.userId);
    if (!existing) {
      byId.set(record.userId, record);
      continue;
    }
    byId.set(record.userId, {
      userId: record.userId,
      email: existing.email || record.email,
      pro: Boolean(existing.pro || record.pro),
      tools: Array.from(new Set([...(existing.tools || []), ...(record.tools || [])])),
      updatedAt: new Date().toISOString(),
    });
  }
  return Array.from(byId.values());
}

function mergeVotes(votes, idMap) {
  const next = {};
  for (const [userId, vote] of Object.entries(votes || {})) {
    const id = remapId(userId, idMap);
    if (next[id] === undefined) next[id] = vote;
  }
  return next;
}

function mergeCommunity(posts, idMap) {
  return posts.map((post) => {
    const votes = mergeVotes(post.votes, idMap);
    const joinRequests = [];
    const seenRequests = new Set();
    for (const request of post.joinRequests || []) {
      const userId = remapId(request.userId, idMap);
      if (seenRequests.has(userId)) continue;
      seenRequests.add(userId);
      joinRequests.push({ ...request, userId });
    }
    return {
      ...post,
      authorId: post.authorId ? remapId(post.authorId, idMap) : post.authorId,
      votes,
      score: Math.max(0, Object.values(votes).reduce((total, vote) => total + Number(vote || 0), 1)),
      joinRequests,
    };
  });
}

function conversationId(a, b) {
  return Array.from(new Set([a, b])).sort().join(':');
}

function remapKeyedRecord(record, idMap) {
  const next = {};
  for (const [key, value] of Object.entries(record || {})) {
    next[remapId(key, idMap)] = value;
  }
  return next;
}

function mergeMessages(conversations, idMap) {
  const byId = new Map();
  for (const raw of conversations) {
    const participants = Array.from(new Set((raw.participants || []).map((id) => remapId(id, idMap))));
    const id = participants.length === 2 ? conversationId(participants[0], participants[1]) : participants.join(':');
    const conversation = {
      ...raw,
      id,
      participants,
      participantNames: remapKeyedRecord(raw.participantNames, idMap),
      participantPseudos: remapKeyedRecord(raw.participantPseudos, idMap),
      messages: (raw.messages || []).map((message) => ({
        ...message,
        senderId: remapId(message.senderId, idMap),
        recipientId: remapId(message.recipientId, idMap),
      })),
    };
    const existing = byId.get(id);
    if (!existing) {
      byId.set(id, conversation);
      continue;
    }
    existing.messages = [...existing.messages, ...conversation.messages]
      .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
      .slice(-80);
    existing.updatedAt = [existing.updatedAt, conversation.updatedAt].sort().at(-1) || new Date().toISOString();
    existing.participantNames = { ...existing.participantNames, ...conversation.participantNames };
    existing.participantPseudos = { ...existing.participantPseudos, ...conversation.participantPseudos };
  }
  return Array.from(byId.values());
}

async function migrateLocal() {
  const users = readJson('users.json', []);
  const oauthUsers = readJson('oauth-users.json', []);
  const currentProfiles = readJson('profiles.json', []);
  const { idMap, groups } = groupDuplicateIds(users, oauthUsers, currentProfiles);
  if (!groups.length) return { mode: 'local', groups, changed: 0 };

  const changed = idMap.size;
  const updatedOauthUsers = oauthUsers.map((user) => ({ ...user, id: remapId(user.id, idMap), email: normalizeEmail(user.email) || user.email }));
  const profiles = mergeProfiles(currentProfiles, idMap);
  const entitlements = mergeEntitlements(readJson('entitlements.json', []), idMap);
  const community = mergeCommunity(readJson('community.json', []), idMap);
  const messages = mergeMessages(readJson('messages.json', []), idMap);

  if (APPLY) {
    backupJson('users.json', users);
    backupJson('oauth-users.json', oauthUsers);
    backupJson('profiles.json', readJson('profiles.json', []));
    backupJson('entitlements.json', readJson('entitlements.json', []));
    backupJson('community.json', readJson('community.json', []));
    backupJson('messages.json', readJson('messages.json', []));
    writeJson('oauth-users.json', updatedOauthUsers);
    writeJson('profiles.json', profiles);
    writeJson('entitlements.json', entitlements);
    writeJson('community.json', community);
    writeJson('messages.json', messages);
  }

  return { mode: 'local', groups, changed };
}

async function readJsonKeys(keys) {
  if (!keys.length) return [];
  const result = await upstashPipeline(keys.map((key) => ['GET', key]));
  return result.map((entry, index) => ({ key: keys[index], value: typeof entry.result === 'string' ? JSON.parse(entry.result) : null }));
}

async function migrateUpstash() {
  const emailKeys = await scanKeys(`${PREFIXES.emailUser}*`);
  const oauthKeys = await scanKeys(`${PREFIXES.oauthUser}*`);
  const users = (await readJsonKeys(emailKeys)).map((entry) => entry.value).filter(Boolean);
  const oauthEntries = (await readJsonKeys(oauthKeys)).filter((entry) => entry.value);
  const oauthUsers = oauthEntries.map((entry) => entry.value);
  const profileKeys = await scanKeys(`${PREFIXES.profile}*`);
  const profileEntries = (await readJsonKeys(profileKeys.filter((key) => !key.startsWith(`${PREFIXES.profile}pseudo:`) && key !== PREFIXES.profilePublic))).filter((entry) => entry.value);
  const { idMap, groups } = groupDuplicateIds(users, oauthUsers, profileEntries.map((entry) => entry.value));
  if (!groups.length) return { mode: 'upstash', groups, changed: 0 };

  const entitlementKeys = await scanKeys(`${PREFIXES.entitlements}*`);
  const messageKeys = (await scanKeys(`${PREFIXES.message}*`)).filter((key) => !key.startsWith(PREFIXES.messageInbox));
  const communityRaw = await upstash(['GET', PREFIXES.community]);

  const entitlementIds = entitlementKeys
    .filter((key) => !key.startsWith(PREFIXES.entitlementTools))
    .map((key) => key.slice(PREFIXES.entitlements.length));
  const messageEntries = (await readJsonKeys(messageKeys)).filter((entry) => entry.value);

  const profiles = mergeProfiles(profileEntries.map((entry) => entry.value), idMap);
  const messageConversations = mergeMessages(messageEntries.map((entry) => entry.value), idMap);
  const community = communityRaw ? mergeCommunity(JSON.parse(communityRaw), idMap) : null;

  const entitlementRecords = [];
  for (const userId of entitlementIds) {
    const hash = await upstash(['HGETALL', `${PREFIXES.entitlements}${userId}`]);
    const tools = await upstash(['SMEMBERS', `${PREFIXES.entitlementTools}${userId}`]);
    const fields = Array.isArray(hash) ? Object.fromEntries(hash.reduce((pairs, value, index, values) => {
      if (index % 2 === 0) pairs.push([value, values[index + 1]]);
      return pairs;
    }, [])) : {};
    if (fields.updatedAt || fields.email || fields.pro || Array.isArray(tools)) {
      entitlementRecords.push({
        userId,
        email: fields.email || undefined,
        pro: fields.pro === '1',
        tools: Array.isArray(tools) ? tools : [],
        updatedAt: fields.updatedAt || '',
      });
    }
  }
  const entitlements = mergeEntitlements(entitlementRecords, idMap);

  if (APPLY) {
    backupJson('upstash-auth-migration.json', {
      groups,
      oauthUsers,
      profiles: profileEntries.map((entry) => entry.value),
      entitlementRecords,
      community: communityRaw ? JSON.parse(communityRaw) : null,
      messages: messageEntries.map((entry) => entry.value),
    });

    const commands = [];
    for (const entry of oauthEntries) {
      const user = { ...entry.value, id: remapId(entry.value.id, idMap), email: normalizeEmail(entry.value.email) || entry.value.email };
      const oauthKey = `${user.provider}:${user.providerSub}`;
      commands.push(['SET', entry.key, JSON.stringify(user)]);
      if (user.email) commands.push(['SET', `${PREFIXES.oauthEmail}${user.email}`, oauthKey]);
    }

    for (const oldId of idMap.keys()) {
      commands.push(['DEL', `${PREFIXES.profile}${oldId}`]);
      commands.push(['SREM', PREFIXES.profilePublic, oldId]);
      commands.push(['DEL', `${PREFIXES.entitlements}${oldId}`]);
      commands.push(['DEL', `${PREFIXES.entitlementTools}${oldId}`]);
      commands.push(['DEL', `${PREFIXES.messageInbox}${oldId}`]);
    }
    for (const entry of profileEntries) {
      if (idMap.has(entry.value.userId) && entry.value.pseudo) {
        commands.push(['DEL', `${PREFIXES.profile}pseudo:${String(entry.value.pseudo).toLowerCase()}`]);
      }
    }

    for (const profile of profiles) {
      commands.push(['SET', `${PREFIXES.profile}${profile.userId}`, JSON.stringify(profile)]);
      if (profile.pseudo) commands.push(['SET', `${PREFIXES.profile}pseudo:${profile.pseudo.toLowerCase()}`, profile.userId]);
      if (profile.pseudo && profile.privacy?.publicProfile) commands.push(['SADD', PREFIXES.profilePublic, profile.userId]);
    }

    for (const record of entitlements) {
      commands.push(['HSET', `${PREFIXES.entitlements}${record.userId}`, 'updatedAt', new Date().toISOString(), 'pro', record.pro ? '1' : '0']);
      if (record.email) commands.push(['HSET', `${PREFIXES.entitlements}${record.userId}`, 'email', record.email]);
      if (record.tools?.length) commands.push(['SADD', `${PREFIXES.entitlementTools}${record.userId}`, ...record.tools]);
    }

    if (community) commands.push(['SET', PREFIXES.community, JSON.stringify(community)]);

    for (const entry of messageEntries) commands.push(['DEL', entry.key]);
    for (const conversation of messageConversations) {
      commands.push(['SET', `${PREFIXES.message}${conversation.id}`, JSON.stringify(conversation)]);
      for (const participant of conversation.participants) {
        commands.push(['SADD', `${PREFIXES.messageInbox}${participant}`, conversation.id]);
      }
    }

    for (let index = 0; index < commands.length; index += 100) {
      await upstashPipeline(commands.slice(index, index + 100));
    }
  }

  return { mode: 'upstash', groups, changed: idMap.size };
}

const result = hasUpstash ? await migrateUpstash() : await migrateLocal();
console.log(JSON.stringify({
  applied: APPLY,
  ...result,
}, null, 2));
