import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { listCompanionDevices } from '@/lib/companionDeviceStore';
import { getLoadouts } from '@/lib/data';
import { getEntitlements } from '@/lib/entitlementStore';
import { emptyProfile, getProfile } from '@/lib/profileStore';
import { getUserSession } from '@/lib/userAuth';
import { withLocalePath } from '@/lib/i18n';
import { getRequestLocale } from '@/lib/requestLocale';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Welcome | WZPRO Meta',
  description: 'Get started on WZPRO Meta: set up your profile, connect the Companion app and unlock the right plan.',
  robots: { index: false, follow: false },
};

const copy = {
  en: {
    kicker: 'GETTING STARTED',
    titleFree: 'Welcome to WZPRO Meta',
    titlePaid: 'Welcome back',
    leadFree: 'A few quick steps to get the most out of your free account.',
    leadPaid: 'Your plan is active. Finish setup to put it to work.',
    planFree: 'Free account',
    planPro: 'Pro subscription',
    planPremium: 'Companion Premium',
    checklist: 'Your setup',
    done: 'Done',
    todo: 'To do',
    open: 'Open',
    stepPseudo: 'Pick a pseudo',
    stepPseudoDesc: 'Your public handle across profile and leaderboard.',
    stepPublic: 'Make your profile public',
    stepPublicDesc: 'Required to appear on the public leaderboard.',
    stepLoadout: 'Choose a main loadout',
    stepLoadoutDesc: 'Compare your weapon against the current meta.',
    stepCompanion: 'Connect WZPRO Companion',
    stepCompanionDesc: 'Import your games for form tracking and stats.',
    stepGames: 'Import your first games',
    stepGamesDesc: 'Play a game with the Companion running to see your form.',
    ctaTitleFree: 'Unlock more',
    ctaDescFree: 'Go further with Pro tools or the Companion overlay.',
    ctaPro: 'See Pro Access',
    ctaPremium: 'See Companion Premium',
    ctaTitlePaid: 'Manage your plan',
    ctaDescPaid: 'Open your account for the coach report and billing.',
    ctaAccount: 'Open account',
    skip: 'Skip to account',
  },
  fr: {
    kicker: 'PREMIERS PAS',
    titleFree: 'Bienvenue sur WZPRO Meta',
    titlePaid: 'Bon retour',
    leadFree: 'Quelques etapes rapides pour profiter au mieux de ton compte gratuit.',
    leadPaid: 'Ton offre est active. Termine la configuration pour en profiter.',
    planFree: 'Compte gratuit',
    planPro: 'Abonnement Pro',
    planPremium: 'Companion Premium',
    checklist: 'Ta configuration',
    done: 'Fait',
    todo: 'A faire',
    open: 'Ouvrir',
    stepPseudo: 'Choisis un pseudo',
    stepPseudoDesc: 'Ton identifiant public sur le profil et le classement.',
    stepPublic: 'Rends ton profil public',
    stepPublicDesc: 'Necessaire pour apparaitre au classement public.',
    stepLoadout: 'Choisis une classe principale',
    stepLoadoutDesc: 'Compare ton arme au meta actuel.',
    stepCompanion: 'Connecte WZPRO Companion',
    stepCompanionDesc: 'Importe tes parties pour le suivi de forme et les stats.',
    stepGames: 'Importe tes premieres parties',
    stepGamesDesc: 'Joue une partie avec le Companion lance pour voir ta forme.',
    ctaTitleFree: 'Debloque plus',
    ctaDescFree: 'Va plus loin avec les outils Pro ou l overlay Companion.',
    ctaPro: 'Voir Pro Access',
    ctaPremium: 'Voir Companion Premium',
    ctaTitlePaid: 'Gere ton offre',
    ctaDescPaid: 'Ouvre ton compte pour le rapport coach et la facturation.',
    ctaAccount: 'Ouvrir le compte',
    skip: 'Aller au compte',
  },
  es: {
    kicker: 'PRIMEROS PASOS',
    titleFree: 'Bienvenido a WZPRO Meta',
    titlePaid: 'Bienvenido de nuevo',
    leadFree: 'Unos pasos rapidos para aprovechar tu cuenta gratuita.',
    leadPaid: 'Tu plan esta activo. Termina la configuracion para usarlo.',
    planFree: 'Cuenta gratuita',
    planPro: 'Suscripcion Pro',
    planPremium: 'Companion Premium',
    checklist: 'Tu configuracion',
    done: 'Hecho',
    todo: 'Pendiente',
    open: 'Abrir',
    stepPseudo: 'Elige un alias',
    stepPseudoDesc: 'Tu nombre publico en el perfil y la clasificacion.',
    stepPublic: 'Haz publico tu perfil',
    stepPublicDesc: 'Necesario para aparecer en la clasificacion publica.',
    stepLoadout: 'Elige una clase principal',
    stepLoadoutDesc: 'Compara tu arma con el meta actual.',
    stepCompanion: 'Conecta WZPRO Companion',
    stepCompanionDesc: 'Importa tus partidas para el seguimiento y las estadisticas.',
    stepGames: 'Importa tus primeras partidas',
    stepGamesDesc: 'Juega una partida con el Companion abierto para ver tu forma.',
    ctaTitleFree: 'Desbloquea mas',
    ctaDescFree: 'Llega mas lejos con las herramientas Pro o el overlay Companion.',
    ctaPro: 'Ver Pro Access',
    ctaPremium: 'Ver Companion Premium',
    ctaTitlePaid: 'Gestiona tu plan',
    ctaDescPaid: 'Abre tu cuenta para el informe de coach y la facturacion.',
    ctaAccount: 'Abrir cuenta',
    skip: 'Ir a la cuenta',
  },
};

