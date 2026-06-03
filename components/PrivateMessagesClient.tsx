'use client';

import LocalizedLink from '@/components/LocalizedLink';
import { FormEvent, useMemo, useState } from 'react';
import type { MessageConversation } from '@/lib/messageStore';

type PrivateMessagesClientProps = {
  currentUserId: string;
  initialConversations: MessageConversation[];
  initialRecipient?: string;
  lockRecipient?: boolean;
};

function formatTime(value: string) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function otherParticipant(conversation: MessageConversation, currentUserId: string) {
  const otherId = conversation.participants.find((id) => id !== currentUserId) || conversation.participants[0];
  return {
    id: otherId,
    name: conversation.participantPseudos[otherId] || conversation.participantNames[otherId] || 'Player',
  };
}

export default function PrivateMessagesClient({
  currentUserId,
  initialConversations,
  initialRecipient = '',
  lockRecipient = false,
}: PrivateMessagesClientProps) {
  const [conversations, setConversations] = useState(initialConversations);
  const [recipientPseudo, setRecipientPseudo] = useState(initialRecipient);
  const [body, setBody] = useState('');
  const [activeId, setActiveId] = useState(() => {
    if (!initialRecipient) return initialConversations[0]?.id || '';
    const match = initialConversations.find((conversation) => {
      const other = otherParticipant(conversation, currentUserId);
      return other.name.toLowerCase() === initialRecipient.toLowerCase();
    });
    return match?.id || '';
  });
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const activeConversation = useMemo(() => (
    conversations.find((conversation) => conversation.id === activeId) || null
  ), [activeId, conversations]);
  const visibleConversations = useMemo(() => {
    if (!lockRecipient || !initialRecipient) return conversations;
    return conversations.filter((conversation) => {
      const other = otherParticipant(conversation, currentUserId);
      return other.name.toLowerCase() === initialRecipient.toLowerCase();
    });
  }, [conversations, currentUserId, initialRecipient, lockRecipient]);

  async function refreshInbox() {
    const res = await fetch('/api/messages');
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data)) setConversations(data);
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('');

    const cleanRecipient = recipientPseudo.trim();
    const cleanBody = body.trim();
    if (!cleanRecipient || !cleanBody) {
      setStatus('Choose a player and write a message.');
      return;
    }

    setBusy(true);
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientPseudo: cleanRecipient, body: cleanBody }),
    });
    const data = await res.json();
    setBusy(false);

    if (!res.ok) {
      setStatus(data.error || 'Unable to send message.');
      return;
    }

    setBody('');
    setStatus('Message sent.');
    setActiveId(data.id);
    setConversations((current) => [data, ...current.filter((conversation) => conversation.id !== data.id)]);
    await refreshInbox();
  }

  function selectConversation(conversation: MessageConversation) {
    const other = otherParticipant(conversation, currentUserId);
    if (lockRecipient && initialRecipient && other.name.toLowerCase() !== initialRecipient.toLowerCase()) {
      return;
    }

    setActiveId(conversation.id);
    setRecipientPseudo(other.name);
    setStatus('');
  }

  return (
    <main className="messages-page">
      <nav className="messages-topbar" aria-label="Messages navigation">
        <LocalizedLink href="/">WZPRO Meta</LocalizedLink>
        <LocalizedLink href="/community">Community</LocalizedLink>
        <LocalizedLink href="/account">Account</LocalizedLink>
      </nav>

      <header className="messages-hero">
        <span>PRIVATE COMMS</span>
        <h1>Messages</h1>
        <p>Talk privately with public WZPRO Meta players, plan sessions, exchange IDs and confirm roles before queueing.</p>
      </header>

      <section className="messages-shell">
        <aside className="messages-inbox" aria-label="Private conversations">
          <div className="messages-panel-head">
            <span>Inbox</span>
            <strong>{visibleConversations.length}</strong>
          </div>
          {visibleConversations.length > 0 ? visibleConversations.map((conversation) => {
            const other = otherParticipant(conversation, currentUserId);
            const last = conversation.messages.at(-1);
            return (
              <button
                type="button"
                key={conversation.id}
                className={conversation.id === activeId ? 'is-active' : undefined}
                onClick={() => selectConversation(conversation)}
              >
                <strong>{other.name}</strong>
                <span>{last?.body || 'No message yet.'}</span>
                <small>{last ? formatTime(last.createdAt) : 'New'}</small>
              </button>
            );
          }) : (
            <div className="messages-empty">
              <strong>No private messages yet</strong>
              <p>
                {lockRecipient
                  ? `No conversation with ${recipientPseudo || 'this player'} yet.`
                  : 'Open a public profile and press DM, or type a player pseudo here.'}
              </p>
            </div>
          )}
        </aside>

        <section className="messages-thread" aria-label="Selected conversation">
          <div className="messages-panel-head">
            <span>Conversation</span>
            {recipientPseudo && <strong>{recipientPseudo}</strong>}
          </div>

          <div className="messages-thread-log">
            {activeConversation ? activeConversation.messages.map((message) => {
              const mine = message.senderId === currentUserId;
              return (
                <article key={message.id} className={mine ? 'is-mine' : undefined}>
                  <span>{mine ? 'You' : message.senderPseudo || message.senderName}</span>
                  <p>{message.body}</p>
                  <small>{formatTime(message.createdAt)}</small>
                </article>
              );
            }) : (
              <div className="messages-empty">
                <strong>Start a private message</strong>
                <p>Messages are only between signed-in users and public player profiles.</p>
              </div>
            )}
          </div>

          <form className="messages-compose" onSubmit={sendMessage}>
            <label>
              Player pseudo
              {lockRecipient ? (
                <div className="messages-recipient-lock" aria-label={`Recipient ${recipientPseudo}`}>
                  {recipientPseudo}
                </div>
              ) : (
                <input
                  value={recipientPseudo}
                  onChange={(event) => setRecipientPseudo(event.target.value)}
                  placeholder="CodexTest"
                />
              )}
            </label>
            <label>
              Message
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Write a private message..."
              />
            </label>
            {status && <p>{status}</p>}
            <button type="submit" disabled={busy}>{busy ? 'Sending...' : 'Send message'}</button>
          </form>
        </section>
      </section>

      <style>{`
        .messages-page {
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;
          padding: 2rem 0 6rem;
          color: var(--tm-ink, #10100e);
          font-family: var(--font-mono, monospace);
        }
        .messages-topbar {
          display: flex;
          flex-wrap: wrap;
          gap: 0.8rem;
          margin-bottom: 1.2rem;
        }
        .messages-topbar a {
          color: inherit;
          font-size: 0.65rem;
          font-weight: 900;
          opacity: 0.62;
          text-decoration: none;
          text-transform: uppercase;
        }
        .messages-hero {
          padding: 2rem 0;
          border-bottom: 1px solid rgba(16,16,14,0.14);
        }
        .messages-hero span,
        .messages-panel-head span,
        .messages-compose label {
          color: #163cff;
          font-size: 0.64rem;
          font-weight: 950;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }
        .messages-hero h1 {
          margin: 0.55rem 0 0.75rem;
          font-size: clamp(2.8rem, 9vw, 6rem);
          line-height: 0.88;
          text-transform: uppercase;
        }
        .messages-hero p,
        .messages-empty p,
        .messages-compose p {
          max-width: 720px;
          margin: 0;
          color: rgba(16,16,14,0.62);
          font-size: 0.84rem;
          line-height: 1.7;
        }
        .messages-shell {
          display: grid;
          grid-template-columns: 340px minmax(0, 1fr);
          gap: 1rem;
          margin-top: 1rem;
          align-items: start;
        }
        .messages-inbox,
        .messages-thread {
          border: 1px solid rgba(16,16,14,0.14);
          background: rgba(239,238,232,0.78);
          padding: 1rem;
        }
        .messages-panel-head {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: center;
          margin-bottom: 1rem;
        }
        .messages-panel-head strong {
          color: #163cff;
          text-transform: uppercase;
        }
        .messages-inbox {
          display: grid;
          gap: 0.55rem;
        }
        .messages-inbox button {
          display: grid;
          gap: 0.25rem;
          width: 100%;
          min-height: 78px;
          border: 1px solid rgba(16,16,14,0.10);
          background: rgba(16,16,14,0.025);
          color: inherit;
          cursor: pointer;
          font: inherit;
          padding: 0.75rem;
          text-align: left;
        }
        .messages-inbox button.is-active {
          border-color: #163cff;
          background: rgba(22,60,255,0.055);
        }
        .messages-inbox button strong {
          text-transform: uppercase;
        }
        .messages-inbox button span {
          overflow: hidden;
          color: rgba(16,16,14,0.62);
          font-size: 0.72rem;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .messages-inbox button small,
        .messages-thread-log small {
          color: rgba(16,16,14,0.45);
          font-size: 0.58rem;
          text-transform: uppercase;
        }
        .messages-thread-log {
          display: grid;
          gap: 0.6rem;
          min-height: 340px;
          align-content: end;
          padding: 1rem;
          border: 1px solid rgba(16,16,14,0.10);
          background: rgba(16,16,14,0.025);
        }
        .messages-thread-log article {
          display: grid;
          justify-self: start;
          max-width: min(86%, 620px);
          gap: 0.3rem;
          padding: 0.75rem;
          border: 1px solid rgba(16,16,14,0.10);
          background: rgba(239,238,232,0.86);
        }
        .messages-thread-log article.is-mine {
          justify-self: end;
          border-color: rgba(22,60,255,0.22);
          background: rgba(22,60,255,0.06);
        }
        .messages-thread-log span {
          color: #163cff;
          font-size: 0.62rem;
          font-weight: 900;
          text-transform: uppercase;
        }
        .messages-thread-log p {
          margin: 0;
          color: rgba(16,16,14,0.72);
          font-size: 0.84rem;
          line-height: 1.55;
        }
        .messages-compose {
          display: grid;
          gap: 0.75rem;
          margin-top: 1rem;
        }
        .messages-compose label {
          display: grid;
          gap: 0.4rem;
        }
        .messages-compose input,
        .messages-recipient-lock,
        .messages-compose textarea {
          width: 100%;
          border: 1px solid rgba(16,16,14,0.16);
          background: rgba(239,238,232,0.86);
          color: inherit;
          font: inherit;
          font-size: 0.82rem;
          padding: 0.75rem;
        }
        .messages-recipient-lock {
          color: #163cff;
          font-weight: 900;
          text-transform: none;
        }
        .messages-compose textarea {
          min-height: 118px;
          resize: vertical;
        }
        .messages-compose button {
          width: fit-content;
          min-height: 42px;
          border: 1px solid #163cff;
          background: #163cff;
          color: #fff;
          cursor: pointer;
          font: inherit;
          font-size: 0.7rem;
          font-weight: 950;
          padding: 0 1rem;
          text-transform: uppercase;
        }
        .messages-compose button:disabled {
          cursor: wait;
          opacity: 0.6;
        }
        .messages-empty {
          display: grid;
          gap: 0.55rem;
          padding: 1rem;
          border: 1px solid rgba(16,16,14,0.10);
        }
        .messages-empty strong {
          text-transform: uppercase;
        }
        @media (max-width: 860px) {
          .messages-shell {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 560px) {
          .messages-page {
            width: min(100% - 28px, 520px);
          }
          .messages-thread-log article {
            max-width: 100%;
          }
          .messages-compose button {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}
