import fs from 'fs';
import path from 'path';
import { hasUpstash, upstashCommand } from './upstash';
import { validateCommunityText } from '@/lib/contentModeration';

const COMMUNITY_FILE = path.join(process.cwd(), 'data', 'community.json');
const COMMUNITY_KEY = 'wz:community:posts';

export type CommunityPostType = 'discussion' | 'lfg' | 'tip' | 'patch';

export type CommunityReply = {
  id: string;
  author: string;
  authorPseudo?: string;
  body: string;
  createdAt: string;
};

export type CommunityJoinRequest = {
  id: string;
  userId: string;
  author: string;
  authorPseudo?: string;
  body: string;
  createdAt: string;
};

export type CommunityPost = {
  id: string;
  type: CommunityPostType;
  title: string;
  body: string;
  author: string;
  authorId?: string;
  authorPseudo?: string;
  authorPlatform?: string;
  authorInput?: string;
  authorRole?: string;
  platform: string;
  region: string;
  mode: string;
  mic: string;
  rank: string;
  language?: string;
  availability?: string;
  expiresAt?: string;
  tags: string[];
  createdAt: string;
  score: number;
  votes?: Record<string, number>;
  reports?: number;
  hidden?: boolean;
  joinRequests?: CommunityJoinRequest[];
  replies: CommunityReply[];
};

type CommunityGlobal = typeof globalThis & {
  __wzCommunityPosts?: CommunityPost[];
};

function readLocalPosts() {
  try {
    return normalizeSeedPosts(JSON.parse(fs.readFileSync(COMMUNITY_FILE, 'utf-8')) as CommunityPost[]);
  } catch {
    return [];
  }
}

function writeLocalPosts(posts: CommunityPost[]) {
  fs.writeFileSync(COMMUNITY_FILE, JSON.stringify(posts, null, 2));
}

function sanitizeText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 42);

  return slug || 'post';
}

function normalizeSeedPosts(posts: CommunityPost[]) {
  return posts.map((post) => {
    const normalized: CommunityPost = {
      ...post,
      language: post.language || 'English',
      availability: post.availability || '',
      votes: post.votes || {},
      reports: post.reports || 0,
      hidden: Boolean(post.hidden),
      joinRequests: post.joinRequests || [],
      replies: post.replies || [],
    };

    if (post.id === 'lfg-ranked-resurgence') {
      return {
        ...normalized,
        title: 'Looking for two ranked Resurgence teammates tonight',
        body: 'Goal: clean rotations, short callouts, no rage quit. I play SMG support and I am available 21:00-00:00.',
        authorPseudo: normalized.authorPseudo || 'Nox',
        authorPlatform: normalized.authorPlatform || 'Crossplay',
        authorInput: normalized.authorInput || 'Controller',
        authorRole: normalized.authorRole || 'SMG support',
        availability: normalized.availability || 'Tonight 21:00-00:00',
        replies: post.replies.map((reply) => reply.id === 'reply-1'
          ? { ...reply, body: 'I am in. AR anchor, Diamond too. I can start around 21:15.' }
          : reply),
      };
    }

    if (post.id === 'discussion-meta-smg') {
      return {
        ...normalized,
        title: 'Which SMG are you running after the latest patch?',
        body: 'Carbon 57 feels more reliable up close, but I still see a lot of VST. What builds are you using?',
        authorPseudo: normalized.authorPseudo || 'Mira',
        authorRole: normalized.authorRole || 'Close-range',
        replies: post.replies.map((reply) => reply.id === 'reply-2'
          ? { ...reply, body: 'VST if you want full mobility, Carbon if you want to win duels a little farther out.' }
          : reply),
      };
    }

    if (post.id === 'tip-comms-stack') {
      return {
        ...normalized,
        title: 'Callout template for playing with new teammates',
        body: 'Before queueing: decide who IGLs, who carries smokes, and who calls rotations. In game: position, number, armor, intention. Example: Prison roof, two, cracked one, I hold cross.',
        authorPseudo: normalized.authorPseudo || 'Raven',
        authorRole: normalized.authorRole || 'IGL',
      };
    }

    return normalized;
  });
}

export async function getCommunityPosts(): Promise<CommunityPost[]> {
  if (hasUpstash()) {
    const value = await upstashCommand(['GET', COMMUNITY_KEY]);
    if (typeof value === 'string') return normalizeSeedPosts(JSON.parse(value) as CommunityPost[]);

    const seed = readLocalPosts();
    await saveCommunityPosts(seed);
    return seed;
  }

  if (process.env.NODE_ENV === 'production') {
    const current = (globalThis as CommunityGlobal).__wzCommunityPosts;
    if (current) return current;
    const seed = readLocalPosts();
    (globalThis as CommunityGlobal).__wzCommunityPosts = seed;
    return seed;
  }

  return readLocalPosts();
}

export async function saveCommunityPosts(posts: CommunityPost[]) {
  if (hasUpstash()) {
    await upstashCommand(['SET', COMMUNITY_KEY, JSON.stringify(posts)]);
    return;
  }

  if (process.env.NODE_ENV === 'production') {
    (globalThis as CommunityGlobal).__wzCommunityPosts = posts;
    return;
  }

  writeLocalPosts(posts);
}

