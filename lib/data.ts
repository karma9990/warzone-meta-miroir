import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'loadouts.json');

export interface Attachment {
  slot: string;
  name: string;
  reason?: string;
}

export interface Stats {
  damage: number;
  range: number;
  mobility: number;
  control: number;
}

export type Tier = 'S' | 'A' | 'B' | 'C';

export interface Loadout {
  id: string;
  weapon: string;
  weaponId?: string;
  category: string;
  tier: Tier;
  playstyle: string;
  attachments: Attachment[];
  stats: Stats;
  advanced?: {
    ttkClose?: number;
    ttkMid?: number;
    ttkLong?: number;
    ads?: number;
    sprintToFire?: number;
    bulletVelocity?: number;
    reload?: number;
  };
  modes?: string[];
  tags?: string[];
  strengths?: string[];
  weaknesses?: string[];
  recommendedPerks?: string[];
  equipment?: string[];
  pairWith?: string[];
  patchSummary?: string;
  sourceNote?: string;
  notes: string;
  updatedAt: string;
}

const VALID_TIERS: Tier[] = ['S', 'A', 'B', 'C'];

const CURATED_BACKFILL: Loadout[] = [
  {
    id: 'meta-strider-300',
    weapon: 'Strider 300',
    weaponId: 'strider-300',
    category: 'Sniper Rifle',
    tier: 'S',
    playstyle: 'One-shot Sniper',
    attachments: [
      { slot: 'Muzzle', name: 'Monolithic Suppressor', reason: 'Keeps velocity high while staying suppressed.' },
      { slot: 'Barrel', name: 'Longbore Recon 29"', reason: 'Extends damage range and steadies long lanes.' },
      { slot: 'Optic', name: 'Imperium 12x', reason: 'Clean sight picture for 150m+ picks.' },
      { slot: 'Stock', name: 'Recon Weight Pad', reason: 'Reduces idle sway before the shot.' },
      { slot: 'Ammunition', name: 'High Velocity', reason: 'Makes leading moving targets easier.' },
    ],
    stats: { damage: 96, range: 98, mobility: 36, control: 78 },
    advanced: { ttkClose: 780, ttkMid: 840, ttkLong: 920, ads: 575, sprintToFire: 310, bulletVelocity: 1320, reload: 3200 },
    modes: ['Battle Royale', 'Ranked', 'Squads'],
    tags: ['one-shot', 'long range', 'high skill'],
    strengths: ['Deletes exposed players at range', 'Pairs well with fast SMGs', 'Very strong for roof control'],
    weaknesses: ['Slow ADS', 'Punished hard in close quarters', 'Needs confident positioning'],
    recommendedPerks: ['Sprinter', 'Tempered', 'High Alert'],
    equipment: ['Smoke Grenade', 'Throwing Knife'],
    pairWith: ['Carbon 57', 'VST', 'Kogot-7'],
    patchSummary: 'Snipers remain valuable because ranked endgames still reward first knock pressure.',
    sourceNote: 'Curated from practical range, handling and current competitive sniper usage patterns.',
    notes: 'Best used by disciplined players who hold power positions and rotate early.',
    updatedAt: '2026-05-21',
  },
  {
    id: 'meta-mxr-17',
    weapon: 'MXR-17',
    weaponId: 'mxr-17',
    category: 'Assault Rifle',
    tier: 'A',
    playstyle: 'Long-Range',
    attachments: [
      { slot: 'Muzzle', name: 'VT-7 Spiritfire Suppressor', reason: 'Adds velocity and keeps the gun off radar.' },
      { slot: 'Barrel', name: 'Hightower 20"', reason: 'Improves range and recoil consistency.' },
      { slot: 'Optic', name: 'Greaves Accuspot 3x', reason: 'Stable long-range visual without excess zoom.' },
      { slot: 'Underbarrel', name: 'Bruen Heavy Support Grip', reason: 'Tames horizontal recoil.' },
      { slot: 'Magazine', name: '60 Round Drum', reason: 'Enough ammo to break multiple plates.' },
    ],
    stats: { damage: 82, range: 88, mobility: 52, control: 84 },
    advanced: { ttkClose: 640, ttkMid: 720, ttkLong: 860, ads: 360, sprintToFire: 235, bulletVelocity: 990, reload: 2850 },
    modes: ['Battle Royale', 'Ranked'],
    tags: ['low recoil', 'anchor', 'beginner friendly'],
    strengths: ['Very forgiving recoil', 'Reliable past 60m', 'Good magazine size'],
    weaknesses: ['Not explosive close range', 'Heavier than sniper-support ARs'],
    recommendedPerks: ['Scavenger', 'Tempered', 'High Alert'],
    equipment: ['Smoke Grenade', 'Semtex'],
    pairWith: ['VST', 'Carbon 57', 'Razor 9mm'],
    patchSummary: 'A stability pick that wins through accuracy instead of raw theoretical TTK.',
    sourceNote: 'Modeled after common low-recoil long-range AR priorities.',
    notes: 'Use this if you want a long-range AR that does not fight your aim.',
    updatedAt: '2026-05-21',
  },
  {
    id: 'meta-egret-17',
    weapon: 'EGRT-17',
    weaponId: 'egrt-17',
    category: 'Assault Rifle',
    tier: 'A',
    playstyle: 'Sniper Support',
    attachments: [
      { slot: 'Muzzle', name: 'Hawker Stabilizer MK.2', reason: 'Controls first-shot climb without killing movement.' },
      { slot: 'Barrel', name: 'LTI Patrol Barrel', reason: 'Keeps mid-range damage consistent.' },
      { slot: 'Optic', name: 'FANG HoverPoint ELO', reason: 'Fast target pickup in 20-50m fights.' },
      { slot: 'Stock', name: 'Tactical Light Pad', reason: 'Keeps strafe speed usable.' },
      { slot: 'Magazine', name: '50 Round Mag', reason: 'Squad-fight capacity without full LMG weight.' },
    ],
    stats: { damage: 78, range: 72, mobility: 74, control: 78 },
    advanced: { ttkClose: 610, ttkMid: 690, ttkLong: 910, ads: 285, sprintToFire: 185, bulletVelocity: 830, reload: 2520 },
    modes: ['Resurgence', 'Battle Royale', 'Solo'],
    tags: ['sniper support', 'balanced', 'fast ADS'],
    strengths: ['Comfortable from 15m to 55m', 'Works with sniper or LMG pairings', 'Good handling'],
    weaknesses: ['Outgunned by SMGs point blank', 'Not a true beam past 75m'],
    recommendedPerks: ['Sprinter', 'Quick Fix', 'High Alert'],
    equipment: ['Smoke Grenade', 'Throwing Knife'],
    pairWith: ['Strider 300', 'MK.78', 'Hawker HX'],
    patchSummary: 'Sniper-support builds are back because teams are splitting long and close pressure more often.',
    sourceNote: 'Curated from sniper-support range needs and mobility tradeoffs.',
    notes: 'The cleanest do-everything support rifle on the board right now.',
    updatedAt: '2026-05-21',
  },
  {
    id: 'meta-hawker-hx',
    weapon: 'Hawker HX',
    weaponId: 'hawker-hx',
    category: 'Sniper Rifle',
    tier: 'A',
    playstyle: 'Aggressive Sniper',
    attachments: [
      { slot: 'Barrel', name: 'Factory Short Precision', reason: 'Keeps ADS manageable for repeeks.' },
      { slot: 'Laser', name: 'Target Line Pro', reason: 'Improves snap timing before a fast shot.' },
      { slot: 'Optic', name: 'Carrack 6x', reason: 'Enough zoom without tunnel vision.' },
      { slot: 'Stock', name: 'Skirmish Pad', reason: 'Better movement between peeks.' },
      { slot: 'Ammunition', name: 'High Grain Rounds', reason: 'Improves damage consistency at mid range.' },
    ],
    stats: { damage: 92, range: 84, mobility: 52, control: 70 },
    advanced: { ttkClose: 820, ttkMid: 875, ttkLong: 980, ads: 465, sprintToFire: 270, bulletVelocity: 1160, reload: 2950 },
    modes: ['Resurgence', 'Solo', 'Duo'],
    tags: ['aggressive sniper', 'quickscope', 'support needed'],
    strengths: ['Fast for a sniper', 'Good for rooftop repeeks', 'Strong solo pick potential'],
    weaknesses: ['Less stable than Strider 300', 'Needs precision under pressure'],
    recommendedPerks: ['Sprinter', 'Quick Fix', 'High Alert'],
    equipment: ['Smoke Grenade', 'Throwing Knife'],
    pairWith: ['Carbon 57', 'VST', 'EGRT-17'],
    patchSummary: 'Aggressive sniping remains viable in Resurgence because fast resets matter more than absolute stability.',
    sourceNote: 'Built around practical ADS and rotation pressure.',
    notes: 'A sniper for players who refuse to sit still.',
    updatedAt: '2026-05-21',
  },
  {
    id: 'meta-peacekeeper-mk1',
    weapon: 'Peacekeeper Mk1',
    weaponId: 'peacekeeper-mk1',
    category: 'Assault Rifle',
    tier: 'A',
    playstyle: 'Sniper Support',
    attachments: [
      { slot: 'Muzzle', name: 'Quartermaster Suppressor', reason: 'Improves recoil without turning it sluggish.' },
      { slot: 'Barrel', name: 'Reinforced Long Barrel', reason: 'Keeps the gun honest in mid-range fights.' },
      { slot: 'Optic', name: 'Microflex LED', reason: 'Fast and clear for mixed-distance fights.' },
      { slot: 'Rear Grip', name: 'Commando Grip', reason: 'ADS and sprint-out help.' },
      { slot: 'Magazine', name: 'Extended Mag II', reason: 'Enough ammo for trios without over-weighting the build.' },
    ],
    stats: { damage: 76, range: 68, mobility: 80, control: 74 },
    advanced: { ttkClose: 590, ttkMid: 710, ttkLong: 940, ads: 260, sprintToFire: 170, bulletVelocity: 780, reload: 2380 },
    modes: ['Resurgence', 'Solo', 'Duo'],
    tags: ['mobile AR', 'sniper support', 'controller friendly'],
    strengths: ['Fast handling', 'Good strafe feel', 'Flexible with snipers'],
    weaknesses: ['Damage drops off at true long range', 'Needs attachments to feel stable'],
    recommendedPerks: ['Sprinter', 'Quick Fix', 'Tracker'],
    equipment: ['Smoke Grenade', 'Semtex'],
    pairWith: ['Strider 300', 'Hawker HX'],
    patchSummary: 'Mobile ARs are a strong answer to players who do not want SMG-only sniper support.',
    sourceNote: 'Curated from handling-first support rifle roles.',
    notes: 'A comfort pick for fast AR players who still want range insurance.',
    updatedAt: '2026-05-21',
  },
  {
    id: 'meta-razor-9mm',
    weapon: 'Razor 9mm',
    weaponId: 'razor-9mm',
    category: 'SMG',
    tier: 'B',
    playstyle: 'Close-Range',
    attachments: [
      { slot: 'Muzzle', name: 'Hawker Series 45', reason: 'Adds close recoil control.' },
      { slot: 'Barrel', name: 'Short Light Barrel', reason: 'Improves mobility and sprint-out.' },
      { slot: 'Stock', name: 'No Stock Mod', reason: 'Maximizes strafe and breakaway speed.' },
      { slot: 'Rear Grip', name: 'Quickdraw Grip', reason: 'Faster ADS into surprise fights.' },
      { slot: 'Magazine', name: 'Extended Mag', reason: 'Needed for squad pressure.' },
    ],
    stats: { damage: 65, range: 42, mobility: 96, control: 61 },
    advanced: { ttkClose: 560, ttkMid: 780, ttkLong: 1100, ads: 205, sprintToFire: 120, bulletVelocity: 570, reload: 2150 },
    modes: ['Resurgence', 'Solo'],
    tags: ['movement', 'close range', 'high risk'],
    strengths: ['Excellent movement', 'Fast sprint-to-fire', 'Great for breaking cameras'],
    weaknesses: ['Falls off quickly', 'Less forgiving than Carbon 57'],
    recommendedPerks: ['Sprinter', 'Quick Fix', 'Tracker'],
    equipment: ['Stim', 'Throwing Knife'],
    pairWith: ['MK.78', 'MXR-17', 'Voyak KT-3'],
    patchSummary: 'Fast SMGs still win stairwell fights, but they demand cleaner positioning.',
    sourceNote: 'Curated from movement-SMG priorities.',
    notes: 'Not the safest SMG, but extremely dangerous in the hands of an entry player.',
    updatedAt: '2026-05-21',
  },
  {
    id: 'meta-mk35-isr',
    weapon: 'MK35 ISR',
    weaponId: 'mk35-isr',
    category: 'Assault Rifle',
    tier: 'B',
    playstyle: 'Mid-Range',
    attachments: [
      { slot: 'Muzzle', name: 'Compensated Flash Hider', reason: 'Keeps visual recoil readable.' },
      { slot: 'Barrel', name: 'Ranger Barrel', reason: 'Improves range without too much ADS tax.' },
      { slot: 'Optic', name: 'FANG HoverPoint ELO', reason: 'Good for mid-range target acquisition.' },
      { slot: 'Underbarrel', name: 'Angled Control Grip', reason: 'Stabilizes lateral bounce.' },
      { slot: 'Magazine', name: '45 Round Mag', reason: 'Balanced reload and capacity.' },
    ],
    stats: { damage: 72, range: 70, mobility: 68, control: 72 },
    advanced: { ttkClose: 640, ttkMid: 760, ttkLong: 950, ads: 310, sprintToFire: 210, bulletVelocity: 820, reload: 2420 },
    modes: ['Resurgence', 'Beginner'],
    tags: ['balanced', 'easy recoil', 'mid range'],
    strengths: ['Predictable recoil', 'Simple to learn', 'Good casual ranked pick'],
    weaknesses: ['No standout stat', 'Loses to elite meta in equal fights'],
    recommendedPerks: ['Scavenger', 'Tempered', 'High Alert'],
    equipment: ['Smoke Grenade', 'Frag Grenade'],
    pairWith: ['Carbon 57', 'VST'],
    patchSummary: 'A stable B-tier option when the top meta gets nerfed.',
    sourceNote: 'Curated as a safe fallback rifle.',
    notes: 'A practical rifle for players who value comfort over spreadsheet wins.',
    updatedAt: '2026-05-21',
  },
  {
    id: 'meta-ak-27',
    weapon: 'AK-27',
    weaponId: 'ak-27',
    category: 'Assault Rifle',
    tier: 'B',
    playstyle: 'Hard-Hitting AR',
    attachments: [
      { slot: 'Muzzle', name: 'Vertical Control Brake', reason: 'Reduces the punishing opening kick.' },
      { slot: 'Barrel', name: 'Heavy Spetsnaz Barrel', reason: 'Boosts range and velocity.' },
      { slot: 'Optic', name: 'Greaves Accuspot 3x', reason: 'Makes the slower fire rate easier to place.' },
      { slot: 'Underbarrel', name: 'Bruen Heavy Support Grip', reason: 'Controls side bounce.' },
      { slot: 'Magazine', name: '50 Round Mag', reason: 'Keeps reload speed acceptable.' },
    ],
    stats: { damage: 86, range: 80, mobility: 48, control: 61 },
    advanced: { ttkClose: 610, ttkMid: 735, ttkLong: 900, ads: 390, sprintToFire: 250, bulletVelocity: 920, reload: 2750 },
    modes: ['Battle Royale', 'High skill'],
    tags: ['high damage', 'high recoil', 'anchor'],
    strengths: ['Heavy damage per bullet', 'Strong if shots are clean', 'Punishes re-peeks'],
    weaknesses: ['Demanding recoil', 'Slow handling'],
    recommendedPerks: ['Scavenger', 'Tempered', 'High Alert'],
    equipment: ['Smoke Grenade', 'Drill Charge'],
    pairWith: ['VST', 'Razor 9mm'],
    patchSummary: 'High-damage rifles are playable, but comfort meta still favors lower recoil.',
    sourceNote: 'Curated from high-damage AR tradeoffs.',
    notes: 'Use it if you trust your recoil control more than your opponent trusts theirs.',
    updatedAt: '2026-05-21',
  },
  {
    id: 'meta-vs-recon',
    weapon: 'VS Recon',
    weaponId: 'vs-recon',
    category: 'Sniper Rifle',
    tier: 'B',
    playstyle: 'Long-Range',
    attachments: [
      { slot: 'Muzzle', name: 'Sonic Suppressor XL', reason: 'Velocity and suppression for long lanes.' },
      { slot: 'Barrel', name: 'Recon Max Barrel', reason: 'Stretches damage and velocity.' },
      { slot: 'Optic', name: 'KR KATT 8x', reason: 'Traditional long-range scope.' },
      { slot: 'Stock', name: 'Heavy Tactical Stock', reason: 'Sway and recoil reset.' },
      { slot: 'Ammunition', name: 'High Velocity', reason: 'Less target lead at range.' },
    ],
    stats: { damage: 90, range: 91, mobility: 32, control: 74 },
    advanced: { ttkClose: 850, ttkMid: 910, ttkLong: 1020, ads: 610, sprintToFire: 340, bulletVelocity: 1260, reload: 3350 },
    modes: ['Battle Royale', 'Squads'],
    tags: ['long range', 'slow', 'stable'],
    strengths: ['Great bullet velocity', 'Stable sight picture', 'Good for overwatch'],
    weaknesses: ['Very slow', 'Hard to use on small maps'],
    recommendedPerks: ['Tempered', 'High Alert', 'Survivor'],
    equipment: ['Smoke Grenade', 'Claymore'],
    pairWith: ['Peacekeeper Mk1', 'EGRT-17'],
    patchSummary: 'A stable long sniper, but currently less flexible than Strider 300.',
    sourceNote: 'Curated from overwatch sniper needs.',
    notes: 'Useful for disciplined squads that rotate before the zone forces them.',
    updatedAt: '2026-05-21',
  },
  {
    id: 'meta-sturmwolf-45',
    weapon: 'Sturmwolf 45',
    weaponId: 'sturmwolf-45',
    category: 'SMG',
    tier: 'B',
    playstyle: 'Close-Range',
    attachments: [
      { slot: 'Muzzle', name: 'Hawker Mini Brake', reason: 'Keeps the first 15 bullets centered.' },
      { slot: 'Barrel', name: 'Compact Mobility Barrel', reason: 'Supports aggressive entry speed.' },
      { slot: 'Stock', name: 'Light Folding Stock', reason: 'Improves strafe in doorway fights.' },
      { slot: 'Rear Grip', name: 'Taped Grip', reason: 'ADS and sprint-out improvement.' },
      { slot: 'Magazine', name: '50 Round Drum', reason: 'Needed for squad wipes.' },
    ],
    stats: { damage: 67, range: 38, mobility: 91, control: 70 },
    advanced: { ttkClose: 575, ttkMid: 805, ttkLong: 1180, ads: 215, sprintToFire: 130, bulletVelocity: 540, reload: 2320 },
    modes: ['Resurgence', 'Duo', 'Trio'],
    tags: ['close range', 'entry', 'forgiving'],
    strengths: ['Good magazine for an SMG', 'Forgiving recoil', 'Comfortable in buildings'],
    weaknesses: ['Average TTK outside close range', 'Worse mobility than Razor 9mm'],
    recommendedPerks: ['Sprinter', 'Quick Fix', 'Tracker'],
    equipment: ['Stim', 'Throwing Knife'],
    pairWith: ['MK.78', 'MXR-17'],
    patchSummary: 'Comfort SMGs stay relevant for teams that fight indoors constantly.',
    sourceNote: 'Curated from entry-SMG practical needs.',
    notes: 'A safer alternative when the Razor 9mm feels too wild.',
    updatedAt: '2026-05-21',
  },
  {
    id: 'meta-lc10',
    weapon: 'LC10',
    weaponId: 'lc10',
    category: 'SMG',
    tier: 'C',
    playstyle: 'Mid-Range SMG',
    attachments: [
      { slot: 'Muzzle', name: 'Agency Suppressor', reason: 'Improves range and keeps shots hidden.' },
      { slot: 'Barrel', name: 'Task Force Barrel', reason: 'Extends bullet velocity.' },
      { slot: 'Stock', name: 'Raider Stock', reason: 'Adds strafe and sprint-out.' },
      { slot: 'Underbarrel', name: 'Field Agent Grip', reason: 'Controls mid-range bounce.' },
      { slot: 'Magazine', name: '55 Round Mag', reason: 'Great reserve for squads.' },
    ],
    stats: { damage: 58, range: 56, mobility: 78, control: 76 },
    advanced: { ttkClose: 660, ttkMid: 820, ttkLong: 1040, ads: 250, sprintToFire: 165, bulletVelocity: 710, reload: 2580 },
    modes: ['Casual', 'Beginner'],
    tags: ['easy recoil', 'off meta', 'mid range'],
    strengths: ['Very easy to control', 'Good for returning players', 'Works as a support weapon'],
    weaknesses: ['Weak close TTK', 'Not tournament-ready'],
    recommendedPerks: ['Scavenger', 'Quick Fix', 'High Alert'],
    equipment: ['Smoke Grenade', 'Semtex'],
    pairWith: ['Strider 300', 'AK-27'],
    patchSummary: 'Fun and controllable, but underpowered against current top SMGs.',
    sourceNote: 'Curated as a comfort/off-meta option.',
    notes: 'A nostalgia pick that still works if you value control over pure speed.',
    updatedAt: '2026-05-21',
  },
  {
    id: 'meta-m8a1',
    weapon: 'M8A1',
    weaponId: 'm8a1',
    category: 'Marksman Rifle',
    tier: 'C',
    playstyle: 'Burst Rifle',
    attachments: [
      { slot: 'Muzzle', name: 'Precision Compensator', reason: 'Keeps burst spread tight.' },
      { slot: 'Barrel', name: 'Marksman Long Barrel', reason: 'Adds range for burst lanes.' },
      { slot: 'Optic', name: 'Greaves Accuspot 3x', reason: 'Clear burst tracking.' },
      { slot: 'Underbarrel', name: 'Support Grip', reason: 'Controls recoil between bursts.' },
      { slot: 'Magazine', name: '45 Round Mag', reason: 'Prevents constant reloads.' },
    ],
    stats: { damage: 79, range: 77, mobility: 50, control: 68 },
    advanced: { ttkClose: 690, ttkMid: 790, ttkLong: 980, ads: 375, sprintToFire: 245, bulletVelocity: 880, reload: 2680 },
    modes: ['Casual', 'High skill'],
    tags: ['burst', 'off meta', 'accuracy check'],
    strengths: ['Strong if every burst lands', 'Good ammo economy', 'Fun skill expression'],
    weaknesses: ['Missed burst is fatal', 'Weak under pressure'],
    recommendedPerks: ['Tempered', 'High Alert', 'Survivor'],
    equipment: ['Smoke Grenade', 'Drill Charge'],
    pairWith: ['Carbon 57', 'VST'],
    patchSummary: 'Burst rifles need perfect timing to compete with full-auto comfort picks.',
    sourceNote: 'Curated from burst weapon risk/reward.',
    notes: 'A specialist weapon. Strong in theory, brutal when you miss.',
    updatedAt: '2026-05-21',
  },
];

