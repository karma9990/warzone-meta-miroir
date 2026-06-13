import webpush from 'web-push';
import { getPushSubscriptions, removePushEndpoints, type PushSubscriptionRecord } from './webPushStore';

let configured = false;

export function getVapidPublicKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || '';
}

export function hasWebPush() {
  return Boolean(getVapidPublicKey() && process.env.VAPID_PRIVATE_KEY);
}

function configure() {
  if (configured || !hasWebPush()) return hasWebPush();
  const subject = process.env.VAPID_SUBJECT || 'mailto:support@wzprometa.com';
  webpush.setVapidDetails(subject, getVapidPublicKey(), process.env.VAPID_PRIVATE_KEY as string);
  configured = true;
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

/**
 * Broadcast a payload to every stored subscription. Subscriptions that the push
 * service rejects with 404/410 (gone) are pruned. Returns delivery counts.
 */
export async function broadcastPush(payload: PushPayload): Promise<{ sent: number; failed: number; skipped?: true }> {
  if (!configure()) return { sent: 0, failed: 0, skipped: true };

  const subscriptions = await getPushSubscriptions();
  if (subscriptions.length === 0) return { sent: 0, failed: 0 };

  const body = JSON.stringify(payload);
  const gone: string[] = [];
  let sent = 0;
  let failed = 0;

  await Promise.all(
    subscriptions.map(async (record: PushSubscriptionRecord) => {
      try {
        await webpush.sendNotification({ endpoint: record.endpoint, keys: record.keys }, body);
        sent += 1;
      } catch (error) {
        failed += 1;
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) gone.push(record.endpoint);
      }
    }),
  );

  await removePushEndpoints(gone);
  return { sent, failed };
}
