'use client';

import Image from 'next/image';
import { useMemo, useRef, useState } from 'react';

type PlayerStyle = 'aggressive' | 'balanced' | 'anchor' | 'sniper' | 'beginner';
type InputDevice = 'controller' | 'mnk';
type Mode = 'resurgence' | 'battle-royale' | 'ranked' | 'squad';
type Range = 'close' | 'mid' | 'long' | 'sniper-support' | 'versatile';
type Priority = 'ttk' | 'recoil' | 'mobility' | 'magazine' | 'easy';
type WeaponPreference = 'auto' | 'Assault Rifle' | 'SMG' | 'LMG' | 'Marksman Rifle' | 'Shotgun';
type RecoilLevel = 'strong' | 'medium' | 'low';
type MetaIntent = 'full-meta' | 'easy-meta' | 'off-meta' | 'fun';

type Answers = {
  style: PlayerStyle;
  input: InputDevice;
  mode: Mode;
  range: Range;
  priority: Priority;
  weaponPreference: WeaponPreference;
  recoilLevel: RecoilLevel;
  metaIntent: MetaIntent;
};

type Attachment = {
  slot: string;
  name: string;
  reason: string;
  benefit: Priority | 'range';
  image?: string;
};

type EngagementBand = 'close' | 'mid' | 'long';
type AttachmentStrategy = 'pro' | 'recoil' | 'range' | 'mobility' | 'ttk' | 'magazine' | 'easy';

type MetaMetrics = {
  metaRank: number;
  tier: 'absolute-meta' | 'meta' | 'contender' | 'viable' | 'niche';
  pickRate: number;
  easeScore: number;
  ttkMs: Partial<Record<EngagementBand, number>>;
  adsMs: number;
  sprintToFireMs: number;
  rpm: number;
  bulletVelocity: number;
  recoil: {
    gunKick: number;
    horizontal: number;
    vertical: number;
  };
  magSize: number;
  rangeScore: number;
  officialPatch: string;
  sourceSummary: string;
};

type AiWeapon = {
  name: string;
  slug?: string;
  image?: string;
  category: Exclude<WeaponPreference, 'auto'>;
  availability: string;
  seasonSource: string;
  roles: PlayerStyle[];
  modes: Mode[];
  ranges: Range[];
  priorities: Priority[];
  inputFit: InputDevice[];
  metaFits: MetaIntent[];
  recoilFit: RecoilLevel[];
  skillFloor: number;
  stats: {
    damage: number;
    range: number;
    mobility: number;
    control: number;
    ease: number;
  };
  attachments: Attachment[];
  why: string;
  watchout: string;
};

type Recommendation = {
  weapon: AiWeapon;
  score: number;
};

type AttachmentProfile = {
  label: string;
  source: string;
  attachments: Attachment[];
};

type StatPreview = {
  label: string;
  value: number;
  delta: number;
};

type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  image?: ChatImage;
};

type ChatImage = {
  dataUrl: string;
  mimeType: string;
  name: string;
};

const DEFAULT_ANSWERS: Answers = {
  style: 'balanced',
  input: 'controller',
  mode: 'resurgence',
  range: 'mid',
  priority: 'recoil',
  weaponPreference: 'auto',
  recoilLevel: 'medium',
  metaIntent: 'easy-meta',
};

const OPENING_MESSAGE = "Que puis-je faire pour vous aujourd'hui ?";

const WEAPON_IMAGE_BANK: Record<string, string> = {
  'AK-27': '/assets/weapons/wzstats/ak-27-hq.avif',
  'Carbon 57': '/assets/weapons/wzstats/carbon-57-hq.avif',
  'CBRS-3': '/assets/weapons/wzstats/cbrs-3.avif',
  'Dravec 45': '/assets/weapons/wzstats/dravec-45-hq.png',
  'DS20 Mirage': '/assets/weapons/wzstats/ds20-mirage-hq.png',
  'Kogot-7': '/assets/weapons/wzstats/kogot-7-hq.avif',
  'KRS-7.62': '/assets/weapons/wzstats/krs-762.avif',
  'M10 Breacher': '/assets/weapons/wzstats/m10-breacher.avif',
  'MXR-17': '/assets/weapons/wzstats/mxr-17-hq.png',
  'REV-46': '/assets/weapons/wzstats/rev-46.avif',
  'Voyak KT-3': '/assets/weapons/wzstats/voyak-kt-3-hq.png',
  'VST': '/assets/weapons/wzstats/vst-hq.png',
  'VX Compact': '/assets/weapons/wzstats/vx-compact.png',
};

const LOW_RES_WEAPON_IMAGES = new Set(['AK-27', 'Carbon 57', 'Dravec 45', 'DS20 Mirage', 'Kogot-7', 'MXR-17', 'VST', 'Voyak KT-3']);

const ATTACHMENT_IMAGE_BANK: Record<string, string> = {};

function assetSeries(base: string, count: number) {
  return Array.from({ length: count }, (_, index) => `${base}${String(index + 1).padStart(2, '0')}.png`);
}

const WEAPON_ATTACHMENT_ASSET_OPTIONS: Record<string, Partial<Record<string, string[]>>> = {
  'ak-27': {
    underbarrel: assetSeries("/assets/attachments/_extracted_accessories/accesoir canon/fusil d'assaut/ak27/ak27__item-", 5),
    muzzle: assetSeries("/assets/attachments/_extracted_accessories/bouche/fusil d'assaut/ak27/ak27__item-", 6),
    barrel: assetSeries("/assets/attachments/_extracted_accessories/canon/fusil d'assaut/ak27/ak27__item-", 5),
    magazine: assetSeries("/assets/attachments/_extracted_accessories/CHARGEUR/FUSIL D'ASSAUT/AK27/AK27__item-", 3),
    stock: assetSeries("/assets/attachments/_extracted_accessories/crosse/fusil d'assaut/AK27/AK27__item-", 4),
  },
  'carbon-57': {
    underbarrel: assetSeries('/assets/attachments/_extracted_accessories/accesoir canon/mitrailettes/CARBON/CARBON__item-', 5),
    muzzle: assetSeries('/assets/attachments/_extracted_accessories/bouche/mitraillettes/carbon/carbon__item-', 6),
    barrel: assetSeries('/assets/attachments/_extracted_accessories/canon/mitraillettes/carbon/carbon__item-', 4),
    magazine: assetSeries('/assets/attachments/_extracted_accessories/CHARGEUR/MITRAILLETTES/CARBON/CARBON__item-', 2),
    stock: assetSeries('/assets/attachments/_extracted_accessories/crosse/mitraillettes/CARBON/CARBON__item-', 4),
  },
  'dravec-45': {
    barrel: assetSeries('/assets/attachments/_extracted_accessories/canon/mitraillettes/dravec/dravec__item-', 4),
    magazine: assetSeries('/assets/attachments/_extracted_accessories/CHARGEUR/MITRAILLETTES/DRAVEC/DRAVEC__item-', 2),
    stock: assetSeries('/assets/attachments/_extracted_accessories/crosse/mitraillettes/DRAVEC 45/DRAVEC 45__item-', 4),
    reargrip: assetSeries('/assets/attachments/_extracted_accessories/poignée arrière/mitraillettes/DRAVEC/DRAVEC__item-', 3),
  },
  'ds20-mirage': {
    underbarrel: assetSeries("/assets/attachments/_extracted_accessories/accesoir canon/fusil d'assaut/DS20/DS20__item-", 6),
    muzzle: assetSeries("/assets/attachments/_extracted_accessories/bouche/fusil d'assaut/ds20mirage/ds20mirage__item-", 6),
    barrel: assetSeries("/assets/attachments/_extracted_accessories/canon/fusil d'assaut/DS20/DS20__item-", 4),
    magazine: assetSeries("/assets/attachments/_extracted_accessories/CHARGEUR/FUSIL D'ASSAUT/DS20/DS20__item-", 3),
    stock: assetSeries("/assets/attachments/_extracted_accessories/crosse/fusil d'assaut/DS20/DS20__item-", 2),
  },
  'kogot-7': {
    underbarrel: assetSeries('/assets/attachments/_extracted_accessories/accesoir canon/mitrailettes/KOGOT/KOGOT__item-', 5),
    muzzle: assetSeries('/assets/attachments/_extracted_accessories/bouche/mitraillettes/kogot/kogot__item-', 6),
    barrel: assetSeries('/assets/attachments/_extracted_accessories/canon/mitraillettes/kogot/kogot__item-', 4),
    magazine: assetSeries('/assets/attachments/_extracted_accessories/CHARGEUR/MITRAILLETTES/KOGOT/KOGOT__item-', 1),
    stock: assetSeries('/assets/attachments/_extracted_accessories/crosse/mitraillettes/KOGOT/KOGOT__item-', 5),
  },
  'mxr-17': {
    underbarrel: assetSeries("/assets/attachments/_extracted_accessories/accesoir canon/fusil d'assaut/mxr17/mxr17__item-", 8),
    barrel: assetSeries("/assets/attachments/_extracted_accessories/canon/fusil d'assaut/MXR17/MXR17__item-", 5),
    magazine: assetSeries("/assets/attachments/_extracted_accessories/CHARGEUR/FUSIL D'ASSAUT/MXR17/MXR17__item-", 3),
    stock: assetSeries("/assets/attachments/_extracted_accessories/crosse/fusil d'assaut/MXR17/MXR17__item-", 4),
  },
  'rev-46': {
    underbarrel: assetSeries("/assets/attachments/_extracted_accessories/accesoir canon/mitrailettes/REV '-/REV '-__item-", 5),
    muzzle: assetSeries('/assets/attachments/_extracted_accessories/bouche/mitraillettes/rev 46/rev 46__item-', 6),
    barrel: assetSeries('/assets/attachments/_extracted_accessories/canon/mitraillettes/rev 46/rev 46__item-', 4),
    magazine: assetSeries('/assets/attachments/_extracted_accessories/CHARGEUR/MITRAILLETTES/REV 46/REV 46__item-', 3),
    stock: assetSeries('/assets/attachments/_extracted_accessories/crosse/mitraillettes/REV 46/REV 46__item-', 1),
  },
  'voyak-kt-3': {
    underbarrel: assetSeries("/assets/attachments/_extracted_accessories/accesoir canon/fusil d'assaut/voyak/voyak__item-", 5),
    muzzle: assetSeries("/assets/attachments/_extracted_accessories/bouche/fusil d'assaut/VOYAK KT-3/VOYAK KT-3__item-", 6),
    barrel: assetSeries("/assets/attachments/_extracted_accessories/canon/fusil d'assaut/voyak/voyak__item-", 4),
    magazine: assetSeries("/assets/attachments/_extracted_accessories/CHARGEUR/FUSIL D'ASSAUT/VOYAK/VOYAK__item-", 3),
    stock: assetSeries("/assets/attachments/_extracted_accessories/crosse/fusil d'assaut/VOYAK/VOYAK__item-", 3),
  },
  vst: {
    underbarrel: assetSeries('/assets/attachments/_extracted_accessories/accesoir canon/mitrailettes/VST/VST__item-', 5),
    barrel: assetSeries('/assets/attachments/_extracted_accessories/canon/mitraillettes/vst/vst__item-', 4),
    magazine: assetSeries('/assets/attachments/_extracted_accessories/CHARGEUR/MITRAILLETTES/VST/VST__item-', 5),
    stock: assetSeries('/assets/attachments/_extracted_accessories/crosse/mitraillettes/VST/VST__item-', 5),
  },
};

const ATTACHMENT_SLOT_FALLBACKS: Record<string, string> = {
  ammunition: "/assets/attachments/_extracted_accessories/mods de tir/fusil d'assaut/tir/tir__item-01.png",
  barrel: "/assets/attachments/_extracted_accessories/canon/fusil d'assaut/ak27/ak27__item-01.png",
  laser: "/assets/attachments/_extracted_accessories/accesoir canon/fusil d'assaut/ak27/ak27__item-02.png",
  magazine: "/assets/attachments/_extracted_accessories/CHARGEUR/FUSIL D'ASSAUT/AK27/AK27__item-01.png",
  muzzle: "/assets/attachments/_extracted_accessories/bouche/fusil d'assaut/ak27/ak27__item-01.png",
  optic: "/assets/attachments/_extracted_accessories/accesoir canon/fusil d'assaut/ak27/ak27__item-03.png",
  reargrip: "/assets/attachments/_extracted_accessories/poignée arrière/fusil d'assaut/AK27/AK27__item-01.png",
  stock: "/assets/attachments/_extracted_accessories/crosse/fusil d'assaut/AK27/AK27__item-01.png",
  underbarrel: "/assets/attachments/_extracted_accessories/accesoir canon/fusil d'assaut/ak27/ak27__item-01.png",
  firemode: "/assets/attachments/_extracted_accessories/mods de tir/fusil d'assaut/tir/tir__item-02.png",
};

