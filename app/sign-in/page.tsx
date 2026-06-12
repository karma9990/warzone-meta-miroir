import Link from 'next/link';
import type { Metadata } from 'next';
import EmailSignInForm from '@/components/EmailSignInForm';
import SupabaseOAuthButtons from '@/components/SupabaseOAuthButtons';
import { withLocalePath } from '@/lib/i18n';
import { getRequestLocale } from '@/lib/requestLocale';

export const metadata: Metadata = {
  title: 'Sign in | WZPRO Meta',
  description: 'Sign in to save Warzone loadouts, manage your WZPRO Meta account and access purchased tools.',
  robots: { index: false, follow: false },
};

const errorCopy: Record<string, Record<string, string>> = {
  en: {
    provider: 'This login provider is not available.',
    google_config: 'Google login is not configured yet.',
    battlenet_config: 'Battle.net login is not configured yet.',
    apple_config: 'Apple login is not configured yet.',
    state: 'The sign-in request expired. Try again.',
    token: 'The provider did not return a valid access token.',
    profile: 'The provider profile could not be loaded.',
    google_email_unverified: 'Google did not confirm a verified email for this account.',
    email_token: 'This email sign-in link is invalid or expired.',
    fallback: 'Sign-in failed. Try again.',
  },
  fr: {
    provider: 'Ce fournisseur de connexion n est pas disponible.',
    google_config: 'La connexion Google n est pas encore configuree.',
    battlenet_config: 'La connexion Battle.net n est pas encore configuree.',
    apple_config: 'La connexion Apple n est pas encore configuree.',
    state: 'La demande de connexion a expire. Reessayez.',
    token: 'Le fournisseur n a pas retourne de jeton d acces valide.',
    profile: 'Le profil du fournisseur n a pas pu etre charge.',
    google_email_unverified: 'Google n a pas confirme d email verifie pour ce compte.',
    email_token: 'Ce lien de connexion par email est invalide ou a expire.',
    fallback: 'Echec de connexion. Reessayez.',
  },
  es: {
    provider: 'Este proveedor de inicio de sesion no esta disponible.',
    google_config: 'El inicio de sesion con Google no esta configurado aun.',
    battlenet_config: 'El inicio de sesion con Battle.net no esta configurado aun.',
    apple_config: 'El inicio de sesion con Apple no esta configurado aun.',
    state: 'La solicitud de inicio de sesion ha expirado. Intentalo de nuevo.',
    token: 'El proveedor no devolvio un token de acceso valido.',
    profile: 'No se pudo cargar el perfil del proveedor.',
    google_email_unverified: 'Google no confirmo un correo verificado para esta cuenta.',
    email_token: 'Este enlace de inicio de sesion por correo no es valido o ha expirado.',
    fallback: 'Error al iniciar sesion. Intentalo de nuevo.',
  },
};

const copy = {
  en: {
    back: 'WZPRO Meta',
    gateway: 'Account gateway',
    access: 'Account access',
    title: 'Sign in',
    lead: 'Reconnect to your WZPRO Meta account with email, Google or Battle.net.',
    noAccount: 'No account yet?',
    signUp: 'Sign up',
    or: 'Or',
    note: 'Your profile, favorites, loadout notes and access stay linked to one WZPRO account.',
    sideTitle: 'Why sign in',
    sideHead: 'Your Warzone workspace follows you.',
    sideDesc: 'Keep the useful parts of WZPRO attached to your profile instead of rebuilding them every session.',
    item1Title: 'Saved loadouts',
    item1Desc: 'Favorite builds and private notes synced to your account.',
    item2Title: 'Patch watch',
    item2Desc: 'Return to the latest checked meta board faster.',
    item3Title: 'Pro access',
    item3Desc: 'Purchased tools unlocked from the same account.',
    item4Title: 'Profile',
    item4Desc: 'Public stats stay under your control.',
    sideAria: 'Account benefits',
  },
  fr: {
    back: 'WZPRO Meta',
    gateway: 'Passerelle de compte',
    access: 'Acces au compte',
    title: 'Connexion',
    lead: 'Reconnectez-vous a votre compte WZPRO Meta avec email, Google ou Battle.net.',
    noAccount: 'Pas encore de compte ?',
    signUp: 'S inscrire',
    or: 'Ou',
    note: 'Votre profil, favoris, notes de classes et acces restent lies a un seul compte WZPRO.',
    sideTitle: 'Pourquoi se connecter',
    sideHead: 'Votre espace Warzone vous suit.',
    sideDesc: 'Gardez les parties utiles de WZPRO attachees a votre profil au lieu de les reconstruire a chaque session.',
    item1Title: 'Classes sauvegardees',
    item1Desc: 'Builds favoris et notes privees synchronises avec votre compte.',
    item2Title: 'Veille patch',
    item2Desc: 'Retrouvez le dernier meta board verifie plus vite.',
    item3Title: 'Acces Pro',
    item3Desc: 'Outils achetes debloques depuis le meme compte.',
    item4Title: 'Profil',
    item4Desc: 'Stats publiques sous votre controle.',
    sideAria: 'Avantages du compte',
  },
  es: {
    back: 'WZPRO Meta',
    gateway: 'Acceso a la cuenta',
    access: 'Acceso a la cuenta',
    title: 'Iniciar sesion',
    lead: 'Vuelve a conectarte a tu cuenta WZPRO Meta con email, Google o Battle.net.',
    noAccount: '¿No tienes cuenta?',
    signUp: 'Registrarse',
    or: 'O',
    note: 'Tu perfil, favoritos, notas de loadouts y acceso permanecen vinculados a una sola cuenta WZPRO.',
    sideTitle: '¿Por que iniciar sesion?',
    sideHead: 'Tu espacio de trabajo Warzone te sigue.',
    sideDesc: 'Manten las partes utiles de WZPRO vinculadas a tu perfil en lugar de reconstruirlas cada sesion.',
    item1Title: 'Loadouts guardados',
    item1Desc: 'Builds favoritos y notas privadas sincronizadas con tu cuenta.',
    item2Title: 'Vigilancia de parches',
    item2Desc: 'Vuelve al ultimo meta board verificado mas rapido.',
    item3Title: 'Acceso Pro',
    item3Desc: 'Herramientas compradas desbloqueadas desde la misma cuenta.',
    item4Title: 'Perfil',
    item4Desc: 'Estadisticas publicas bajo tu control.',
    sideAria: 'Beneficios de la cuenta',
  },
};

