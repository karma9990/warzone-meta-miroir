import fs from 'fs';
import path from 'path';
import { hasUpstash, upstashCommand } from './upstash';

const TOOL_CONTENT_FILE = path.join(process.cwd(), 'data', 'tool-content.json');
const BACKUP_DIR = path.join(process.cwd(), 'data', 'migration-backups');
const TOOL_CONTENT_KEY = 'wz:tool-content';

export interface ToolSource {
  label: string;
  url: string;
}

export interface ToolItem {
  title: string;
  body: string;
  image?: string;
  pros?: string[];
  cons?: string[];
  difficulty?: 'hot' | 'medium' | 'quiet';
  category?: string;
  sources?: ToolSource[];
  video?: {
    title: string;
    url: string;
    note: string;
  };
}

export interface ToolData {
  name: string;
  tag: string;
  content: ToolItem[];
}

export type ToolVideo = NonNullable<ToolItem['video']>;

const PRO_OPTI_VIDEOS: Record<string, ToolVideo> = {
  'Read this before optimising anything': {
    title: 'Warzone PC optimization overview',
    url: 'https://www.youtube.com/embed/D1Y2bt4KDq4',
    note: 'Example video for understanding the kind of PC-wide optimisation approach this section introduces.',
  },
  'Frame rate priority': {
    title: 'Warzone FPS and quality settings',
    url: 'https://www.youtube.com/embed/D1Y2bt4KDq4',
    note: 'Use this as a visual reference for balancing FPS, quality, and smooth frame pacing.',
  },
  'In-game graphics settings': {
    title: 'Warzone graphics settings example',
    url: 'https://www.youtube.com/embed/jJ_-bPHgBhg',
    note: 'Example walkthrough for competitive graphics settings and visibility-focused choices.',
  },
  'Windows optimisation': {
    title: 'Windows gaming optimization example',
    url: 'https://www.youtube.com/embed/3O5j2xyeddQ',
    note: 'Quick example of OS-level gaming optimisation ideas before going deeper into Windows settings.',
  },
  'Windows settings to disable': {
    title: 'Warzone lag and FPS drop optimization',
    url: 'https://www.youtube.com/embed/fw3sd22kyG0',
    note: 'Example video focused on reducing lag, stutters, and FPS drops through system cleanup.',
  },
  'Performance-focused operating systems': {
    title: 'Atlas OS gaming performance comparison',
    url: 'https://www.youtube.com/embed/wgxrr5F1M7U',
    note: 'Example comparison for understanding what debloated gaming-focused Windows builds try to improve.',
  },
  'Overclocking CPU & GPU': {
    title: 'GPU overclocking example',
    url: 'https://www.youtube.com/embed/ypJH6JAiTPs',
    note: 'Short example showing the basic overclocking idea. Always test stability and temperatures before playing ranked.',
  },
  'Monitor setup': {
    title: 'Warzone color and visibility setup',
    url: 'https://www.youtube.com/embed/UPUHARFCgjc',
    note: 'Example video for visibility and color tuning without sacrificing FPS.',
  },
  'NVIDIA Control Panel': {
    title: 'NVIDIA and Warzone settings example',
    url: 'https://www.youtube.com/embed/fAc5ADA_ixg',
    note: 'Example reference for NVIDIA-side settings that affect latency, visibility, and FPS.',
  },
  'AMD Radeon Software': {
    title: 'AMD Radeon Warzone settings example',
    url: 'https://www.youtube.com/embed/082jOaAnCHc',
    note: 'Example reference for AMD Radeon users tuning FPS and visibility.',
  },
  'Audio setup': {
    title: 'Warzone footstep audio settings',
    url: 'https://www.youtube.com/embed/oD5oGV6ctLQ',
    note: 'Example video for basic footstep-focused audio settings before advanced EQ chains.',
  },
  'Network stability': {
    title: 'Warzone packet loss example',
    url: 'https://www.youtube.com/embed/iGgElAPNThY',
    note: 'Example reference for diagnosing packet loss and connection instability in Warzone.',
  },
  'Controller & peripheral settings': {
    title: 'SCUF controller settings example',
    url: 'https://www.youtube.com/embed/2VK8GoXFGOY',
    note: 'Example controller setup reference for paddle binds and competitive controller behaviour.',
  },
  'Storage & load times': {
    title: 'SSD vs HDD gaming performance',
    url: 'https://www.youtube.com/embed/bNZpjaXWlRs',
    note: 'Example comparison for understanding why SSD storage matters for modern game loading and asset streaming.',
  },
};

export function getToolVideo(toolId: string, item: ToolItem) {
  return item.video ?? (toolId === 'pro-opti' ? PRO_OPTI_VIDEOS[item.title] : undefined);
}


