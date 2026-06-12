import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Account | WZPRO Meta',
  description: 'Create a WZPRO Meta account for saved loadouts, pro access and private notes.',
  robots: { index: false, follow: false },
};
import Link from 'next/link';
import EmailSignInForm from '@/components/EmailSignInForm';
import SupabaseOAuthButtons from '@/components/SupabaseOAuthButtons';
import { withLocalePath } from '@/lib/i18n';
import { getRequestLocale } from '@/lib/requestLocale';

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
    email_token: 'This email verification link is invalid or expired.',
    fallback: 'Sign-up failed. Try again.',
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
    email_token: 'Ce lien de verification email est invalide ou a expire.',
    fallback: 'Echec d inscription. Reessayez.',
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
    email_token: 'Este enlace de verificacion de correo no es valido o ha expirado.',
    fallback: 'Error al registrarse. Intentalo de nuevo.',
  },
};

const copy = {
  en: {
    back: 'WZPRO Meta',
    access: 'Account access',
    title: 'Create an account',
    lead: 'Start a WZPRO profile for saved loadouts, Pro access and private performance notes.',
    haveAccount: 'You already have an account?',
    signIn: 'Sign in',
    or: 'Or',
    note: 'Secure sign-up with email, Google or Battle.net. You control profile visibility and saved account data.',
    sync: 'SYNC',
    tools: 'PRO TOOLS',
    loadout: 'Account loadout',
    head: 'Build once. Reopen before every lobby.',
    desc: 'Your account keeps favorites, tool access and profile settings tied together.',
    favKey: 'Favorites',
    favValue: 'Mark the weapons you actually run.',
    notesKey: 'Private notes',
    notesValue: 'Keep recoil, perk and squad notes synced.',
    bnKey: 'Battle.net',
    bnValue: 'Use your platform identity when configured.',
    billingKey: 'Billing',
    billingValue: 'Link Pro access to your account.',
    sideAria: 'Account features',
  },
  fr: {
    back: 'WZPRO Meta',
    access: 'Acces au compte',
    title: 'Creer un compte',
    lead: 'Creez un profil WZPRO pour les classes sauvegardees, l acces Pro et les notes de performance privees.',
    haveAccount: 'Vous avez deja un compte ?',
    signIn: 'Se connecter',
    or: 'Ou',
    note: 'Inscription securisee avec email, Google ou Battle.net. Vous controlez la visibilite du profil et les donnees du compte.',
    sync: 'SYNC',
    tools: 'OUTILS PRO',
    loadout: 'Classe de compte',
    head: 'Configurez une fois. Rouvrez avant chaque lobby.',
    desc: 'Votre compte garde favoris, acces aux outils et parametres de profil lies ensemble.',
    favKey: 'Favoris',
    favValue: 'Marquez les armes que vous utilisez vraiment.',
    notesKey: 'Notes privees',
    notesValue: 'Gardez les notes de recul, atouts et equipe synchronisees.',
    bnKey: 'Battle.net',
    bnValue: 'Utilisez votre identite de plateforme quand elle est configuree.',
    billingKey: 'Facturation',
    billingValue: 'Liez l acces Pro a votre compte.',
    sideAria: 'Fonctionnalites du compte',
  },
  es: {
    back: 'WZPRO Meta',
    access: 'Acceso a la cuenta',
    title: 'Crear una cuenta',
    lead: 'Crea un perfil WZPRO para loadouts guardados, acceso Pro y notas de rendimiento privadas.',
    haveAccount: '¿Ya tienes una cuenta?',
    signIn: 'Iniciar sesion',
    or: 'O',
    note: 'Registro seguro con email, Google o Battle.net. Tu controlas la visibilidad del perfil y los datos de la cuenta.',
    sync: 'SYNC',
    tools: 'HERRAMIENTAS PRO',
    loadout: 'Loadout de cuenta',
    head: 'Configura una vez. Reabre antes de cada lobby.',
    desc: 'Tu cuenta mantiene favoritos, acceso a herramientas y configuracion de perfil vinculados.',
    favKey: 'Favoritos',
    favValue: 'Marca las armas que realmente usas.',
    notesKey: 'Notas privadas',
    notesValue: 'Manten sincronizadas las notas de retroceso, ventajas y escuadron.',
    bnKey: 'Battle.net',
    bnValue: 'Usa tu identidad de plataforma cuando este configurada.',
    billingKey: 'Facturacion',
    billingValue: 'Vincula el acceso Pro a tu cuenta.',
    sideAria: 'Funciones de la cuenta',
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
  };
}

function safeNextPath(value?: string) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return '/';
  }

  return value;
}

export default async function SignUpPage({
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
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-form-column">
            <Link className="auth-back" href={href('/')}>{t.back}</Link>
            <div className="auth-heading">
              <span>{t.access}</span>
              <h1>{t.title}</h1>
              <p>{t.lead}</p>
            </div>

            {error && (
              <div className="auth-error">
                {ec[error] || ec.fallback}
              </div>
            )}

            <div className="auth-actions">
              <EmailSignInForm initialMode="signup" allowSwitch={false} redirectTo={nextPath} locale={locale} />
              <p className="email-auth-switch">
                {t.haveAccount} <Link href={href(`/sign-in${nextPath !== '/' ? `?next=${encodeURIComponent(nextPath)}` : ''}`)}>{t.signIn}</Link>
              </p>
              <div className="auth-separator">{t.or}</div>
              <SupabaseOAuthButtons intent="signup" nextPath={nextPath} initialProviders={getOAuthProviderStatus()} />
            </div>

            <p className="auth-note">
              {t.note}
            </p>
          </div>

          <aside className="auth-intel" aria-label={t.sideAria}>
            <div className="auth-intel-radar">
              <span>{t.sync}</span>
              <strong>06</strong>
              <small>{t.tools}</small>
            </div>
            <div className="auth-intel-copy">
              <span>{t.loadout}</span>
              <h2>{t.head}</h2>
              <p>{t.desc}</p>
            </div>
            <dl className="auth-feature-grid">
              <div>
                <dt>{t.favKey}</dt>
                <dd>{t.favValue}</dd>
              </div>
              <div>
                <dt>{t.notesKey}</dt>
                <dd>{t.notesValue}</dd>
              </div>
              <div>
                <dt>{t.bnKey}</dt>
                <dd>{t.bnValue}</dd>
              </div>
              <div>
                <dt>{t.billingKey}</dt>
                <dd>{t.billingValue}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>
    </main>
  );
}
