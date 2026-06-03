import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import RecoilVisualizer from '@/components/RecoilVisualizer';
import PatchNotesTracker from '@/components/PatchNotesTracker';
import PeekAngleVisualizer from '@/components/PeekAngleVisualizer';
import ContractPriorityGuide from '@/components/ContractPriorityGuide';
import LootTierMap from '@/components/LootTierMap';
import { withLocalePath } from '@/lib/i18n';
import { GENERATED_PAGE_PACKS, getProToolsPageCopy } from '@/lib/pageCopy';
import { getRequestLocale } from '@/lib/requestLocale';
import '../pro-tools.css';

const RESPONSE_CURVE_BODY = 'The response curve defines the mathematical relationship between how far you push the stick and how fast the crosshair moves. On a linear curve, pushing the stick 50% of the way produces exactly 50% of the maximum aim speed - the relationship is a straight line. On a dynamic or exponential curve, pushing the stick 50% of the way might produce only 30% of the speed, then the speed ramps up sharply at higher stick values. Dynamic feels smoother and more forgiving at low stick deflections, which is why it is the default in most games - it makes the aim feel more "natural" for casual players. For competitive play, linear is non-negotiable. With a dynamic curve, the same hand movement produces different crosshair speeds depending on how hard you push, which means there is no single repeatable reference point for your muscle memory to anchor to. Every micro-correction becomes a guess. With linear, the relationship is constant and predictable - your body can learn it precisely. Find this setting in the controller advanced options. If your game does not offer it directly, the closest equivalent is setting your inner deadzone to minimum and your outer deadzone to maximum, which approximates linear behaviour. After switching to linear, your aim may feel twitchy at first - that is because the dynamic curve was hiding the full speed of your stick input. Lower sensitivity by 0.5-1 unit and re-calibrate over 5 sessions.';
const PATCH_PREDICTION_BODY = 'Based on current pick rate data, discussions in pro communities, and historical Warzone balancing trends, here are the most likely changes in the coming weeks. First, the Kogot-7 and VST will receive adjustments. No weapon dominates a category this clearly without drawing developer attention - their combined pick rate in competitive lobbies exceeds 60% for SMGs, which is the classic sign of an incoming nerf. Expect a reduction in ADS speed or a slight nerf to the close-range damage multiplier. Second, the Voyak KT-3 is reportedly in internal testing for a recoil nerf according to tracked dataminers - if this nerf goes live, the DS20 Mirage consolidates its position as the best AR of the patch. Third, the M15 MOD 0 in semi-auto could receive an ADS speed buff to better compete with full-auto ARs should those receive nerfs. Fourth, the Drill Charge may see its penetration radius reduced - its usage rate has increased by 340% since its buff, making it too dominant in siege scenarios. These predictions are based on historical patterns and observable trends, not official information. Use them to adapt your loadout ahead of the patch rather than reacting after.';
const MOVEMENT_PRIMARY_BODY = 'Bullets travel in a straight line. Every defensive mechanic in Warzone - armor, cover, high ground - is a passive layer that requires the enemy to make a mistake. Movement is active. It forces the enemy to do something harder than pulling the trigger: it forces them to predict. A moving target at close range requires the shooter to track, lead, and fire simultaneously. A sliding target reversing direction mid-engagement invalidates the aim entirely. A player who repositions between shots forces a full re-acquisition each time. This is why movement is not a stylistic preference - it is a mechanical force multiplier. The best players in the world do not win more gunfights because they aim better. They win more gunfights because they give the enemy less time to aim at them. Every pro-level movement mechanic - slide cancel, bunny hop, corner jiggle - exists to solve the same problem: how do I reduce the window during which the enemy can track me while maximizing my own tracking window on them? The answer is always asymmetric: your crosshair is more stable than theirs because you control when and how you move. Movement is not escape - it is aggression applied to positioning.';
const MASTER_1V1_BODY = 'A squad is only as strong as its weakest link in an isolated duel. If you cannot reliably win a 1v1 - one enemy at full health, same range, fair engagement - you cannot rely on your squad to cover that gap permanently. Work on 1v1s in solo resurgence mode, privately with friends, or on custom servers. Break each duel into four parts: first shot, damage trade, reposition, finish. If you lose the first shot, learn to break line of sight instead of panic-shooting. If you win the damage trade, do not sprint blindly into the finish; reload, plate if needed, and cut the escape route. Practice the same range repeatedly: close-range SMG duels inside 10 metres, mid-range AR fights around 25-40 metres, then awkward fights around stairs and doorframes. The goal is not to win every duel - it is to understand why you lose the ones you lose. A pro who loses a 1v1 knows exactly which decision cost them the fight. An average player just thinks the enemy aimed better.';
const CLUSTER_DROP_BODY = 'The Cluster Drop means landing the entire squad in tight formation on a single point - usually the most strategically valuable building in a POI - to take immediate control before any other team. The advantage is decisive: three players looted and positioned inside one building in 10 seconds, against enemies who scatter across the POI. This coordination eliminates the consolidation phase - the dangerous window where teammates regroup after a scattered drop. The Cluster Drop is the definitive strategy for squads with perfect communication and predefined roles. Each player knows exactly which corridor, which floor, which window they own the moment they land. Against uncoordinated teams, it is a near-guaranteed squad wipe within 20 seconds.';
const NVIDIA_BODY = 'The NVIDIA Control Panel exposes settings that directly affect colour clarity, input latency, and frame consistency - none of which are accessible from within Warzone itself. Open it by right-clicking the desktop or searching from the Start menu. Display -> Adjust Desktop Color Settings: Set Digital Vibrance to 70-80%. The default 50% produces a washed-out image; raising it makes enemy outlines and operator skins more distinct against terrain backgrounds. Do not exceed 85% - at extreme values textures become unnaturally saturated, reducing rather than improving target identification. Set Brightness to 51-52%, Contrast to 52-55%, and Gamma to 1.10-1.15. These values lift the shadow range - dark interiors and covered positions become readable without overexposing lit areas. Display -> Change Resolution: Set Output Color Format to RGB and Output Dynamic Range to Full. Many monitors default to YCbCr422 and Limited range - this crushes blacks and reduces the full contrast bandwidth your panel is capable of rendering. Manage 3D Settings -> Global Settings: Low Latency Mode -> Ultra. This reduces the pre-rendered frame queue from the default 3 frames to 1, directly cutting input latency. The trade-off is a minor average fps reduction - always worth it for competitive play.';
const AMD_BODY = 'AMD Radeon Software (Adrenalin) contains the equivalent competitive optimisation settings for AMD GPU users. Open it from the system tray icon or by right-clicking the desktop. Display -> Color: Set Saturation, equivalent to NVIDIA Digital Vibrance, to 130-140 on the AMD scale. This increases colour separation between enemy operators and background terrain without creating unnatural oversaturation. Set Contrast to 102-105% and Brightness to 101-102%. Hue should remain at 0 - shifting it introduces colour casts that distort the image and hurt rather than help clarity. Display -> Custom Resolution: Confirm your monitor is running at its native resolution and maximum refresh rate. AMD does not always apply the correct refresh rate automatically after major driver updates. Graphics -> Advanced: Enable Radeon Anti-Lag. This reduces the CPU-to-GPU command queue and directly lowers input lag. Radeon Boost should be disabled for Warzone because it introduces resolution inconsistency during fast movement.';