const WEAPON_ATTACHMENT_OVERRIDES: Record<string, string> = {
  // AK-27
  'ak-27_muzzle': "/assets/attachments/_extracted_accessories/bouche/fusil d'assaut/ak27/ak27__item-01.png",
  'ak-27_barrel': "/assets/attachments/_extracted_accessories/canon/fusil d'assaut/ak27/ak27__item-01.png",
  'ak-27_magazine': "/assets/attachments/_extracted_accessories/CHARGEUR/FUSIL D'ASSAUT/AK27/AK27__item-01.png",
  'ak-27_stock': "/assets/attachments/_extracted_accessories/crosse/fusil d'assaut/AK27/AK27__item-01.png",
  'ak-27_reargrip': "/assets/attachments/_extracted_accessories/poignée arrière/fusil d'assaut/AK27/AK27__item-01.png",
  'ak-27_underbarrel': "/assets/attachments/_extracted_accessories/accesoir canon/fusil d'assaut/ak27/ak27__item-01.png",
  'ak-27_ammunition': "/assets/attachments/_extracted_accessories/mods de tir/fusil d'assaut/tir/tir__item-01.png",
  // DS20 Mirage
  'ds20-mirage_muzzle': "/assets/attachments/_extracted_accessories/bouche/fusil d'assaut/ds20mirage/ds20mirage__item-01.png",
  'ds20-mirage_barrel': "/assets/attachments/_extracted_accessories/canon/fusil d'assaut/DS20/DS20__item-01.png",
  'ds20-mirage_magazine': "/assets/attachments/_extracted_accessories/CHARGEUR/FUSIL D'ASSAUT/DS20/DS20__item-01.png",
  'ds20-mirage_stock': "/assets/attachments/_extracted_accessories/crosse/fusil d'assaut/DS20/DS20__item-01.png",
  'ds20-mirage_reargrip': "/assets/attachments/_extracted_accessories/poignée arrière/fusil d'assaut/DS20/DS20__item-01.png",
  'ds20-mirage_underbarrel': "/assets/attachments/_extracted_accessories/accesoir canon/fusil d'assaut/DS20/DS20__item-01.png",
  'ds20-mirage_optic': "/assets/attachments/_extracted_accessories/accesoir canon/fusil d'assaut/DS20/DS20__item-02.png",
  // Voyak KT-3
  'voyak-kt-3_muzzle': "/assets/attachments/_extracted_accessories/bouche/fusil d'assaut/VOYAK KT-3/VOYAK KT-3__item-01.png",
  'voyak-kt-3_barrel': "/assets/attachments/_extracted_accessories/canon/fusil d'assaut/voyak/voyak__item-01.png",
  'voyak-kt-3_magazine': "/assets/attachments/_extracted_accessories/CHARGEUR/FUSIL D'ASSAUT/VOYAK/VOYAK__item-01.png",
  'voyak-kt-3_stock': "/assets/attachments/_extracted_accessories/crosse/fusil d'assaut/VOYAK/VOYAK__item-01.png",
  'voyak-kt-3_reargrip': "/assets/attachments/_extracted_accessories/poignée arrière/fusil d'assaut/VOYAK/VOYAK__item-01.png",
  'voyak-kt-3_underbarrel': "/assets/attachments/_extracted_accessories/accesoir canon/fusil d'assaut/voyak/voyak__item-01.png",
  'voyak-kt-3_optic': "/assets/attachments/_extracted_accessories/accesoir canon/fusil d'assaut/voyak/voyak__item-02.png",
  // REV-46
  'rev-46_muzzle': "/assets/attachments/_extracted_accessories/bouche/mitraillettes/rev 46/rev 46__item-01.png",
  'rev-46_barrel': "/assets/attachments/_extracted_accessories/canon/mitraillettes/rev 46/rev 46__item-01.png",
  'rev-46_magazine': "/assets/attachments/_extracted_accessories/CHARGEUR/MITRAILLETTES/REV 46/REV 46__item-01.png",
  'rev-46_stock': "/assets/attachments/_extracted_accessories/crosse/mitraillettes/REV 46/REV 46__item-01.png",
  'rev-46_reargrip': "/assets/attachments/_extracted_accessories/poignée arrière/mitraillettes/REV 46/REV 46__item-01.png",
  'rev-46_underbarrel': "/assets/attachments/_extracted_accessories/accesoir canon/mitrailettes/REV '-/REV '-__item-01.png",
};

const WEAPON_META: Record<string, MetaMetrics> = {
  'MXR-17': {
    metaRank: 1,
    tier: 'absolute-meta',
    pickRate: 2.9,
    easeScore: 6.8,
    ttkMs: { close: 600, mid: 600, long: 760 },
    adsMs: 388,
    sprintToFireMs: 216,
    rpm: 500,
    bulletVelocity: 1194,
    recoil: { gunKick: 15.55, horizontal: 21.81, vertical: 43.97 },
    magSize: 60,
    rangeScore: 96,
    officialPatch: 'Saison 04: medium damage range passe de 55m a 60m.',
    sourceSummary: 'CODMunity 06/06: Absolute Meta long range, 600ms jusqu a 40m, 760ms jusqu a 80m.',
  },
  'DS20 Mirage': {
    metaRank: 2,
    tier: 'absolute-meta',
    pickRate: 18.9,
    easeScore: 9.5,
    ttkMs: { close: 615, mid: 640, long: 780 },
    adsMs: 390,
    sprintToFireMs: 178,
    rpm: 606,
    bulletVelocity: 855,
    recoil: { gunKick: 10.88, horizontal: 2.92, vertical: 49.69 },
    magSize: 45,
    rangeScore: 90,
    officialPatch: 'Saison 04: recoil vertical reduit de 8%, Flip Mags ameliore.',
    sourceSummary: 'CODMunity 06/06: Absolute Meta long range, EaseScore 9.5, recoil horizontal tres bas.',
  },
  'Dravec 45': {
    metaRank: 3,
    tier: 'absolute-meta',
    pickRate: 4.6,
    easeScore: 7.1,
    ttkMs: { close: 548, mid: 690, long: 940 },
    adsMs: 169,
    sprintToFireMs: 114,
    rpm: 685,
    bulletVelocity: 432,
    recoil: { gunKick: 62.46, horizontal: 34.92, vertical: 66.43 },
    magSize: 48,
    rangeScore: 48,
    officialPatch: 'Saison 04: fire rate passe de 638 a 652rpm et headshot multiplier 1.15x.',
    sourceSummary: 'CODMunity 06/04: Absolute Meta close range, tres rapide mais recoil exigeant.',
  },
  'Carbon 57': {
    metaRank: 4,
    tier: 'meta',
    pickRate: 1.6,
    easeScore: 8.3,
    ttkMs: { close: 560, mid: 667, long: 899 },
    adsMs: 189,
    sprintToFireMs: 120,
    rpm: 857,
    bulletVelocity: 550,
    recoil: { gunKick: 34.06, horizontal: 11.46, vertical: 38.33 },
    magSize: 50,
    rangeScore: 60,
    officialPatch: 'Saison 04: cite parmi les meilleurs SMG de l environnement meta.',
    sourceSummary: 'CODMunity 06/04: Meta close range, 560ms jusqu a 10m, 667ms jusqu a 40m.',
  },
  'Kogot-7': {
    metaRank: 5,
    tier: 'meta',
    pickRate: 2.3,
    easeScore: 7.4,
    ttkMs: { close: 558, mid: 725, long: 867 },
    adsMs: 170,
    sprintToFireMs: 110,
    rpm: 779,
    bulletVelocity: 610,
    recoil: { gunKick: 32, horizontal: 15, vertical: 40 },
    magSize: 45,
    rangeScore: 61,
    officialPatch: 'Saison 04: SMG meta close range, ADS 170ms et sprint-to-fire 110ms sur build actuel.',
    sourceSummary: 'CODMunity 06/06: Meta Warzone, #2 Close Range, 558ms jusqu a 10m, EaseScore 7.4.',
  },
  'AK-27': {
    metaRank: 6,
    tier: 'meta',
    pickRate: 1.4,
    easeScore: 7.3,
    ttkMs: { close: 610, mid: 650, long: 790 },
    adsMs: 403,
    sprintToFireMs: 209,
    rpm: 682,
    bulletVelocity: 1185,
    recoil: { gunKick: 11.97, horizontal: 8.59, vertical: 28.13 },
    magSize: 60,
    rangeScore: 92,
    officialPatch: 'Saison 04: shake/recoil horizontal reduits, 7.62 Soviet FMJ velocity 14% a 18%.',
    sourceSummary: 'CODMunity 06/04: Meta long range, #2 long range, 1184.96m/s avec build controle.',
  },
  'Voyak KT-3': {
    metaRank: 7,
    tier: 'meta',
    pickRate: 2.4,
    easeScore: 7.8,
    ttkMs: { close: 630, mid: 675, long: 805 },
    adsMs: 395,
    sprintToFireMs: 218,
    rpm: 600,
    bulletVelocity: 1188,
    recoil: { gunKick: 14.8, horizontal: 8.9, vertical: 38.5 },
    magSize: 60,
    rangeScore: 94,
    officialPatch: 'Saison 04: 17.6 LTI Grav-4 Barrel velocity 15% a 20%, Monolithic range reduit.',
    sourceSummary: 'Gamer.org/CODMunity: long range stable, velocity ~1188m/s, classe laser.',
  },
  'VX Compact': {
    metaRank: 8,
    tier: 'meta',
    pickRate: 1.8,
    easeScore: 7.4,
    ttkMs: { close: 575, mid: 705, long: 910 },
    adsMs: 210,
    sprintToFireMs: 145,
    rpm: 780,
    bulletVelocity: 770,
    recoil: { gunKick: 30.5, horizontal: 16.2, vertical: 42.8 },
    magSize: 30,
    rangeScore: 70,
    officialPatch: 'Saison 04: AR rapide avec accessoire Prestige MFS Impetus Fast Mag.',
    sourceSummary: 'Profil sniper support/mobile: bon handling, TTK close solide, chargeur plus exigeant.',
  },
  'CBRS-3': {
    metaRank: 9,
    tier: 'contender',
    pickRate: 5.3,
    easeScore: 5.7,
    ttkMs: { close: 568, mid: 689, long: 863 },
    adsMs: 135,
    sprintToFireMs: 95,
    rpm: 740,
    bulletVelocity: 590,
    recoil: { gunKick: 42.01, horizontal: 11.3, vertical: 45.57 },
    magSize: 60,
    rangeScore: 67,
    officialPatch: 'Saison 04: nouveau SMG Battle Pass avec chargeur haute capacite.',
    sourceSummary: 'CODMunity 06/04: Contender close range, 568ms jusqu a 10m, 689ms jusqu a 40m.',
  },
  'REV-46': {
    metaRank: 10,
    tier: 'contender',
    pickRate: 1.1,
    easeScore: 6.7,
    ttkMs: { close: 585, mid: 710, long: 930 },
    adsMs: 203,
    sprintToFireMs: 125,
    rpm: 1154,
    bulletVelocity: 620,
    recoil: { gunKick: 33.13, horizontal: 5.19, vertical: 42.48 },
    magSize: 55,
    rangeScore: 63,
    officialPatch: 'Saison 04: max range 12m a 12.5m, medium range 20m a 21m.',
    sourceSummary: 'CODMunity 06/04: Contender close range, 1154rpm, recoil horizontal bas avec build controle.',
  },
  'KRS-7.62': {
    metaRank: 11,
    tier: 'viable',
    pickRate: 0,
    easeScore: 5.9,
    ttkMs: { close: 650, mid: 650, long: 800 },
    adsMs: 339,
    sprintToFireMs: 292,
    rpm: 200,
    bulletVelocity: 918,
    recoil: { gunKick: 14.96, horizontal: 22.53, vertical: 61.69 },
    magSize: 14,
    rangeScore: 88,
    officialPatch: 'Saison 04: arme Battle Pass semi-auto, forte punition si les tirs sont rates.',
    sourceSummary: 'CODMunity 06/04: Very Good semi-auto, 918.4m/s, 14 coups en build et recoil vertical eleve.',
  },
  'M10 Breacher': {
    metaRank: 12,
    tier: 'niche',
    pickRate: 0.4,
    easeScore: 4.8,
    ttkMs: { close: 520, mid: 980, long: 1400 },
    adsMs: 250,
    sprintToFireMs: 150,
    rpm: 120,
    bulletVelocity: 360,
    recoil: { gunKick: 24, horizontal: 16, vertical: 36 },
    magSize: 8,
    rangeScore: 30,
    officialPatch: 'Saison 04: medium range 1.77-7.1m a 1.77-7.8m, ADS 280ms a 250ms.',
    sourceSummary: 'Activision 06/03: buff de range et ADS, niche tres close range uniquement.',
  },
  'VST': {
    metaRank: 13,
    tier: 'contender',
    pickRate: 1.2,
    easeScore: 5.8,
    ttkMs: { close: 550, mid: 656, long: 780 },
    adsMs: 185,
    sprintToFireMs: 125,
    rpm: 820,
    bulletVelocity: 590,
    recoil: { gunKick: 43, horizontal: 24, vertical: 50 },
    magSize: 50,
    rangeScore: 64,
    officialPatch: 'Saison 04: max damage range augmente de 13.2m a 13.6m, recoil vertical -8%, horizontal -12%.',
    sourceSummary: 'CODMunity 06/06: Contender Warzone, 550ms jusqu a 10m, 656ms jusqu a 40m, EaseScore 5.8.',
  },
};