function getOAuthProviderStatus() {
  return {
    google: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    ),
    battlenet: Boolean(process.env.BATTLE_NET_CLIENT_ID && process.env.BATTLE_NET_CLIENT_SECRET),
    apple: false,
  es: {
    provider: 'Este proveedor de inicio de sesion no esta disponible.',
    google_config: 'El inicio de sesion con Google no esta configurado aun.',
    battlenet_config: 'El inicio de sesion con Battle.net no esta configurado aun.',
    apple_config: 'El inicio de sesion con Apple no esta configurado aun.',
    state: 'La solicitud de inicio de sesion ha expirado. Intentalo de nuevo.',
    token: 'El proveedor no devolvio un token de acceso valido.',
    profile: 'No se pudo cargar el perfil del proveedor.',
    google_email_unverified: 'Google no confirmo un correo verificado para esta cuenta.',
    email_token: 'Este enlace de inicio de sesion por correo no es valido o ha expirado.',
    fallback: 'Error al iniciar sesion. Intentalo de nuevo.',
  },
};
}

function safeNextPath(value?: string) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return '/';
  }

  return value;
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const [{ error, next }, locale] = await Promise.all([searchParams, getRequestLocale()]);
  const href = (path: string) => withLocalePath(path, locale);
  const nextPath = safeNextPath(next);
  const t = (copy as Record<string, typeof copy.en>)[locale] || copy.en;
  const ec = (errorCopy as Record<string, typeof errorCopy.en>)[locale] || errorCopy.en;

  return (
    <main className="sign-in-page">
      <section className="sign-in-panel">
        <div className="sign-in-layout">
          <div className="sign-in-form-column">
            <div className="sign-in-topline">
              <Link className="auth-back" href={href('/')}>{t.back}</Link>
              <span>{t.gateway}</span>
            </div>

            <div className="sign-in-copy">
              <span>{t.access}</span>
              <h1>{t.title}</h1>
              <p>{t.lead}</p>
            </div>

            {error && (
              <div className="auth-error">
                {ec[error] || ec.fallback}
              </div>
            )}

            <div className="auth-actions sign-in-actions">
              <EmailSignInForm initialMode="signin" allowSwitch={false} redirectTo={nextPath} locale={locale} />
              <p className="email-auth-switch">
                {t.noAccount} <Link href={href(`/sign-up${nextPath !== '/' ? `?next=${encodeURIComponent(nextPath)}` : ''}`)}>{t.signUp}</Link>
              </p>
              <div className="auth-separator">{t.or}</div>
              <SupabaseOAuthButtons intent="signin" nextPath={nextPath} initialProviders={getOAuthProviderStatus()} />
            </div>

            <p className="auth-note sign-in-note">
              {t.note}
            </p>
          </div>

          <aside className="sign-in-side" aria-label={t.sideAria}>
            <div className="sign-in-side-header">
              <span>{t.sideTitle}</span>
              <h2>{t.sideHead}</h2>
              <p>{t.sideDesc}</p>
            </div>

            <div className="sign-in-side-grid">
              <div>
                <span>01</span>
                <strong>{t.item1Title}</strong>
                <p>{t.item1Desc}</p>
              </div>
              <div>
                <span>02</span>
                <strong>{t.item2Title}</strong>
                <p>{t.item2Desc}</p>
              </div>
              <div>
                <span>03</span>
                <strong>{t.item3Title}</strong>
                <p>{t.item3Desc}</p>
              </div>
              <div>
                <span>04</span>
                <strong>{t.item4Title}</strong>
                <p>{t.item4Desc}</p>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
