import fs from 'fs';
import path from 'path';
import { hasUpstash, upstashPipeline } from './upstash';

const NEWSLETTER_FILE = path.join(process.cwd(), 'data', 'newsletter-subscribers.json');
const NEWSLETTER_KEY_PREFIX = 'wz:newsletter:';
const NEWSLETTER_INDEX_KEY = 'wz:newsletter:index';

export type NewsletterSubscriber = {
  email: string;
  source: string;
  subscribedAt: string;
  updatedAt: string;
};

function readLocalSubscribers(): NewsletterSubscriber[] {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Local newsletter storage is disabled in production. Configure Upstash Redis.');
  }

  try {
    return JSON.parse(fs.readFileSync(NEWSLETTER_FILE, 'utf-8')) as NewsletterSubscriber[];
  } catch {
    return [];
  }
}

function writeLocalSubscribers(records: NewsletterSubscriber[]) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Local newsletter storage is disabled in production. Configure Upstash Redis.');
  }

  fs.writeFileSync(NEWSLETTER_FILE, JSON.stringify(records, null, 2));
}

export async function saveNewsletterSubscriber(input: { email: string; source?: string }) {
  const now = new Date().toISOString();
  const source = input.source || 'subscribe-page';
  const key = `${NEWSLETTER_KEY_PREFIX}${input.email}`;

  if (hasUpstash()) {
    const existing = await upstashPipeline([
      ['HGET', key, 'subscribedAt'],
    ]);
    const subscribedAt = typeof existing[0]?.result === 'string' ? existing[0].result : now;
    const record: NewsletterSubscriber = {
      email: input.email,
      source,
      subscribedAt,
      updatedAt: now,
    };

    await upstashPipeline([
      ['HSET', key, 'email', record.email, 'source', record.source, 'subscribedAt', record.subscribedAt, 'updatedAt', record.updatedAt],
      ['SADD', NEWSLETTER_INDEX_KEY, record.email],
    ]);
    return { record, alreadySubscribed: subscribedAt !== now };
  }

  const records = readLocalSubscribers();
  const index = records.findIndex((record) => record.email === input.email);
  const record: NewsletterSubscriber = {
    email: input.email,
    source,
    subscribedAt: index >= 0 ? records[index].subscribedAt : now,
    updatedAt: now,
  };

  if (index >= 0) {
    records[index] = record;
  } else {
    records.push(record);
  }

  writeLocalSubscribers(records);
  return { record, alreadySubscribed: index >= 0 };
}
