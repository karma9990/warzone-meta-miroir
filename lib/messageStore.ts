import fs from 'fs';
import path from 'path';
import { hasUpstash, upstashCommand, upstashPipeline } from './upstash';
import { getProfileByPseudo } from '@/lib/profileStore';

const MESSAGES_FILE = path.join(process.cwd(), 'data', 'messages.json');
const MESSAGE_KEY_PREFIX = 'wz:messages:';
const MESSAGE_INDEX_PREFIX = `${MESSAGE_KEY_PREFIX}inbox:`;

export type PrivateMessage = {
  id: string;
  senderId: string;
  senderName: string;
  senderPseudo?: string;
  recipientId: string;
  recipientName: string;
  recipientPseudo?: string;
  body: string;
  createdAt: string;
};

export type MessageConversation = {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  participantPseudos: Record<string, string>;
  messages: PrivateMessage[];
  updatedAt: string;
};

type MessageGlobal = typeof globalThis & {
  __wzMessages?: MessageConversation[];
};

function readLocalMessages(): MessageConversation[] {
  try {
    return JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf-8')) as MessageConversation[];
  } catch {
    return [];
  }
}

function writeLocalMessages(conversations: MessageConversation[]) {
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify(conversations, null, 2));
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function conversationId(a: string, b: string) {
  return [a, b].sort().join(':');
}

async function getConversation(id: string) {
  if (hasUpstash()) {
    const value = await upstashCommand(['GET', `${MESSAGE_KEY_PREFIX}${id}`]);
    return typeof value === 'string' ? JSON.parse(value) as MessageConversation : null;
  }

  if (process.env.NODE_ENV === 'production') {
    const conversations = (globalThis as MessageGlobal).__wzMessages || [];
    return conversations.find((conversation) => conversation.id === id) || null;
  }

  return readLocalMessages().find((conversation) => conversation.id === id) || null;
}

async function saveConversation(conversation: MessageConversation) {
  if (hasUpstash()) {
    await upstashPipeline([
      ['SET', `${MESSAGE_KEY_PREFIX}${conversation.id}`, JSON.stringify(conversation)],
      ['SADD', `${MESSAGE_INDEX_PREFIX}${conversation.participants[0]}`, conversation.id],
      ['SADD', `${MESSAGE_INDEX_PREFIX}${conversation.participants[1]}`, conversation.id],
    ]);
    return;
  }

  if (process.env.NODE_ENV === 'production') {
    const state = globalThis as MessageGlobal;
    const conversations = state.__wzMessages || [];
    const index = conversations.findIndex((entry) => entry.id === conversation.id);
    if (index >= 0) conversations[index] = conversation;
    else conversations.push(conversation);
    state.__wzMessages = conversations;
    return;
  }

  const conversations = readLocalMessages();
  const index = conversations.findIndex((entry) => entry.id === conversation.id);
  if (index >= 0) conversations[index] = conversation;
  else conversations.push(conversation);
  writeLocalMessages(conversations);
}

export async function getMessageInbox(userId: string) {
  if (hasUpstash()) {
    const ids = await upstashCommand(['SMEMBERS', `${MESSAGE_INDEX_PREFIX}${userId}`]);
    if (!Array.isArray(ids)) return [];
    const conversations = await Promise.all(
      ids.filter((id): id is string => typeof id === 'string').map((id) => getConversation(id))
    );
    return conversations
      .filter((conversation): conversation is MessageConversation => Boolean(conversation))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  const conversations = process.env.NODE_ENV === 'production'
    ? ((globalThis as MessageGlobal).__wzMessages || [])
    : readLocalMessages();

  return conversations
    .filter((conversation) => conversation.participants.includes(userId))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function sendPrivateMessage(input: {
  senderId: string;
  senderName: string;
  senderPseudo?: string;
  recipientPseudo: unknown;
  body: unknown;
}) {
  const recipientPseudo = cleanText(input.recipientPseudo, 48);
  const body = cleanText(input.body, 1200);
  if (!recipientPseudo || !body) return { error: 'Recipient and message are required.' };

  const recipientProfile = await getProfileByPseudo(recipientPseudo);
  if (!recipientProfile || !recipientProfile.pseudo || !recipientProfile.privacy.publicProfile) {
    return { error: 'Public recipient profile not found.' };
  }
  if (recipientProfile.userId === input.senderId) {
    return { error: 'You cannot send a private message to yourself.' };
  }

  const id = conversationId(input.senderId, recipientProfile.userId);
  const now = new Date().toISOString();
  const existing = await getConversation(id);
  const conversation: MessageConversation = existing || {
    id,
    participants: [input.senderId, recipientProfile.userId],
    participantNames: {
      [input.senderId]: input.senderName,
      [recipientProfile.userId]: recipientProfile.publicName || recipientProfile.pseudo,
    },
    participantPseudos: {
      [input.senderId]: input.senderPseudo || '',
      [recipientProfile.userId]: recipientProfile.pseudo,
    },
    messages: [],
    updatedAt: now,
  };

  conversation.participantNames[input.senderId] = input.senderName;
  conversation.participantNames[recipientProfile.userId] = recipientProfile.publicName || recipientProfile.pseudo;
  conversation.participantPseudos[input.senderId] = input.senderPseudo || '';
  conversation.participantPseudos[recipientProfile.userId] = recipientProfile.pseudo;
  conversation.messages.push({
    id: `msg-${Date.now().toString(36)}`,
    senderId: input.senderId,
    senderName: input.senderName,
    senderPseudo: input.senderPseudo,
    recipientId: recipientProfile.userId,
    recipientName: recipientProfile.publicName || recipientProfile.pseudo,
    recipientPseudo: recipientProfile.pseudo,
    body,
    createdAt: now,
  });
  conversation.messages = conversation.messages.slice(-80);
  conversation.updatedAt = now;

  await saveConversation(conversation);
  return { conversation };
}