function asText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function asTier(value: unknown, fallback: Tier): Tier {
  return VALID_TIERS.includes(value as Tier) ? value as Tier : fallback;
}

function asStat(value: unknown, fallback: number) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.max(0, Math.min(100, Math.round(numberValue)));
}

function asAttachments(value: unknown): Attachment[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((attachment) => ({
      slot: asText((attachment as Partial<Attachment>)?.slot),
      name: asText((attachment as Partial<Attachment>)?.name),
    }))
    .filter((attachment) => attachment.slot && attachment.name)
    .slice(0, 10);
}

function inferAdvanced(loadout: Loadout): NonNullable<Loadout['advanced']> {
  const isSmg = loadout.category.toLowerCase().includes('smg');
  const isSniper = loadout.category.toLowerCase().includes('sniper');
  const isLmg = loadout.category.toLowerCase().includes('lmg');
  const baseClose = isSniper ? 830 : isSmg ? 570 : isLmg ? 660 : 620;
  const rangeTax = Math.max(0, 80 - loadout.stats.range) * 4;
  const handlingTax = Math.max(0, 78 - loadout.stats.mobility) * 3;

  return {
    ttkClose: Math.round(baseClose + rangeTax * 0.3),
    ttkMid: Math.round(baseClose + 110 + rangeTax),
    ttkLong: Math.round(baseClose + 270 + rangeTax * 1.4),
    ads: Math.round((isSniper ? 520 : isLmg ? 390 : isSmg ? 220 : 310) + handlingTax),
    sprintToFire: Math.round((isSniper ? 290 : isLmg ? 245 : isSmg ? 135 : 205) + handlingTax * 0.35),
    bulletVelocity: Math.round(isSniper ? 1220 : isLmg ? 920 : isSmg ? 610 : 860),
    reload: Math.round(isLmg ? 3300 : isSniper ? 3100 : isSmg ? 2250 : 2650),
  };
}

