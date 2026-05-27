import fs from 'fs';
import path from 'path';

const COMMUNITY_FILE = path.join(process.cwd(), 'data', 'community.json');
const COMMUNITY_KEY = 'wz:community:posts';

export type CommunityPostType = 'discussion' | 'lfg' | 'tip' | 'patch';

export type CommunityReply = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
};

export type CommunityPost = {
  id: string;
  type: CommunityPostType;
  title: string;
  body: string;
  author: string;
  platform: string;
  region: string;
  mode: string;
  mic: string;
  rank: string;
  tags: string[];
  createdAt: string;
  score: number;
  replies: CommunityReply[];
};

type CommunityGlobal = typeof globalThis & {
  __wzCommunityPosts?: CommunityPost[];
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
    throw new Error('Community storage request failed.');
  }

  const data = await res.json() as Array<{ result: unknown }>;
  return data[0]?.result;
}

function readLocalPosts() {
  try {
    return JSON.parse(fs.readFileSync(COMMUNITY_FILE, 'utf-8')) as CommunityPost[];
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

export async function getCommunityPosts(): Promise<CommunityPost[]> {
  if (hasUpstash()) {
    const value = await upstash(['GET', COMMUNITY_KEY]);
    if (typeof value === 'string') return JSON.parse(value) as CommunityPost[];

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
    await upstash(['SET', COMMUNITY_KEY, JSON.stringify(posts)]);
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
  const type = sanitizeText(input.type, 24) as CommunityPostType;

  if (!title || !body) {
    return { error: 'Title and message are required.' };
  }

  const posts = await getCommunityPosts();
  const post: CommunityPost = {
    id: `${slugify(title)}-${Date.now().toString(36)}`,
    type: ['discussion', 'lfg', 'tip', 'patch'].includes(type) ? type : 'discussion',
    title,
    body,
    author,
    platform: sanitizeText(input.platform, 32) || 'Crossplay',
    region: sanitizeText(input.region, 24) || 'Global',
    mode: sanitizeText(input.mode, 48) || 'Warzone',
    mic: sanitizeText(input.mic, 32) || 'Optional',
    rank: sanitizeText(input.rank, 32) || 'Open',
    tags: Array.isArray(input.tags)
      ? input.tags.map((tag) => sanitizeText(tag, 18)).filter(Boolean).slice(0, 4)
      : [],
    createdAt: new Date().toISOString(),
    score: 1,
    replies: [],
  };

  await saveCommunityPosts([post, ...posts]);
  return { post };
}

export async function addCommunityReply(postId: string, input: Record<string, unknown>, fallbackAuthor: string) {
  const body = sanitizeText(input.body, 600);
  const author = sanitizeText(fallbackAuthor, 32) || 'Operator';

  if (!body) return { error: 'Reply is required.' };

  const posts = await getCommunityPosts();
  const post = posts.find((entry) => entry.id === postId);
  if (!post) return { error: 'Post not found.' };

  const reply: CommunityReply = {
    id: `reply-${Date.now().toString(36)}`,
    author,
    body,
    createdAt: new Date().toISOString(),
  };

  post.replies.push(reply);
  await saveCommunityPosts(posts);
  return { reply, post };
}

export async function voteCommunityPost(postId: string, delta: number) {
  const posts = await getCommunityPosts();
  const post = posts.find((entry) => entry.id === postId);
  if (!post) return { error: 'Post not found.' };

  post.score = Math.max(0, post.score + (delta > 0 ? 1 : -1));
  await saveCommunityPosts(posts);
  return { post };
}
