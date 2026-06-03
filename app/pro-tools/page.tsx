import Link from 'next/link';
import ProToolsShell from '@/components/ProToolsShell';
import ProToolsWeaponScene from '@/components/ProToolsWeaponScene';
import { withLocalePath } from '@/lib/i18n';
import { getProToolsPageCopy } from '@/lib/pageCopy';
import { getRequestLocale } from '@/lib/requestLocale';
import { translateRuntimeText } from '@/lib/runtimeTranslations';
import './pro-tools.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Pro Tools — WZPRO Meta',
  description: 'Advanced tools and guides to elevate your Warzone game',
};

type Tip = { key: string; body: string };
type SpawnCard = { label: string; body: string };
type SpawnGroup = { title: string; cards: SpawnCard[] };

type Section = {
  id: string;
  num: string;
  label: string;
  tag: string;
  description?: string;
  result: string;
  preview: string;
  lead: string;
  sub?: string;
  tips: Tip[];
  spawnGroups?: SpawnGroup[];
};

const sections: Section[] = [
  {
    id: 'aim-tools',
    num: '01',
    label: 'AIM TOOLS',
    tag: 'PRECISION',
    result: 'Stabilize your sensitivity, ADS multiplier and micro-corrections.',
    preview: '10-minute routine, low dead zones and crosshair placement.',
    lead: 'Aim is the most direct expression of skill in Warzone. Without consistent aiming, every other advantage collapses under pressure.',
    tips: [
      { key: 'Sensitivity tuning', body: 'Find your optimal sensitivity by testing at 3–6 inches per 360°. Lower sens gives control at long range; higher sens wins close fights. Stick with one setting for at least 2 weeks before judging.' },
      { key: 'ADS sensitivity multiplier', body: 'Set your ADS multiplier between 0.85 and 1.0. Relative aim makes transitions between zoom levels feel consistent.' },
      { key: 'Dead zone calibration', body: 'Calibrate your controller dead zones in-game. Even small stick drift kills micro-adjustment accuracy. Aim for the lowest dead zone your hardware allows.' },
      { key: 'Crosshair placement', body: 'Keep your crosshair at head level at all times. Pre-aim common corners and high-traffic angles. Most kills come from positioning, not reaction time.' },
      { key: 'Target switching', body: 'When engaging a squad, prioritize the closest target first, then rotate. Resist tracking a fleeing player when a threat is flanking you.' },
      { key: 'Recoil patterns', body: 'Every weapon has a fixed recoil pattern. Spend 15 minutes in the firing range learning the pattern, then counter it with a consistent pull direction.' },
      { key: 'Aim training routine', body: "10 minutes of aim training before session start (Aimlabs or KovaaK's). Focus on target switching and micro-correction, not flicking." },
    ],
  },
  {
    id: 'next-meta',
    num: '02',
    label: 'NEXT META',
    tag: 'INTEL',
    description: 'Next meta as perceived by pros — weapons & equipment',
    result: 'Understand which weapons and perks are rising before the lobby copies them.',
    preview: 'Mobile SMGs, sniper-support ARs and equipment shifts.',
    lead: 'Pro players and content creators consistently pick up on meta shifts 1–2 patches ahead of the general player base. Here is what the top 1% is moving toward.',
    tips: [
      { key: 'Movement SMGs rising', body: 'Fast-ADS submachine guns are overtaking assault rifles in close-range dominance. Expect the meta to lean harder into slide-cancel aggression builds.' },
      { key: 'Sniper support ARs', body: 'Semi-auto marksman rifles paired with a close-range secondary are replacing full-auto AR classes at mid-range. Higher damage per bullet rewards accurate players.' },
      { key: 'Equipment shift', body: 'Semtex is losing ground to Drill Charge for penetrating corner campers. Snapshot grenades are becoming standard for checking rooftops before pushing.' },
      { key: 'Perk meta', body: 'Ghost + Resolute is the dominant perk combination in resurgence. Tracker is replacing Vigilance as the secondary detection perk for aggressive players.' },
      { key: 'Vest selection', body: 'Engineer Vest is taking over from Gunner Vest in competitive lobbies. The ability to reroll field upgrades and see enemy equipment mid-fight is increasingly valued.' },
      { key: 'Field upgrade', body: 'Tactical Camera placement at dominant sight lines is replacing Trophy System as the most impactful field upgrade for squad play.' },
    ],
  },
  {
    id: 'pro-movement',
    num: '03',
    label: 'PRO MOVEMENT',
    tag: 'MECHANICS',
    result: 'Win fights by controlling space, timing and angles.',
    preview: 'Slide cancel, corner peeks, high ground and clean rotations.',
    lead: 'Movement is the difference between being a target and being a threat. In Warzone, a player who controls space controls the outcome of every engagement.',
    tips: [
      { key: 'Why movement matters', body: 'Bullets travel in a straight line. A moving target forces the enemy to track, lead, and predict — tripling the difficulty of landing shots. Every frame you are moving erratically is a frame you are harder to kill.' },
      { key: 'Slide cancel', body: 'Slide cancelling restores full movement speed instantly, making you unpredictable at close range. It is not a trick — it is a core mechanic that every pro uses on every engagement.' },
      { key: 'Corner peeking', body: 'Jiggle-peek before committing to a corner. A fast peek gives you information without exposing your full body. If you see a player, you have the data to decide — push or reposition.' },
      { key: 'High ground control', body: 'Rooftops and elevated positions give a wider field of view and force enemies into exposed approaches. Rotate to high ground early, before the circle closes around it.' },
      { key: 'Rotation timing', body: 'Bad movement means rotating too late, under fire, with no cover. Good movement means being in the next position before the enemy expects you there. Rotate early — always.' },
      { key: 'Swim routes', body: 'Water movement kills velocity. If you must cross water, choose the shortest crossing and have a landing spot pre-planned. Never cross open water with an enemy watching.' },
    ],
  },
  {
    id: 'how-to-be-a-pro',
    num: '04',
    label: 'HOW TO BE A PRO',
    tag: 'MINDSET',
    result: 'Turn sessions into measurable practice instead of blind grinding.',
    preview: 'Session goals, VOD review and mental reset.',
    lead: 'Being a pro is not about raw talent. It is a system — consistent habits, quality time, the right people, and a relentless drive to improve solo before relying on a team.',
    tips: [
      { key: 'Minimum effective dose', body: 'Play at least 2 focused hours per day. Less than that and your mechanics decay between sessions. More than 5 hours without a break and your decision-making degrades. Volume is not the goal — quality reps are.' },
      { key: 'Play with intent', body: 'Every session needs a goal. "Get better at close range," "practice rotations," "test a new class." Aimless games are entertainment, not training. Track your wins and your deaths — understand why, not just what.' },
      { key: 'Review your gameplay', body: 'Record your sessions. Watch back fights you lost and identify the decision that cost you the fight. Most deaths are self-inflicted — bad position, bad timing, wrong engagement.' },
      { key: 'Play with good teammates', body: 'Your squad will carry or anchor your development. Teammates who communicate, rotate together, and share callouts accelerate your growth by 10x. Find a consistent duo or trio — randoms do not teach you anything.' },
      { key: 'Build solo excellence first', body: 'A squad is only as strong as its weakest player in a 1v1. Before you rely on teammates to clean up fights, make sure you can close out 1v1s reliably. Drop into solo modes, play aggressively, and force yourself into uncomfortable 1v1 situations daily.' },
      { key: 'Mental reset between sessions', body: 'Tilt compounds. If you lose three games in a row on a bad day, stop. Playing angry reinforces bad habits. Pros understand when to step away — it is not weakness, it is efficiency.' },
      { key: 'Study the top 1%', body: 'Watch professionals stream and analyze their positioning, not their aim. Aim is personal. Positioning and game sense are universal transferable skills.' },
    ],
  },
  {
    id: 'pro-spawn',
    num: '05',
    label: 'PRO SPAWN',
    tag: 'MAP CONTROL',
    result: 'Choose spawns that give information, elevation and cleaner rotations.',
    preview: 'HQ roof, Bio Labs, Riverboat and Train Station.',
    lead: 'Knowing where enemies spawn is not a trick — it is information. Controlling spawns means controlling the flow of the match and reducing the number of angles you have to check.',
    sub: 'There are currently two active resurgence maps. Mastering at least two dominant spawn zones per map gives you a systematic edge at every stage of the game.',
    tips: [
      { key: 'Controlled Hot Drop', body: 'Pro squads land in populated zones with a precise plan: split the team to cover multiple buildings, prioritize floor loot and secure immediate contracts for cash.' },
      { key: 'Late Drop', body: 'Wait until the flight path empties before jumping. Cleaner loot, less pressure and more freedom to pick a strategic position based on first zone.' },
      { key: 'Contract Drop', body: 'Land directly on a bounty, recon or supply contract to generate cash instantly. It forces early pressure but accelerates loadout timing.' },
      { key: 'Buy Station Control', body: 'Position the squad around nearby buy stations to punish teams trying to revive teammates or recover their loadout.' },
      { key: 'Zone Prep', body: 'From spawn, calculate the first rotation path. Drop near the predictable zone edge to avoid getting pinched between gas and enemy teams.' },
      { key: 'Cluster Drop', body: 'Land as a tight squad on one point to dominate a specific area immediately. Requires clean communication but creates a strong early loot advantage.' },
    ],
    spawnGroups: [
      {
        title: 'REBIRTH ISLAND',
        cards: [
          {
            label: 'SPAWN 01 — HEADQUARTERS ROOF',
            body: 'Drop directly onto HQ rooftop. Enemies rotating from Prison or Chemical Engineering must cross the open courtyard below. You hold elevation on every approach. Control this spawn and you dictate the centre of the map for the first 90 seconds.',
          },
          {
            label: 'SPAWN 02 — BIOWEAPON LABS EAST ENTRY',
            body: 'The east entry of Bio Labs spawns you adjacent to the staircase stack and the loot room. This spawn gives immediate access to the labs interior while putting you above the beach-side rotation lane. Teams rotating from Decon are exposed — pre-aim the corner before they peek.',
          },
        ],
      },
      {
        title: 'HAVEN',
        cards: [
          {
            label: 'SPAWN 01 — RIVERBOAT',
            body: 'Riverboat sits at the southern edge of the map and controls the main water-side rotation lane. Drop onto the boat structure for immediate cover and a sight line over the south approach. Squads rotating from Lumbermill or Main Street are forced to cross your field of fire.',
          },
          {
            label: 'SPAWN 02 — TRAIN STATION',
            body: 'Train Station is the dominant spawn on the west side of Haven. The building structure offers multiple floors of cover and controls the only western rotation corridor. Holding Train Station early forces the entire lobby to rotate around you rather than through you.',
          },
        ],
      },
    ],
  },
  {
    id: 'pro-opti',
    num: '06',
    label: 'PRO OPTI',
    tag: 'PERFORMANCE',
    result: 'Reduce input lag, stutter, packet loss and muddy audio.',
    preview: 'Stable FPS, Boost High audio, ethernet and Windows settings.',
    lead: 'Your hardware and software environment are the ceiling of your performance. You can have perfect mechanics, but a stuttering frame or a muddy audio mix will cost you a fight you should have won.',
    tips: [
      { key: 'PC optimization', body: 'Close every non-essential background app before launching. Disable Xbox Game Bar, Windows Search indexing, and auto-updates during play sessions. Set your power plan to High Performance in Windows settings. Free RAM is fast RAM.' },
      { key: 'Windows tuning', body: 'Disable hardware-accelerated GPU scheduling if your GPU is below an RTX 3000. Enable it if you have a newer card. Set your display adapter to maximum refresh rate. Turn off mouse acceleration system-wide — it is always on by default and destroys consistency.' },
      { key: 'In-game settings', body: 'Prioritize stable framerate over image quality. Target 1% low fps above your display refresh rate, not just average fps. Disable film grain, motion blur, and depth of field — they reduce visual clarity with zero gameplay upside.' },
      { key: 'Monitor setup', body: "Match your in-game framerate cap to your monitor's refresh rate using hardware sync (G-Sync or FreeSync). Response time should be set to the fastest mode your monitor offers without introducing overshoot artifacts." },
      { key: 'Audio setup', body: 'This is the most underrated advantage in Warzone. Use stereo headphones with spatial audio enabled (Windows Sonic or Dolby Atmos). Set your in-game audio mix to Boost High. Hear the fight before you see it.' },
      { key: 'Network stability', body: 'A wired ethernet connection beats WiFi in every measurable way: lower ping, zero packet loss, no interference. High packet loss is more damaging than high ping — prioritize stability over raw speed numbers.' },
    ],
  },
];