function enrichLoadout(loadout: Loadout): Loadout {
  const isClose = loadout.playstyle.toLowerCase().includes('close');
  const isLong = loadout.playstyle.toLowerCase().includes('long') || loadout.category.toLowerCase().includes('sniper');
  const modes = loadout.modes ?? (isClose ? ['Resurgence', 'Duo', 'Trio'] : isLong ? ['Battle Royale', 'Ranked'] : ['Resurgence', 'Battle Royale']);
  const tags = loadout.tags ?? [
    loadout.playstyle.toLowerCase(),
    loadout.stats.control >= 78 ? 'low recoil' : 'balanced',
    loadout.stats.mobility >= 82 ? 'movement' : 'stable',
  ];

  return {
    ...loadout,
    attachments: loadout.attachments.map((attachment) => ({
      ...attachment,
      reason: attachment.reason ?? `Chosen to support this ${loadout.playstyle.toLowerCase()} role without breaking the weapon's handling profile.`,
    })),
    advanced: loadout.advanced ?? inferAdvanced(loadout),
    modes,
    tags,
    strengths: loadout.strengths ?? [
      loadout.stats.control >= 78 ? 'Stable enough to stay on target under pressure.' : 'Works best when fights are taken inside its intended range.',
      loadout.stats.mobility >= 82 ? 'Fast enough for aggressive resets and repositioning.' : 'Reliable for structured squad roles and held angles.',
      loadout.stats.damage >= 80 ? 'High damage profile rewards clean tracking.' : 'Comfortable, practical build for repeatable fights.',
    ],
    weaknesses: loadout.weaknesses ?? [
      isClose ? 'Falls off quickly outside close-range fights.' : 'Can be punished if forced into close quarters.',
      loadout.stats.control < 70 ? 'Needs practice because recoil is less forgiving.' : 'Still needs patch checks after weapon tuning.',
    ],
    recommendedPerks: loadout.recommendedPerks ?? (isClose ? ['Sprinter', 'Quick Fix', 'Tracker'] : ['Scavenger', 'Tempered', 'High Alert']),
    equipment: loadout.equipment ?? (isClose ? ['Stim', 'Throwing Knife'] : ['Smoke Grenade', 'Semtex']),
    patchSummary: loadout.patchSummary ?? 'Ranked from current practical stat balance, recoil comfort, handling and squad-role value.',
    sourceNote: loadout.sourceNote ?? 'WZPRO Meta uses curated practical estimates for public-facing guidance until live telemetry is connected.',
    notes: loadout.notes || `A practical ${loadout.playstyle.toLowerCase()} build focused on reliability, handling and repeatable fights.`,
  };
}

