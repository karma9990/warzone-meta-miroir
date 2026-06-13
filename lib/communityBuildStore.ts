import fs from 'fs';
import path from 'path';
import { hasUpstash, upstashCommand, warnIfEphemeralWrite } from './upstash';
import { validateCommunityText } from '@/lib/contentModeration';

const BUILDS_FILE = path.join(process.cwd(), 'data', 'community-builds.json');
const BUILDS_KEY = 'wz:community:builds';

export type BuildAttachment = { slot: string; name: string };

export type CommunityBuild = {
  id: string;
  weapon: string;
  weaponId?: string;
  category: string;
  playstyle: string;
  attachments: BuildAttachment[];
  notes: string;
  author: string;
  authorId: string;
  authorPseudo?: string;
  createdAt: string;
  votes: Record<string, number>;
  score: number;
  reports: number;
  hidden: boolean;
};

type BuildsGlobal = typeof globalThis & {
  __wzCommunityBuilds?: CommunityBuild[];
};

function sanitizeText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function slugify(value: string) {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 42);
  return slug || 'build';
}

function sanitizeAttachments(value: unknown): BuildAttachment[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => ({
      slot: sanitizeText((entry as Partial<BuildAttachment>)?.slot, 32),
      name: sanitizeText((entry as Partial<BuildAttachment>)?.name, 48),
    }))
    .filter((entry) => entry.slot && entry.name)
    .slice(0, 8);
}

function readLocal(): CommunityBuild[] {
  try {
    return JSON.parse(fs.readFileSync(BUILDS_FILE, 'utf-8')) as CommunityBuild[];
  } catch {
    return [];
  }
}

function writeLocal(builds: CommunityBuild[]) {
  warnIfEphemeralWrite('community-builds');
  fs.mkdirSync(path.dirname(BUILDS_FILE), { recursive: true });
  fs.writeFileSync(BUILDS_FILE, JSON.stringify(builds, null, 2));
}

export async function getCommunityBuilds(): Promise<CommunityBuild[]> {
  if (hasUpstash()) {
    const value = await upstashCommand(['GET', BUILDS_KEY]);
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as CommunityBuild[];
      } catch {
        return [];
      }
    }
    return [];
  }

  if (process.env.NODE_ENV === 'production') {
    return (globalThis as BuildsGlobal).__wzCommunityBuilds ?? [];
  }

  return readLocal();
}

export async function saveCommunityBuilds(builds: CommunityBuild[]) {
  if (hasUpstash()) {
    await upstashCommand(['SET', BUILDS_KEY, JSON.stringify(builds)]);
    return;
  }
  if (process.env.NODE_ENV === 'production') {
    (globalThis as BuildsGlobal).__wzCommunityBuilds = builds;
    return;
  }
  writeLocal(builds);
}

/** Public list, hidden builds removed, ranked by score then recency (leaderboard order). */
export async function getRankedBuilds(): Promise<CommunityBuild[]> {
  const builds = await getCommunityBuilds();
  return builds
    .filter((build) => !build.hidden)
    .sort((a, b) => b.score - a.score || b.createdAt.localeCompare(a.createdAt));
}

export async function createCommunityBuild(
  input: Record<string, unknown>,
  user: { id: string; name: string; pseudo?: string },
): Promise<{ build: CommunityBuild } | { error: string }> {
  const weapon = sanitizeText(input.weapon, 48);
  const notes = sanitizeText(input.notes, 600);
  const attachments = sanitizeAttachments(input.attachments);

  if (!weapon) return { error: 'A weapon name is required.' };
  if (attachments.length === 0) return { error: 'Add at least one attachment.' };

  const moderation = validateCommunityText(
    weapon,
    notes,
    input.playstyle,
    input.category,
    ...attachments.map((entry) => entry.name),
  );
  if (moderation) return moderation;

  const builds = await getCommunityBuilds();
  const build: CommunityBuild = {
    id: `${slugify(weapon)}-${Date.now().toString(36)}`,
    weapon,
    weaponId: sanitizeText(input.weaponId, 80) || undefined,
    category: sanitizeText(input.category, 32) || 'Assault Rifle',
    playstyle: sanitizeText(input.playstyle, 32) || 'All-round',
    attachments,
    notes,
    author: sanitizeText(user.name, 32) || 'Operator',
    authorId: user.id,
    authorPseudo: user.pseudo,
    createdAt: new Date().toISOString(),
    votes: {},
    score: 1,
    reports: 0,
    hidden: false,
  };

  await saveCommunityBuilds([build, ...builds]);
  return { build };
}

export async function voteCommunityBuild(buildId: string, delta: number, userId: string) {
  const builds = await getCommunityBuilds();
  const build = builds.find((entry) => entry.id === buildId);
  if (!build) return { error: 'Build not found.' };

  build.votes = build.votes || {};
  const nextVote = delta > 0 ? 1 : -1;
  const previousVote = build.votes[userId] || 0;
  build.votes[userId] = previousVote === nextVote ? 0 : nextVote;
  build.score = Math.max(0, Object.values(build.votes).reduce((total, vote) => total + vote, 1));
  await saveCommunityBuilds(builds);
  return { build };
}

export async function reportCommunityBuild(buildId: string) {
  const builds = await getCommunityBuilds();
  const build = builds.find((entry) => entry.id === buildId);
  if (!build) return { error: 'Build not found.' };

  build.reports = (build.reports || 0) + 1;
  if (build.reports >= 5) build.hidden = true;
  await saveCommunityBuilds(builds);
  return { build };
}
