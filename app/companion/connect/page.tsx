import Link from 'next/link';
import { redirect } from 'next/navigation';
import CompanionConnectAuthorize from '@/components/CompanionConnectAuthorize';
import { getCompanionFlow } from '@/lib/companionDeviceStore';
import { withLocalePath } from '@/lib/i18n';
import { getRequestLocale } from '@/lib/requestLocale';
import { getUserSession } from '@/lib/userAuth';

export const dynamic = 'force-dynamic';

export default async function CompanionConnectPage({ searchParams }: {
  searchParams: Promise<{ code?: string }>;
}) {
  const locale = await getRequestLocale();
  const href = (path: string) => withLocalePath(path, locale);
  const params = await searchParams;
  const code = typeof params.code === 'string' ? params.code.trim().toUpperCase() : '';
  const flow = code ? await getCompanionFlow(code) : null;
  const user = await getUserSession();

  if (!user) {
    redirect(href(`/sign-in?next=${encodeURIComponent(`/companion/connect?code=${code}`)}`));
  }

  // Server component rendered per-request (force-dynamic): reading the current
  // time here is intentional and deterministic for the lifetime of the request.
  // eslint-disable-next-line react-hooks/purity
  const expired = !flow || new Date(flow.expiresAt).getTime() <= Date.now();

  return (
    <main className="companion-connect-page">
      {expired ? (
        <section className="companion-connect-card">
          <span>WZPRO COMPANION</span>
          <h1>Code expire</h1>
          <p>Retourne dans WZPRO Companion et relance la connexion pour generer un nouveau code.</p>
          <Link href={href('/account')}>Retour au compte</Link>
        </section>
      ) : flow.authorizedAt ? (
        <section className="companion-connect-card">
          <span>WZPRO COMPANION</span>
          <h1>Deja autorise</h1>
          <p>Tu peux retourner dans WZPRO Companion.</p>
          <Link href={href('/account')}>Voir mes appareils</Link>
        </section>
      ) : (
        <CompanionConnectAuthorize code={flow.code} deviceName={flow.deviceName} />
      )}

      <style>{`
        .companion-connect-page {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 2rem;
          color: var(--tm-ink, #10100e);
        }

        .companion-connect-card {
          width: min(520px, 100%);
          display: grid;
          gap: 1rem;
          border: 1px solid rgba(22,60,255,0.38);
          background: var(--theme-panel, rgba(239,238,232,0.82));
          padding: 1.25rem;
          font-family: var(--font-mono, monospace);
        }

        .companion-connect-card span {
          color: #163cff;
          font-size: 0.62rem;
          font-weight: 950;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .companion-connect-card h1 {
          margin: 0;
          font-size: clamp(1.7rem, 6vw, 3rem);
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .companion-connect-card p,
        .companion-connect-card small {
          margin: 0;
          color: rgba(16,16,14,0.62);
          font-size: 0.78rem;
          line-height: 1.6;
        }

        .companion-connect-card code {
          width: fit-content;
          border: 1px solid rgba(22,60,255,0.3);
          background: rgba(22,60,255,0.08);
          color: #163cff;
          padding: 0.55rem 0.75rem;
          font-size: 1.1rem;
          font-weight: 950;
          letter-spacing: 0.18em;
        }

        .companion-connect-card button,
        .companion-connect-card a {
          display: inline-grid;
          min-height: 44px;
          place-items: center;
          border: 1px solid #163cff;
          background: #163cff;
          color: #fff;
          cursor: pointer;
          font: inherit;
          font-size: 0.72rem;
          font-weight: 950;
          letter-spacing: 0.12em;
          padding: 0 1rem;
          text-decoration: none;
          text-transform: uppercase;
        }

        .companion-connect-card button:disabled {
          opacity: 0.72;
          cursor: default;
        }

        .companion-connect-card small.is-error {
          color: #d93d3d;
        }

        :global(:root[data-theme="dark"]) .companion-connect-card p,
        :global(:root[data-theme="dark"]) .companion-connect-card small {
          color: rgba(255,255,255,0.62);
        }
      `}</style>
    </main>
  );
}