const ATTACHMENT_PROFILES: Record<string, Partial<Record<AttachmentStrategy, AttachmentProfile>>> = {
  'MXR-17': {
    pro: {
      label: 'Build pro long range',
      source: 'CODMunity/Gamer.org: MXR-17 joue en primary longue distance avec optic, suppressor, barrel velocity, drum et stock controle.',
      attachments: [
        { slot: 'Optic', name: 'FANG HoverPoint ELO', benefit: 'recoil', reason: 'Image propre pour exploiter le TTK long range.' },
        { slot: 'Muzzle', name: 'Monolithic Suppressor', benefit: 'range', reason: 'Range et velocite pour garder les balles rapides.' },
        { slot: 'Barrel', name: '17" Greaves Scourge Barrel', benefit: 'range', reason: 'Priorise velocite et damage range.' },
        { slot: 'Magazine', name: 'Rhodes Drum Mag', benefit: 'magazine', reason: '60 balles pour ranked et squad.' },
        { slot: 'Stock', name: 'Winch Stock', benefit: 'recoil', reason: 'Baisse le kick vertical pour tenir les lignes.' },
      ],
    },
    recoil: {
      label: 'Beam recoil',
      source: 'Profil controle: on sacrifie du handling pour stabiliser horizontal/vertical.',
      attachments: [
        { slot: 'Optic', name: 'FANG HoverPoint ELO', benefit: 'recoil', reason: 'Viseur sans surcharge pour mieux lire le recul.' },
        { slot: 'Muzzle', name: 'LTI Stentorian Brake', benefit: 'recoil', reason: 'Freine le recoil horizontal, critere cle des AR longues.' },
        { slot: 'Barrel', name: '17" Greaves Scourge Barrel', benefit: 'range', reason: 'Garde la velocite haute meme sans suppressor.' },
        { slot: 'Underbarrel', name: 'VAS Convergence Foregrip', benefit: 'recoil', reason: 'Stabilise les sprays longue distance.' },
        { slot: 'Magazine', name: 'Rhodes Drum Mag', benefit: 'magazine', reason: '60 balles pour finir plusieurs plaques.' },
      ],
    },
  },
  'Kogot-7': {
    pro: {
      label: 'Build pro close range',
      source: 'CODMunity: Kogot-7 #2 close range; builds Swagg/Biffle autour de Hawker/Targil/Vex pour TTK et handling.',
      attachments: [
        { slot: 'Muzzle', name: 'Hawker Ported Comp', benefit: 'recoil', reason: 'Controle le kick tout en gardant le profil agressif.' },
        { slot: 'Barrel', name: '13.5" Canis-05 Barrel', benefit: 'range', reason: 'Ameliore la plage utile sans transformer le SMG.' },
        { slot: 'Underbarrel', name: 'EAM Steady-90 Grip', benefit: 'recoil', reason: 'Le choix stable vu sur les builds createurs.' },
        { slot: 'Magazine', name: 'Vex Expanse Mag', benefit: 'magazine', reason: 'Plus de marge en squad wipe.' },
        { slot: 'Fire Mods', name: 'Buffer Spring', benefit: 'recoil', reason: 'Reduit le recoil pour rester dans le TTK theorique.' },
      ],
    },
    mobility: {
      label: 'Movement close range',
      source: 'CODMunity: certains builds Kogot utilisent 8.5" Targil Hock-XR et Targil Orbiter Stock pour ADS/mouvement.',
      attachments: [
        { slot: 'Optic', name: 'FANG HoverPoint ELO', benefit: 'recoil', reason: 'Viseur lisible sans ralentir le build.' },
        { slot: 'Barrel', name: '8.5" Targil Hock-XR Barrel', benefit: 'mobility', reason: 'ADS speed +17% pour entry tres rapide.' },
        { slot: 'Magazine', name: 'Vex Expanse Mag', benefit: 'magazine', reason: 'Capacite pour finir un deuxieme joueur.' },
        { slot: 'Stock', name: 'Targil Orbiter Stock', benefit: 'mobility', reason: 'ADS ameliore depuis les ajustements.' },
        { slot: 'Rear Grip', name: 'Remedy Light Grip', benefit: 'mobility', reason: 'Garde le sprint-to-fire bas.' },
      ],
    },
  },
  'VST': {
    pro: {
      label: 'Build JoeWo close range',
      source: 'CODMunity: JoeWo VST close range avec Hawker Series 45, Bowen/Expedition barrel, EAM Steady-90, Avarice II et Cub-55.',
      attachments: [
        { slot: 'Muzzle', name: 'Hawker Series 45', benefit: 'recoil', reason: 'Recoil plus controle pour rendre le VST viable.' },
        { slot: 'Barrel', name: '10.5" Bowen Conquer Barrel', benefit: 'range', reason: 'Build createur pour garder du degat au-dela du point blank.' },
        { slot: 'Underbarrel', name: 'EAM Steady-90 Grip', benefit: 'recoil', reason: 'Controle horizontal et stabilite.' },
        { slot: 'Magazine', name: 'Avarice Extended Mag II', benefit: 'magazine', reason: 'Capacite pour squad et ranked.' },
        { slot: 'Stock', name: 'Hawker Cub-55 Pad', benefit: 'mobility', reason: 'Conserve la vitesse de strafe.' },
      ],
    },
    ttk: {
      label: 'TTK/Diaz Biffle',
      source: 'CODMunity: build Diaz Biffle VST avec 14" LTI Expedition, Amplify Extended Mag I, VAS Convergence, LTI Stern Aim Pad et Buffer Springs.',
      attachments: [
        { slot: 'Barrel', name: '14" LTI Expedition Barrel', benefit: 'range', reason: 'Profite du buff range Saison 04.' },
        { slot: 'Magazine', name: 'Amplify Extended Mag I', benefit: 'magazine', reason: 'Chargeur sans trop perdre en vitesse.' },
        { slot: 'Underbarrel', name: 'VAS Convergence Foregrip', benefit: 'recoil', reason: 'Aide a tenir le TTK 550ms sur cible mobile.' },
        { slot: 'Stock', name: 'LTI Stern Aim Pad', benefit: 'mobility', reason: 'ADS/strafe pour fights close.' },
        { slot: 'Fire Mods', name: 'Buffer Springs', benefit: 'recoil', reason: 'Recoil reduit sur le build TTK.' },
      ],
    },
  },
  'Dravec 45': {
    mobility: {
      label: 'Movement King',
      source: 'PC Gamer/CODMunity: Dravec 45 excelle close range; les builds rapides priorisent ADS, sprint-to-fire et laser.',
      attachments: [
        { slot: 'Muzzle', name: 'Bowen .45 Suppressor', benefit: 'range', reason: 'Reste discret sans ruiner la mobilite.' },
        { slot: 'Barrel', name: '12" Cloud Barrel', benefit: 'mobility', reason: 'Boost ADS et vitesse de duel.' },
        { slot: 'Rear Grip', name: 'Herald-Z1 Grip', benefit: 'mobility', reason: 'Ameliore la vitesse apres slide/dive.' },
        { slot: 'Laser', name: 'LTI Swiftpoint Laser', benefit: 'mobility', reason: 'Sprint-to-fire plus rapide pour entry.' },
        { slot: 'Magazine', name: 'Gator Extended Mag', benefit: 'magazine', reason: '48 balles pour squad fights.' },
      ],
    },
    recoil: {
      label: 'Dravec controle',
      source: 'Profil manette/recoil: on remplace une partie du pur movement par comp et foregrip.',
      attachments: [
        { slot: 'Muzzle', name: 'Hawker Series 45', benefit: 'recoil', reason: 'Compense le gun kick eleve du Dravec.' },
        { slot: 'Barrel', name: '19" EAM Horizon Barrel', benefit: 'range', reason: 'Rallonge la premiere plage de degats.' },
        { slot: 'Underbarrel', name: 'EAM Steady-90 Grip', benefit: 'recoil', reason: 'Controle horizontal en tracking.' },
        { slot: 'Magazine', name: 'Gator Extended Mag', benefit: 'magazine', reason: '48 balles pour wipe.' },
        { slot: 'Fire Mods', name: 'Bolt Carrier Group', benefit: 'ttk', reason: 'Garde le profil TTK agressif.' },
      ],
    },
  },
  'Carbon 57': {
    mobility: {
      label: 'Movement SMG',
      source: 'Profil pro movement: on garde le TTK Carbon 57 mais on priorise ADS, sprint-to-fire et strafe.',
      attachments: [
        { slot: 'Muzzle', name: 'Kuhn Ported Comp', benefit: 'recoil', reason: 'Garde le recoil propre sans trop ralentir.' },
        { slot: 'Barrel', name: 'Short Control Barrel', benefit: 'mobility', reason: 'Plus rapide en ADS pour les entrees de batiment.' },
        { slot: 'Laser', name: 'Target Line Pro', benefit: 'mobility', reason: 'Sprint-to-fire plus vif apres slide/dive.' },
        { slot: 'Magazine', name: 'MFS Renown Plus Mag', benefit: 'magazine', reason: '50 balles tout en restant mobile.' },
        { slot: 'Stock', name: 'Light Stock', benefit: 'mobility', reason: 'Strafe plus nerveux pour casser les angles.' },
      ],
    },
    recoil: {
      label: 'Carbon controle',
      source: 'Profil recoil/manette: on utilise comp, handstop et recoil system pour rendre le tracking plus regulier.',
      attachments: [
        { slot: 'Muzzle', name: 'Kuhn Ported Comp', benefit: 'recoil', reason: 'Recoil horizontal plus facile a tenir.' },
        { slot: 'Barrel', name: '14" Rockleigh Barrel', benefit: 'range', reason: 'Conserve la plage de degats utile.' },
        { slot: 'Underbarrel', name: 'Sapper Guard Handstop', benefit: 'recoil', reason: 'Stabilite sans gros malus ADS.' },
        { slot: 'Magazine', name: 'MFS Renown Plus Mag', benefit: 'magazine', reason: '50 balles pour ne pas reload en plein duel.' },
        { slot: 'Fire Mods', name: 'Accelerated Recoil System', benefit: 'recoil', reason: 'Controle le spray en gardant la cadence.' },
      ],
    },
    easy: {
      label: 'Meta facile',
      source: 'CODMunity: Carbon 57 meta close range avec EaseScore eleve; on privilegie recoil lisible et chargeur.',
      attachments: [
        { slot: 'Muzzle', name: 'Kuhn Ported Comp', benefit: 'recoil', reason: 'Compense le recoil tout en gardant le SMG vif.' },
        { slot: 'Barrel', name: '14" Rockleigh Barrel', benefit: 'range', reason: 'Consistance de degats en close/mid.' },
        { slot: 'Underbarrel', name: 'Sapper Guard Handstop', benefit: 'recoil', reason: 'Stabilite sans gros malus handling.' },
        { slot: 'Magazine', name: 'MFS Renown Plus Mag', benefit: 'magazine', reason: '50 balles pour jouer safe.' },
        { slot: 'Fire Mods', name: 'Accelerated Recoil System', benefit: 'ttk', reason: 'DPS solide sans perdre le feeling.' },
      ],
    },
  },
  'VX Compact': {
    mobility: {
      label: 'Sniper support rapide',
      source: 'Saison 04: VX Compact joue autour du MFS Impetus Fast Mag pour reload/handling et du brake pour controler le recoil.',
      attachments: [
        { slot: 'Magazine', name: 'MFS Impetus Fast Mag', benefit: 'magazine', reason: 'Reload et handling, cle du profil sniper support.' },
        { slot: 'Muzzle', name: 'LTI Stentorian Brake', benefit: 'recoil', reason: 'Controle horizontal pour AR mobile.' },
        { slot: 'Barrel', name: 'Reinforced Barrel', benefit: 'range', reason: 'Portee utile superieure a un SMG.' },
        { slot: 'Rear Grip', name: 'Commando Grip', benefit: 'mobility', reason: 'Sprint-to-fire et transitions.' },
        { slot: 'Stock', name: 'Light Stock', benefit: 'mobility', reason: 'Strafe et feeling agressif.' },
      ],
    },
  },
  'DS20 Mirage': {
    recoil: {
      label: 'Beam recoil ranked',
      source: 'Profil recoil: DS20 Mirage profite du recoil horizontal tres bas et du buff vertical Saison 04; on renforce encore la stabilite.',
      attachments: [
        { slot: 'Optic', name: 'FANG HoverPoint ELO', benefit: 'recoil', reason: 'Viseur clair pour beam longue distance.' },
        { slot: 'Muzzle', name: 'LTI Stentorian Brake', benefit: 'recoil', reason: 'Recoil horizontal encore plus controle.' },
        { slot: 'Barrel', name: '17.1" Abdicator Barrel', benefit: 'range', reason: 'Portee et vitesse de balle.' },
        { slot: 'Underbarrel', name: 'VAS Convergence Foregrip', benefit: 'recoil', reason: 'Stabilise les longues rafales.' },
        { slot: 'Magazine', name: 'Griffon Reserve Extended 2', benefit: 'magazine', reason: 'Chargeur ranked/squad.' },
      ],
    },
    easy: {
      label: 'Beam facile ranked',
      source: 'CODMunity: DS20 Mirage Absolute Meta long range avec EaseScore 9.5 et recoil horizontal tres bas.',
      attachments: [
        { slot: 'Optic', name: 'FANG HoverPoint ELO', benefit: 'recoil', reason: 'Lecture propre en ranked.' },
        { slot: 'Muzzle', name: 'Suppressor', benefit: 'range', reason: 'Buff range Saison 04 sur les armes principales.' },
        { slot: 'Barrel', name: '17.1" Abdicator Barrel', benefit: 'range', reason: 'Portee et stabilite.' },
        { slot: 'Magazine', name: 'Griffon Reserve Extended 2', benefit: 'magazine', reason: 'Chargeur confortable.' },
        { slot: 'Stock', name: 'Weighted Stock', benefit: 'recoil', reason: 'Beam stable pour manette.' },
      ],
    },
  },
};