export function buildLoadoutFromInput(
  input: unknown,
  fallback?: Loadout
): { loadout: Omit<Loadout, 'id'>; error?: never } | { loadout?: never; error: string } {
  const body = input as Partial<Loadout>;
  const weapon = asText(body.weapon, fallback?.weapon);

  if (!weapon) {
    return { error: 'Weapon is required.' };
  }

  const attachments = asAttachments(body.attachments ?? fallback?.attachments);

  return {
    loadout: {
      weapon,
      weaponId: asText(body.weaponId, fallback?.weaponId),
      category: asText(body.category, fallback?.category || 'Assault Rifle'),
      tier: asTier(body.tier, fallback?.tier || 'B'),
      playstyle: asText(body.playstyle, fallback?.playstyle || 'Mid-Range'),
      attachments,
      stats: {
        damage: asStat(body.stats?.damage, fallback?.stats.damage ?? 50),
        range: asStat(body.stats?.range, fallback?.stats.range ?? 50),
        mobility: asStat(body.stats?.mobility, fallback?.stats.mobility ?? 50),
        control: asStat(body.stats?.control, fallback?.stats.control ?? 50),
      },
      notes: asText(body.notes, fallback?.notes),
      updatedAt: new Date().toISOString().split('T')[0],
    },
  };
}

export function getLoadouts(): Loadout[] {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const saved = JSON.parse(raw) as Loadout[];
    const savedIds = new Set(saved.map((loadout) => loadout.id));
    return [
      ...saved.map(enrichLoadout),
      ...CURATED_BACKFILL.filter((loadout) => !savedIds.has(loadout.id)),
    ];
  } catch {
    return CURATED_BACKFILL;
  }
}

export function saveLoadouts(loadouts: Loadout[]): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(loadouts, null, 2));
}
