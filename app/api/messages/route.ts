import { NextRequest, NextResponse } from 'next/server';
import { getMessageInbox, sendPrivateMessage } from '@/lib/messageStore';
import { getProfile } from '@/lib/profileStore';
import { readJsonBody } from '@/lib/security';
import { getUserSession } from '@/lib/userAuth';
import { rateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getUserSession();
  if (!user) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }

  return NextResponse.json(await getMessageInbox(user.sub));
}

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, 'private-message', 20, 10 * 60_000);
  if (limited) return limited;

  const parsed = await readJsonBody<{ recipientPseudo?: unknown; body?: unknown }>(req);
  if ('error' in parsed) return parsed.error;

  const user = await getUserSession();
  if (!user) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }

  const profile = await getProfile(user.sub);
  const result = await sendPrivateMessage({
    senderId: user.sub,
    senderName: profile?.pseudo || user.name,
    senderPseudo: profile?.pseudo || undefined,
    recipientPseudo: parsed.data.recipientPseudo,
    body: parsed.data.body,
  });

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result.conversation, { status: 201 });
}
