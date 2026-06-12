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

const copy = {
  en: {
    kicker: 'PRIVATE COMMS',
    title: 'Messages',
    lead: 'Sign in to send private messages to public WZPRO Meta players.',
    signIn: 'Sign in',
  },
  fr: {
    kicker: 'COMMS PRIVEES',
    title: 'Messages',
    lead: 'Connectez-vous pour envoyer des messages prives aux joueurs publics WZPRO Meta.',
    signIn: 'Se connecter',
  },
};

export default async function MessagesPage() {
  const locale = await getRequestLocale();
  const href = (path: string) => withLocalePath(path, locale);
  const user = await getUserSession();
  const t = locale === 'fr' ? copy.fr : copy.en;

  if (!user) {
    return (
      <main className="messages-page">
        <section className="messages-hero">
          <span>{t.kicker}</span>
          <h1>{t.title}</h1>
          <p>{t.lead}</p>
          <Link href={href('/sign-in')}>{t.signIn}</Link>
        </section>
      </main>
    );
  }

  const conversations = await getMessageInbox(user.sub);
  return <PrivateMessagesClient currentUserId={user.sub} initialConversations={conversations} />;
}