const WEAPONS: AiWeapon[] = [
  {
    name: 'MXR-17',
    slug: 'mxr-17',
    image: '/assets/weapons/wzstats/mxr-17.avif',
    category: 'Assault Rifle',
    availability: 'Meta Saison 04',
    seasonSource: 'Buff Saison 04: medium damage range augmente de 55m a 60m.',
    roles: ['anchor', 'balanced'],
    modes: ['battle-royale', 'ranked', 'squad'],
    ranges: ['mid', 'long', 'versatile'],
    priorities: ['ttk', 'recoil', 'magazine'],
    inputFit: ['controller', 'mnk'],
    metaFits: ['full-meta'],
    recoilFit: ['medium', 'low'],
    skillFloor: 3,
    stats: { damage: 90, range: 96, mobility: 58, control: 78, ease: 68 },
    attachments: [
      { slot: 'Optic', name: 'FANG HoverPoint ELO', benefit: 'recoil', reason: 'Viseur clair pour exploiter le TTK long range.' },
      { slot: 'Muzzle', name: 'Monolithic Suppressor', benefit: 'range', reason: 'Range et velocite pour conserver le 600ms jusqu a 40m.' },
      { slot: 'Barrel', name: '17" Greaves Scourge Barrel', benefit: 'range', reason: 'Build CODMunity Absolute Meta: velocite et controle longue distance.' },
      { slot: 'Magazine', name: 'Rhodes Drum Mag', benefit: 'magazine', reason: '60 balles pour squad et ranked.' },
      { slot: 'Stock', name: 'Winch Stock', benefit: 'recoil', reason: 'Controle le kick vertical sur les longues lignes.' },
    ],
    why: 'Le choix full meta long range: TTK tres fort jusqu a 40m, bonne velocite et chargeur 60.',
    watchout: 'Handling lourd: il faut le jouer comme primaire longue distance, pas comme sniper support.',
  },
  {
    name: 'CBRS-3',
    category: 'SMG',
    availability: 'Saison 04 - Battle Pass',
    seasonSource: 'Arme de lancement Saison 04 avec chargeur de base 60 balles.',
    roles: ['aggressive', 'balanced', 'beginner'],
    modes: ['resurgence', 'ranked', 'battle-royale', 'squad'],
    ranges: ['close', 'mid', 'versatile'],
    priorities: ['magazine', 'recoil', 'easy', 'mobility'],
    inputFit: ['controller', 'mnk'],
    metaFits: ['full-meta', 'easy-meta'],
    recoilFit: ['medium', 'low'],
    skillFloor: 2,
    stats: { damage: 72, range: 70, mobility: 88, control: 84, ease: 88 },
    attachments: [
      { slot: 'Muzzle', name: 'Suppressor', benefit: 'range', reason: 'Bonus de portee de degats en Saison 04 tout en restant discret.' },
      { slot: 'Magazine', name: 'MFS Carousel Fast Mag', benefit: 'magazine', reason: 'Prestige Attachment officiel: 60 balles, meilleure reload et handling.' },
      { slot: 'Barrel', name: 'Long Barrel', benefit: 'range', reason: 'Etend la portee pratique sans transformer le SMG en arme lourde.' },
      { slot: 'Rear Grip', name: 'Quickdraw Grip', benefit: 'mobility', reason: 'Aide l ADS dans les duels courts.' },
      { slot: 'Stock', name: 'Agility Stock', benefit: 'mobility', reason: 'Garde un bon strafe pour casser les angles.' },
    ],
    why: 'Le choix le plus stable pour un profil agressif ou debutant: gros chargeur, bonne portee SMG, recul lisible.',
    watchout: 'La rotation du chargeur demande un petit temps d adaptation sur les longs sprays.',
  },
  {
    name: 'Dravec 45',
    slug: 'dravec-45',
    image: '/assets/weapons/wzstats/dravec-45.avif',
    category: 'SMG',
    availability: 'Meta Saison 04',
    seasonSource: 'Buff Saison 04: fire rate 638 a 652rpm et headshot multiplier 1.12x a 1.15x.',
    roles: ['aggressive', 'balanced'],
    modes: ['resurgence', 'ranked', 'squad'],
    ranges: ['close', 'sniper-support'],
    priorities: ['ttk', 'mobility'],
    inputFit: ['controller', 'mnk'],
    metaFits: ['full-meta', 'fun'],
    recoilFit: ['strong', 'medium'],
    skillFloor: 3,
    stats: { damage: 84, range: 56, mobility: 90, control: 58, ease: 71 },
    attachments: [
      { slot: 'Muzzle', name: 'Bowen .45 Suppressor', benefit: 'range', reason: 'Garde la portee et la discretion en close/ranked.' },
      { slot: 'Barrel', name: '19" EAM Horizon Barrel', benefit: 'range', reason: 'Build Absolute Meta close range pour rallonger la premiere plage.' },
      { slot: 'Magazine', name: 'Gator Extended Mag', benefit: 'magazine', reason: '48 balles pour enchainer les duels.' },
      { slot: 'Laser', name: 'MFS Agile Laser Pro', benefit: 'mobility', reason: 'ADS et sprint-to-fire pour entry rapide.' },
      { slot: 'Fire Mods', name: 'Bolt Carrier Group', benefit: 'ttk', reason: 'Acces au profil TTK le plus agressif de l arme.' },
    ],
    why: 'Le SMG le plus violent si tu acceptes son recoil: TTK close tres bas et handling rapide.',
    watchout: 'Le recoil monte fort. Si tu veux confort, Carbon 57 ou CBRS-3 sera plus propre.',
  },
  {
    name: 'Carbon 57',
    slug: 'carbon-57',
    image: '/assets/weapons/wzstats/carbon-57.avif',
    category: 'SMG',
    availability: 'Meta Saison 04',
    seasonSource: 'Saison 04: cite comme top SMG close range par les classements meta actualises.',
    roles: ['aggressive', 'beginner', 'balanced'],
    modes: ['resurgence', 'ranked', 'squad'],
    ranges: ['close', 'sniper-support'],
    priorities: ['easy', 'mobility', 'ttk'],
    inputFit: ['controller', 'mnk'],
    metaFits: ['full-meta', 'easy-meta'],
    recoilFit: ['medium', 'low'],
    skillFloor: 2,
    stats: { damage: 80, range: 60, mobility: 94, control: 82, ease: 88 },
    attachments: [
      { slot: 'Muzzle', name: 'Kuhn Ported Comp', benefit: 'mobility', reason: 'Mobilite et controle close range.' },
      { slot: 'Barrel', name: '14" Rockleigh Barrel', benefit: 'range', reason: 'Ameliore la consistance de TTK.' },
      { slot: 'Underbarrel', name: 'Sapper Guard Handstop', benefit: 'recoil', reason: 'Recoil plus stable sans tuer la vitesse.' },
      { slot: 'Magazine', name: 'MFS Renown Plus Mag', benefit: 'magazine', reason: '50 balles, bonne marge en squad.' },
      { slot: 'Fire Mods', name: 'Accelerated Recoil System', benefit: 'ttk', reason: 'Garde la pression de DPS en close.' },
    ],
    why: 'Le meilleur compromis close range: TTK proche du top, recoil plus propre et EaseScore eleve.',
    watchout: 'Moins dominant au-dela du mid range: ne le joue pas comme AR.',
  },
  {
    name: 'Kogot-7',
    slug: 'kogot-7',
    image: '/assets/weapons/wzstats/kogot-7.avif',
    category: 'SMG',
    availability: 'Meta Saison 04',
    seasonSource: 'SMG meta close range avec ADS 170ms, sprint-to-fire 110ms et TTK 558ms jusqu a 10m.',
    roles: ['aggressive', 'balanced', 'beginner'],
    modes: ['resurgence', 'ranked', 'squad'],
    ranges: ['close', 'sniper-support'],
    priorities: ['ttk', 'mobility', 'easy'],
    inputFit: ['controller', 'mnk'],
    metaFits: ['full-meta', 'easy-meta'],
    recoilFit: ['medium', 'low'],
    skillFloor: 2,
    stats: { damage: 82, range: 61, mobility: 93, control: 80, ease: 84 },
    attachments: [
      { slot: 'Muzzle', name: 'Hawker Ported Comp', benefit: 'recoil', reason: 'Build CODMunity close range pour reduire le kick et garder le tracking.' },
      { slot: 'Barrel', name: '13.5" Canis-05 Barrel', benefit: 'range', reason: 'Aide la portee utile sans casser le profil mobile.' },
      { slot: 'Underbarrel', name: 'EAM Steady-90 Grip', benefit: 'recoil', reason: 'Controle horizontal et stabilite pour manette.' },
      { slot: 'Magazine', name: 'Vex Expanse Mag', benefit: 'magazine', reason: 'Chargeur plus confortable pour enchainement de fights.' },
      { slot: 'Fire Mods', name: 'Buffer Spring', benefit: 'recoil', reason: 'Stabilise le recoil pour tenir le TTK sur cible mobile.' },
    ],
    why: 'Excellent SMG meta pour joueur agressif qui veut du TTK sans perdre trop de confort.',
    watchout: 'Moins fort qu un AR quand la fight passe vraiment au mid/long range.',
  },
  {
    name: 'VX Compact',
    slug: 'vx-compact',
    image: '/assets/weapons/wzstats/vx-compact.png',
    category: 'Assault Rifle',
    availability: 'Saison 04 - Event Reward',
    seasonSource: 'AR de Saison 04 avec cadence tres elevee et accessoire Prestige MFS Impetus Fast Mag.',
    roles: ['aggressive', 'balanced', 'sniper'],
    modes: ['resurgence', 'ranked', 'squad'],
    ranges: ['close', 'mid', 'sniper-support'],
    priorities: ['mobility', 'ttk'],
    inputFit: ['controller', 'mnk'],
    metaFits: ['full-meta', 'fun'],
    recoilFit: ['strong', 'medium'],
    skillFloor: 3,
    stats: { damage: 76, range: 64, mobility: 86, control: 78, ease: 74 },
    attachments: [
      { slot: 'Magazine', name: 'MFS Impetus Fast Mag', benefit: 'magazine', reason: 'Prestige Attachment officiel: reload tres rapide, deviation et recoil stabilises.' },
      { slot: 'Muzzle', name: 'LTI Stentorian Brake', benefit: 'recoil', reason: 'Compense le recoil horizontal d une AR mobile.' },
      { slot: 'Barrel', name: 'Reinforced Barrel', benefit: 'range', reason: 'Allonge la portee pour sniper support.' },
      { slot: 'Rear Grip', name: 'Commando Grip', benefit: 'mobility', reason: 'Renforce le sprint-to-fire et les transitions rapides.' },
      { slot: 'Stock', name: 'Light Stock', benefit: 'mobility', reason: 'Garde le profil mobile pour accompagner un sniper.' },
    ],
    why: 'Une AR mobile de support sniper: plus de portee qu un SMG, handling rapide, bon feeling agressif.',
    watchout: 'Le chargeur demande de la discipline: si tu veux squad wipe facile, CBRS-3 reste plus permissive.',
  },
  {
    name: 'VST',
    slug: 'vst',
    image: '/assets/weapons/wzstats/vst.avif',
    category: 'SMG',
    availability: 'Contender Saison 04',
    seasonSource: 'Buff Saison 04: range amelioree, recoil vertical -8% et horizontal -12%.',
    roles: ['aggressive', 'balanced'],
    modes: ['resurgence', 'ranked'],
    ranges: ['close', 'sniper-support'],
    priorities: ['ttk', 'mobility'],
    inputFit: ['controller', 'mnk'],
    metaFits: ['off-meta', 'fun'],
    recoilFit: ['strong', 'medium'],
    skillFloor: 3,
    stats: { damage: 84, range: 64, mobility: 91, control: 64, ease: 58 },
    attachments: [
      { slot: 'Muzzle', name: 'Hawker Series 45', benefit: 'recoil', reason: 'Compense le recoil pour rendre le SMG plus stable.' },
      { slot: 'Barrel', name: '14" LTI Expedition Barrel', benefit: 'range', reason: 'Profite du buff Saison 04 sur les ranges.' },
      { slot: 'Underbarrel', name: 'VAS Convergence Foregrip', benefit: 'recoil', reason: 'Aide les longs sprays close/mid.' },
      { slot: 'Magazine', name: 'Avarice Extended Mag II', benefit: 'magazine', reason: 'Plus de marge pour les fights squad.' },
      { slot: 'Stock', name: 'Hawker Cub-55 Pad', benefit: 'mobility', reason: 'Conserve le strafe et la reactivite.' },
    ],
    why: 'Option off-meta rapide: tres bon TTK close, mais demande plus de controle que Kogot ou Carbon.',
    watchout: 'EaseScore plus bas: si tu veux simple, prends Kogot-7 ou Carbon 57.',
  },
  {
    name: 'KRS-7.62',
    category: 'Marksman Rifle',
    availability: 'Saison 04 - Battle Pass',
    seasonSource: 'Arme de lancement Saison 04, fusil semi-auto a gros degats.',
    roles: ['anchor', 'sniper', 'balanced'],
    modes: ['battle-royale', 'ranked', 'squad'],
    ranges: ['mid', 'long'],
    priorities: ['ttk', 'recoil'],
    inputFit: ['mnk', 'controller'],
    metaFits: ['full-meta', 'off-meta'],
    recoilFit: ['strong', 'medium'],
    skillFloor: 4,
    stats: { damage: 92, range: 86, mobility: 70, control: 70, ease: 54 },
    attachments: [
      { slot: 'Barrel', name: '15" MFS Incursion Barrel', benefit: 'range', reason: 'Prestige Attachment officiel: penetration, velocite et stabilisation visuelle.' },
      { slot: 'Muzzle', name: 'Suppressor', benefit: 'range', reason: 'La Saison 04 buff le Suppressor sur les armes principales.' },
      { slot: 'Optic', name: 'Greaves Accuspot 3x', benefit: 'recoil', reason: 'Lecture propre pour double-tap a moyenne et longue distance.' },
      { slot: 'Underbarrel', name: 'Bruen Heavy Support Grip', benefit: 'recoil', reason: 'Calme le premier recul, point faible de l arme.' },
      { slot: 'Magazine', name: 'Extended Mag', benefit: 'magazine', reason: 'Plus de marge pour finir un down ou enchainer un deuxieme joueur.' },
    ],
    why: 'Parfait pour un joueur qui tient les lignes et veut punir les repeeks avec deux ou trois balles bien placees.',
    watchout: 'Ce n est pas une arme de panique: si tu rates le rythme semi-auto, un AR full-auto te pardonnera moins.',
  },
  {
    name: 'REV-46',
    slug: 'rev-46',
    image: '/assets/weapons/wzstats/rev-46.avif',
    category: 'SMG',
    availability: 'Arsenal actif Saison 04',
    seasonSource: 'Buff Saison 04 sur portees, ADS et multiplicateurs bas du corps.',
    roles: ['aggressive', 'balanced'],
    modes: ['resurgence', 'ranked'],
    ranges: ['close', 'sniper-support'],
    priorities: ['ttk', 'mobility'],
    inputFit: ['controller', 'mnk'],
    metaFits: ['full-meta', 'fun'],
    recoilFit: ['strong', 'medium'],
    skillFloor: 2,
    stats: { damage: 74, range: 58, mobility: 92, control: 76, ease: 76 },
    attachments: [
      { slot: 'Muzzle', name: 'Suppressor', benefit: 'range', reason: 'Bonus Saison 04 sur portee de degats SMG.' },
      { slot: 'Barrel', name: 'Short Light Barrel', benefit: 'mobility', reason: 'Priorise ADS et vitesse de push.' },
      { slot: 'Underbarrel', name: 'Vas Convergence Foregrip', benefit: 'recoil', reason: 'Stabilise le spray en tracking manette.' },
      { slot: 'Rear Grip', name: 'Quickdraw Grip', benefit: 'mobility', reason: 'Capitalise sur le buff ADS.' },
      { slot: 'Magazine', name: 'Extended Mag', benefit: 'magazine', reason: 'Indispensable pour nettoyer une piece en squad.' },
    ],
    why: 'Tres bonne arme de duel apres les buffs: rapide, simple, et plus fiable sur les tirs bas du corps.',
    watchout: 'A moyenne distance, passe sur ton AR au lieu de t obstiner.',
  },
  {
    name: 'M10 Breacher',
    slug: 'm10-breacher',
    image: '/assets/weapons/wzstats/m10-breacher.avif',
    category: 'Shotgun',
    availability: 'Arsenal actif Saison 04',
    seasonSource: 'Buff Saison 04 et Argus Lever annonce en Weekly Challenge.',
    roles: ['aggressive'],
    modes: ['resurgence'],
    ranges: ['close'],
    priorities: ['ttk', 'mobility'],
    inputFit: ['controller'],
    metaFits: ['fun', 'off-meta'],
    recoilFit: ['medium', 'low'],
    skillFloor: 3,
    stats: { damage: 86, range: 36, mobility: 82, control: 62, ease: 58 },
    attachments: [
      { slot: 'Stock', name: 'M10 Breacher Argus Lever', benefit: 'ttk', reason: 'Conversion Saison 04: fire rate plus rapide et spread ADS plus precis.' },
      { slot: 'Muzzle', name: 'Breacher Choke', benefit: 'range', reason: 'Resserre la dispersion dans les couloirs.' },
      { slot: 'Barrel', name: 'Short Barrel', benefit: 'mobility', reason: 'Preserve la vitesse de deplacement.' },
      { slot: 'Laser', name: 'Target Line Pro', benefit: 'mobility', reason: 'Aide la transition hipfire/ADS.' },
      { slot: 'Rear Grip', name: 'Quickdraw Grip', benefit: 'mobility', reason: 'Plus rapide quand tu dois finir un joueur plaque.' },
    ],
    why: 'Option niche mais violente pour joueur ultra-agressif sur Fortune Keep/Rebirth.',
    watchout: 'Tres mauvais si la fight sort de la piece. Il faut une primaire longue distance avec.',
  },
  {
    name: 'DS20 Mirage',
    slug: 'ds20-mirage',
    image: '/assets/weapons/wzstats/ds20-mirage.avif',
    category: 'Assault Rifle',
    availability: 'Arsenal actif Saison 04',
    seasonSource: 'Buff de recoil vertical en Saison 04 et kit Dual Fire annonce.',
    roles: ['balanced', 'anchor', 'beginner'],
    modes: ['battle-royale', 'ranked', 'resurgence', 'squad'],
    ranges: ['mid', 'long', 'versatile'],
    priorities: ['recoil', 'easy', 'magazine'],
    inputFit: ['controller', 'mnk'],
    metaFits: ['easy-meta', 'full-meta'],
    recoilFit: ['medium', 'low'],
    skillFloor: 2,
    stats: { damage: 80, range: 82, mobility: 68, control: 86, ease: 90 },
    attachments: [
      { slot: 'Optic', name: 'FANG HoverPoint ELO', benefit: 'recoil', reason: 'Viseur clair deja utilise dans les builds meta du site.' },
      { slot: 'Muzzle', name: 'Suppressor', benefit: 'range', reason: 'Buff Saison 04: bonus de portee de degats.' },
      { slot: 'Barrel', name: '17.1" Abdicator Barrel', benefit: 'range', reason: 'Renforce portee et stabilite pour les lanes.' },
      { slot: 'Magazine', name: 'Griffon Reserve Extended 2', benefit: 'magazine', reason: 'Chargeur confortable pour trios/quads.' },
      { slot: 'Stock', name: 'Weighted Stock', benefit: 'recoil', reason: 'Transforme l AR en beam stable.' },
    ],
    why: 'Le meilleur profil confort: facile a controler, stable en ranked et tres bon pour manette.',
    watchout: 'Moins explosif qu un SMG si tu forces les escaliers et pieces courtes.',
  },
  {
    name: 'Voyak KT-3',
    slug: 'voyak-kt-3',
    image: '/assets/weapons/wzstats/voyak-kt-3.avif',
    category: 'Assault Rifle',
    availability: 'Arsenal actif Saison 04',
    seasonSource: '17.6" LTI Grav-4 Barrel buff en velocite Saison 04.',
    roles: ['anchor', 'balanced'],
    modes: ['battle-royale', 'ranked', 'squad'],
    ranges: ['long', 'versatile'],
    priorities: ['recoil', 'magazine'],
    inputFit: ['mnk', 'controller'],
    metaFits: ['full-meta', 'easy-meta'],
    recoilFit: ['medium', 'low'],
    skillFloor: 3,
    stats: { damage: 88, range: 94, mobility: 58, control: 82, ease: 78 },
    attachments: [
      { slot: 'Muzzle', name: 'Suppressor', benefit: 'range', reason: 'Alternative plus interessante depuis le buff de portee Saison 04.' },
      { slot: 'Barrel', name: '17.6" LTI Grav-4 Barrel', benefit: 'range', reason: 'Buff officiel de velocite de balle en BR/Resurgence.' },
      { slot: 'Optic', name: 'FANG HoverPoint ELO', benefit: 'recoil', reason: 'Garde une image stable sans trop de zoom.' },
      { slot: 'Stock', name: 'V-Last Control Pad', benefit: 'recoil', reason: 'Controle pour tenir les longues lignes.' },
      { slot: 'Magazine', name: 'SK-Garrison Drum', benefit: 'magazine', reason: 'Capacite pour casser plusieurs plaques sans reload.' },
    ],
    why: 'Pour le joueur anchor qui veut tenir 60m+ et ouvrir les fights avant la rotation.',
    watchout: 'Handling plus lourd: evite de l utiliser comme sniper support close.',
  },
  {
    name: 'AK-27',
    slug: 'ak-27',
    image: '/assets/weapons/wzstats/ak-27.avif',
    category: 'Assault Rifle',
    availability: 'Arsenal actif Saison 04',
    seasonSource: 'Buff Saison 04 sur shake/recoil et Flip Mags.',
    roles: ['anchor', 'balanced'],
    modes: ['battle-royale', 'ranked', 'squad'],
    ranges: ['mid', 'long'],
    priorities: ['ttk'],
    inputFit: ['mnk'],
    metaFits: ['off-meta', 'fun'],
    recoilFit: ['strong'],
    skillFloor: 4,
    stats: { damage: 90, range: 82, mobility: 54, control: 66, ease: 50 },
    attachments: [
      { slot: 'Muzzle', name: 'LTI Stentorian Brake', benefit: 'recoil', reason: 'Combat le recoil horizontal sans perdre la pression de tir.' },
      { slot: 'Ammunition', name: '7.62 Soviet FMJ', benefit: 'range', reason: 'Buff Saison 04 sur velocite de balle en BR/Resurgence.' },
      { slot: 'Optic', name: 'Greaves Accuspot 3x', benefit: 'recoil', reason: 'Meilleure lecture pour une arme a gros degats.' },
      { slot: 'Underbarrel', name: 'Bruen Heavy Support Grip', benefit: 'recoil', reason: 'Reduit le cote nerveux du recul.' },
      { slot: 'Magazine', name: 'Flip Mags', benefit: 'magazine', reason: 'Capacite et reload ameliores en Saison 04.' },
    ],
    why: 'Un choix fort si tu controles bien le recul et veux gagner au degat par balle.',
    watchout: 'Moins conseille pour debutant ou joueur manette sensible au recoil lateral.',
  },
];

