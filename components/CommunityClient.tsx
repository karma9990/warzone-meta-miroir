'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import AuthButton from '@/components/AuthButton';
import type { CommunityPost, CommunityPostType } from '@/lib/communityStore';

type User = {
  name: string;
  provider: 'google' | 'battlenet' | 'apple' | 'email';
};

type SortMode = 'hot' | 'new' | 'replies';

const typeLabels: Record<CommunityPostType | 'all', string> = {
  all: 'All',
  lfg: 'Find mates',
  discussion: 'Discussions',
  tip: 'Tips',
  patch: 'Patch talk',
};

const starterTags = ['LFG', 'Ranked', 'Resurgence', 'Meta'];

function formatTime(value: string) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function normalizeTags(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 4);
}

export default function CommunityClient({ initialPosts }: { initialPosts: CommunityPost[] }) {
  const [posts, setPosts] = useState(initialPosts);
  const [user, setUser] = useState<User | null>(null);
  const [activeType, setActiveType] = useState<CommunityPostType | 'all'>('all');
  const [sortMode, setSortMode] = useState<SortMode>('hot');
  const [query, setQuery] = useState('');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    type: 'lfg' as CommunityPostType,
    title: '',
    body: '',
    author: '',
    platform: 'Crossplay',
    region: 'EU',
    mode: 'Ranked Resurgence',
    mic: 'Mic required',
    rank: 'Open',
    tags: 'LFG, Ranked, EU',
  });

  useEffect(() => {
    let alive = true;

    fetch('/api/session')
      .then((res) => res.json())
      .then((data) => {
        if (alive) setUser(data.user);
      })
      .catch(() => {
        if (alive) setUser(null);
      });

    fetch('/api/community')
      .then((res) => res.json())
      .then((data) => {
        if (alive && Array.isArray(data)) setPosts(data);
      })
      .catch(() => undefined);

    return () => {
      alive = false;
    };
  }, []);

  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = posts.filter((post) => {
      if (activeType !== 'all' && post.type !== activeType) return false;
      if (!normalizedQuery) return true;

      return [
        post.title,
        post.body,
        post.author,
        post.platform,
        post.region,
        post.mode,
        post.rank,
        ...post.tags,
      ].join(' ').toLowerCase().includes(normalizedQuery);
    });

    return [...filtered].sort((a, b) => {
      if (sortMode === 'new') return b.createdAt.localeCompare(a.createdAt);
      if (sortMode === 'replies') return b.replies.length - a.replies.length;
      return (b.score + b.replies.length * 2) - (a.score + a.replies.length * 2);
    });
  }, [activeType, posts, query, sortMode]);

  const lfgCount = posts.filter((post) => post.type === 'lfg').length;
  const replyCount = posts.reduce((total, post) => total + post.replies.length, 0);

  async function publishPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');

    const res = await fetch('/api/community', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        tags: normalizeTags(form.tags),
      }),
    });

    const data = await res.json();
    setBusy(false);

    if (!res.ok) {
      setError(data.error || 'Unable to publish right now.');
      return;
    }

    setPosts((current) => [data, ...current]);
    setForm((current) => ({
      ...current,
      title: '',
      body: '',
      tags: starterTags.join(', '),
    }));
  }

  async function submitReply(postId: string) {
    const body = replyDrafts[postId]?.trim();
    if (!body) return;

    const res = await fetch(`/api/community/${postId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body, author: form.author }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Unable to reply right now.');
      return;
    }

    setPosts((current) => current.map((post) => post.id === postId ? data : post));
    setReplyDrafts((current) => ({ ...current, [postId]: '' }));
  }

  return (
    <>
      <div className="pt-technical-backdrop" aria-hidden="true" />

      <div className="safari-bar community-safari">
        <Link className="brand-pill" href="/">
          <b>WZ</b>
          <span>Meta</span>
        </Link>
        <nav>
          <Link href="/pro-tools">Pro Tools</Link>
          <Link href="/#all-loadouts">Loadouts</Link>
          <Link href="/set-up">Set-up</Link>
          <Link href="/esport">Esport</Link>
          <Link href="/community" aria-current="page">Community</Link>
        </nav>
        <label>
          <span>Search</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Mate, rank, loadout" />
        </label>
        <AuthButton />
        <div className="nav-readout" aria-hidden="true">
          <span>{posts.length} POSTS</span>
          <span>{lfgCount} LFG ACTIVE</span>
          <span>CHAT: LIVE</span>
        </div>
      </div>

      <main className="community-main">
        <header className="community-hero">
          <div>
            <span>WZ SOCIAL HUB</span>
            <h1>COMMUNITY</h1>
            <p>A Reddit-style space to ask questions, share builds, find squadmates and organize sessions directly on the site.</p>
          </div>
          <aside aria-label="Community stats">
            <strong>{posts.length}</strong>
            <small>threads</small>
            <strong>{replyCount}</strong>
            <small>replies</small>
          </aside>
        </header>

        <section className="community-layout">
          <aside className="community-compose">
            <div className="community-panel-head">
              <span>POST</span>
              <h2>Start a thread</h2>
            </div>
            <form onSubmit={publishPost}>
              <label>
                Type
                <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as CommunityPostType })}>
                  <option value="lfg">Find mates</option>
                  <option value="discussion">Discussion</option>
                  <option value="tip">Tip / guide</option>
                  <option value="patch">Patch talk</option>
                </select>
              </label>
              {!user && (
                <div className="community-signin-note">
                  <strong>Sign in to post</strong>
                  <p>Reading is open. To publish, reply or vote, sign in with your WZ Meta account.</p>
                  <Link href="/sign-in">Sign in</Link>
                </div>
              )}
              <label>
                Title
                <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Looking for a ranked duo tonight" required />
              </label>
              <label>
                Message
                <textarea value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} placeholder="Mode, time, rank, playstyle..." required />
              </label>
              <div className="community-form-grid">
                <label>
                  Region
                  <select value={form.region} onChange={(event) => setForm({ ...form, region: event.target.value })}>
                    <option>EU</option>
                    <option>NA</option>
                    <option>LATAM</option>
                    <option>Global</option>
                  </select>
                </label>
                <label>
                  Platform
                  <select value={form.platform} onChange={(event) => setForm({ ...form, platform: event.target.value })}>
                    <option>Crossplay</option>
                    <option>PC</option>
                    <option>PlayStation</option>
                    <option>Xbox</option>
                  </select>
                </label>
              </div>
              <div className="community-form-grid">
                <label>
                  Mode
                  <input value={form.mode} onChange={(event) => setForm({ ...form, mode: event.target.value })} />
                </label>
                <label>
                  Rank
                  <input value={form.rank} onChange={(event) => setForm({ ...form, rank: event.target.value })} />
                </label>
              </div>
              <label>
                Mic
                <select value={form.mic} onChange={(event) => setForm({ ...form, mic: event.target.value })}>
                  <option>Mic required</option>
                  <option>Mic recommended</option>
                  <option>Optional</option>
                </select>
              </label>
              <label>
                Tags
                <input value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} placeholder="LFG, Ranked, EU" />
              </label>
              {error && <p className="community-error">{error}</p>}
              <button type="submit" disabled={busy || !user}>{busy ? 'Publishing...' : 'Publish'}</button>
            </form>
          </aside>

          <section className="community-feed" aria-label="Community feed">
            <div className="community-toolbar">
              <div>
                {(Object.keys(typeLabels) as Array<CommunityPostType | 'all'>).map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={activeType === type ? 'is-active' : undefined}
                    onClick={() => setActiveType(type)}
                  >
                    {typeLabels[type]}
                  </button>
                ))}
              </div>
              <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} aria-label="Sort posts">
                <option value="hot">Hot</option>
                <option value="new">New</option>
                <option value="replies">Most replies</option>
              </select>
            </div>

            <div className="community-posts">
              {filteredPosts.map((post) => (
                <article className="community-post" key={post.id}>
                  <div className="community-post-body">
                    <div className="community-post-meta">
                      <span>{typeLabels[post.type]}</span>
                      <small>{post.author} / {post.region} / {formatTime(post.createdAt)}</small>
                    </div>
                    <h2>{post.title}</h2>
                    <p>{post.body}</p>
                    <div className="community-tags">
                      <span>{post.platform}</span>
                      <span>{post.mode}</span>
                      <span>{post.rank}</span>
                      <span>{post.mic}</span>
                      {post.tags.map((tag) => <span key={tag}>{tag}</span>)}
                    </div>
                    <div className="community-replies">
                      {post.replies.map((reply) => (
                        <div key={reply.id}>
                          <strong>{reply.author}</strong>
                          <span>{formatTime(reply.createdAt)}</span>
                          <p>{reply.body}</p>
                        </div>
                      ))}
                    </div>
                    <div className="community-reply-box">
                      <input
                        value={replyDrafts[post.id] ?? ''}
                        onChange={(event) => setReplyDrafts({ ...replyDrafts, [post.id]: event.target.value })}
                        placeholder={user ? 'Reply, suggest a session, share a build...' : 'Sign in to reply'}
                        disabled={!user}
                      />
                      <button type="button" onClick={() => submitReply(post.id)} disabled={!user}>Reply</button>
                    </div>
                  </div>
                </article>
              ))}
              {filteredPosts.length === 0 && (
                <div className="community-empty">
                  <strong>No thread found</strong>
                  <p>Change the filters or start the first post for this search.</p>
                </div>
              )}
            </div>
          </section>
        </section>
      </main>
    </>
  );
}