function TipBriefing({ tips }: { tips: Tip[] }) {
  return (
    <ol className="pt-wt-entries">
      {tips.map((tip, index) => (
        <li key={tip.key} className="pt-wt-entry">
          <span className="pt-wt-entry-idx">{String(index + 1).padStart(2, '0')}</span>
          <div>
            <h3 className="pt-wt-entry-key">{tip.key}</h3>
            <p className="pt-wt-entry-body">{tip.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function SpawnGroups({ groups }: { groups: SpawnGroup[] }) {
  return (
    <>
      {groups.map((group) => (
        <div key={group.title}>
          <h3 className="pt-wt-map-title">{group.title}</h3>
          <div className="pt-wt-spawn-row">
            {group.cards.map((card) => (
              <div key={card.label} className="pt-wt-spawn">
                <div className="pt-wt-spawn-label">{card.label}</div>
                <p>{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

export default async function ProToolsPage() {
  const locale = await getRequestLocale();
  const copy = getProToolsPageCopy(locale);
  const href = (pathname: string) => withLocalePath(pathname, locale);
  const t = (value: string) => translateRuntimeText(value, locale);
  const localizedSections = sections.map((section) => ({
    ...section,
    ...copy.modulesCopy[section.id],
    tag: t(copy.modulesCopy[section.id]?.tag ?? section.tag),
    label: t(copy.modulesCopy[section.id]?.label ?? section.label),
    result: t(copy.modulesCopy[section.id]?.result ?? section.result),
    preview: t(copy.modulesCopy[section.id]?.preview ?? section.preview),
    lead: t(copy.modulesCopy[section.id]?.lead ?? section.lead),
    sub: section.sub ? t(section.sub) : section.sub,
    description: section.description ? t(section.description) : section.description,
    tips: section.tips.map((tip) => ({ key: t(tip.key), body: t(tip.body) })),
    spawnGroups: section.spawnGroups?.map((group) => ({
      title: t(group.title),
      cards: group.cards.map((card) => ({ label: t(card.label), body: t(card.body) })),
    })),
  }));

  return (
    <div className="pro-tools-page">
      <div className="pt-technical-backdrop" aria-hidden="true" />
      <ProToolsWeaponScene />

      <div className="safari-bar">
        <Link className="brand-pill" href={href('/')}>
          <b>WZ</b>
          <span>Meta</span>
        </Link>
        <nav>
          <Link href={href('/pro-tools')} aria-current="page">{copy.nav.proTools}</Link>
          <Link href={href('/#all-loadouts')}>{copy.nav.loadouts}</Link>
          <Link href={href('/set-up')}>{copy.nav.setUp}</Link>
          <Link href={href('/esport')}>{copy.nav.esport}</Link>
          <Link href={href('/community')}>{copy.nav.community}</Link>
        </nav>
        <label>
          <span>{copy.nav.search}</span>
          <input placeholder={copy.nav.searchPlaceholder} />
        </label>
        <div className="nav-readout" aria-hidden="true">
          <span>THEATER // AL MAZRAH</span>
          <span>UTC-04 21:08</span>
          <span>TRACKING: ACTIVE</span>
        </div>
      </div>

      <main className="ptv2-main pt-wt" data-layout="zigzag">
        <header className="pt-wt-hero">
          <div className="pt-wt-hero-meta" aria-hidden="true">
            <span>DOC / WZ-PT-01</span>
            <span>REV 26.05</span>
            <span>TRACKING ACTIVE</span>
          </div>
          <div className="pt-wt-hero-grid">
            <div>
              <p className="pt-wt-hero-kicker">{copy.heroKicker}</p>
              <h1 className="pt-wt-hero-title">{copy.heroTitle}</h1>
              <p className="pt-wt-hero-lead">
                {copy.heroLead}
              </p>
              <div className="pt-wt-hero-actions">
                <Link href={href('/tools-individual')}>{copy.viewTools}</Link>
                <Link href={href('/pro-access')}>{copy.goPro}</Link>
              </div>
            </div>
            <dl className="pt-wt-hero-stats">
              <div>
                <dt>{copy.modules}</dt>
                <dd>06</dd>
              </div>
              <div>
                <dt>{copy.tools}</dt>
                <dd>6</dd>
              </div>
              <div>
                <dt>{copy.from}</dt>
                <dd>9€</dd>
              </div>
            </dl>
          </div>
        </header>

        <section className="pt-wt-proof-grid" aria-label={copy.accessAria}>
          {copy.proof.map((card) => (
            <article key={card.label}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <p>{card.body}</p>
            </article>
          ))}
        </section>

        <section className="pt-access-compare" aria-label={copy.accessAria}>
          <article>
            <span>{copy.free}</span>
            <strong>{copy.freeTitle}</strong>
            <p>{copy.freeBody}</p>
          </article>
          <article>
            <span>{copy.pro}</span>
            <strong>{copy.proTitle}</strong>
            <p>{copy.proBody}</p>
          </article>
          <Link href={href('/pro-access')}>{copy.compareAccess}</Link>
        </section>

        <ProToolsShell
          sections={localizedSections.map(({ id, num, label, tag }) => ({ id, num, label, tag }))}
          copy={copy.rail}
          toolsHref={href('/tools-individual')}
        >
            {localizedSections.map((section, index) => (
              <article
                key={section.id}
                id={section.id}
                className={`pt-wt-module ${index % 2 === 0 ? 'pt-wt-module--left' : 'pt-wt-module--right'}`}
              >
                <header className="pt-wt-module-head">
                  <span className="pt-wt-module-idx">MOD_{section.num}</span>
                  <span className="pt-wt-module-tag">{section.tag}</span>
                  <h2 className="pt-wt-module-title">{section.label}</h2>
                </header>

                <div className="pt-wt-module-body">
                  <div className="pt-wt-product-preview">
                    <div>
                      <span>{copy.result}</span>
                      <p>{section.result}</p>
                    </div>
                    <div>
                      <span>{copy.freePreview}</span>
                      <p>{section.preview}</p>
                      <Link className="pt-wt-preview-btn" href={href(`/pro-tools/${section.id}`)}>
                        {copy.openPreview}
                      </Link>
                    </div>
                  </div>

                  {section.description && (
                    <p className="pt-wt-module-desc">{section.description}</p>
                  )}

                  <p className="pt-wt-brief">{section.lead}</p>
                  {section.sub && <p className="pt-wt-sub">{section.sub}</p>}

                  {section.id === 'pro-spawn' && (
                    <p className="pt-wt-section-label">{copy.spawnProtocols}</p>
                  )}

                  <TipBriefing tips={section.tips} />

                  {section.spawnGroups && <SpawnGroups groups={section.spawnGroups} />}
                </div>
              </article>
            ))}

        <section id="access" className="pt-wt-pricing">
          <header className="pt-wt-pricing-head">
            <span className="pt-wt-pricing-tag">{copy.clearance}</span>
            <h2 className="pt-wt-pricing-title">{copy.accessTiers}</h2>
          </header>

          <div className="pt-wt-plans">
            <div className="pt-wt-plan">
              <span className="pt-wt-plan-tier">{copy.plans.freeTier}</span>
              <div className="pt-wt-plan-price">0 EUR<span>{copy.plans.always}</span></div>
              <p className="pt-wt-plan-desc">{copy.plans.freeDesc}</p>
              <ul className="pt-wt-plan-list">
                {copy.plans.freeItems.map((item) => <li key={item}>{item}</li>)}
              </ul>
              <Link href={href('/subscribe')} className="pt-wt-plan-btn">{copy.plans.subscribe}</Link>
            </div>

            <div className="pt-wt-plan pt-wt-plan--featured">
              <span className="pt-wt-plan-badge">{copy.plans.priority}</span>
              <span className="pt-wt-plan-tier">{copy.plans.proTier}</span>
              <div className="pt-wt-plan-price">50 EUR<span>{copy.plans.month}</span></div>
              <p className="pt-wt-plan-desc">{copy.plans.proDesc}</p>
              <ul className="pt-wt-plan-list">
                {copy.plans.proItems.map((item) => <li key={item}>{item}</li>)}
              </ul>
              <Link href={href('/pro-access')} className="pt-wt-plan-btn pt-wt-plan-btn--pro">{copy.plans.getPro}</Link>
            </div>

            <div className="pt-wt-plan">
              <span className="pt-wt-plan-tier">{copy.plans.modularTier}</span>
              <div className="pt-wt-plan-price">
                {copy.from} <span className="pt-wt-plan-price-accent">9 EUR</span>
                <span>{copy.plans.tool}</span>
              </div>
              <p className="pt-wt-plan-desc">{copy.plans.modularDesc}</p>
              <ul className="pt-wt-plan-list">
                {localizedSections.map((section) => <li key={section.id}>{section.label}</li>)}
              </ul>
              <Link href={href('/tools-individual')} className="pt-wt-plan-btn">{copy.plans.browse}</Link>
            </div>
          </div>
        </section>
        </ProToolsShell>
      </main>
    </div>
  );
}