const QUESTION_COPY = [
  {
    key: 'style',
    title: 'Tu joues principalement comment ?',
    eyebrow: 'Question 01',
    options: [
      { value: 'aggressive', label: 'Agressif', body: 'Tu push, tu entry, tu veux gagner les pieces.' },
      { value: 'balanced', label: 'Polyvalent', body: 'Tu veux une arme qui reste fiable partout.' },
      { value: 'anchor', label: 'Support', body: 'Tu tiens les lignes et tu ouvres les fights.' },
      { value: 'sniper', label: 'Sniper support', body: 'Tu joues autour d une arme longue distance.' },
      { value: 'beginner', label: 'Confort', body: 'Tu veux simple, stable et facile a apprendre.' },
    ],
  },
  {
    key: 'input',
    title: 'Tu joues sur quoi ?',
    eyebrow: 'Question 02',
    options: [
      { value: 'controller', label: 'Manette', body: 'Priorite tracking, recoil lisible et confort.' },
      { value: 'mnk', label: 'Clavier souris', body: 'Priorite precision, controle manuel et snap.' },
    ],
  },
  {
    key: 'mode',
    title: 'Quel mode tu joues le plus ?',
    eyebrow: 'Question 03',
    options: [
      { value: 'resurgence', label: 'Resurgence', body: 'Fights rapides, beaucoup de close range.' },
      { value: 'battle-royale', label: 'Battle Royale', body: 'Rotations, longues lignes et endurance.' },
      { value: 'ranked', label: 'Ranked', body: 'Meta fiable, stable, peu de risque.' },
      { value: 'squad', label: 'Trio / Squad', body: 'Chargeur, controle et enchainement de fights.' },
    ],
  },
  {
    key: 'range',
    title: 'Tu cherches une arme pour quelle distance ?',
    eyebrow: 'Question 04',
    options: [
      { value: 'close', label: 'Tres proche', body: 'Batiments, escaliers, couloirs.' },
      { value: 'mid', label: 'Moyenne distance', body: '15 a 55 metres, la zone la plus frequente.' },
      { value: 'long', label: 'Longue distance', body: 'Lanes, rooftops, rotations ouvertes.' },
      { value: 'sniper-support', label: 'Sniper support', body: 'Une arme rapide pour proteger ton sniper.' },
      { value: 'versatile', label: 'Polyvalente', body: 'Une seule arme principale tres complete.' },
    ],
  },
  {
    key: 'priority',
    title: 'Qu est-ce qui est le plus important ?',
    eyebrow: 'Question 05',
    options: [
      { value: 'ttk', label: 'TTK', body: 'Tuer le plus vite possible.' },
      { value: 'recoil', label: 'Peu de recoil', body: 'Rester sur la cible sans forcer.' },
      { value: 'mobility', label: 'Mobilite', body: 'ADS, strafe, sprint-to-fire.' },
      { value: 'magazine', label: 'Chargeur', body: 'Plus de balles pour squad wipes.' },
      { value: 'easy', label: 'Facile', body: 'Une classe simple a maitriser.' },
    ],
  },
  {
    key: 'weaponPreference',
    title: 'Tu preferes quel type d arme ?',
    eyebrow: 'Question 06',
    options: [
      { value: 'auto', label: 'Peu importe', body: 'L IA choisit le meilleur match.' },
      { value: 'Assault Rifle', label: 'AR', body: 'Rifle principal ou sniper support.' },
      { value: 'SMG', label: 'SMG', body: 'Close range et movement.' },
      { value: 'LMG', label: 'LMG', body: 'Gros chargeur et long range.' },
      { value: 'Marksman Rifle', label: 'Marksman', body: 'Precision, gros degats, high skill.' },
      { value: 'Shotgun', label: 'Shotgun', body: 'Niche close range tres agressive.' },
    ],
  },
  {
    key: 'recoilLevel',
    title: 'Ton niveau avec le recoil ?',
    eyebrow: 'Question 07',
    options: [
      { value: 'strong', label: 'Je controle bien', body: 'Tu acceptes une arme plus exigeante.' },
      { value: 'medium', label: 'Moyen', body: 'Tu veux un bon equilibre puissance/confort.' },
      { value: 'low', label: 'Le moins possible', body: 'Priorite beam et stabilite.' },
    ],
  },
  {
    key: 'metaIntent',
    title: 'Tu veux une classe plutot meta ou confort ?',
    eyebrow: 'Question 08',
    options: [
      { value: 'full-meta', label: 'Full meta', body: 'Le plus fort selon la Saison 04.' },
      { value: 'easy-meta', label: 'Meta facile', body: 'Fort, mais sans se battre avec l arme.' },
      { value: 'off-meta', label: 'Off-meta viable', body: 'Moins commun, mais coherent.' },
      { value: 'fun', label: 'Fun jouable', body: 'Style marque, toujours utilisable.' },
    ],
  },
] as const;