const PREVIEWS = [
  {
    id: 'aim-tools',
    num: '01',
    label: 'Aim Tools',
    tag: 'Precision',
    result: 'Stabilize your sensitivity, ADS multiplier and micro-corrections.',
    preview: '10-minute routine, low dead zones and crosshair placement.',
  },
  {
    id: 'next-meta',
    num: '02',
    label: 'Next Meta',
    tag: 'Intel',
    result: 'Understand which weapons and perks are rising before the lobby copies them.',
    preview: 'Mobile SMGs, sniper-support ARs and equipment shifts.',
  },
  {
    id: 'pro-movement',
    num: '03',
    label: 'Pro Movement',
    tag: 'Mechanics',
    result: 'Win fights by controlling space, timing and angles.',
    preview: 'Slide cancel, corner peeks, high ground and clean rotations.',
  },
  {
    id: 'how-to-be-a-pro',
    num: '04',
    label: 'How To Be A Pro',
    tag: 'Mindset',
    result: 'Turn sessions into measurable practice instead of blind grinding.',
    preview: 'Session goals, VOD review and mental reset.',
  },
  {
    id: 'pro-spawn',
    num: '05',
    label: 'Pro Spawn',
    tag: 'Map Control',
    result: 'Choose spawns that give information, elevation and cleaner rotations.',
    preview: 'HQ roof, Bio Labs, Riverboat and Train Station.',
  },
  {
    id: 'pro-opti',
    num: '06',
    label: 'Pro Opti',
    tag: 'Performance',
    result: 'Reduce input lag, stutter, packet loss and muddy audio.',
    preview: 'Stable FPS, Boost High audio, ethernet and Windows settings.',
  },
];