export default async function WelcomePage() {
  const locale = await getRequestLocale();
  const href = (path: string) => withLocalePath(path, locale);
  const user = await getUserSession();
  if (!user) redirect(href('/sign-in?next=/welcome'));

  const t = (copy as Record<string, typeof copy.en>)[locale] || copy.en;

  const [userEnt, emailEnt, profileRaw, loadouts, devices] = await Promise.all([
    getEntitlements(user.sub),
    user.email ? getEntitlements(user.email.toLowerCase()) : Promise.resolve(null),
    getProfile(user.sub),
    getLoadouts(),
    listCompanionDevices(user.sub),
  ]);

  const profile = profileRaw || emptyProfile({ userId: user.sub, email: user.email, name: user.name, picture: user.picture });
  const pro = Boolean(userEnt?.pro || emailEnt?.pro);
  const companion = Boolean(userEnt?.companion || emailEnt?.companion);
  const paid = pro || companion;
  const activeDevices = devices.filter((device) => !device.revoked);
  const hasMainLoadout = Boolean(
    (profile.featuredLoadoutId && loadouts.some((l) => l.id === profile.featuredLoadoutId)) ||
    profile.favoriteLoadouts.some((id) => loadouts.some((l) => l.id === id)),
  );

  const planLabel = companion ? t.planPremium : pro ? t.planPro : t.planFree;

  const steps = [
    { done: Boolean(profile.pseudo), label: t.stepPseudo, desc: t.stepPseudoDesc, href: href('/account') },
    { done: Boolean(profile.privacy.publicProfile), label: t.stepPublic, desc: t.stepPublicDesc, href: href('/account') },
    { done: hasMainLoadout, label: t.stepLoadout, desc: t.stepLoadoutDesc, href: href('/account') },
    { done: activeDevices.length > 0, label: t.stepCompanion, desc: t.stepCompanionDesc, href: href('/download') },
    { done: profile.statsEntries.length > 0, label: t.stepGames, desc: t.stepGamesDesc, href: href('/companion') },
  ];
  const completed = steps.filter((step) => step.done).length;
  const progress = Math.round((completed / steps.length) * 100);

  return (
    <main className="mx-auto max-w-[860px] px-6 py-16 pb-24 font-[var(--mono)] text-[var(--tm-ink,#10100e)]">
      <p className="m-0 text-[0.72rem] font-black tracking-[0.18em] uppercase text-[var(--tm-blue,#163cff)]">{t.kicker}</p>
      <h1 className="m-0 mt-2 text-[clamp(2rem,5vw,3.2rem)] leading-[1.02] tracking-normal uppercase">
        {paid ? t.titlePaid : t.titleFree}
      </h1>
      <p className="mt-4 mb-0 max-w-[560px] text-[var(--tm-muted,rgba(16,16,14,0.62))] leading-[1.7]">
        {paid ? t.leadPaid : t.leadFree}
      </p>

      <div className="mt-6 inline-flex items-center gap-3 border border-[var(--tm-line,rgba(16,16,14,0.16))] px-4 py-2">
        <span className="text-[0.7rem] font-black uppercase tracking-normal text-[var(--tm-blue,#163cff)]">{planLabel}</span>
        <span className="text-[0.7rem] uppercase tracking-normal text-[var(--tm-muted,rgba(16,16,14,0.55))]">{completed}/{steps.length} · {progress}%</span>
      </div>

      <section className="mt-10 border-t border-[var(--tm-line,rgba(16,16,14,0.16))] pt-6">
        <h2 className="m-0 mb-4 text-[1rem] tracking-normal uppercase">{t.checklist}</h2>
        <div className="grid gap-2">
          {steps.map((step) => (
            <div
              key={step.label}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-4 border border-[var(--tm-line,rgba(16,16,14,0.14))] p-4 bg-[var(--theme-panel,rgba(239,238,232,0.55))]"
            >
              <span
                className="inline-grid place-items-center h-7 w-7 rounded-full text-[0.8rem] font-black"
                style={{
                  background: step.done ? 'var(--tm-blue,#163cff)' : 'transparent',
                  color: step.done ? '#fff' : 'var(--tm-muted,rgba(16,16,14,0.5))',
                  border: step.done ? 'none' : '1px solid var(--tm-line,rgba(16,16,14,0.3))',
                }}
                aria-hidden
              >
                {step.done ? '✓' : ''}
              </span>
              <div>
                <strong className="block text-[0.95rem] tracking-normal">{step.label}</strong>
                <span className="block mt-1 text-[0.78rem] leading-[1.5] text-[var(--tm-muted,rgba(16,16,14,0.55))]">{step.desc}</span>
              </div>
              <span className="text-[0.7rem] font-black uppercase tracking-normal">
                {step.done ? (
                  <span className="text-[var(--tm-blue,#163cff)]">{t.done}</span>
                ) : (
                  <Link href={step.href} className="text-[var(--tm-ink,#10100e)] underline">{t.open}</Link>
                )}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 border border-[var(--tm-line,rgba(16,16,14,0.16))] p-6 bg-[var(--theme-panel,rgba(239,238,232,0.55))]">
        <h2 className="m-0 mb-2 text-[1rem] tracking-normal uppercase">{paid ? t.ctaTitlePaid : t.ctaTitleFree}</h2>
        <p className="m-0 mb-4 text-[0.85rem] leading-[1.6] text-[var(--tm-muted,rgba(16,16,14,0.62))]">{paid ? t.ctaDescPaid : t.ctaDescFree}</p>
        <div className="flex flex-wrap gap-3">
          {paid ? (
            <Link href={href('/account')} className="inline-grid place-items-center min-h-[42px] px-5 bg-[var(--tm-blue,#163cff)] text-white text-[0.72rem] font-black uppercase tracking-[0.12em] no-underline">
              {t.ctaAccount}
            </Link>
          ) : (
            <>
              <Link href={href('/pro-access')} className="inline-grid place-items-center min-h-[42px] px-5 bg-[var(--tm-blue,#163cff)] text-white text-[0.72rem] font-black uppercase tracking-[0.12em] no-underline">
                {t.ctaPro}
              </Link>
              <Link href={href('/companion/premium')} className="inline-grid place-items-center min-h-[42px] px-5 border border-[var(--tm-line,rgba(16,16,14,0.3))] text-[var(--tm-ink,#10100e)] text-[0.72rem] font-black uppercase tracking-[0.12em] no-underline">
                {t.ctaPremium}
              </Link>
            </>
          )}
        </div>
      </section>

      <div className="mt-6">
        <Link href={href('/account')} className="text-[0.75rem] uppercase tracking-normal text-[var(--tm-muted,rgba(16,16,14,0.5))] no-underline">
          {t.skip} →
        </Link>
      </div>
    </main>
  );
}