const BENEFIT_LABELS: Record<Attachment['benefit'], string> = {
  ttk: 'TTK',
  recoil: 'Recoil',
  mobility: 'Mobilite',
  magazine: 'Chargeur',
  easy: 'Confort',
  range: 'Portee',
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function higherIsBetter(value: number, min: number, max: number) {
  return clamp(((value - min) / (max - min)) * 100);
}

function lowerIsBetter(value: number, min: number, max: number) {
  return clamp(((max - value) / (max - min)) * 100);
}

function engagementBand(range: Range): EngagementBand {
  if (range === 'close' || range === 'sniper-support') return 'close';
  if (range === 'long') return 'long';
  return 'mid';
}

function metaFor(weapon: AiWeapon) {
  const meta = WEAPON_META[weapon.name];
  if (!meta) {
    throw new Error(`Missing Season 04 meta data for ${weapon.name}`);
  }
  return meta;
}

function recoilIndex(meta: MetaMetrics) {
  return meta.recoil.gunKick * 0.3 + meta.recoil.horizontal * 1.15 + meta.recoil.vertical * 0.55;
}

function scoreWeapon(weapon: AiWeapon, answers: Answers) {
  const meta = metaFor(weapon);
  const band = engagementBand(answers.range);
  const ttk = meta.ttkMs[band] ?? meta.ttkMs.mid ?? meta.ttkMs.close ?? 800;
  const ttkScore = lowerIsBetter(ttk, band === 'close' ? 520 : 590, band === 'long' ? 980 : 900);
  const recoilScore = lowerIsBetter(recoilIndex(meta), 20, 92);
  const mobilityScore = (lowerIsBetter(meta.adsMs, 130, 430) * 0.58) + (lowerIsBetter(meta.sprintToFireMs, 90, 300) * 0.42);
  const magScore = higherIsBetter(meta.magSize, 8, 60);
  const rangeScore = (higherIsBetter(meta.bulletVelocity, 360, 1200) * 0.55) + (meta.rangeScore * 0.45);
  const easeScore = meta.easeScore * 10;
  const metaScore = lowerIsBetter(meta.metaRank, 1, 10);

  let score = 18;
  score += ttkScore * 0.24;
  score += recoilScore * 0.15;
  score += mobilityScore * 0.13;
  score += magScore * 0.08;
  score += rangeScore * 0.12;
  score += easeScore * 0.1;
  score += metaScore * 0.12;

  if (weapon.roles.includes(answers.style)) score += 7;
  if (weapon.inputFit.includes(answers.input)) score += 4;
  if (weapon.modes.includes(answers.mode)) score += 5;
  if (weapon.ranges.includes(answers.range)) score += 8;
  if (weapon.priorities.includes(answers.priority)) score += 6;
  if (weapon.recoilFit.includes(answers.recoilLevel)) score += 5;

  if (answers.priority === 'ttk') score += ttkScore * 0.12;
  if (answers.priority === 'recoil') score += recoilScore * 0.14;
  if (answers.priority === 'mobility') score += mobilityScore * 0.14;
  if (answers.priority === 'magazine') score += magScore * 0.12;
  if (answers.priority === 'easy') score += easeScore * 0.2 + recoilScore * 0.08;

  if (answers.mode === 'squad') score += magScore * 0.05;
  if (answers.mode === 'ranked') score += (metaScore + recoilScore + easeScore) * 0.035;
  if (answers.style === 'beginner') score += Math.max(0, 20 - weapon.skillFloor * 4) + easeScore * 0.12 + recoilScore * 0.08;
  if (answers.input === 'controller') score += recoilScore * 0.04;
  if (answers.input === 'mnk') score += ttkScore * 0.035;

  if (answers.weaponPreference !== 'auto' && weapon.category === answers.weaponPreference) score += 35;
  if (answers.weaponPreference !== 'auto' && weapon.category !== answers.weaponPreference) score -= 80;

  if (answers.metaIntent === 'full-meta') score += metaScore * 0.1;
  if (answers.metaIntent === 'easy-meta') score += (easeScore + recoilScore) * 0.11;
  if (answers.metaIntent === 'off-meta') score += meta.tier === 'contender' || meta.tier === 'viable' ? 10 : -4;
  if (answers.metaIntent === 'fun') score += meta.tier === 'niche' || weapon.priorities.includes('mobility') ? 8 : 0;
  if (answers.priority === 'ttk' && band === 'close' && meta.tier === 'absolute-meta') score += 16;
  if (answers.style === 'aggressive' && band === 'close' && meta.adsMs <= 190) score += 8;
  if ((answers.style === 'beginner' || answers.priority === 'easy') && meta.easeScore < 7) score -= 10;
  if (answers.style === 'beginner' && !weapon.roles.includes('beginner')) score -= 60;
  if (answers.priority === 'easy' && !weapon.priorities.includes('easy')) score -= 34;
  if (answers.metaIntent === 'easy-meta' && !weapon.metaFits.includes('easy-meta')) score -= 34;

  return Math.round(Math.max(0, score));
}

function displayScore(score: number) {
  return Math.round(clamp(score, 0, 99));
}

function attachmentStrategy(answers: Answers): AttachmentStrategy {
  if (answers.priority === 'recoil' || answers.recoilLevel === 'low') return 'recoil';
  if (answers.priority === 'mobility' || (answers.style === 'aggressive' && engagementBand(answers.range) === 'close')) return 'mobility';
  if (answers.priority === 'ttk') return 'ttk';
  if (answers.priority === 'magazine' || answers.mode === 'squad') return 'magazine';
  if (answers.priority === 'easy' || answers.style === 'beginner' || answers.metaIntent === 'easy-meta') return 'easy';
  if (answers.range === 'long' || answers.range === 'versatile') return 'range';
  return 'pro';
}

function attachmentProfileFor(weapon: AiWeapon, answers: Answers): AttachmentProfile {
  const profiles = ATTACHMENT_PROFILES[weapon.name];
  const strategy = attachmentStrategy(answers);
  const selected = profiles?.[strategy] ?? profiles?.pro ?? profiles?.easy ?? profiles?.mobility ?? profiles?.recoil;
  if (selected) return selected;
  return {
    label: 'Build meta polyvalent',
    source: 'Fallback: build meta actuel de l arme, utilise quand aucune variante pro specifique ne surpasse le preset principal.',
    attachments: weapon.attachments,
  };
}

function slotKey(slot: string) {
  return slot.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function slotLabel(slot: string) {
  const labels: Record<string, string> = {
    ammunition: 'Munition',
    barrel: 'Barrel',
    firemode: 'Fire Mods',
    laser: 'Laser',
    magazine: 'Magazine',
    muzzle: 'Muzzle',
    optic: 'Optic',
    reargrip: 'Rear Grip',
    stock: 'Stock',
    underbarrel: 'Underbarrel',
  };
  return labels[slot] ?? slot;
}

function attachmentBenefitForAsset(slot: string, index: number): Attachment['benefit'] {
  if (slot === 'barrel') return index % 2 === 0 ? 'range' : 'mobility';
  if (slot === 'muzzle') return index % 2 === 0 ? 'recoil' : 'range';
  if (slot === 'magazine') return 'magazine';
  if (slot === 'stock' || slot === 'reargrip' || slot === 'underbarrel') return index % 2 === 0 ? 'recoil' : 'mobility';
  if (slot === 'laser') return 'mobility';
  if (slot === 'optic') return 'recoil';
  return 'easy';
}

function assetAttachment(weapon: AiWeapon, slot: string, image: string, index: number): Attachment {
  const label = slotLabel(slot);
  return {
    slot: label,
    name: `${weapon.name} ${label} ${String(index + 1).padStart(2, '0')}`,
    benefit: attachmentBenefitForAsset(slot, index),
    reason: `Accessoire compatible ${weapon.name}, extrait du dossier local ${label}.`,
    image,
  };
}

function compatibleAttachmentOptions(weapon: AiWeapon) {
  const options = new Map<string, Attachment[]>();
  const add = (attachment: Attachment) => {
    const key = slotKey(attachment.slot);
    const current = options.get(key) ?? [];
    if (!current.some((item) => item.name === attachment.name)) {
      current.push(attachment);
      options.set(key, current);
    }
  };

  weapon.attachments.forEach(add);
  Object.values(ATTACHMENT_PROFILES[weapon.name] ?? {}).forEach((profile) => {
    profile?.attachments.forEach(add);
  });
  const assetOptions = WEAPON_ATTACHMENT_ASSET_OPTIONS[weapon.slug ?? slugify(weapon.name)] ?? {};
  Object.entries(assetOptions).forEach(([slot, images]) => {
    images?.forEach((image, index) => add(assetAttachment(weapon, slot, image, index)));
  });

  return options;
}

function attachmentDelta(attachment: Attachment) {
  const delta = { damage: 0, range: 0, velocity: 0, recoil: 0, mobility: 0, magazine: 0 };
  const name = attachment.name.toLowerCase();
  const slot = attachment.slot.toLowerCase();

  if (attachment.benefit === 'ttk') delta.damage += 7;
  if (attachment.benefit === 'range') {
    delta.range += 8;
    delta.velocity += 7;
  }
  if (attachment.benefit === 'recoil') recoilBoost(delta, 9);
  if (attachment.benefit === 'mobility') delta.mobility += 8;
  if (attachment.benefit === 'magazine') delta.magazine += 12;
  if (attachment.benefit === 'easy') recoilBoost(delta, 5);

  if (slot.includes('muzzle')) {
    if (name.includes('brake') || name.includes('comp') || name.includes('ported') || name.includes('hawker')) recoilBoost(delta, 8);
    if (name.includes('suppressor')) {
      delta.range += 5;
      delta.velocity += 5;
      delta.mobility -= 3;
    }
  }
  if (slot.includes('barrel')) {
    delta.range += 7;
    delta.velocity += 7;
    if (name.includes('short') || name.includes('8.5') || name.includes('cloud')) delta.mobility += 8;
    else delta.mobility -= 4;
  }
  if (slot.includes('underbarrel')) {
    recoilBoost(delta, 10);
    delta.mobility -= 2;
  }
  if (slot.includes('stock')) {
    if (name.includes('light') || name.includes('orbiter') || name.includes('cub') || name.includes('stern')) delta.mobility += 9;
    else recoilBoost(delta, 9);
  }
  if (slot.includes('rear grip') || slot.includes('grip')) delta.mobility += 6;
  if (slot.includes('laser')) delta.mobility += 10;
  if (slot.includes('magazine')) {
    delta.magazine += name.includes('fast') ? 8 : 14;
    delta.mobility -= name.includes('drum') ? 7 : 3;
  }
  if (slot.includes('ammunition')) {
    delta.velocity += 9;
    delta.range += 4;
  }
  if (slot.includes('fire')) {
    delta.damage += 4;
    recoilBoost(delta, 4);
  }
  if (slot.includes('optic')) delta.recoil += 3;

  return delta;
}

function recoilBoost(delta: { recoil: number }, amount: number) {
  delta.recoil += amount;
}

function statPreview(weapon: AiWeapon, meta: MetaMetrics, attachments: Attachment[]): StatPreview[] {
  const base = {
    damage: weapon.stats.damage,
    range: weapon.stats.range,
    velocity: higherIsBetter(meta.bulletVelocity, 360, 1200),
    recoil: lowerIsBetter(recoilIndex(meta), 20, 92),
    mobility: (lowerIsBetter(meta.adsMs, 130, 430) * 0.58) + (lowerIsBetter(meta.sprintToFireMs, 90, 300) * 0.42),
    magazine: higherIsBetter(meta.magSize, 8, 60),
  };
  const sum = attachments.reduce(
    (acc, attachment) => {
      const delta = attachmentDelta(attachment);
      return {
        damage: acc.damage + delta.damage,
        range: acc.range + delta.range,
        velocity: acc.velocity + delta.velocity,
        recoil: acc.recoil + delta.recoil,
        mobility: acc.mobility + delta.mobility,
        magazine: acc.magazine + delta.magazine,
      };
    },
    { damage: 0, range: 0, velocity: 0, recoil: 0, mobility: 0, magazine: 0 },
  );

  return [
    { label: 'Degats', value: clamp(base.damage + sum.damage), delta: sum.damage },
    { label: 'Portee', value: clamp(base.range + sum.range), delta: sum.range },
    { label: 'Vitesse balle', value: clamp(base.velocity + sum.velocity), delta: sum.velocity },
    { label: 'Recul', value: clamp(base.recoil + sum.recoil), delta: sum.recoil },
    { label: 'Mobilite', value: clamp(base.mobility + sum.mobility), delta: sum.mobility },
    { label: 'Chargeur', value: clamp(base.magazine + sum.magazine), delta: sum.magazine },
  ];
}

function imageSrc(weapon: AiWeapon) {
  const src = WEAPON_IMAGE_BANK[weapon.name] ?? weapon.image;
  if (!src) {
    throw new Error(`Missing wzstats image for ${weapon.name}`);
  }
  return src;
}

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function attachmentImage(attachment: Attachment, weaponName?: string) {
  if (attachment.image) return attachment.image;

  // Try weapon-specific screenshot first
  if (weaponName) {
    const key = `${slugify(weaponName)}_${attachment.slot.toLowerCase().replace(/\s+/g, '')}`;
    const override = WEAPON_ATTACHMENT_OVERRIDES[key];
    if (override) return override;
  }

  // Try exact name match
  const exact = ATTACHMENT_IMAGE_BANK[attachment.name];
  if (exact) return exact;

  // Fall back by slot type
  const normalized = attachment.slot.toLowerCase();
  if (normalized.includes('rear grip')) return ATTACHMENT_SLOT_FALLBACKS.reargrip;
  if (normalized.includes('underbarrel')) return ATTACHMENT_SLOT_FALLBACKS.underbarrel;
  if (normalized.includes('ammunition')) return ATTACHMENT_SLOT_FALLBACKS.ammunition;
  if (normalized.includes('magazine')) return ATTACHMENT_SLOT_FALLBACKS.magazine;
  if (normalized.includes('muzzle')) return ATTACHMENT_SLOT_FALLBACKS.muzzle;
  if (normalized.includes('barrel')) return ATTACHMENT_SLOT_FALLBACKS.barrel;
  if (normalized.includes('optic')) return ATTACHMENT_SLOT_FALLBACKS.optic;
  if (normalized.includes('stock')) return ATTACHMENT_SLOT_FALLBACKS.stock;
  if (normalized.includes('laser')) return ATTACHMENT_SLOT_FALLBACKS.laser;
  if (normalized.includes('fire') || normalized.includes('mod')) return ATTACHMENT_SLOT_FALLBACKS.firemode;
  return ATTACHMENT_SLOT_FALLBACKS.barrel;
}

function updateAnswer<K extends keyof Answers>(answers: Answers, key: K, value: Answers[K]) {
  return { ...answers, [key]: value };
}

function messageId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function wantsClassAdvice(text: string, hasImage = false) {
  if (hasImage) return true;
  return /(classe|build|loadout|arme|accessoire|accessoires|conseille|conseil|recommande|meta|optimise|optimiser|setup|ttk|recul|viseur|canon|muzzle|chargeur|stock|crosse|sniper support)/i.test(text);
}

function wantsProgressAdvice(text: string) {
  return /(devenir pro|passer pro|etre pro|être pro|pro player|joueur pro|competitive|competitif|compétitif|tournoi|wsow|world series|faceit|challengers|scrim|progresser|ameliorer|améliorer|entrainement|entraînement|ranked|iridescent|top 250)/i.test(text);
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('image-read-failed'));
    reader.readAsDataURL(file);
  });
}