export async function createCommunityPost(input: Record<string, unknown>, fallbackAuthor: string) {
  const title = sanitizeText(input.title, 96);
  const body = sanitizeText(input.body, 900);
  const author = sanitizeText(fallbackAuthor, 32) || 'Operator';
  const authorId = sanitizeText(input.authorId, 120);
  const authorPseudo = sanitizeText(input.authorPseudo, 48);
  const type = sanitizeText(input.type, 24) as CommunityPostType;

  if (!title || !body) {
    return { error: 'Title and message are required.' };
  }

  const moderation = validateCommunityText(
    title,
    body,
    input.platform,
    input.region,
    input.mode,
    input.mic,
    input.rank,
    input.language,
    input.availability,
    ...(Array.isArray(input.tags) ? input.tags : [])
  );
  if (moderation) return moderation;

  const posts = await getCommunityPosts();
  const post: CommunityPost = {
    id: `${slugify(title)}-${Date.now().toString(36)}`,
    type: ['discussion', 'lfg', 'tip', 'patch'].includes(type) ? type : 'discussion',
    title,
    body,
    author,
    authorId,
    authorPseudo,
    authorPlatform: sanitizeText(input.authorPlatform, 32),
    authorInput: sanitizeText(input.authorInput, 32),
    authorRole: sanitizeText(input.authorRole, 48),
    platform: sanitizeText(input.platform, 32) || 'Crossplay',
    region: sanitizeText(input.region, 24) || 'Global',
    mode: sanitizeText(input.mode, 48) || 'Warzone',
    mic: sanitizeText(input.mic, 32) || 'Optional',
    rank: sanitizeText(input.rank, 32) || 'Open',
    language: sanitizeText(input.language, 32) || 'English',
    availability: sanitizeText(input.availability, 80),
    expiresAt: type === 'lfg' ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : '',
    tags: Array.isArray(input.tags)
      ? input.tags.map((tag) => sanitizeText(tag, 18)).filter(Boolean).slice(0, 4)
      : [],
    createdAt: new Date().toISOString(),
    score: 1,
    votes: {},
    reports: 0,
    hidden: false,
    joinRequests: [],
    replies: [],
  };

  await saveCommunityPosts([post, ...posts]);
  return { post };
}

export async function addCommunityReply(postId: string, input: Record<string, unknown>, fallbackAuthor: string) {
  const body = sanitizeText(input.body, 600);
  const author = sanitizeText(fallbackAuthor, 32) || 'Operator';
  const authorPseudo = sanitizeText(input.authorPseudo, 48);

  if (!body) return { error: 'Reply is required.' };
  const moderation = validateCommunityText(body);
  if (moderation) return moderation;

  const posts = await getCommunityPosts();
  const post = posts.find((entry) => entry.id === postId);
  if (!post) return { error: 'Post not found.' };

  const reply: CommunityReply = {
    id: `reply-${Date.now().toString(36)}`,
    author,
    authorPseudo,
    body,
    createdAt: new Date().toISOString(),
  };

  post.replies.push(reply);
  await saveCommunityPosts(posts);
  return { reply, post };
}

export async function voteCommunityPost(postId: string, delta: number, userId: string) {
  const posts = await getCommunityPosts();
  const post = posts.find((entry) => entry.id === postId);
  if (!post) return { error: 'Post not found.' };

  post.votes = post.votes || {};
  const nextVote = delta > 0 ? 1 : -1;
  const previousVote = post.votes[userId] || 0;
  post.votes[userId] = previousVote === nextVote ? 0 : nextVote;
  post.score = Math.max(0, Object.values(post.votes).reduce((total, vote) => total + vote, 1));
  await saveCommunityPosts(posts);
  return { post };
}

export async function reportCommunityPost(postId: string) {
  const posts = await getCommunityPosts();
  const post = posts.find((entry) => entry.id === postId);
  if (!post) return { error: 'Post not found.' };

  post.reports = (post.reports || 0) + 1;
  if (post.reports >= 5) post.hidden = true;
  await saveCommunityPosts(posts);
  return { post };
}

export async function setCommunityPostHidden(postId: string, hidden: boolean) {
  const posts = await getCommunityPosts();
  const post = posts.find((entry) => entry.id === postId);
  if (!post) return { error: 'Post not found.' };

  post.hidden = hidden;
  await saveCommunityPosts(posts);
  return { post };
}

export async function deleteCommunityPost(postId: string) {
  const posts = await getCommunityPosts();
  const nextPosts = posts.filter((entry) => entry.id !== postId);
  if (nextPosts.length === posts.length) return { error: 'Post not found.' };

  await saveCommunityPosts(nextPosts);
  return { ok: true };
}

export async function requestJoinCommunityPost(postId: string, input: Record<string, unknown>, user: { id: string; name: string; pseudo?: string }) {
  const posts = await getCommunityPosts();
  const post = posts.find((entry) => entry.id === postId);
  if (!post) return { error: 'Post not found.' };
  if (post.type !== 'lfg') return { error: 'Join requests are only available on LFG posts.' };

  post.joinRequests = post.joinRequests || [];
  if (post.joinRequests.some((request) => request.userId === user.id)) {
    return { error: 'You already asked to join this squad.' };
  }

  const body = sanitizeText(input.body, 240) || 'I would like to join this session.';
  const moderation = validateCommunityText(body);
  if (moderation) return moderation;

  post.joinRequests.push({
    id: `join-${Date.now().toString(36)}`,
    userId: user.id,
    author: user.name,
    authorPseudo: user.pseudo,
    body,
    createdAt: new Date().toISOString(),
  });

  await saveCommunityPosts(posts);
  return { post };
}