export const DEFAULT_TOOL_CONTENT: Record<string, ToolData> = {
  'aim-tools': {
    name: 'Aim Tools',
    tag: 'PRECISION',
    content: [
      {
        title: 'Sensitivity tuning',
        body: 'Sensitivity is the single most personal setting in the game — and the one most players get wrong by changing it too often. The goal is not to find the "correct" number, it is to build an accurate spatial map in your brain between hand movement and crosshair movement. That map only forms through repetition at a fixed value. On controller, start at 6 horizontal / 6 vertical and do not touch it for 30 sessions minimum. Most competitive Warzone players settle between 5 and 8 depending on their role: aggressive entry fraggers who need to track fast targets at close range tend to push toward 7–9, while sniper-support players who need clean micro-corrections at 100m+ prefer 4–6. On PC, the equivalent benchmark is 3–6 inches per 360° — lower means more precision, higher means more speed. The test for whether your sensitivity is right is not how it feels in the menu, it is whether your aim corrections overshoot or undershoot in a real gunfight. If you consistently overshoot and overcorrect, your sensitivity is too high. If you consistently cannot track a sliding target at close range without repositioning your arm, it is too low. Adjust by 0.5 increments, run 10 full sessions, then evaluate again. Never change sensitivity mid-session, mid-week, or out of frustration after a bad game. The worst players in the game have tried 40 different sensitivities and mastered none of them.\n\nTwo additional factors directly affect what sensitivity works for you and are almost never talked about. First, your personal sensitivity to camera speed. Some players experience motion discomfort or visual blur at high camera speeds — their eyes struggle to track the screen when the view rotates fast. If high sensitivity makes the game feel visually unstable or gives you headaches after long sessions, your perceptual limit is lower than average and you should stay between 4 and 6 regardless of playstyle. Forcing a high sensitivity past that threshold will always hurt your performance. Second, the condition of your controller joystick. A worn or drifting joystick introduces random micro-inputs that fight against your aim at low sensitivity — the stick is never perfectly neutral, so low sensitivity magnifies that noise into visible crosshair wobble. If your joystick is degraded, a slightly higher sensitivity (7–8) reduces the relative impact of drift on your aim, while you compensate with a higher dead zone. The correct fix is to replace the stick or the controller, but in the meantime raise both sensitivity and dead zone together to minimise the effect.',
        image: '/assets/tools/aim/sensitivity.jpg',
        sources: [
          { label: 'ProSettings — Warzone pro sensitivity database', url: 'https://prosettings.net/warzone/' },
          { label: 'Reddit r/CODWarzone — sensitivity guides', url: 'https://www.reddit.com/r/CODWarzone/' },
        ],
      },
      {
        title: 'ADS sensitivity multiplier',
        body: 'Your ADS multiplier is the ratio between your hipfire sensitivity and your scoped sensitivity. At 1.0 they are identical — the crosshair moves at the same speed whether you are hip-firing or looking through a 4x scope. For most players, 1.0 causes overshooting at range because the same stick movement that feels natural at close range is too aggressive when trying to place a precise shot on a head at 80 metres. The competitive standard is 0.85–0.90, which slows your ADS aim enough for accurate micro-corrections without making tracking feel sluggish. Start at 0.90 and test in the firing range against static targets at 50m, 100m, and 150m. If your shots consistently land wide of where you intended, drop to 0.85. If tracking a moving target at 30m feels too slow, push to 0.92. The second and equally important setting is your aim input type. Set it to Relative, not Legacy. Legacy changes the effective sensitivity per zoom level — a 1x and a 4x scope will feel completely different, which makes unified muscle memory impossible. Relative applies your multiplier consistently regardless of optic, so your body learns one single reference point. Once you switch to Relative, your sensitivity may feel different — that is normal. Adjust the multiplier accordingly and commit.',
        image: '/assets/tools/aim/ads.jpg',
        sources: [
          { label: 'ProSettings — ADS multiplier breakdowns', url: 'https://prosettings.net/warzone/' },
          { label: 'Reddit r/CODWarzone — Relative vs Legacy aim input', url: 'https://www.reddit.com/r/CODWarzone/' },
        ],
      },
      {
        title: 'Dead zone calibration',
        body: 'Dead zone is the input buffer that filters out hardware imprecision — specifically, the unintended stick drift that occurs when your thumb is off the stick. The game ships with generous default dead zones because controllers vary widely in quality, and too small a dead zone on a worn-out stick causes constant camera drift. The problem is that those defaults are far too large for competitive play. A dead zone of 10% means the first 10% of your stick travel does nothing — your aim does not begin moving until you have already pushed the stick 10% of the way. That kills precision on micro-adjustments. There are two dead zones to calibrate independently. First, the stick dead zone: lower it in the settings to the absolute minimum where your view does not drift when your thumbs are fully off both sticks. Stand still in a live match, let go, and watch. If the crosshair moves at all, raise the dead zone by 1 unit and repeat until it is perfectly still. Second, the trigger dead zone: this controls how much you must press the trigger before the shot registers. Lower it to the minimum so the weapon fires at the first detectable press. Every percent of trigger dead zone adds a hidden delay between your decision to shoot and the actual shot — this is measurable reaction time you are giving away for free. Newer controllers (Xbox Elite Series 2, DualSense Edge) allow you to physically adjust trigger travel. If you have one, use the shortest trigger travel setting.',
        image: '/assets/tools/aim/deadzone.jpg',
        sources: [
          { label: 'Reddit r/CODWarzone — dead zone calibration guide', url: 'https://www.reddit.com/r/CODWarzone/' },
          { label: 'ProSettings — controller dead zone recommendations', url: 'https://prosettings.net/warzone/' },
        ],
      },
      {
        title: 'Crosshair placement',
        body: 'Crosshair placement is the mechanical habit with the highest return per hour of practice, and it requires zero raw aim skill to improve — only awareness and discipline. The concept is simple: your crosshair should be at head height at all times, positioned at the exact spot where an enemy head would appear if someone were standing there. When you pre-aim correctly, you do not need reaction time — the moment the enemy appears, the shot is already lined up. You just pull the trigger. The average player aims at the ground or mid-body by default, requiring 200–400ms of upward correction before the shot can land. Against an opponent who is already pre-aimed at their head, that correction window is your death. On Rebirth Island: always pre-aim the HQ main doorframe at head height from street level, the Bio Labs staircase exits at the top step, the Chemical Engineering rooftop edge at the far side of the ladder, and every Prison window at the upper frame. On Haven: pre-aim the Train Station entrance pillars at standing head height, the Pond building corners at the window ledge level, the Lumbermill upper floor edge, and the Main Street building rooftop parapets. Practice this by making a conscious checklist every time you approach a corner — before you peek, ask yourself: is my crosshair at head height? After 2–3 weeks it becomes automatic and you stop thinking about it. The players you watch winning close fights without apparently trying are not aiming faster — they are already aimed.',
        image: '/assets/tools/aim/crosshair.jpg',
        sources: [
          { label: 'Reddit r/CODWarzone — crosshair placement tips', url: 'https://www.reddit.com/r/CODWarzone/' },
        ],
      },
      {
        title: 'Target switching',
        body: 'Target switching is the skill that separates players who can win 1v1s from players who can win squad wipes. The instinct in a squad fight is to finish every target completely before moving to the next. That instinct is wrong, and it gets you killed. The correct approach is to disengage from a target the moment they stop being the primary threat — even if they are still alive. A player who is running away, downed but crawling, or behind cover is no longer a danger to you. The player pushing your flank from the side is. Priority order: first, the enemy closest to you or with direct line of sight; second, the one actively shooting at you; third, the one who is reloading; fourth, the one retreating. In a 1v3 on Rebirth where all three are pushing aggressively, you have roughly 3–5 seconds before you are flanked from multiple angles. Every extra second you spend spraying at the first target is a second the other two use to close distance and cross-fire you. The mechanical drill for this is in Aimlabs — run Multitask 180 and Spidershot daily. Both require you to identify and eliminate multiple targets in sequence under time pressure. After 2 weeks of daily practice, you will notice your eyes naturally scan for the next threat during a fight rather than locking onto the current one. That scanning habit is what squad wipe potential looks like in practice.',
        image: '/assets/tools/aim/switching.jpg',
        sources: [
          { label: 'Aimlabs — Multitask 180 scenario', url: 'https://aimlabs.com/' },
          { label: 'Reddit r/CODWarzone — squad fight prioritisation', url: 'https://www.reddit.com/r/CODWarzone/' },
        ],
      },
      {
        title: 'Recoil patterns',
        body: 'Recoil in Warzone is not random. Every weapon fires a fixed, repeatable sequence of recoil vectors that is identical every single magazine. The pattern does not change based on distance, movement, or any other variable — it is hardcoded. This means it is fully learnable, and mastering it gives you a measurable accuracy advantage at every range beyond 20 metres. The DS20 Mirage pulls vertically for the first 8 rounds, then drifts left and slightly left for rounds 9–20, then kicks hard up-right at the end of the magazine. The counter-pull is: down-left for the first burst, then correct right, then brace for the final kick. The M15 MOD 0 pulls straight up with a gentle left drift starting around round 10 — the counter is a clean downward pull with a slight right correction past the midpoint. The MK.78 has a tighter, slower vertical climb that rewards short controlled bursts of 5–7 rounds rather than full-auto spray — fire, reset, fire again. To learn any pattern: go to the firing range, stand at exactly 30 metres from a flat wall, fire a full magazine without any stick correction, and either screenshot or study where the shots landed. That cluster is your counter-pull map. Practice the inverse movement until the correction is subconscious. This takes approximately 15 focused minutes per weapon. After that, your bullet groups at 60 metres will tighten dramatically without any conscious effort during real fights.',
        image: '/assets/tools/aim/recoil.jpg',
        sources: [
          { label: 'TrueGameData — Warzone weapon stats & recoil data', url: 'https://truegamedata.com/' },
          { label: 'Reddit r/CODWarzone — recoil pattern analysis', url: 'https://www.reddit.com/r/CODWarzone/' },
        ],
      },
      {
        title: 'Aim training routine',
        body: 'The purpose of a pre-session aim routine is not to warm up your hands — it is to calibrate your eye-hand loop before it matters. Ten minutes of structured aim training activates the neural pathways responsible for precise motor corrections, so when you enter your first real game those pathways are already firing at full speed rather than cold. In Aimlabs, the three scenarios that most directly transfer to Warzone are: Gridshot Ultimate for rapid point-to-point target acquisition — this trains your brain to identify and acquire new targets quickly; Motiontrack for smooth continuous tracking — this trains the micro-correction loop needed to stay on a sliding or jumping enemy; and Multitask 180 for target prioritisation and switching under pressure. In KovaaKs, use Reactive Training and Smoothbot. Do not play these for score. Play them for consistency. A score that is 20% higher one session and 20% lower the next means your aim is not stable — it is luck-dependent. The real benchmark is the variance between sessions, not the peak. When your Gridshot score stays within a 5% band across 10 consecutive sessions, your baseline mechanics are internalised. At that point the warm-up is no longer teaching you — it is just activating what you already own. Give it 4 weeks of daily practice and your in-game aim decisions will happen below the level of conscious thought. You will track, correct, and switch without choosing to. That is the end state.',
        image: '/assets/tools/aim/training.jpg',
        sources: [
          { label: 'Aimlabs — scenario library', url: 'https://aimlabs.com/' },
          { label: 'KovaaKs — aim trainer', url: 'https://www.kovaaks.com/' },
        ],
      },
      {
        title: 'Aimlabs on controller',
        body: 'Aimlabs natively supports Xbox, PlayStation, and any generic XInput controller. Plug in and it is detected automatically — no configuration needed. The scenarios were designed for mouse input, so your absolute scores will always be lower than mouse players and the leaderboards are irrelevant for you. The training value is identical regardless. For controller Warzone players, ignore most of the Aimlabs scenario library and focus on three specifically: Motiontrack trains your ability to smoothly follow a single target moving unpredictably — this is the core skill in close-range 1v1s where the enemy is sliding and repositioning constantly. Multitask 180 trains target prioritisation and rapid switching between three targets at close to medium range — this is the core skill in squad wipes. Spidershot trains point-to-point acquisition speed when a new target appears at an unexpected angle — this transfers directly to corner fights and third-party situations. Run each scenario for 3–4 minutes, making a total of 10–12 minutes before you launch Warzone. Over the first two weeks you will feel the improvement most in fights that previously felt uncontrollable — fast-moving enemies at close range, multi-enemy engagements, and fights where you have to quickly switch from one direction to another.',
        image: '/assets/tools/aim/aimlabs.jpg',
        sources: [
          { label: 'Aimlabs — controller support', url: 'https://aimlabs.com/' },
        ],
      },
      {
        title: 'Aim assist settings',
        body: 'Aim assist in Warzone functions by applying a slowdown to your aim when the crosshair passes near an enemy hitbox, and a magnetism pull that helps the reticle stick to them during tracking. The type of aim assist changes how strong each of these effects is and when they activate. Standard aim assist is the default — moderate slowdown bubble, moderate magnetism, works in most situations. Precision applies a strong snap at the moment of ADS entry, then releases quickly — it is best for close-range aggressive builds where you need the snap-on to compensate for fast-moving targets but do not need sustained tracking assistance. Black Ops provides a wider, more persistent slowdown bubble that stays active while scoped, making sustained tracking at mid-range significantly easier — this is the preferred setting for most competitive players in resurgence because the majority of fights happen at 15–50 metres where sustained tracking matters. For sniper builds with the MK.78 or a dedicated marksman rifle, Precision is generally better because the snap helps with the initial acquisition at long range where the Black Ops bubble is too wide to be precise. Test your chosen setting across a full 5-session block before switching. One bad session is not enough data. The feel of aim assist also varies with sensitivity — if you change your sensitivity, re-evaluate your aim assist type since the two interact directly.',
        image: '/assets/tools/aim/aim-assist.jpg',
        sources: [
          { label: 'ProSettings — aim assist type used by pros', url: 'https://prosettings.net/warzone/' },
          { label: 'Reddit r/CODWarzone — aim assist comparison', url: 'https://www.reddit.com/r/CODWarzone/' },
        ],
      },
      {
        title: 'Response curve',
        body: 'The response curve defines the mathematical relationship between how far you push the stick and how fast the crosshair moves. On a linear curve, pushing the stick 50% of the way produces exactly 50% of the maximum aim speed — the relationship is a straight line. On a dynamic or exponential curve, pushing the stick 50% of the way might produce only 30% of the speed, then the speed ramps up sharply at higher stick values. Dynamic feels smoother and more forgiving at low stick deflections, which is why it is the default in most games — it makes the aim feel more "natural" for casual players. For competitive play, linear is non-negotiable. With a dynamic curve, the same hand movement produces different crosshair speeds depending on how hard you push, which means there is no single repeatable reference point for your muscle memory to anchor to. Every micro-correction becomes a guess. With linear, the relationship is constant and predictable — your body can learn it precisely. Find this setting in the controller advanced options. If your game does not offer it directly, the closest equivalent is setting your inner deadzone to minimum and your outer deadzone to maximum, which approximates linear behaviour. After switching to linear, your aim may feel twitchy at first — that is because the dynamic curve was hiding the full speed of your stick input. Lower sensitivity by 0.5–1 unit and re-calibrate over 5 sessions.',
        image: '/assets/tools/aim/response-curve.jpg',
        sources: [
          { label: 'ProSettings — response curve settings of top players', url: 'https://prosettings.net/warzone/' },
          { label: 'Reddit r/CODWarzone — linear vs dynamic discussion', url: 'https://www.reddit.com/r/CODWarzone/' },
        ],
      },
      {
        title: 'Hip fire',
        body: 'Hip fire is one of the most underused skills in competitive Warzone, and it directly costs players fights at close range every session. When you ADS, the game plays an animation that takes 150ms for an SMG, 200–250ms for an AR, and 280–320ms for an LMG before your aim is fully stabilised. At 3 metres, an enemy can close that gap entirely in the time it takes you to finish your ADS animation. Shooting hip-fired at that range with a DS20 Mirage or any fast-handling SMG is not only viable — it is the faster kill. Hip fire spread on close-range SMGs is tight enough to reliably hit chest and head shots inside 8 metres without any optic. The practical rule: inside 6 metres, shoot immediately without scoping. At 6–15 metres, use ADS. Beyond 15 metres, always ADS. Training this habit requires unlearning the ADS reflex, which is deeply ingrained from hundreds of hours of play. Force it in practice games by consciously not scoping in any fight where the enemy is inside a room or hallway width away. After 10 sessions of conscious practice it becomes a conditional reflex rather than a choice, and you will start winning fights that previously felt like coin flips at point blank.',
        image: '/assets/tools/aim/hip-fire.jpg',
        sources: [
          { label: 'TrueGameData — ADS speed & hip fire stats by weapon', url: 'https://truegamedata.com/' },
          { label: 'Reddit r/CODWarzone — hip fire mechanics', url: 'https://www.reddit.com/r/CODWarzone/' },
        ],
      },
      {
        title: 'Pre-firing',
        body: 'Pre-firing is the act of shooting into a space before you can see an enemy — based on the certainty that they are there. It converts your reaction time from a liability into an advantage: instead of seeing an enemy and then reacting, you have already made the decision and started shooting before the visual confirmation. The information sources that justify pre-firing are: footstep audio — if you hear clear footsteps in the room above you in Bio Labs, you know an enemy is there and you know they will appear at the staircase exit. Pre-aim and fire the moment a hitbox enters your crosshair. Rotation logic — if you forced a squad out of Prison into the alley and the only exit is the south doorframe, someone is coming through that doorframe. Start shooting at it 0.5 seconds before they would realistically arrive. Minimap and UAV — a red dot moving toward your position in a predictable path gives you their arrival point. Pre-fire the corner at the moment they should reach it. The skill ceiling of pre-firing is game sense, not mechanics. The mechanical execution is simple — aim at the entry point and pull the trigger. The high-level skill is correctly reading where the enemy will be. Players who pre-fire correctly look like they have supernatural reactions to spectators because the shots appear before the enemy is visible on screen. They do not have faster reactions — they made the decision earlier.',
        image: '/assets/tools/aim/pre-firing.jpg',
        sources: [
          { label: 'Reddit r/CODWarzone — pre-firing angles guide', url: 'https://www.reddit.com/r/CODWarzone/' },
        ],
      },
      {
        title: 'Bullet velocity',
        body: 'Every projectile in Warzone has a finite travel time — bullets are not hitscan, they move through space and take measurable time to reach the target. At 100 metres with a standard AR, the bullet takes approximately 120–180ms to arrive depending on the weapon and barrel attachment. In that time, a sprinting enemy moves roughly 3–4 metres. If you aim at where they are, you miss. You must aim at where they will be when the bullet arrives. The lead distance increases with range and decreases with bullet velocity. Weapons with high bullet velocity, like the MK.78 with a long barrel, require minimal lead even at 100 metres — the bullet arrives fast enough that the enemy has moved less than a body width. Weapons with low bullet velocity, like short-barrel SMGs used at anything beyond 30 metres, require visible lead — aim half a body width in front of a sprinting target. To develop this skill, practice at the firing range against the moving targets at maximum range. Fire and observe where your shots land relative to the target. Adjust your lead angle until you are hitting consistently. The mental model is simple: the faster the target and the farther the range, the more you lead. Speed this process up by equipping barrels that increase bullet velocity on any weapon you use at range — it is often the most impactful attachment for long-range accuracy, more so than optics or stock.',
        image: '/assets/tools/aim/bullet-velocity.jpg',
        sources: [
          { label: 'TrueGameData — bullet velocity by weapon & barrel', url: 'https://truegamedata.com/' },
          { label: 'Reddit r/CODWarzone — bullet drop & velocity data', url: 'https://www.reddit.com/r/CODWarzone/' },
        ],
      },
    ],
  },
  'next-meta': {
    name: 'Next Meta',
    tag: 'INTEL',
    content: [
      {
        title: 'The rise of fast-ADS SMGs',
        image: '/assets/tools/next-meta/smg-rise.jpg',
        body: 'The current meta is shifting hard toward ultra-fast ADS submachine guns. This is not a coincidence — it is a direct consequence of resurgence engagement pacing. The zone closes faster, engagement distances are shrinking, and players with sub-150ms ADS in close-range fights consistently win the first-shot advantage. The Kogot-7 and VST dominate this category for one simple reason: their damage profile does not drop off fast enough at close range to justify running anything else. What is changing heading into the next patch is the internal competition within this category. The Carbon 57 received a silent buff in the last hotfix — its torso multiplier was slightly increased — which brings it within range of the two leaders in real TTK. Pros currently testing on private servers report that within 8–12 metres, the TTK gap between all three is under 20ms. What will separate these weapons in competitive meta is no longer raw TTK but recoil management, ADS movement speed, and attachment compatibility with aggressive slide-cancel builds. Expect the Carbon 57 to appear in pro loadouts within two weeks if the buff is not reverted.',
        sources: [
          { label: 'WZRanked — SMG pick rate tracker', url: 'https://www.wzranked.com/' },
          { label: 'TrueGameData — TTK comparisons', url: 'https://www.truegamedata.com/' },
        ],
      },
      {
        title: 'Semi-auto ARs are taking over mid-range',
        image: '/assets/tools/next-meta/semi-auto.jpg',
        body: 'For three patches, full-auto ARs at mid-range have been losing ground to semi-auto marksman rifles. The M15 MOD 0 is the clearest example: its damage profile at 30–60m outperforms every full-auto AR in the current patch, provided you land accurate shots. That is where the paradigm shift lies. The full-auto meta rewarded spray discipline and recoil management — two skills average players can approximate with practice. Semi-auto demands per-shot precision that sharply separates good and bad players. In competitive lobbies where the overall skill floor is higher, this trade-off favors teams with the best individual fraggers. The class currently performing best at mid-range is an M15 MOD 0 with a long barrel, moderate magnification optic (2.5x), and grip for kick control, paired with an SMG for close-range fights. This combination is not new — the two-range "sniper support" concept has existed for years — but this is the first time semi-auto has surpassed full-auto in pick rate among the top 5 teams in recent tournaments.',
        sources: [
          { label: 'WZRanked — AR pick rate evolution', url: 'https://www.wzranked.com/' },
          { label: 'ProSettings — pro loadout database', url: 'https://prosettings.net/warzone/' },
        ],
      },
      {
        title: 'Drill Charge: the equipment changing rotations',
        image: '/assets/tools/next-meta/drill-charge.jpg',
        body: 'The Drill Charge is becoming the most impactful equipment in the meta, and most players still do not understand why. It is not simply a tool for killing campers — it is a space-control tool that forces repositioning. The reason Semtex is losing ground is mechanical: Semtex deals damage on impact and explosion, but the enemy has time to react if they see the projectile incoming. The Drill Charge penetrates opaque surfaces without a direct line of sight. Practically: you know a squad is in the B building of Bio Labs. With Semtex, you either have to enter the building or bait them out. With a Drill Charge, you can force the repositioning from outside, safely. This creates pressure without exposure. The best teams use the Drill Charge not to kill directly, but to control enemy movement and force exits into their lines of fire. This is a tactical use most players are not yet exploiting. The other rising use case: blind-drilling rooftops before climbing, to confirm the roof is clear without exposing your head. Combined with Snapshot Grenades for interior cover, this has become the standard pre-push routine for the top teams.',
        sources: [
          { label: 'Reddit r/CODWarzone — Drill Charge meta discussion', url: 'https://www.reddit.com/r/CODWarzone/' },
        ],
      },
      {
        title: 'Ghost + Resolute: the dominant perk combo',
        image: '/assets/tools/next-meta/perks.jpg',
        body: 'Ghost remains the non-negotiable defensive perk across multiple seasons — its ability to hide your position from enemy UAVs on the minimap is too valuable to replace. The real question in the current meta is the second defensive perk. Resolute is establishing itself as the dominant choice in resurgence for a concrete reason: it reduces bullet stagger — the screen shake effect when you take incoming fire. In resurgence, where rapid trades and 1v2 situations are constant, staying on target even while taking hits is a massive advantage. Tracker, meanwhile, is rising in pick rate among aggressive players who chase kills over placements. Enemy footprints visible for 45 seconds let you follow enemy rotations and cut repositioning paths. In a resurgence format where information on enemy movement is critical, Tracker provides an informational edge that Vigilance no longer delivers. Vigilance — which alerted you to drones and tracer rounds — loses relevance in lobbies where Ghost is near-universal. If everyone is running Ghost, being warned of an enemy UAV is less useful than knowing exactly where they moved 30 seconds ago.',
        sources: [
          { label: 'WZRanked — perk pick rate data', url: 'https://www.wzranked.com/' },
        ],
      },
      {
        title: 'Prediction: what the next patch will change',
        image: '/assets/tools/next-meta/patch-prediction.jpg',
        body: 'Based on current pick rate data, discussions in pro communities, and historical Warzone balancing trends, here are the most likely changes in the coming weeks. First, the Kogot-7 and VST will receive adjustments. No weapon dominates a category this clearly without drawing developer attention — their combined pick rate in competitive lobbies exceeds 60% for SMGs, which is the classic sign of an incoming nerf. Expect a reduction in ADS speed or a slight nerf to the close-range damage multiplier. Second, the Voyak KT-3 is reportedly in internal testing for a recoil nerf according to tracked dataminers — if this nerf goes live, the DS20 Mirage consolidates its position as the best AR of the patch. Third, the M15 MOD 0 in semi-auto could receive an ADS speed buff to better compete with full-auto ARs should those receive nerfs. Fourth, the Drill Charge may see its penetration radius reduced — its usage rate has increased by 340% since its buff, making it too dominant in siege scenarios. These predictions are based on historical patterns and observable trends, not official information. Use them to adapt your loadout ahead of the patch rather than reacting after.',
        sources: [
          { label: 'WZRanked — meta predictions tracker', url: 'https://www.wzranked.com/' },
          { label: 'Reddit r/CODWarzone — patch prediction threads', url: 'https://www.reddit.com/r/CODWarzone/' },
        ],
      },
    ],
  },
  'pro-movement': {
    name: 'Pro Movement',
    tag: 'MECHANICS',
    content: [
      {
        title: 'Why movement is your primary weapon',
        image: '/assets/tools/pro-movement/movement-why.jpg',
        body: 'Bullets travel in a straight line. Every defensive mechanic in Warzone — armor, cover, high ground — is a passive layer that requires the enemy to make a mistake. Movement is active. It forces the enemy to do something harder than pulling the trigger: it forces them to predict. A moving target at close range requires the shooter to track, lead, and fire simultaneously. A sliding target reversing direction mid-engagement invalidates the aim entirely. A player who repositions between shots forces a full re-acquisition each time. This is why movement is not a stylistic preference — it is a mechanical force multiplier. The best players in the world do not win more gunfights because they aim better. They win more gunfights because they give the enemy less time to aim at them. Every pro-level movement mechanic — slide cancel, bunny hop, corner jiggle — exists to solve the same problem: how do I reduce the window during which the enemy can track me while maximizing my own tracking window on them? The answer is always asymmetric: your crosshair is more stable than theirs because you control when and how you move. Movement is not escape — it is aggression applied to positioning.',
        sources: [{ label: 'ProSettings — Warzone pro movement analysis', url: 'https://prosettings.net/warzone/' }],
      },
      {
        title: 'Slide cancel: the core mechanic you must master',
        image: '/assets/tools/pro-movement/slide-cancel.jpg',
        body: 'Slide cancelling restores full sprint speed instantly after a slide without committing to the full slide animation. The mechanic works by initiating a slide and immediately cancelling it by jumping or standing up, which resets your momentum and sprint state simultaneously. The result is that you can chain full-speed movements indefinitely, making direction changes instantaneous and your trajectory completely unpredictable. The technical execution on controller: sprint → crouch → jump in rapid succession. The timing window is tight — too slow and you complete the slide, too fast and the input does not register. Practice it in a private match until the rhythm is automatic. On keyboard: sprint → C → Space. The timing is slightly more forgiving but requires key rebinding for most players — crouch on a thumb key significantly reduces the input complexity. What slide cancel actually does in a gunfight: it breaks the enemy\'s tracking arc. When you run in a straight line, an experienced opponent can predict your position 200–300ms ahead and pre-aim where you will be. When you slide cancel with direction changes, your movement is no longer predictable on that timescale. You are forcing a reactive aim rather than a predictive one — which is always harder. Slide cancel also allows you to ADS during the transition, giving you a stable aim window immediately after the movement. This combination — move unpredictably, ADS instantly — is the core loop of aggressive resurgence play.',
        sources: [
          { label: 'Reddit r/CODWarzone — slide cancel mechanics thread', url: 'https://www.reddit.com/r/CODWarzone/' },
          { label: 'TrueGameData — movement speed analysis', url: 'https://www.truegamedata.com/' },
        ],
      },
      {
        title: 'Corner peeking: information before commitment',
        image: '/assets/tools/pro-movement/corner-peek.jpg',
        body: 'The jiggle-peek is the most information-efficient action in Warzone. The principle: expose a minimal portion of your body to a dangerous angle for less than 150ms, then retreat to cover. If the enemy fires, you have their position. If they do not, you have confirmed the angle is clear or that they are holding fire — both are information. The mechanics of a correct jiggle-peek: sprint toward the corner from a slight angle (not perpendicular), slide along the wall edge so that your body clips the corner briefly, then pull back immediately. Your screen should see around the corner for exactly as long as the animation takes. The common mistake is peeking too slowly or stopping at the corner — both dramatically increase your exposure time and turn a scouting action into a gunfight you are not ready for. The advanced application is the wide-peek versus the tight-peek. A tight-peek clips the corner close — minimal exposure, minimal information, no shot available to you. A wide-peek moves further from the corner before peeking — more exposure, but you see more of the angle and can take a shot if the enemy is exposed. The choice between them depends on the distance to your target: tight-peeks at close range, wide-peeks at medium range where exposure duration matters less than sight line quality. All pro players use jiggle-peeks before every hard corner push. The ones who die on corners are almost exclusively those who committed to the angle before verifying it.',
        sources: [{ label: 'ProSettings — corner peeking guide', url: 'https://prosettings.net/warzone/' }],
      },
      {
        title: 'High ground: the position multiplier',
        image: '/assets/tools/pro-movement/high-ground.jpg',
        body: 'High ground does three things simultaneously that no other positional concept achieves: it widens your field of view, it shrinks the enemy\'s exposure window, and it forces them into predictable approach vectors. A player on a rooftop sees 270 degrees of the area below. A player on the ground approaching that rooftop sees one face of the building — the one they are walking toward. This asymmetry is extreme and it compounds with every additional layer of elevation. The mistake most players make is treating high ground as a late-game strategy. In resurgence, high ground should be your first objective after landing and clearing your initial engagement. The reason is that high ground degrades over time — the longer you wait to take it, the more likely an enemy already has it, and taking it from someone already holding it is exponentially harder than arriving first. The second mistake is over-committing to high ground against superior numbers. A rooftop is not invincible — it is exposed from all sides. High ground is only valuable when you control the approach routes to it, which requires at minimum one teammate watching each accessible ladder or staircase. In solos or with a disorganized squad, high ground can become a trap: you are visible from everywhere and stuck with no fallback. The correct use: take high ground early with a full squad, designate approach watchers, and rotate off it proactively before the zone forces you into a contested descent.',
        sources: [{ label: 'Reddit r/CODWarzone — high ground positioning thread', url: 'https://www.reddit.com/r/CODWarzone/' }],
      },
      {
        title: 'Rotation timing: the skill that wins more than aim',
        image: '/assets/tools/pro-movement/rotation.jpg',
        body: 'Rotation timing is the single skill that separates players who consistently place in the top 5 from players who die in the top 10. The core principle: you should be in your next position before the enemy expects you there. This means rotating when the zone first moves, not when it is about to close. Players who wait for the zone to pressure them rotate under fire with degraded positioning options. Players who rotate early arrive at contested areas before the enemy has established, take the angle of their choice, and wait for the enemy to rotate into them. The timing calculus is simple but requires practice to internalize. When the new circle appears, ask two questions: how long do I have before the zone damages me, and how long will it take me to reach the next position I want? If the travel time is more than 60% of the window, you are already late. If it is under 40%, you can hold your current position briefly for information before moving. The trap that kills most players in resurgence is the "one more kill" hesitation. You are in a strong position, there is an enemy squad nearby, and you stay to fight rather than rotate. This is almost always wrong in late-game scenarios. A kill gives you loot and a brief tactical advantage. Being in the right position at the right time gives you the entire game. Pros make this trade explicitly: they ask "is this fight worth the rotation opportunity I am giving up?" The answer is usually no.',
        sources: [
          { label: 'WZRanked — rotation timing data', url: 'https://www.wzranked.com/' },
          { label: 'ProSettings — pro rotation analysis', url: 'https://prosettings.net/warzone/' },
        ],
      },
      {
        title: 'Water and terrain: movement penalties that kill rotations',
        image: '/assets/tools/pro-movement/terrain.jpg',
        body: 'Water is the most punishing terrain in Warzone for a reason that most players underestimate: it does not just slow you down, it makes you completely predictable. In water, you cannot slide cancel, you cannot strafe effectively, you cannot ADS at full speed, and you cannot break the enemy\'s tracking with direction changes. You are a slow-moving target on a linear path. Every second in water is a second during which any enemy with line of sight can track you with minimal effort. The rule is absolute: never enter water in a contested area. If you must cross water — zone forces you, there is no other route — then do it in the shortest possible stretch, at an angle that minimizes the time you are exposed from the dominant sighting positions, and never with enemies already firing at you. Terrain elevation changes have a subtler but equally important effect. Ascending a steep slope reduces your movement speed by 30–40% depending on the angle. This means that if you are retreating uphill from an enemy chasing you downhill, they are gaining on you rapidly even at the same base movement speed. The counterintuitive move when pushed from below on a slope: do not run uphill, break to the side toward a building or cover that neutralizes the elevation gap. The same applies to vault-heavy environments like Bio Labs or Prison — every vault animation has a 600–800ms window where you are fully exposed and cannot change direction. Pre-clear the landing zone with a peek before committing to the vault.',
        sources: [{ label: 'TrueGameData — terrain movement speed analysis', url: 'https://www.truegamedata.com/' }],
      },
    ],
  },
  'how-to-be-a-pro': {
    name: 'How To Be A Pro',
    tag: 'MINDSET',
    content: [
      { title: 'Minimum effective dose', body: 'Play at least 2 focused hours per day. Below that, your mechanics degrade between sessions — muscle memory requires regular repetition to stay ingrained. Raw volume is not enough: 5 hours of aimless games are worth less than 90 focused minutes with a clear objective. Identify one mechanic per session (slide cancel, repositioning after a kill, peek timing) and work on it consciously until it becomes automatic. Structure those 2 hours like training, not entertainment: 10 minutes warm-up, 70–80 minutes of real matches with one clear focus, 10 minutes of review, then a short note about what improved and what still failed. If you only have 45 minutes, reduce the goal instead of skipping the structure — for example, practice only crosshair placement or only early rotations. Consistency matters because Warzone rewards habits under pressure. The habits you repeat every day are the ones that appear when the screen is chaotic, your teammate is down, and the zone is moving. That is how pros improve — not by playing more, but by playing better.', image: '/assets/tools/how-to-be-a-pro/minimum-effective-dose.jpg' },
      { title: 'Playing with intent', body: 'Every session needs a defined objective before you launch your first game. "Winning" is not an objective — it is a result. A real objective looks like: "today I will not push any angle without peeking first", or "I will rotate as soon as the first circle appears without waiting for zone pressure". Write down that objective before you start. At the end of the session, evaluate whether you stuck to it. The important detail is that the objective must be controllable. You cannot control lobby strength, teammates, zone pull, or server quality, but you can control whether you communicate after every knock, whether you reload behind cover, whether you plate before re-challenging, and whether you stop ego-pushing after a down. Track the objective for a full week before changing it, because one night is too noisy to prove anything. Aimless games where you play on autopilot teach you to play on autopilot — meaning you repeat your bad habits at full speed.', image: '/assets/tools/how-to-be-a-pro/playing-with-intent.jpg' },
      { title: 'Review your own gameplay', body: 'To review your gameplay you need a screen recording tool running in the background during every session. The three main options are: OBS Studio (free, open-source, full control over quality and file size — recommended), Shadowplay (Nvidia GPU only, near-zero performance impact, saves automatically), and Medal.tv (lightweight, clip-focused, easy to share). OBS is the most versatile: set it to record at 1080p 60fps with a CRF of 23 and it will capture everything without noticeably impacting your frame rate. Once recording is set up, the habit is simple — after each session, watch the last 3 times you died. Pause 10 seconds before the death and ask three questions: what information did I have, what did I ignore, and what safer option existed? In the majority of cases, you will identify a decision error that preceded your death by 5 to 10 seconds — a bad position, a poorly-peeked angle, a late rotation. Tag each death as mechanics, position, information, teamwork, or greed. After 20 reviews, the pattern becomes obvious. Deaths in Warzone are rarely caused by the enemy\'s aim: they are almost always caused by a reading error you could have avoided. This habit alone, applied for 30 days, will teach you more about your game than 300 hours of unreviewed gameplay.', image: '/assets/tools/how-to-be-a-pro/review-gameplay.jpg' },
      { title: 'Playing with good teammates', body: 'The quality of your teammates affects your progression as much as the quality of your individual training. A duo or trio that communicates positions, coordinates rotations and shares callouts forces you to make better decisions — because information flows in real time. Conversely, silent teammates who push alone teach you to react rather than anticipate. Find a fixed group via Discord, Reddit, or Warzone communities. Look for players with compatible rhythm, not only better stats: a cracked entry player who never waits for the team can be worse for your progress than a slightly weaker teammate who trades properly, shares plates, and calls enemy direction clearly. Build small rules together: who buys UAV first, who holds money, who leads rotations, who anchors when two players push. The regularity of playing with the same people builds an implicit coordination that no random player can replace. Over time, you start predicting each other without speaking, which is exactly what makes good squads look faster than they really are.', image: '/assets/tools/how-to-be-a-pro/good-teammates.jpg' },
      { title: 'Master the 1v1 first', body: 'A squad is only as strong as its weakest link in an isolated duel. If you cannot reliably win a 1v1 — one enemy at full health, same range, fair engagement — you cannot rely on your squad to cover that gap permanently. Work on 1v1s in solo resurgence mode, privately with friends, or on custom servers. Break each duel into four parts: first shot, damage trade, reposition, finish. If you lose the first shot, learn to break line of sight instead of panic-shooting. If you win the damage trade, do not sprint blindly into the finish; reload, plate if needed, and cut the escape route. Practice the same range repeatedly: close-range SMG duels inside 10 metres, mid-range AR fights around 25–40 metres, then awkward fights around stairs and doorframes. The goal is not to win every duel — it is to understand why you lose the ones you lose. A pro who loses a 1v1 knows exactly which decision cost them the fight. An average player just thinks the enemy aimed better.', image: '/assets/tools/how-to-be-a-pro/master-1v1.jpg' },
      { title: 'Mental reset between sessions', body: 'Tilt is cumulative and it measurably degrades your decision-making. After 3 consecutive losses in a bad session, your cortisol is elevated, your patience is gone and you take irrational risks — you push angles you would never push with a clear head, you take fights you know are lost, you blame teammates for errors that came from you. Pros have a strict protocol: they define in advance the threshold at which they stop (3 stupid deaths, 2 back-to-back tilted games), and they respect that threshold without negotiation. A reset does not have to mean ending the night immediately. It can mean standing up for 5 minutes, drinking water, changing mode for one low-pressure game, or reviewing one death before queuing again. What matters is interrupting the emotional loop before it becomes your playstyle. If you keep queueing angry, you train angry decisions. Coming back the next day with a fresh mindset is 10x better than continuing on tilt.', image: '/assets/tools/how-to-be-a-pro/mental-reset.jpg' },
      { title: 'Study the top 1%', body: 'Watch pro streamers and analyse their positioning, not their aim. A pro player\'s aim is the result of thousands of hours — you cannot copy it in 3 weeks. But their map reading, rotation decisions, use of cover, peek timing — these are cognitive decisions you can understand and reproduce immediately. Watch streams with an objective: "why is he in that position right now?" Ask yourself what information allowed him to make that decision. When the player rotates early, pause and identify the reason: zone pull, UAV information, squad count, buy station control, or a power position becoming free. When the player refuses a fight, notice what they are protecting: high ground, cash, respawn timer, or late-game position. Take one decision from the stream and apply it in your next session instead of trying to copy the whole playstyle. That is game sense — the collection of implicit information that guides every action. It is acquired through observation as much as through practice.', image: '/assets/tools/how-to-be-a-pro/study-top-1.jpg' },
      { title: 'Warm-up routine', body: 'The 15 minutes before launching a ranked game are more important than any game in the session. A cold player makes mechanical errors in the first engagements — bad peek timing, aim dropping on first targets, missed slides. The routine: 5 minutes on Aimlabs (Gridshot or Motiontrack depending on your role), then 5 minutes in the firing range against moving targets at 30–50 metres to calibrate your aim for the day. Add 2–3 minutes of movement chaining before the first queue: slide cancel into ADS, jump peek into cover, reload cancel behind cover, then re-challenge. The purpose is not to become tired before playing; it is to wake up the exact actions you will need under pressure. Then play a first game in relaxed mode, with no mental pressure — it serves to activate your reflexes, not to win. Only from the second or third game is your session truly running. Skip this routine and you give your first engagements away to the opponent.', image: '/assets/tools/how-to-be-a-pro/warmup-routine.jpg' },
      { title: 'Reading the minimap in real time', body: 'The minimap is the densest information stream in the game and the majority of players look at it less than 10% of the time. In competitive play, pros scan it every 2–3 seconds — not to see where their allies are, but to build a mental picture of enemy positions based on what they do NOT see. If the UAV pings no enemies to the east but you hear shots to the east, someone has Ghost. If a squad you saw to the north disappeared from the minimap 10 seconds ago, they have rotated — and they are probably coming through the only corridor left. Read the minimap in layers: red dots show immediate threats, teammate arrows show coverage gaps, buy stations reveal likely regroup points, and the edge of zone predicts where desperate teams will appear. Between every reload, plate, ladder climb, or rotation, take one quick scan and update your mental map. The minimap is not a map — it is a deduction tool. Train yourself to look at it actively between every action, not only when you are safe.', image: '/assets/tools/how-to-be-a-pro/reading-minimap.jpg' },
      { title: 'Consistency over peaks', body: 'A player who delivers 8/10 consistently every session beats in the long run the player who alternates 10/10 and 3/10. The reason is counterintuitive: weak sessions are not neutral — they retrain bad habits under stress and destroy accumulated confidence. Pros optimise their floor, not their ceiling. Concretely: if you play better by only taking favourable fights rather than trying ambitious plays, take the favourable fights every day. Build a repeatable baseline: same sensitivity, same warm-up, same loadout role, same review habit, and the same rules for when to rotate or disengage. Peaks are allowed, but they should come from a stable base, not from gambling on hero plays. Ambition will come naturally once the base is solid. The temptation to "force" a good session after several bad ones is exactly what prolongs bad runs — it is a tilt mechanism disguised as determination.', image: '/assets/tools/how-to-be-a-pro/consistency-over-peaks.jpg' },
      { title: 'Analysing your statistics', body: 'Emotions after a session are a poor indicator of your progress. WZRanked and CODTracker give you objective data: K/D per session, damage per game, average placement, survival rate. These numbers reveal patterns you cannot see from inside the game. If your damage per game is high but your K/D is low, you rarely finish engagements — a problem with finishing or withdrawal decisions. If your placement is good but your damage is low, you are playing too passively and avoiding fights you should be winning. Add two more lenses: deaths per game and damage taken before first knock. Too many deaths usually means poor disengagement or late rotations; high damage taken before first knock means you are entering fights without first-shot advantage. Look at these stats once a week, not after every session. One session reveals nothing — one week reveals a trend. Identify the clearest weak point and make it the objective for the following week.', image: '/assets/tools/how-to-be-a-pro/analysing-statistics.jpg' },
      { title: 'Communication under pressure', body: 'Most squads stop communicating at exactly the moment it is most critical — during an active fight, when the circle is closing, when a teammate is down. Under stress, the brain prioritises execution over transmission. The result: nobody knows where the enemies are, rotations happen solo, and the squad dies in disarray. The solution is a standard callout protocol learned in advance: cardinal direction + distance + status (e.g. "northeast 30m, one up one down"). Short, factual, actionable. Good comms also include intent: "I am plating", "I am holding stairs", "I am swinging left", "do not push yet". These phrases prevent two players from doing the same job while another angle stays open. Avoid emotional comms during the fight; save blame and analysis for review after the match. Train yourself to make a callout after EVERY enemy kill you spot — not just those that concern you directly. After 20 sessions, it is automatic and you communicate under pressure without conscious effort.', image: '/assets/tools/how-to-be-a-pro/communication-under-pressure.jpg' },
    ],
  },
  'pro-spawn': {
    name: 'Pro Spawn',
    tag: 'MAP CONTROL',
    content: [
      {
        title: 'Spawn strategy — how to drop correctly',
        body: 'The drop is the most important decision of a resurgence game. Every fight you have in the first 60 seconds is a direct consequence of where you landed, how fast you got there, and whether you had a plan before you jumped. Most average players pick a POI because they recognise the name — pros pick a POI because of what it controls, what it gives them, and what it costs them if the zone does not cooperate.\n\nThe first rule is to decide before the plane takes off. Look at the flight path, identify the two or three POIs you can reach without a full glide, and commit to one before you exit. Hesitation mid-air means you land late, which means every enemy at your POI is already looted and positioned by the time your feet touch the ground. Arriving a second late at a contested drop is worse than choosing a quieter POI entirely.\n\nThe second rule is to match your drop to your squad\'s playstyle. An aggressive squad should drop hot — contested POIs like Prison, Headquarters, or Mansion — because early fights build momentum, burn respawns from the enemy, and give you kills before the squad count drops. A methodical squad should drop quiet — Dock, Stronghold, Riverboat, Lumbermill — loot fast, kit up completely, and rotate into mid-game at full strength. Dropping hot with a passive squad or quiet with an aggressive squad creates friction that costs you games.\n\nThe third rule is to always know your rotation before you are forced to make it. The moment you land, look at the zone and identify your next position. You should never be surprised by the circle — the plan for where you move next should already exist in your head. Players who rotate reactively under zone pressure make bad decisions. Players who rotated proactively 20 seconds earlier own the position, hold the angle, and wait.\n\nFinally: never land in water, never vault into an unchecked room on drop, and never split the squad across two POIs unless both players are experienced enough to hold alone. The drop is not a random event — it is the opening move of a game of chess. Make it deliberately.',
        pros: ['Deciding before the plane sets removes hesitation and guarantees a clean landing', 'Matching drop style to squad playstyle eliminates early friction', 'Knowing your rotation before the zone moves keeps you ahead of every reactive player'],
        cons: ['Hot drops reward aggression but punish mechanical weakness — pick based on your actual level, not your ideal level', 'Quiet drops require discipline to rotate early — teams that loot too long get caught by the zone or by rotators', 'Splitting the squad on drop is almost always wrong — the 1v2 disadvantage is rarely worth the loot gain'],
      },
      {
        title: 'Controlled Hot Drop',
        body: 'The hot drop is widely misunderstood — pros do not drop hot because they want kills, they do it with a precise plan. The squad splits to cover multiple buildings simultaneously, each player securing their zone before regrouping. The absolute priority: floor loot first, contracts immediately after. A contract at the start of a hot drop generates enough cash for a loadout before anyone else in the lobby. The key is selective engagement — do not chase every visible kill, control the zone and eliminate direct threats only. Squads that drop hot without a plan die fast; squads that drop hot with coordinated roles dominate the first 60 seconds and dictate the pace of the entire game.',
        difficulty: 'hot' as const,
        pros: ['Early kills = fewer threats in mid-game', 'Dense loot in hot zones', 'Momentum and psychological pressure on the lobby'],
        cons: ['Punishes uncoordinated squads hard', 'Risk of early wipe if execution breaks down', 'Requires strong individual mechanics from every player'],
      },
      {
        title: 'Late Drop',
        body: 'Waiting until the deploy bus is nearly empty before jumping is one of the most underrated strategies in competitive play. The late drop guarantees clean, uncontested loot in a near-empty zone. More importantly, it lets you choose your landing spot based on the first zone already revealed — eliminating any rotation under pressure. Pros use this strategy consistently in tournaments to minimise uncontrollable early-game variables. The goal is to reach mid-game at full strength — complete loadout, maximum armour, full map awareness — rather than burning resources in low-value early fights. The trade-off is no early kills, but in tournament play placement matters more than raw K/D.',
        difficulty: 'quiet' as const,
        pros: ['Guaranteed loot with no combat pressure', 'Proactive rotation toward the zone — never caught off-guard', 'Minimum risk in early game'],
        cons: ['No early kills = no early pressure on the lobby', 'Requires discipline to rotate before looting too long', 'Zone can be distant if drop location is poorly chosen'],
      },
      {
        title: 'Contract Drop',
        body: 'Landing directly on an active contract is one of the most efficient openings in competitive resurgence. Bounty, recon, and supply run contracts generate cash instantly, making it possible to buy a full loadout in under 90 seconds — before most squads have finished looting. The mechanic is simple: identify the most accessible contract on the flight path before the plane takes off, prioritise it on drop, and secure the minimum loot needed to survive long enough to activate it. Bounty contracts are particularly powerful because they force a managed engagement — you are choosing to hunt a specific target rather than reacting to a random threat. Recon contracts add the bonus of revealing the next zone, information that is often worth more than the cash itself.',
        difficulty: 'medium' as const,
        pros: ['Full loadout available in 60–90 seconds', 'Recon reveals the next zone early', 'Controlled engagement vs random early fight'],
        cons: ['Forces an immediate engagement without full loot', 'Enemy can bounty your squad simultaneously', 'High risk if another squad contests the same contract'],
      },
      {
        title: 'Buy Station Control',
        body: 'Positioning around buy stations near active combat zones is an advanced information strategy. The goal is not to buy back a teammate — it is to intercept squads buying back theirs. A squad buying back a player signals their location, their cash level, and the fact that they just lost someone. By anticipating the buy stations closest to active fights and arriving before them, you convert their moment of vulnerability into an ambush. Timing is everything: you must be in position before they recover their loadout, not after. A freshly respawned player without a loadout is a target; a freshly respawned player with their loadout is a full threat.',
        difficulty: 'medium' as const,
        pros: ['Intercepts squads at their most vulnerable moment', 'Provides information on which squads lost a player', 'Zone control without direct engagement'],
        cons: ['Requires advanced map reading', 'Easy to miss the timing window', 'Exposes your position while waiting'],
      },
      {
        title: 'Zone Prep',
        body: 'Zone Prep is the strategy that defines a competitive player: from the moment of landing, before the first fight, pros identify the first zone and calculate their optimal rotation path. The drop is chosen on the edge of the predicted zone — not so far that rotation happens under pressure, not inside it to avoid being surrounded immediately. This approach eliminates reactive rotation, the primary cause of mid-game deaths. Players who react to the zone sprint across open ground, under fire, with no positional choice. Players who anticipate the zone arrive first, pick their angle, and wait. Zone Prep turns every closing circle from a race against time into a positional advantage.',
        difficulty: 'quiet' as const,
        pros: ['Never caught off-guard by the zone', 'Position chosen before the enemy arrives', 'Eliminates rotations under fire'],
        cons: ['Requires sacrificing early kills', 'Less effective when zone placement is unpredictable', 'Demands discipline to leave a good position on time'],
      },
      {
        title: 'Cluster Drop',
        body: 'The Cluster Drop means landing the entire squad in tight formation on a single point — usually the most strategically valuable building in a POI — to take immediate control before any other team. The advantage is decisive: three players looted and positioned inside one building in 10 seconds, against enemies who scatter across the POI. This coordination eliminates the consolidation phase — the dangerous window where teammates regroup after a scattered drop. The Cluster Drop is the definitive strategy for squads with perfect communication and predefined roles. Each player knows exactly which corridor, which floor, which window they own the moment they land. Against uncoordinated teams, it is a near-guaranteed squad wipe within 20 seconds.',
        difficulty: 'hot' as const,
        pros: ['Immediate dominance of a key strategic position', 'No dangerous consolidation phase', 'Fast squad wipe against uncoordinated teams'],
        cons: ['Requires perfect communication and defined roles', 'A badly timed group drop can wipe your own squad', 'Predictable to teams who recognise your playstyle'],
      },
      { title: 'REBIRTH — Headquarters', body: 'Headquarters sits at the south-west of the island and is one of the most fought-over drops on the map. The rooftop gives elevation over the courtyard and the road toward Living Quarters and Factory. Enemies rotating from Prison or Control Center must cross open ground below. Secure the upper level first — it prevents being shot from the lower section by teams landing slightly late.', image: '/assets/tools/pro-spawn/rebirth-headquarters.jpg', difficulty: 'hot' as const, pros: ['Elevation over every ground approach', 'Controls the south-west rotation lane toward Living Quarters', 'Rich loot inside the building below'], cons: ['Heavily contested on drop', 'Exposed from Prison at long range', 'No easy escape route if pushed from multiple sides'] },
      { title: 'REBIRTH — Prison', body: 'Prison is the dominant high-ground position on Rebirth. The tower gives line of sight over Headquarters, Control Center, Industry, and the south rotation corridor simultaneously. Squads holding Prison force every mid-map rotation through their field of fire. The trade-off is the single staircase — one player can hold the push, but if that player goes down the entire position collapses. Always have a grapple or redeploy balloon ready.', image: '/assets/tools/pro-spawn/rebirth-prison.jpg', difficulty: 'hot' as const, pros: ['Tallest structure on the map — 360° sightlines', 'Forces every central rotation through your field of fire', 'Easy to hold with one player on the staircase'], cons: ['Single staircase entry — easy to trap', 'Well-known position, always targeted early', 'No escape without a grapple or balloon'] },
      { title: 'REBIRTH — Bioweapons', body: 'Bioweapons sits at the north-east tip of the island. The rooftop controls the north road and the approach from Chemical Engineer. Teams that land here early can hold the entire north-east corner before any rotation reaches them. The position is isolated enough that third parties are rare in the first 90 seconds, giving a squad time to loot fully and set up before engaging.', image: '/assets/tools/pro-spawn/rebirth-bioweapons.jpg', difficulty: 'quiet' as const, pros: ['Isolated — rarely third-partied early', 'Controls the north-east corner and Chemical Engineer approach', 'Roof provides clean sightlines over the north road'], cons: ['Far corner — long rotation if zone pulls south or west', 'Limited loot compared to central POIs', 'Exposed from Industry rooftop across the gap'] },
      { title: 'REBIRTH — Chemical Engineer', body: 'Chemical Engineer sits on the east coast and its rooftop controls the rotation lane between Bioweapons and Harbor. Teams coming from the north or rotating along the coast must pass in front of this position. The roof has a low parapet that allows shooting while staying largely covered. One of the most consistent low-contest holds for squads that want east-side control without fighting for Prison or Headquarters.', image: '/assets/tools/pro-spawn/rebirth-chemical-engineer.jpg', difficulty: 'quiet' as const, pros: ['Controls the east coast rotation lane', 'Low parapet provides natural cover', 'Lower contest rate than central POIs'], cons: ['East edge — poor positioning if zone pulls west', 'Limited sightlines toward the centre of the map', 'Isolated from resupply if pushed off'] },
      { title: 'REBIRTH — Control Center', body: 'Control Center sits in the middle of the island and is the best information position on the map. From here you can track rotations coming from Dock, Headquarters, Prison, and Industry simultaneously. It is not a high-ground position but the central location makes it the ideal hub for squads that play flexible — able to push in any direction depending on what the UAV and audio reveal.', image: '/assets/tools/pro-spawn/rebirth-control-center.jpg', difficulty: 'hot' as const, pros: ['Central — tracks rotations from four directions', 'Quick access to Prison, Headquarters, Dock, and Industry', 'Flexible — easy to reposition in any direction'], cons: ['No natural elevation — purely ground level', 'Exposed to Prison tower from the east', 'Surrounded on all sides with no single defensible angle'] },
      { title: 'REBIRTH — Industry', body: 'Industry sits in the upper-centre of the island between Turbines and Bioweapons. Its rooftop is one of the highest points in the north half of the map and gives clear sightlines over the Turbines road and the Control Center approach. Squads that hold Industry roof can shut down the north-to-south rotation corridor that most teams use in mid-game. Less contested than Prison, making it the preferred power position for teams that want elevation without the fight.', image: '/assets/tools/pro-spawn/rebirth-industry.jpg', difficulty: 'quiet' as const, pros: ['High elevation in the north-centre of the map', 'Controls the Turbines-to-Control Center rotation lane', 'Less contested than Prison'], cons: ['Exposed from Bioweapons and Chemical Engineer at range', 'Limited internal loot — need to clear the building fast', 'Zone can isolate this position if it pulls south early'] },
      { title: 'REBIRTH — Turbines', body: 'Turbines sits in the upper-centre of the island just west of Industry. Its elevated platforms and large turbine structures provide natural cover while giving sightlines over the north road and the Control Center approach. Teams rotating from Dock toward Prison must pass through or around this position. A solid mid-ground option for squads that want north-side control without the full exposure of Prison tower.', image: '/assets/tools/pro-spawn/rebirth-turbines.jpg', difficulty: 'medium' as const, pros: ['Natural cover from the turbine structures', 'Controls the north road toward Prison and Industry', 'Less contested than Prison or Headquarters'], cons: ['No single dominant angle — cover is fragmented', 'Exposed from Industry rooftop to the east', 'Zone can cut this position off if it pulls south early'] },
      { title: 'REBIRTH — Factory', body: 'Factory sits in the south-centre of the island between Headquarters and Living Quarters. It is one of the best loot-dense drops on Rebirth with multiple floors and fast spawning equipment. Its central-south position gives quick access to Headquarters, Living Quarters, and Harbor. Teams holding Factory can contest rotations coming from any southern direction while staying close enough to the centre to react to zone movement.', image: '/assets/tools/pro-spawn/rebirth-factory.jpg', difficulty: 'medium' as const, pros: ['High loot density across multiple floors', 'Central-south — quick access to Headquarters, Living Quarters, Harbor', 'Good cover inside the building for holding a fight'], cons: ['Ground level — no elevation advantage', 'Contested from Headquarters and Living Quarters simultaneously', 'Exposed in the open courtyard between buildings'] },
      { title: 'REBIRTH — Dock', body: 'Dock sits on the west coast of the island and controls the western water approach. It is one of the lowest-contest drops on Rebirth, making it ideal for squads that want a clean start before rotating into the centre. The dock structures provide cover against snipers from Prison and Headquarters. Teams landing here typically use it as a staging area to loot quickly and move toward Control Center or Headquarters before mid-game.', image: '/assets/tools/pro-spawn/rebirth-dock.jpg', difficulty: 'quiet' as const, pros: ['Lowest contest rate on the west side', 'Clean early game with time to fully loot', 'Water provides a natural barrier from the west'], cons: ['Far from the centre — long rotation under pressure', 'No elevation — exposed to Prison tower at long range', 'Dead-end position if the zone pulls east'] },
      { title: 'REBIRTH — Stronghold', body: 'Stronghold sits at the far south-west tip of the island, isolated from the main rotation lanes. It is the most overlooked drop on Rebirth — squads landing here almost never face a contest. The elevated structure gives sightlines over the south coast and the road toward Headquarters. Best used as a quiet early-game drop for squads that want guaranteed loot before rotating in. The lighthouse tower at the tip provides a small high-ground platform with visibility over the western coastline.', image: '/assets/tools/pro-spawn/rebirth-strongholo.jpg', difficulty: 'hot' as const, pros: ['Almost never contested on drop', 'Elevated tip with sightlines over the south-west coast', 'Guaranteed loot and setup time before any fight'], cons: ['Furthest point from the centre — rotation takes the longest', 'Single exit route toward Headquarters', 'Irrelevant if zone pulls north or east from the start'] },
      { title: 'REBIRTH — Living Quarters', body: 'Living Quarters sits in the south of the island between Headquarters and Stronghold. Its residential building layout provides dense cover and multiple floors for holding fights. Teams landing here are close to Headquarters and Factory, making it a flexible south-side drop. The rooftops of the taller buildings give partial elevation over the south road. Moderately contested — expect at least one squad on drop but rarely a full three-way fight.', image: '/assets/tools/pro-spawn/rebirth-living-quarters.jpg', difficulty: 'medium' as const, pros: ['Dense building cover across multiple floors', 'Close to Headquarters and Factory for quick rotation', 'Moderate contest rate — manageable on drop'], cons: ['No dominant elevated position', 'Caught between Headquarters and Stronghold — third parties are common', 'Limited sightlines beyond the immediate area'] },
      { title: 'REBIRTH — Harbor', body: 'Harbor sits on the south-east coast between Factory and Chemical Engineer. The dock structures and elevated loading platforms provide cover and partial elevation over the south-east approach. Teams holding Harbor control the rotation lane between the south coast and Chemical Engineer. One of the more underrated drops on Rebirth — the loot is solid, the contest rate is low, and the position gives early information on squads rotating from Factory or Chemical Engineer.', image: '/assets/tools/pro-spawn/rebirth-harbor.jpg', difficulty: 'quiet' as const, pros: ['Low contest rate — often a free drop', 'Controls the south-east rotation lane', 'Elevated loading platforms provide partial high ground'], cons: ['East coast edge — isolated from central rotations', 'Exposed to Chemical Engineer rooftop from the north', 'Limited fallback options if pushed from two sides'] },
      { title: 'HAVEN — Mansion', body: 'Mansion sits at the north of the map and its roof is the highest point on the Haven skyline. It overlooks Main Street to the south, Pond to the west, and Research Center to the east. Squads that control Mansion early dictate which rotation lanes are safe — anyone moving below is visible and exposed. The building has multiple internal levels with loot, making it self-sufficient for a squad that wants a long-term hold without rotating for resources.', image: '/assets/tools/pro-spawn/haven-mansion.jpg', difficulty: 'hot' as const, pros: ['Highest point on Haven — overlooks the entire map', 'Self-sufficient loot inside the building', 'Forces all north-side rotations through your sightlines'], cons: ['North edge — bad position if zone pulls south', 'High-profile target, frequently contested on drop', 'Long open descent if forced to leave the roof'] },
      { title: 'HAVEN — Pond', body: 'Pond sits on the west side between Train Station and Mansion. The buildings around the water control the central-west rotation lane and provide elevation over anyone approaching from the train tracks. The water itself acts as a natural barrier — enemies coming from the east are slowed and predictable. One of the most defensible mid-map positions on Haven, especially when paired with a teammate holding Train Station.', image: '/assets/tools/pro-spawn/haven-pond.jpg', difficulty: 'quiet' as const, pros: ['Water acts as a natural barrier on the east side', 'Controls the west-to-centre rotation road', 'Predictable enemy approach — water slows repositioning'], cons: ['Isolated from Lumbermill and Coal Depot rotations', 'Limited cover on the upper levels', 'Exposed from Mansion to the north'] },
      { title: 'HAVEN — Train Station', body: 'Train Station sits on the west edge of the map and controls the only western rotation corridor. Squads coming from Pond or Main Street must pass in front of this position. The station roof overlooks the rail track — the main rotation artery on the west side. Any team rotating along the tracks in mid-game is exposed for 3–4 seconds. Holding this spawn with a marksman rifle is one of the highest-value positions on Haven for early kills and zone control.', image: '/assets/tools/pro-spawn/haven-train-station.jpg', difficulty: 'medium' as const, pros: ['Controls the only western rotation corridor', 'Rail track creates a long exposed kill zone', 'Good loot inside the station building'], cons: ['Contested from Pond across open ground', 'Zone often forces a difficult rotation east in late game', 'Roof exposed from the hillside to the north'] },
      { title: 'HAVEN — Barn', body: 'Barn occupies the centre of the map between Pond, Mansion, Main Street, and Coal Depot. Its central position makes it the best early-game information hub on Haven — rotations from all four cardinal directions are visible or audible from here. Not a strong static hold due to the lack of elevation, but ideal for squads that want to contest loot quickly and move into a power position before mid-game.', image: '/assets/tools/pro-spawn/haven-barn.jpg', difficulty: 'hot' as const, pros: ['Exact centre of the map — tracks all rotations', 'Fast access to every major POI', 'High early loot density'], cons: ['No significant elevation — no dominant angle', 'Exposed from Mansion, Research Center, and Main Street simultaneously', 'Not a sustainable hold for late game'] },
      { title: 'HAVEN — Main Street', body: 'Main Street runs through the lower-centre of Haven and its rooftops are the most contested elevated positions on the map. Buildings spread across two or three rooftops give a squad control over every approach angle simultaneously. The trade-off is exposure — you are also visible from all sides. Main Street rewards squads with disciplined zone coverage and punishes those who fail to cover all angles. Best used as a mid-game transition position rather than a permanent hold.', image: '/assets/tools/pro-spawn/haven-main-street.jpg', difficulty: 'hot' as const, pros: ['Central — relevant regardless of zone position', 'Multiple rooftops cover all four approach angles', 'High loot density at street level below'], cons: ['Exposed from Mansion, Pond, Coal Depot, and Lumbermill simultaneously', 'Most contested area on the map', 'Requires full squad coordination to hold effectively'] },
      { title: 'HAVEN — Riverboat', body: 'Riverboat sits at the south edge of the map along the water. It controls the southern rotation lane and the approach from Lumbermill toward Main Street. Squads landing here face minimal early competition and have time to fully kit before engaging. The boat itself provides cover on the water side while the dock gives sightlines over the south road. A strong drop for squads that want a clean early game before rotating into the centre in mid-game.', image: '/assets/tools/pro-spawn/haven-riverboat.jpg', difficulty: 'quiet' as const, pros: ['Rarely contested — clean early game', 'Controls the southern rotation lane', 'Water side provides natural cover from the south'], cons: ['South edge — long rotation if zone pulls north', 'Limited elevation compared to inland positions', 'Isolated — hard to get support if pushed early'] },
      { title: 'HAVEN — Research Center', body: 'Research Center sits on the east side of the map and is the highest elevated structure on the east half of Haven. Its roof gives sightlines over Coal Depot, Lumbermill, and the east road connecting to Mansion. Squads holding Research Center control the entire east rotation corridor — anyone rotating between the north and south of the east side must pass through their field of fire. Less contested than Mansion, making it a reliable power position for teams that want east-side dominance.', image: '/assets/tools/pro-spawn/haven-research-center.jpg', difficulty: 'medium' as const, pros: ['Highest elevation on the east half of the map', 'Controls the east rotation corridor between Mansion and Lumbermill', 'Less contested than Mansion or Main Street'], cons: ['East edge — poor if zone pulls west', 'Exposed from Mansion rooftop across the centre', 'Single approach from the west leaves the east flank uncontested'] },
      { title: 'HAVEN — Coal Depot', body: 'Coal Depot bridges the gap between Research Center and Lumbermill on the east side. Its upper section provides elevation over the south-east rotation lane and cuts the east half of the map into two zones. Combined with a teammate at Research Center, a squad can effectively shut down all east-side rotations during mid-game. The position is consistently underused, making it a reliable drop with time to set up before the first rotation wave.', image: '/assets/tools/pro-spawn/haven-coal-depot.jpg', difficulty: 'quiet' as const, pros: ['Splits east-side rotations in two', 'Pairs with Research Center to lock down the entire east half', 'Low contest rate on drop'], cons: ['Limited loot compared to Mansion or Main Street', 'Hard to escape if pushed from Research Center and Lumbermill simultaneously', 'Irrelevant if zone pulls to the west side'] },
      { title: 'HAVEN — Lumbermill', body: 'Lumbermill sits at the south-east corner of the map. Its upper platform controls the south-east rotation lane and the road toward Coal Depot. Consistently overlooked in early rotations — squads that land here often establish without a fight. Once set up on the upper level, any team rotating through the south-east is caught in the open. Particularly strong in final circles when the zone collapses south, as Lumbermill upper becomes one of the last elevated positions remaining.', image: '/assets/tools/pro-spawn/haven-lumbermill.jpg', difficulty: 'medium' as const, pros: ['Rarely contested on drop', 'Strong final circle position when zone collapses south', 'Controls the south-east rotation lane toward Coal Depot'], cons: ['Corner position — poor if zone pulls north or west', 'Limited loot compared to central POIs', 'Hard to escape if pushed from Coal Depot and the road simultaneously'] },
    ],
  },
  'pro-opti': {
    name: 'Pro Opti',
    tag: 'PERFORMANCE',
    content: [
      {
        title: 'Read this before optimising anything',
        category: 'DISCLAIMER',
        body: 'Before applying any optimisation — from this guide or anywhere else — there are things you need to understand about how this space works and what the realistic limits of software tweaks actually are.\n\nMost third-party optimisation content is recycled. The majority of YouTube videos, "Ultimate FPS Boost" guides, and paid optimisation scripts pull from the same pool of registry edits, service disables, and power plan tweaks that have been circulating since Windows 7. They are repackaged under a new label, presented as exclusive discoveries, and sold or promoted for views. The underlying changes are real and often legitimately useful — but they are not proprietary. Everything in this guide is derived from publicly documented Windows behaviour, official GPU driver documentation, and community-verified testing. There is no secret.\n\nSome optimisations disable Windows services that your system depends on for everyday use. Disabling SysMain, Windows Search, or Connected User Experiences can measurably reduce background CPU load during gaming — but those same services power the Microsoft Store, Windows Update, certain app installations, and background sync features. If you use your gaming PC for work, creative software, or Microsoft 365, apply these changes selectively and know how to re-enable them. A dedicated gaming build and a daily driver machine have different needs. Do not blindly run a debloating script without reading what it removes.\n\nOptimisations deliver diminishing returns as hardware improves. On a low-end or mid-range PC — a system struggling to maintain 60fps with a 1060 or RX 580 — software optimisation can produce gains of 15–30% by freeing CPU and RAM that the game desperately needed. On a high-end build already delivering 180fps+ with an RTX 4080 and a fast CPU, the same tweaks might produce 5–10fps of additional headroom and tighter frame time consistency. The optimisation is not less real — the hardware ceiling is simply higher. For a powerful machine, optimisation serves to maintain peak performance over time, prevent degradation from background bloat, and reduce variance. It does not replace hardware.\n\nThe bottleneck problem is why the "just buy the latest GPU" approach fails. A bottleneck occurs when one component in your system cannot supply data fast enough to keep another component fully utilised. The most common scenario: a CPU that cannot generate game frames quickly enough to keep the GPU busy. The GPU renders nothing while it waits for the CPU to finish processing game logic, AI, physics, and draw calls. You can install an RTX 5090 in a system with an i5-8400 and still run at 90fps because the CPU is the limiting factor, not the GPU. The GPU will show 40–50% utilisation in task manager while running a game — that is the tell. A balanced build means the CPU and GPU finish their respective workloads at roughly the same time. Matching component tiers matters more than maximising any single part.\n\nRAM speed and capacity are more impactful than most players realise. Games increasingly rely on fast memory access for asset streaming, physics calculations, and AI processing. Running 16GB at 2400MHz versus 32GB at 3600MHz can produce a 10–20% fps difference on CPU-limited systems — not because the GPU got faster, but because the CPU can feed it data more quickly. If your RAM is running below its rated speed (check in HWiNFO64 under the memory tab), enabling XMP/EXPO in BIOS is one of the single highest-return changes you can make at zero cost.\n\nThermal performance is the silent fps killer. A CPU or GPU that hits its thermal limit throttles its clock speed automatically to prevent damage. A system running at 95°C on the CPU during a Warzone session is not running at its rated speed — it is running at whatever speed keeps the temperature from climbing further. Cleaning dust from heatsinks, replacing dried thermal paste (every 2–3 years on a CPU, every 3–4 years on a GPU), and improving case airflow can recover 10–20% of clock speed on a thermally throttled system. If your fps was higher six months ago and you have changed nothing else, temperature is almost always the reason.',
      },
      {
        title: 'Frame rate priority',
        category: 'GRAPHICS',
        body: 'Frame rate is the single most impactful graphics setting in Warzone — more than resolution, texture quality, or shadow detail. A stable 60fps on console or 144fps+ on PC does two things simultaneously: it makes your game look smoother, and it makes your inputs register more frequently per second. At 60fps, a new frame renders every 16.6ms. At 144fps, every 6.9ms. That gap directly affects how quickly your aim corrections appear on screen and how responsive your shots feel. The key word is stable. An average of 144fps that dips to 80fps during fights is worse than a locked 120fps with no variance. Unstable frame rate creates inconsistent input timing, which is exactly the kind of invisible variable that causes you to lose fights you should win. On PC: cap your frame rate at a value your system can sustain without dropping — not the maximum your GPU can push in an empty field. On console: enable Performance Mode in the console system settings, not just in the game. Some console games apply the setting only in-app; enabling it system-wide ensures the console prioritises frame rate across every menu and loading screen too.',
      },
      {
        title: 'In-game graphics settings',
        category: 'GRAPHICS',
        body: 'The goal of in-game graphics settings is not to make the game look good — it is to remove everything that reduces your ability to see and react. Start by disabling three settings that exist purely for cinematic effect and actively hurt competitive play: Film Grain adds visual noise that masks enemy silhouettes at distance; Motion Blur smears the image during movement, making it harder to track targets; Depth of Field blurs everything outside your aim point, reducing peripheral threat detection. All three are off in every professional player\'s setup without exception. Next, set Texture Resolution to the maximum your VRAM allows — low textures make enemies harder to distinguish from background surfaces. Set Shader Quality to Low or Medium; high shader quality costs significant GPU performance with no gameplay upside. Shadow quality can be dropped to Low — shadows rarely help you spot enemies and the GPU cost is high. For the environment detail settings (foliage, particle quality, level of detail), keep them at Medium: too low and distant enemies disappear into terrain; too high and frame rate drops. The most overlooked setting is Render Resolution. On console, this is often set below 100% by default in Quality Mode — switch to Performance Mode and confirm Render Resolution is at 100%. A blurry image at high frame rate is better than a sharp image at low frame rate, but a sharp image at high frame rate is the target.',
      },
      {
        title: 'Windows optimisation',
        category: 'WINDOWS',
        body: 'Windows runs dozens of background processes that compete with Warzone for CPU and RAM resources. Eliminating the unnecessary ones is one of the highest-impact free optimisations available on PC. Start with Power Plan: go to Control Panel → Power Options and set it to High Performance or Ultimate Performance (the latter is hidden by default — enable it via PowerShell with the command: powercmd /setactive e9a42b02-d5df-448d-aa00-03f14749eb61). This prevents Windows from throttling CPU clock speed to save energy, which directly reduces frame time spikes. Disable Xbox Game Bar (Settings → Gaming → Xbox Game Bar → Off) and Hardware-Accelerated GPU Scheduling if your GPU is below an RTX 3000 series — on older cards it introduces latency instead of reducing it; on RTX 3000 and newer, enable it. Turn off mouse acceleration system-wide: Settings → Bluetooth & Devices → Mouse → Additional Mouse Settings → Pointer Options → uncheck "Enhance pointer precision". This setting is on by default and silently destroys aim consistency by varying the relationship between hand movement and cursor movement. Before each session, close background applications manually: Discord can stay open but disable hardware acceleration in Discord settings (Settings → Appearance → Hardware Acceleration → Off). Browsers, streaming software, and update services should be closed entirely.',
      },
      {
        title: 'Windows settings to disable',
        category: 'WINDOWS',
        body: 'Beyond the basics, Windows has dozens of hidden services and visual features that consume CPU cycles and memory with zero gaming benefit. Work through this checklist once and your system will run measurably lighter. In Settings → System → Display, disable Hardware-accelerated GPU scheduling if on a pre-RTX 3000 GPU, and set Windows HD Color to Off — it adds processing overhead. In Settings → Privacy & Security, disable every toggle under Diagnostics & Feedback, Activity History, and App Diagnostics — these background telemetry services constantly write to disk during your session. In Services (run services.msc), disable: SysMain (formerly Superfetch — it pre-loads apps into RAM and competes directly with your game), Windows Search (constantly indexes your drive mid-session), Connected User Experiences and Telemetry (sends usage data to Microsoft), Print Spooler (unless you actively print), and Fax. In Task Scheduler, disable the following tasks: Microsoft → Windows → Application Experience → ProgramDataUpdater, Microsoft → Windows → Customer Experience Improvement Program → all tasks, and Microsoft → Windows → Defragment → ScheduledDefrag (defrag should never run during a gaming session — schedule it manually at week end). Finally, in the NVIDIA Control Panel (if applicable): set Power Management Mode to Prefer Maximum Performance, disable Vertical Sync globally, set Texture Filtering Quality to High Performance, and turn off Ambient Occlusion and Anisotropic Filtering at the global level — let the game control these instead.',
      },
      {
        title: 'Performance-focused operating systems',
        category: 'OS',
        body: 'Standard Windows 11 ships with telemetry services, bloatware, and background processes that no competitive gamer needs. Several modified operating system builds strip all of that out and rebuild Windows from the ground up around performance. Atlas OS is the most widely used among competitive players — it is a debloated Windows 10 build that removes over 60 background services, disables all telemetry, and applies a curated set of registry tweaks automatically. The result is a measurably lower CPU and RAM baseline at idle, which translates directly to more consistent frame times during play. Reef OS and ReviOS follow a similar philosophy and are compatible with Windows 11 if you prefer the newer base. The trade-off with any debloated build is that some Windows Update and security features are disabled by default — these systems are designed for dedicated gaming machines that are not used for banking or sensitive data. For Linux, Nobara OS (built on Fedora) is the best available option for gaming. It ships with gaming-specific kernel patches, pre-configured Proton/Wine compatibility layers, and out-of-the-box support for the hardware drivers most gaming builds need. Warzone runs via Proton on Nobara with competitive performance that matches Windows in most configurations. The caveat: kernel-level anti-cheat (Easy Anti-Cheat and BattlEye) has limited Linux support depending on the game version — verify current compatibility before committing to a full OS switch.',
      },
      {
        title: 'Overclocking CPU & GPU',
        category: 'OVERCLOCKING',
        body: 'Overclocking pushes your hardware beyond its factory-rated clock speed to extract additional performance — at the cost of higher heat, higher power consumption, and reduced hardware longevity if done incorrectly. Done correctly, it is one of the few ways to meaningfully increase performance without spending money on new hardware. For CPU overclocking: use Intel XMP or AMD EXPO first. These are official memory profiles that push your RAM to its rated speed — most systems ship with RAM running below its rated frequency by default. Enable XMP/EXPO in BIOS under the memory settings tab. This alone can improve frame times by 5–15% depending on your CPU and game. Beyond XMP, manual CPU overclocking is done through the BIOS by raising the core multiplier incrementally (1 step at a time), running a stress test (Prime95 or Cinebench R23), and monitoring temperatures with HWiNFO64. Stay below 90°C under full load. For GPU overclocking: MSI Afterburner is the universal tool. Start by raising the Power Limit to maximum (+20–25%), then incrementally raise the Core Clock offset by +50MHz, run a benchmark (Unigine Superposition or Furmark), and check for artifacts or crashes. A stable +100–150MHz core clock is realistic on most modern GPUs. Memory overclocking on GPUs often has a larger impact on gaming performance than core clock — raise the Memory Clock offset by +200MHz, test, then push further in 100MHz increments until instability appears, then back off by 50MHz. Never overclock without monitoring temperatures. A GPU thermal throttling under load produces identical frame time variance to a system that is simply not overclocked — the performance gain disappears and instability increases.',
      },
      {
        title: 'Monitor setup',
        category: 'DISPLAY',
        body: 'Your monitor is the last step between the game and your eyes, and its settings matter more than most players realise. The first priority is refresh rate: confirm your monitor is actually running at its advertised maximum. Go to Windows Display Settings → Advanced Display → Refresh Rate and verify it matches your monitor spec. Many monitors default to 60Hz even when capable of 144Hz or 240Hz — this is the most common and most costly oversight in PC setup. Enable hardware sync correctly: G-Sync on NVIDIA or FreeSync on AMD, and cap your in-game frame rate at 3fps below your monitor\'s refresh rate — this eliminates tearing while keeping input latency minimal. For response time, set it to the fastest mode your monitor offers (often labelled Fast, Faster, or Extreme). Some monitors introduce overshoot artifacts at the fastest setting — test by looking at fine text during movement; if you see colour fringing, drop one level. Calibrate brightness so that dark corners in-game are readable without blowing out bright outdoor areas. Most monitors ship with brightness set too high — reduce it to the point where you can see into shadows without squinting at sunlit areas. Finally, in Windows Display Settings → Change Resolution, confirm Output Color Format is RGB and Output Dynamic Range is Full — many monitors default to Limited range, which crushes blacks and reduces contrast information available to your eyes.',
      },
      {
        title: 'NVIDIA Control Panel',
        category: 'NVIDIA',
        body: 'The NVIDIA Control Panel exposes settings that directly affect colour clarity, input latency, and frame consistency — none of which are accessible from within Warzone itself. Open it by right-clicking the desktop or searching from the Start menu.\n\nDisplay → Adjust Desktop Color Settings: Set Digital Vibrance to 70–80%. The default 50% produces a washed-out image; raising it makes enemy outlines and operator skins more distinct against terrain backgrounds. Do not exceed 85% — at extreme values textures become unnaturally saturated, reducing rather than improving target identification. Set Brightness to 51–52%, Contrast to 52–55%, and Gamma to 1.10–1.15. These values lift the shadow range — dark interiors and covered positions become readable without overexposing lit areas.\n\nDisplay → Change Resolution: Set Output Color Format to RGB and Output Dynamic Range to Full. Many monitors default to YCbCr422 and Limited range — this crushes blacks and reduces the full contrast bandwidth your panel is capable of rendering.\n\nManage 3D Settings → Global Settings: Low Latency Mode → Ultra. This reduces the pre-rendered frame queue from the default 3 frames to 1, directly cutting input latency. The trade-off is a minor average fps reduction — always worth it for competitive play. Shader Cache Size → Unlimited (eliminates mid-session compilation stutters). Texture Filtering Quality → High Performance. Vertical Sync → Off globally — let the in-game frame cap control timing instead. Power Management Mode → Prefer Maximum Performance (prevents GPU clock from dropping during menu screens or calm moments in-game, keeping frame times consistent throughout the session).',
      },
      {
        title: 'AMD Radeon Software',
        category: 'AMD',
        body: 'AMD Radeon Software (Adrenalin) contains the equivalent competitive optimisation settings for AMD GPU users. Open it from the system tray icon or by right-clicking the desktop.\n\nDisplay → Color: Set Saturation (equivalent to NVIDIA\'s Digital Vibrance) to 130–140 on the AMD scale (default is 100). This increases colour separation between enemy operators and background terrain without creating unnatural oversaturation. Set Contrast to 102–105% and Brightness to 101–102%. Hue should remain at 0 — shifting it introduces colour casts that distort the image and hurt rather than help clarity.\n\nDisplay → Custom Resolution: Confirm your monitor is running at its native resolution and maximum refresh rate. AMD does not always apply the correct refresh rate automatically after driver updates — verify it here after every major driver install.\n\nGraphics → Advanced: Enable Radeon Anti-Lag. This is AMD\'s equivalent to NVIDIA\'s Low Latency Mode Ultra — it reduces the CPU-to-GPU command queue and directly lowers input lag. Enable it globally or per-game. Radeon Boost (which dynamically reduces resolution during fast movement to maintain frame rate) should be disabled for Warzone — it introduces resolution inconsistency that makes target tracking harder at the moments it matters most. Set Texture Filtering Quality to Performance. Disable Morphological Anti-Aliasing globally — let the game engine handle AA. Surface Format Optimisation → Off (can cause visual artefacts in some scenes). Under Radeon Chill, confirm it is disabled — Chill caps frame rate dynamically based on mouse movement, which is the opposite of what competitive play requires.',
      },
      {
        title: 'Audio setup',
        category: 'AUDIO',
        body: 'Audio is the most underrated performance advantage in Warzone, and it is the one most players configure incorrectly by default. The in-game audio mix setting is the single most impactful change you can make: set it to Boost High. This mode amplifies the high-frequency range of the audio spectrum, which is where footstep sounds, reloading clicks, and equipment sounds live. The default Balanced mix compresses this range to make explosions and gunshots feel more cinematic — it actively makes footsteps quieter. Boost High inverts this priority. The second critical setting is spatial audio. On PC, enable Windows Sonic for Headphones or Dolby Atmos (system-wide in Windows Sound settings). On console, enable 3D audio in the system settings, not the game settings — the system-level toggle applies spatial processing at a lower level and is more accurate. Use stereo headphones, not surround sound headsets. Surround sound headsets use multiple small drivers that create a muddy, inaccurate stereo image — a high-quality stereo pair with spatial audio software processing produces a more precise and directionally accurate soundstage. Volume balance: master volume between 70–80%, effects volume at 100%, music and dialogue at 20% or off entirely. You should hear every footstep before you see the player. If you do not, your audio setup is the problem.',
      },
      {
        title: 'Advanced audio optimisation',
        category: 'AUDIO',
        body: 'For advanced audio, think in tiers instead of copying one magic preset. Tier 1 is a clean stereo base: no virtual 7.1 headset mode, no heavy bass boost, no music, and effects volume high enough to read footsteps without hurting your ears. Tier 2 is EQ work: reduce muddy low frequencies that mask movement, keep mids readable for reloads and plating, and lift the presence range carefully so footsteps separate from gunfire. Tier 3 is the ArtIsWar-style approach: a proper DAC/interface when possible, Equalizer APO or SteelSeries Sonar, light compression, and narrow EQ cuts that stop explosions and streaks from covering enemy movement. The goal is not louder audio. The goal is separation. If gunfire is painful, if your own footsteps are louder than enemy information, or if long sessions fatigue your ears, the tune is too aggressive. IEMs can be very strong here because good wired IEMs isolate room noise and make small directional details easier to track than many bulky gaming headsets.',
        video: {
          title: 'Triivio sound optimization',
          url: 'https://www.youtube.com/embed/Yhl-dK75f8s',
          note: 'Use this video as a reference point for the audio chain, then adapt the final EQ to your own headset or IEMs.',
        },
      },
      {
        title: 'Network stability',
        category: 'NETWORK',
        body: 'Network performance in Warzone is governed by two separate metrics that most players conflate: ping and packet loss. Ping is the round-trip time between your machine and the game server — lower is better, but anything below 60ms is functionally competitive. Packet loss is the percentage of data packets that fail to arrive — even 1–2% packet loss creates rubber-banding, delayed hit registration, and desync that no amount of skill can overcome. A wired ethernet connection solves both simultaneously. On Wi-Fi, signal interference, distance from the router, and other devices sharing the channel all introduce packet loss. An ethernet cable eliminates every one of those variables at once. If running ethernet is not possible, use a Wi-Fi 6 router and place it in the same room — Wi-Fi 6 has significantly lower latency and better congestion handling than previous standards. In the game\'s network settings, enable On-Demand Texture Streaming only if your internet connection is fast and stable (100Mbps+); on slower connections it causes mid-game stutters as textures load. Set your preferred server region manually — automatic selection sometimes connects you to a geographically suboptimal server. Choose the region closest to you and confirm the ping reading in the server browser. Finally, QoS (Quality of Service) on your router can prioritise gaming traffic over other household devices — if your router supports it, enable it and assign highest priority to your gaming device.\n\nNetwork optimization software belongs in the same category: it can improve routing, but it cannot fix bad Wi-Fi, an overloaded router, or a poor local line. Tools such as ExitLag, NoPing, WTFast/GPN, GearUP Booster, and Cloudflare WARP work by sending game traffic through an alternate route instead of the default path chosen by your ISP. This can help when your ISP takes a bad route to the Warzone server, causing high jitter, unstable ping, or packet loss. It can also make things worse if the default route is already clean. Treat these tools like a diagnostic layer: test one at a time, compare ping, jitter, packet loss, and hit registration across the same server region, then keep it only if the numbers and in-game feel improve consistently.',
      },
      {
        title: 'Controller & peripheral settings',
        category: 'INPUT',
        body: 'The Tactical button layout is non-negotiable for competitive controller play. It remaps crouch/slide to the right thumbstick click, freeing your right thumb to remain on the aim stick at all times — including while sliding, crouching behind cover, or performing a slide cancel. The default layout forces you to remove your thumb from aim to crouch, which introduces a brief window where you cannot aim. Every pro controller player uses Tactical or a custom layout that achieves the same result. On PC, rebind crouch to a side mouse button or a keyboard key reachable without moving your hand from WASD. For controller players on PC specifically, use a wired connection between your controller and PC — Bluetooth introduces 10–30ms of additional input latency that a wire eliminates entirely. For mouse players, set your polling rate to 1000Hz or higher (most modern gaming mice support this in their driver software). A higher polling rate means the PC reads your mouse position more frequently per second, producing smoother and more responsive cursor movement. Finally, keep your peripherals clean. Sticky keys, dust under a mouse sensor, and dirty controller joysticks all introduce subtle input inconsistencies that are invisible until you fix them and notice the difference.',
      },
      {
        title: 'Storage & load times',
        category: 'SYSTEM',
        body: 'Warzone installed on an SSD versus an HDD is not a minor quality-of-life difference — it is a competitive timing advantage. Players on SSDs load into the game and into matches measurably faster than those on hard drives, which means more time in the pre-game lobby to check callouts, plan the drop, and review the map. On a hard drive, Warzone frequently stalls during asset streaming mid-match — textures loading in after you land, objects appearing several seconds after you see the environment. This creates brief windows where enemies are fully rendered on your screen but you see a grey placeholder model or nothing at all. An SSD eliminates this entirely. If a full SSD upgrade is not immediately possible, at minimum move Warzone to your fastest available drive. NVMe SSDs (M.2 slot) outperform SATA SSDs for large sequential reads — relevant for a game the size of Warzone. On console, the internal SSD in PS5 and Xbox Series X is already fast enough; ensure the game is not installed on an older external USB hard drive if you are using one for storage expansion. External SSDs connected via USB 3.1 Gen 2 or USB-C are acceptable; USB 2.0 external drives are slower than the internal SSD and should not be used for active game installs.',
      },
    ],
  },
};