type PreviewPageProps = {
  params: Promise<{ previewId: string }>;
};

export function generateStaticParams() {
  return PREVIEWS.map((preview) => ({ previewId: preview.id }));
}

export async function generateMetadata({ params }: PreviewPageProps) {
  const locale = await getRequestLocale();
  const copy = getProToolsPageCopy(locale);
  const { previewId } = await params;
  const previewBase = PREVIEWS.find((item) => item.id === previewId);
  const preview = previewBase ? { ...previewBase, ...copy.modulesCopy[previewBase.id] } : null;

  return {
    title: preview ? `${preview.label} - Free preview | WZPRO Meta` : 'Pro Tools Preview | WZPRO Meta',
    description: preview?.preview ?? 'Free preview of WZPRO Meta Pro Tools modules.',
  };
}

export default async function ProToolPreviewPage({ params }: PreviewPageProps) {
  const locale = await getRequestLocale();
  const copy = getProToolsPageCopy(locale);
  const pack = GENERATED_PAGE_PACKS[locale];
  const href = (pathname: string) => withLocalePath(pathname, locale);
  const { previewId } = await params;
  const previewBase = PREVIEWS.find((item) => item.id === previewId);

  if (!previewBase) notFound();

  const preview = {
    ...previewBase,
    ...copy.modulesCopy[previewBase.id],
  };

  return (
    <main className="pt-preview-page pt-wt">
      <Link className="pt-preview-back" href={href('/pro-tools')}>
        {locale === 'es' ? 'Volver a Herramientas Pro' : locale === 'fr' ? 'Retour aux Outils Pro' : pack ? pack.viewTools : 'Back to Pro Tools'}
      </Link>

      <article className="pt-preview-card">
        <header className="pt-preview-head">
          <span>Preview / MOD_{preview.num}</span>
          <span>{preview.tag}</span>
        </header>

        <div className="pt-preview-body">
          <p className="pt-wt-hero-kicker">{copy.freePreview}</p>
          <h1 className="pt-wt-hero-title">{preview.label}</h1>
          <p className="pt-wt-hero-lead">{preview.preview}</p>

          <div className="pt-preview-split">
            <section>
              <span>{locale === 'es' ? 'Resultado esperado' : locale === 'fr' ? 'Resultat attendu' : pack ? pack.result : 'Expected result'}</span>
              <p>{preview.result}</p>
            </section>
            <section>
              <span>{locale === 'es' ? 'Siguiente paso' : locale === 'fr' ? 'Etape suivante' : pack ? pack.openPreview : 'Next step'}</span>
              <p>{locale === 'es' ? 'Esta pagina conecta una preview dedicada sin tocar las paginas de pago.' : locale === 'fr' ? 'Cette page connecte un apercu dedie sans toucher aux pages payantes.' : pack ? `${pack.openPreview}: ${pack.heroLead}` : 'This page connects a dedicated preview tool without touching the paid pages.'}</p>
            </section>
          </div>
        </div>
      </article>

      {preview.id === 'aim-tools' && (
        <section className="pt-preview-tools" aria-label="Aim Tools preview">
          <RecoilVisualizer />

          <article className="pt-preview-response">
            <header>
              <span>10</span>
              <h2>Response Curve</h2>
            </header>
            <Image
              src="/assets/tools/aim/response-curve.jpg"
              alt="Standard, Linear and Dynamic response curves"
              width={1200}
              height={786}
              sizes="(max-width: 980px) 100vw, 980px"
            />
            <p>{RESPONSE_CURVE_BODY}</p>
          </article>

          <div className="pt-preview-unlock">
            <span>{locale === 'es' ? 'Desbloquear Herramientas de Aim completas' : locale === 'fr' ? 'Debloquer Aim Tools complet' : pack ? `${pack.goPro} Aim Tools` : 'Unlock full Aim Tools'}</span>
            <p>{locale === 'es' ? 'Desbloquea calculadoras, guias y herramientas interactivas para tu aim.' : locale === 'fr' ? 'Debloque les calculateurs, guides et outils interactifs pour ton aim.' : pack ? pack.catalogLead : 'Unlock the full calculators, guides and interactive tools for your aim.'}</p>
            <Link href={href('/tools-individual')}>{locale === 'es' ? 'Desbloquear herramienta' : locale === 'fr' ? 'Debloquer l outil' : pack ? pack.viewTools : 'Unlock tool'}</Link>
          </div>
        </section>
      )}

      {preview.id === 'next-meta' && (
        <section className="pt-preview-tools" aria-label="Next Meta preview">
          <PatchNotesTracker />

          <article className="pt-preview-response">
            <header>
              <span>05</span>
              <h2>Prediction: What The Next Patch Will Change</h2>
            </header>
            <Image
              src="/assets/tools/next-meta/patch-prediction.jpg"
              alt="Patch notes Black Ops 7 Warzone S03"
              width={1200}
              height={678}
              sizes="(max-width: 980px) 100vw, 980px"
            />
            <p>{PATCH_PREDICTION_BODY}</p>
          </article>

          <div className="pt-preview-unlock">
            <span>Unlock full Next Meta</span>
            <p>Unlock full predictions, patch reads and meta signals before the rest of the lobby.</p>
            <Link href={href('/tools-individual')}>Buy tool</Link>
          </div>
        </section>
      )}

      {preview.id === 'pro-movement' && (
        <section className="pt-preview-tools" aria-label="Pro Movement preview">
          <PeekAngleVisualizer />

          <article className="pt-preview-response">
            <header>
              <span>01</span>
              <h2>Why Movement Is Your Primary Weapon</h2>
            </header>
            <Image
              src="/assets/tools/pro-movement/movement-why.jpg"
              alt="Warzone operator moving on a roof"
              width={1200}
              height={675}
              sizes="(max-width: 980px) 100vw, 980px"
            />
            <p>{MOVEMENT_PRIMARY_BODY}</p>
          </article>

          <div className="pt-preview-unlock">
            <span>Unlock full Pro Movement</span>
            <p>Unlock the full visualizers, routines and guides to peek, rotate and win space.</p>
            <Link href={href('/tools-individual')}>Unlock tool</Link>
          </div>
        </section>
      )}

      {preview.id === 'how-to-be-a-pro' && (
        <section className="pt-preview-tools" aria-label="How To Be A Pro preview">
          <ContractPriorityGuide />

          <article className="pt-preview-response">
            <header>
              <span>05</span>
              <h2>Master The 1v1 First</h2>
            </header>
            <Image
              src="/assets/tools/how-to-be-a-pro/master-1v1.jpg"
              alt="Operator standing in a duel scene"
              width={1200}
              height={675}
              sizes="(max-width: 980px) 100vw, 980px"
            />
            <p>{MASTER_1V1_BODY}</p>
          </article>

          <div className="pt-preview-unlock">
            <span>Unlock full How To Be A Pro</span>
            <p>Unlock the full guides to structure sessions, read mistakes and progress like a competitive player.</p>
            <Link href={href('/tools-individual')}>Unlock tool</Link>
          </div>
        </section>
      )}

      {preview.id === 'pro-spawn' && (
        <section className="pt-preview-tools" aria-label="Pro Spawn preview">
          <LootTierMap />

          <article className="pt-preview-response">
            <header>
              <span>07</span>
              <h2>Cluster Drop</h2>
              <strong className="pt-preview-hot-drop">Hot drop</strong>
            </header>
            <p>{CLUSTER_DROP_BODY}</p>
            <div className="pt-preview-pros-cons">
              <section>
                <span>Advantages</span>
                <p>Immediate dominance of a key strategic position</p>
                <p>No dangerous consolidation phase</p>
                <p>Fast squad wipe against uncoordinated teams</p>
              </section>
              <section>
                <span>Disadvantages</span>
                <p>Requires perfect communication and defined roles</p>
                <p>A badly timed group drop can wipe your own squad</p>
                <p>Predictable to teams who recognise your playstyle</p>
              </section>
            </div>
          </article>

          <div className="pt-preview-unlock">
            <span>Unlock full Pro Spawn</span>
            <p>Unlock maps, routes, spawns and control plans to gain the advantage from the drop.</p>
            <Link href={href('/tools-individual')}>Unlock tool</Link>
          </div>
        </section>
      )}

      {preview.id === 'pro-opti' && (
        <section className="pt-preview-tools" aria-label="Pro Opti preview">
          <article className="pt-preview-response">
            <header>
              <span>09</span>
              <h2>NVIDIA Control Panel</h2>
              <strong className="pt-preview-gpu-chip">NVIDIA</strong>
            </header>
            <div className="pt-preview-video-block">
              <span>Video reference</span>
              <h3>NVIDIA and Warzone Settings Example</h3>
              <p>Example reference for NVIDIA-side settings that affect latency, visibility, and FPS.</p>
              <iframe
                src="https://www.youtube.com/embed/fAc5ADA_ixg"
                title="NVIDIA and Warzone settings example"
                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                sandbox="allow-scripts allow-presentation"
              />
            </div>
            <h3 className="pt-preview-inline-title">NVIDIA Control Panel</h3>
            <p>{NVIDIA_BODY}</p>
          </article>

          <article className="pt-preview-response">
            <header>
              <span>10</span>
              <h2>AMD Radeon Software</h2>
              <strong className="pt-preview-gpu-chip">AMD</strong>
            </header>
            <div className="pt-preview-video-block">
              <span>Video reference</span>
              <h3>AMD Radeon Warzone Settings Example</h3>
              <p>Example reference for AMD Radeon users tuning FPS and visibility.</p>
              <iframe
                src="https://www.youtube.com/embed/082jOaAnCHc"
                title="AMD Radeon Warzone settings example"
                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                sandbox="allow-scripts allow-presentation"
              />
            </div>
            <h3 className="pt-preview-inline-title">AMD Radeon Software</h3>
            <p>{AMD_BODY}</p>
          </article>

          <div className="pt-preview-unlock">
            <span>Unlock full Pro Opti</span>
            <p>Unlock the full guides for FPS, latency, network, audio and system optimization.</p>
            <Link href={href('/tools-individual')}>Unlock tool</Link>
          </div>
        </section>
      )}
    </main>
  );
}
