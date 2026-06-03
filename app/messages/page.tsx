import Link from 'next/link';
import PrivateMessagesClient from '@/components/PrivateMessagesClient';
import { getMessageInbox } from '@/lib/messageStore';
import { getUserSession } from '@/lib/userAuth';
import { withLocalePath } from '@/lib/i18n';
import { getRequestLocale } from '@/lib/requestLocale';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Private messages | WZPRO Meta',
  description: 'Private player-to-player messages for WZPRO Meta profiles.',
};

export default async function MessagesPage() {
  const locale = await getRequestLocale();
  const href = (path: string) => withLocalePath(path, locale);
  const user = await getUserSession();

  if (!user) {
    return (
      <main className="messages-page">
        <section className="messages-hero">
          <span>PRIVATE COMMS</span>
          <h1>Messages</h1>
          <p>Sign in to send private messages to public WZPRO Meta players.</p>
          <Link href={href('/sign-in')}>Sign in</Link>
        </section>
      </main>
    );
  }

  const conversations = await getMessageInbox(user.sub);
  return <PrivateMessagesClient currentUserId={user.sub} initialConversations={conversations} />;
}