export type ProToolContentMap = Record<string, ToolData>;

function text(value: unknown, fallback: string, max = 180) {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned ? cleaned.slice(0, max) : fallback;
}

function multiline(value: unknown, fallback: string, max = 12000) {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.replace(/\r\n/g, '\n').trim();
  return cleaned ? cleaned.slice(0, max) : fallback;
}

function optionalText(value: unknown, max = 180) {
  if (typeof value !== 'string') return undefined;
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned ? cleaned.slice(0, max) : undefined;
}

function optionalMultiline(value: unknown, max = 1200) {
  if (typeof value !== 'string') return undefined;
  const cleaned = value.replace(/\r\n/g, '\n').trim();
  return cleaned ? cleaned.slice(0, max) : undefined;
}

function stringList(value: unknown, fallback: string[] | undefined, maxItems = 12, maxLength = 240) {
  if (!Array.isArray(value)) return fallback;
  const items = value
    .map((item, index) => optionalMultiline(item, maxLength) ?? fallback?.[index] ?? '')
    .filter(Boolean)
    .slice(0, maxItems);
  return items.length ? items : fallback;
}

function safeUrl(value: unknown, fallback: string) {
  const candidate = text(value, fallback, 700);
  if (candidate.startsWith('/')) return candidate;
  try {
    const url = new URL(candidate);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}

function safeOptionalUrl(value: unknown, fallback?: string) {
  if (typeof value !== 'string') return fallback;
  const candidate = value.trim().slice(0, 700);
  if (!candidate) return fallback;
  if (candidate.startsWith('/')) return candidate;
  try {
    const url = new URL(candidate);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}

function sources(value: unknown, fallback?: ToolSource[]) {
  if (!Array.isArray(value)) return fallback;
  const items = value
    .map((item, index) => {
      const record = item as Partial<ToolSource>;
      const base = fallback?.[index];
      return {
        label: text(record.label, base?.label ?? 'Source', 100),
        url: safeUrl(record.url, base?.url ?? 'https://www.callofduty.com/'),
      };
    })
    .filter(item => item.label && item.url)
    .slice(0, 8);
  return items.length ? items : fallback;
}

function video(value: unknown, fallback?: ToolVideo) {
  if (!value || typeof value !== 'object') return fallback;
  const record = value as Partial<ToolVideo>;
  return {
    title: text(record.title, fallback?.title ?? 'Video reference', 120),
    url: safeUrl(record.url, fallback?.url ?? 'https://www.youtube.com/embed/D1Y2bt4KDq4'),
    note: multiline(record.note, fallback?.note ?? '', 700),
  };
}

function normalizeToolItem(value: unknown, fallback: ToolItem): ToolItem {
  const item = (value ?? {}) as Partial<ToolItem>;
  const next: ToolItem = {
    title: text(item.title, fallback.title, 120),
    body: multiline(item.body, fallback.body),
  };
  const image = safeOptionalUrl(item.image, fallback.image);
  if (image) next.image = image;
  const pros = stringList(item.pros, fallback.pros);
  if (pros) next.pros = pros;
  const cons = stringList(item.cons, fallback.cons);
  if (cons) next.cons = cons;
  const difficulty = item.difficulty === 'hot' || item.difficulty === 'medium' || item.difficulty === 'quiet' ? item.difficulty : fallback.difficulty;
  if (difficulty) next.difficulty = difficulty;
  const category = optionalText(item.category, 80) ?? fallback.category;
  if (category) next.category = category;
  const sourceList = sources(item.sources, fallback.sources);
  if (sourceList) next.sources = sourceList;
  const videoData = video(item.video, fallback.video);
  if (videoData) next.video = videoData;
  return next;
}

function normalizeToolData(value: unknown, fallback: ToolData): ToolData {
  const tool = (value ?? {}) as Partial<ToolData>;
  const inputItems = Array.isArray(tool.content) ? tool.content : [];
  const content = fallback.content.map((item, index) => normalizeToolItem(inputItems[index], item));
  return {
    name: text(tool.name, fallback.name, 80),
    tag: text(tool.tag, fallback.tag, 60),
    content,
  };
}

export function normalizeProToolsContent(input: unknown, fallback: ProToolContentMap = DEFAULT_TOOL_CONTENT): ProToolContentMap {
  const record = (input ?? {}) as Partial<ProToolContentMap>;
  return Object.fromEntries(
    Object.entries(DEFAULT_TOOL_CONTENT).map(([toolId, defaultTool]) => [
      toolId,
      normalizeToolData(record[toolId], fallback[toolId] ?? defaultTool),
    ])
  );
}

function readLocalProToolsContent(): ProToolContentMap {
  try {
    return normalizeProToolsContent(JSON.parse(fs.readFileSync(TOOL_CONTENT_FILE, 'utf-8')));
  } catch {
    return DEFAULT_TOOL_CONTENT;
  }
}

function backupLocalProToolsContent(current: ProToolContentMap) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(BACKUP_DIR, `${stamp}-tool-content.json`);
  fs.writeFileSync(file, JSON.stringify(current, null, 2));
}

function writeLocalProToolsContent(content: ProToolContentMap) {
  fs.mkdirSync(path.dirname(TOOL_CONTENT_FILE), { recursive: true });
  fs.writeFileSync(TOOL_CONTENT_FILE, JSON.stringify(content, null, 2));
}

export async function getProToolsContent(): Promise<ProToolContentMap> {
  if (hasUpstash()) {
    const result = await upstashCommand(['GET', TOOL_CONTENT_KEY]);
    if (typeof result === 'string') return normalizeProToolsContent(JSON.parse(result));
  }

  return readLocalProToolsContent();
}

export async function getProToolContent(toolId: string): Promise<ToolData | undefined> {
  const tools = await getProToolsContent();
  return tools[toolId];
}

export async function saveProToolsContent(input: unknown): Promise<ProToolContentMap> {
  const current = await getProToolsContent();
  const next = normalizeProToolsContent(input, current);

  if (hasUpstash()) {
    await upstashCommand(['SET', TOOL_CONTENT_KEY, JSON.stringify(next)]);
  } else {
    backupLocalProToolsContent(current);
    writeLocalProToolsContent(next);
  }

  return next;
}