async function normalizeChatImage(file: File): Promise<ChatImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('not-image');
  }

  const originalDataUrl = await readFileAsDataUrl(file);
  if (file.size <= 1_800_000 || file.type === 'image/gif') {
    return {
      dataUrl: originalDataUrl,
      mimeType: file.type || 'image/png',
      name: file.name || 'image-warzone',
    };
  }

  const preview = document.createElement('img');
  preview.decoding = 'async';
  await new Promise<void>((resolve, reject) => {
    preview.onload = () => resolve();
    preview.onerror = () => reject(new Error('image-load-failed'));
    preview.src = originalDataUrl;
  });

  const maxEdge = 1440;
  const scale = Math.min(1, maxEdge / Math.max(preview.naturalWidth, preview.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(preview.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(preview.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) {
    return {
      dataUrl: originalDataUrl,
      mimeType: file.type || 'image/png',
      name: file.name || 'image-warzone',
    };
  }

  context.drawImage(preview, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
  return {
    dataUrl,
    mimeType: 'image/jpeg',
    name: file.name || 'image-warzone',
  };
}

function selectedOptionLabel(key: keyof Answers, value: string) {
  const question = QUESTION_COPY.find((item) => item.key === key);
  return question?.options.find((option) => option.value === value)?.label ?? value;
}

function profileSummary(answers: Answers) {
  return [
    selectedOptionLabel('style', answers.style),
    selectedOptionLabel('range', answers.range),
    selectedOptionLabel('priority', answers.priority),
    selectedOptionLabel('weaponPreference', answers.weaponPreference),
  ].join(' / ');
}

function coachResultMessage(recommendation: Recommendation, answers: Answers) {
  const weapon = recommendation.weapon;
  const profile = attachmentProfileFor(weapon, answers);
  return `Je partirais sur ${weapon.name}. C'est le meilleur match pour ton profil ${profileSummary(answers)}. Je te mets le build ${profile.label}, et tu peux changer chaque accessoire compatible dans la fiche visuelle.`;
}

function inferAnswersFromText(text: string, answers: Answers) {
  const lower = text.toLowerCase();
  let next = answers;
  let changed = false;
  const set = <K extends keyof Answers>(key: K, value: Answers[K]) => {
    if (next[key] !== value) {
      next = updateAnswer(next, key, value);
      changed = true;
    }
  };

  if (/(agress|rush|push|entry|rapide|close|corps)/.test(lower)) set('style', 'aggressive');
  if (/(debut|début|facile|simple|stable|noob)/.test(lower)) set('style', 'beginner');
  if (/(ancre|anchor|tenir|position|slow)/.test(lower)) set('style', 'anchor');
  if (/(snip|kar|hdr|longue ligne)/.test(lower)) set('style', 'sniper');
  if (/(manette|controller|pad)/.test(lower)) set('input', 'controller');
  if (/(clavier|souris|mnk|mouse)/.test(lower)) set('input', 'mnk');
  if (/(resurgence|résurgence|rebirth)/.test(lower)) set('mode', 'resurgence');
  if (/(ranked|class|classement)/.test(lower)) set('mode', 'ranked');
  if (/(battle royale|br|grande map)/.test(lower)) set('mode', 'battle-royale');
  if (/(squad|trio|quatuor|equipe|équipe)/.test(lower)) set('mode', 'squad');
  if (/(smg|mitraillette|sub)/.test(lower)) set('weaponPreference', 'SMG');
  if (/(ar|assaut|fusil)/.test(lower)) set('weaponPreference', 'Assault Rifle');
  if (/(shotgun|pompe)/.test(lower)) set('weaponPreference', 'Shotgun');
  if (/(lmg|mitrailleuse)/.test(lower)) set('weaponPreference', 'LMG');
  if (/(auto|n'importe|importe|conseille)/.test(lower)) set('weaponPreference', 'auto');
  if (/(close|proche|courte)/.test(lower)) set('range', 'close');
  if (/(mid|moyen|polyvalent)/.test(lower)) set('range', 'mid');
  if (/(long|loin|distance)/.test(lower)) set('range', 'long');
  if (/(sniper support|support sniper)/.test(lower)) set('range', 'sniper-support');
  if (/(ttk|tuer vite|degat|dégat|damage)/.test(lower)) set('priority', 'ttk');
  if (/(recul|stable|laser|controle|contrôle)/.test(lower)) set('priority', 'recoil');
  if (/(mobil|vitesse|movement|ads|sprint)/.test(lower)) set('priority', 'mobility');
  if (/(chargeur|balles|mag|reload)/.test(lower)) set('priority', 'magazine');
  if (/(full meta|meta absolue|meilleur)/.test(lower)) set('metaIntent', 'full-meta');
  if (/(off meta|original|different|différent)/.test(lower)) set('metaIntent', 'off-meta');

  return { answers: next, changed };
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="ai-class-stat">
      <span>{label}</span>
      <i style={{ width: `${value}%` }} />
      <b>{value}</b>
    </div>
  );
}

function WeaponVisual({ weapon }: { weapon: AiWeapon }) {
  const src = imageSrc(weapon);

  return (
    <div className={`ai-result-weapon-visual${LOW_RES_WEAPON_IMAGES.has(weapon.name) ? ' is-low-res-source' : ''}`}>
      <div className="ai-result-reticle" aria-hidden="true">
        <span />
      </div>
      <Image src={src} alt={weapon.name} width={1400} height={620} priority={false} sizes="(max-width: 768px) 92vw, 1100px" />
    </div>
  );
}

function ResultPanel({
  recommendation,
  alternatives,
  answers,
  onReset,
}: {
  recommendation: Recommendation;
  alternatives: Recommendation[];
  answers: Answers;
  onReset: () => void;
}) {
  const { weapon, score } = recommendation;
  const meta = metaFor(weapon);
  const band = engagementBand(answers.range);
  const selectedTtk = meta.ttkMs[band] ?? meta.ttkMs.mid ?? meta.ttkMs.close;
  const attachmentProfile = attachmentProfileFor(weapon, answers);
  const compatibleOptions = useMemo(() => compatibleAttachmentOptions(weapon), [weapon]);
  const profileKey = `${weapon.name}-${attachmentProfile.label}`;
  const [customBuild, setCustomBuild] = useState({ key: profileKey, attachments: attachmentProfile.attachments });
  const selectedAttachments = customBuild.key === profileKey ? customBuild.attachments : attachmentProfile.attachments;
  const statPreviewRows = statPreview(weapon, meta, selectedAttachments);

  function changeAttachment(index: number, nextName: string) {
    setCustomBuild((currentBuild) => {
      const current = currentBuild.key === profileKey ? currentBuild.attachments : attachmentProfile.attachments;
      const attachment = current[index];
      const options = compatibleOptions.get(slotKey(attachment.slot)) ?? [attachment];
      const next = options.find((item) => item.name === nextName) ?? attachment;
      return {
        key: profileKey,
        attachments: current.map((item, itemIndex) => (itemIndex === index ? next : item)),
      };
    });
  }

  return (
    <section className="ai-class-result ai-class-result-visual" aria-label="Classe recommandee">
      <header className="ai-result-header">
        <div>
          <span>IA recommandation principale</span>
          <h2>{weapon.name}</h2>
          <p>{weapon.category} / {weapon.availability}</p>
        </div>
        <strong>{displayScore(score)}% MATCH</strong>
      </header>

      <div className="ai-result-stage">
        <WeaponVisual weapon={weapon} />
        <div className="ai-result-badges" aria-label="Atouts de la classe">
          <span>Saison 04</span>
          <span>{weapon.metaFits.includes('easy-meta') ? 'Meta facile' : 'Meta profile'}</span>
          <span>{weapon.stats.control >= 80 ? 'Faible recoil' : 'High skill'}</span>
        </div>
      </div>

      <div className="ai-result-loadout">
        <article className="ai-class-card ai-class-card-main">
          <span>Pourquoi cette arme</span>
          <p>{weapon.why}</p>
          <small>{weapon.watchout}</small>
          <div className="ai-class-stats">
            <Stat label="Damage" value={weapon.stats.damage} />
            <Stat label="Range" value={weapon.stats.range} />
            <Stat label="Mobility" value={weapon.stats.mobility} />
            <Stat label="Control" value={weapon.stats.control} />
            <Stat label="Ease" value={weapon.stats.ease} />
          </div>
          <div className="ai-meta-metrics" aria-label="Metriques Warzone Saison 04">
            <span>TTK {selectedTtk}ms</span>
            <span>ADS {meta.adsMs}ms</span>
            <span>{meta.rpm} RPM</span>
            <span>{meta.bulletVelocity}m/s</span>
            <span>Mag {meta.magSize}</span>
            <span>Recoil {Math.round(recoilIndex(meta))}</span>
          </div>
          <div className="ai-build-stat-preview" aria-label="Resume visuel des effets d accessoires">
            {statPreviewRows.map((row) => (
              <div key={row.label}>
                <span>{row.label}</span>
                <i><b style={{ width: `${row.value}%` }} /></i>
                <strong>{row.delta >= 0 ? '+' : ''}{Math.round(row.delta)}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="ai-class-card ai-attachment-board">
          <span>{attachmentProfile.label}</span>
          <div className="ai-class-attachments ai-class-attachments-visual">
            {selectedAttachments.map((attachment, index) => (
              <div key={`${weapon.name}-${attachment.slot}-${attachment.name}`} className={`ai-attachment ai-attachment-${index + 1}`}>
                <i aria-hidden="true">{String(index + 1).padStart(2, '0')}</i>
                <Image src={attachmentImage(attachment, weapon.name)} alt={attachment.name} width={520} height={360} sizes="190px" />
                <b>{attachment.slot}</b>
                <label>
                  <strong>{attachment.name}</strong>
                  <select value={attachment.name} onChange={(event) => changeAttachment(index, event.target.value)} aria-label={`Changer ${attachment.slot}`}>
                    {(compatibleOptions.get(slotKey(attachment.slot)) ?? [attachment]).map((option) => (
                      <option key={`${attachment.slot}-${option.name}`} value={option.name}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </label>
                <em>{BENEFIT_LABELS[attachment.benefit]}</em>
                <p>{attachment.reason}</p>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="ai-class-source">
        <span>Base data Saison 04</span>
        <p>{meta.officialPatch} {meta.sourceSummary} {attachmentProfile.source} {weapon.seasonSource}</p>
      </div>

      <section className="ai-class-alternatives" aria-label="Alternatives">
        <div className="ai-class-section-title">
          <span>Alternatives IA</span>
          <h2>Si tu veux changer de feeling</h2>
        </div>
        <div className="ai-class-alt-grid">
          {alternatives.map(({ weapon: altWeapon, score: altScore }) => (
            <article key={altWeapon.name}>
              <WeaponVisual weapon={altWeapon} />
              <span>{displayScore(altScore)}% match</span>
              <h3>{altWeapon.name}</h3>
              <p>{altWeapon.category} / {altWeapon.availability}</p>
              <small>{altWeapon.why}</small>
            </article>
          ))}
        </div>
      </section>

      <button type="button" className="ai-class-reset" onClick={onReset}>
        Refaire le questionnaire
      </button>
    </section>
  );
}

export default function AiClassBuilder() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [answers, setAnswers] = useState<Answers>(DEFAULT_ANSWERS);
  const [isComplete, setIsComplete] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ChatImage | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'assistant-opening',
      role: 'assistant',
      text: OPENING_MESSAGE,
    },
  ]);

  const recommendations = useMemo(() => {
    return WEAPONS
      .map((weapon) => ({ weapon, score: scoreWeapon(weapon, answers) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [answers]);

  function pushMessage(role: ChatMessage['role'], text: string, image?: ChatImage) {
    setMessages((current) => [...current, { id: messageId(role), role, text, image }]);
  }

  function reset() {
    setAnswers(DEFAULT_ANSWERS);
    setIsComplete(false);
    setChatInput('');
    setSelectedImage(null);
    setMessages([
      {
        id: `assistant-reset-${Date.now()}`,
        role: 'assistant',
        text: OPENING_MESSAGE,
      },
    ]);
  }

  function completeBuild(nextAnswers = answers) {
    const nextRecommendations = scoreRecommendations(nextAnswers);
    setIsComplete(true);
    if (nextRecommendations[0]) {
      pushMessage('assistant', coachResultMessage(nextRecommendations[0], nextAnswers));
    }
  }

  async function handleImageFile(file?: File | null) {
    if (!file) return;
    try {
      const image = await normalizeChatImage(file);
      setSelectedImage(image);
    } catch {
      pushMessage('assistant', "Je peux lire les images PNG, JPG, WebP ou GIF. Envoie-moi une image plus lisible ou moins lourde.");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function askCoach(text: string) {
    const trimmed = text.trim();
    const imageToSend = selectedImage;
    if ((!trimmed && !imageToSend) || isAiThinking) return;
    const userText = trimmed || "Analyse cette image pour m'aider sur Warzone.";
    setChatInput('');
    setSelectedImage(null);
    pushMessage('user', userText, imageToSend ?? undefined);
    const inferred = inferAnswersFromText(userText, answers);
    const progressIntent = wantsProgressAdvice(userText);
    const classIntent = wantsClassAdvice(userText, Boolean(imageToSend)) && !progressIntent;
    if (inferred.changed) {
      setAnswers(inferred.answers);
    }
    const lower = userText.toLowerCase();
    if (/(genere|génère|fais|cree|crée|termine|donne).*classe|classe maintenant|build maintenant/.test(lower)) {
      completeBuild(inferred.answers);
      return;
    }

    setIsAiThinking(true);
    try {
      const response = await fetch('/api/ai-classes/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          answers: inferred.answers,
          recommendation: classIntent ? scoreRecommendations(inferred.answers)[0]?.weapon.name : undefined,
          history: messages
            .filter((message) => message.text.trim().length > 0)
            .slice(-10)
            .map((message) => ({ role: message.role, text: message.text })),
          image: imageToSend,
        }),
      });
      const data = await response.json() as { reply?: string };
      pushMessage('assistant', data.reply ?? (classIntent ? `Je peux te faire une classe precise, mais il me faut ton mode, ta distance et ta priorite: TTK, recul, mobilite ou chargeur.` : "Oui, je t'ecoute. Tu veux parler de quoi sur Warzone ?"));
    } catch {
      pushMessage('assistant', classIntent ? "Je peux te faire une classe, mais il me faut encore ton mode, ta distance et ta priorite: recul, TTK, mobilite ou chargeur." : "Je peux te repondre sur la meta, les armes, les accessoires, le ranked, les rotations ou analyser une image. Dis-moi ce que tu veux savoir.");
    } finally {
      setIsAiThinking(false);
    }
  }

  function scoreRecommendations(nextAnswers: Answers) {
    return WEAPONS
      .map((weapon) => ({ weapon, score: scoreWeapon(weapon, nextAnswers) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }

  return (
    <div className="ai-class-builder ai-class-conversation">
      <section id="ai-wzpro-chat" className="ai-coach-chat" aria-label="Discussion avec l IA Warzone">
        <header className="ai-chat-topbar">
          <div className="ai-chat-avatar" aria-hidden="true">
            <span />
          </div>
          <div>
            <strong>IA WZPRO</strong>
            <small>Coach Warzone Saison 04</small>
          </div>
        </header>

        <div className="ai-chat-thread" aria-live="polite">
          {messages.map((message) => (
            <article key={message.id} className={`ai-chat-message is-${message.role}`}>
              {message.image && (
                <Image
                  className="ai-chat-message-image"
                  src={message.image.dataUrl}
                  alt={message.image.name}
                  width={320}
                  height={180}
                  unoptimized
                />
              )}
              {message.text && <p>{message.text}</p>}
            </article>
          ))}
          {isAiThinking && (
            <article className="ai-chat-message is-assistant">
              <p>J analyse la meta et ton profil...</p>
            </article>
          )}
        </div>

        <form
          className="ai-chat-form"
          onSubmit={(event) => {
            event.preventDefault();
            askCoach(chatInput);
          }}
        >
          <button
            type="button"
            className="ai-chat-attach"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Ajouter une image"
          >
            +
          </button>
          <input
            ref={fileInputRef}
            className="ai-chat-file-input"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
            onChange={(event) => handleImageFile(event.target.files?.[0])}
          />
          <div className="ai-chat-input-shell">
            {selectedImage && (
              <div className="ai-chat-image-chip">
                <Image
                  src={selectedImage.dataUrl}
                  alt={selectedImage.name}
                  width={40}
                  height={40}
                  unoptimized
                />
                <span>{selectedImage.name}</span>
                <button type="button" onClick={() => setSelectedImage(null)} aria-label="Retirer l'image">
                  x
                </button>
              </div>
            )}
            <textarea
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder="Entrez un message"
              rows={1}
            />
          </div>
          <button type="submit" disabled={isAiThinking || (!chatInput.trim() && !selectedImage)} aria-label="Envoyer le message">
            ↑
          </button>
        </form>
      </section>

      {isComplete && recommendations[0] && (
        <ResultPanel recommendation={recommendations[0]} alternatives={recommendations.slice(1)} answers={answers} onReset={reset} />
      )}
    </div>
  );
}
