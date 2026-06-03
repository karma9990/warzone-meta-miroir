import { notFound } from 'next/navigation';
import PrivateMessagesClient from '@/components/PrivateMessagesClient';
import { getMessageInbox } from '@/lib/messageStore';
import { getProfileByPseudo } from '@/lib/profileStore';
import { getUserSession } from '@/lib/userAuth';
import Link from 'next/link';
import { withLocalePath } from '@/lib/i18n';
import { getRequestLocale } from '@/lib/requestLocale';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pseudo: string }>;
}) {
  const { pseudo } = await params;
  return {
    title: `Message ${decodeURIComponent(pseudo)} | WZPRO Meta`,
  };
}

export default async function MessagePlayerPage({
  params,
}: {
  params: Promise<{ pseudo: string }>;
}) {
  const [{ pseudo }, locale, user] = await Promise.all([params, getRequestLocale(), getUserSession()]);
  const decodedPseudo = decodeURIComponent(pseudo);

  if (!user) {
    return (
      <main className="messages-page">
        <section className="messages-hero">
          <span>PRIVATE COMMS</span>
          <h1>Messages</h1>
          <p>Sign in to message {decodedPseudo}.</p>
          <Link href={withLocalePath('/sign-in', locale)}>Sign in</Link>
        </section>
      </main>
    );
  }

  const [profile, conversations] = await Promise.all([
    getProfileByPseudo(decodedPseudo),
    getMessageInbox(user.sub),
  ]);
  if (!profile || !profile.privacy.publicProfile) notFound();

  return (
    <PrivateMessagesClient
      currentUserId={user.sub}
      initialConversations={conversations}
      initialRecipient={profile.pseudo}
      lockRecipient
    />
  );
}
