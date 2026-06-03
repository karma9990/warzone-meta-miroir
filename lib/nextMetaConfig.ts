import fs from 'fs';
import path from 'path';
import { hasUpstash, upstashCommand } from './upstash';

const NEXT_META_CONFIG_FILE = path.join(process.cwd(), 'data', 'next-meta-config.json');
const NEXT_META_CONFIG_KEY = 'wz:next-meta:config';

export type NextMetaPatchSignal = 'buff' | 'nerf' | 'indirect-buff' | 'unchanged';
export type NextMetaRangeRole = 'Close range' | 'Sniper support' | 'Long range' | 'Flex';

export type NextMetaAttachment = {
  slot: string;
  name: string;
};

export type NextMetaConfig = {
  weaponOptions: string[];
  defaultWeapon: string;
  defaultCategory: string;
  defaultRole: NextMetaRangeRole;
  defaultSignal: NextMetaPatchSignal;
  defaultPatchNote: string;
  defaultReason: string;
  defaultConfidence: number;
  priorityScore: number;
  defaultAttachments: NextMetaAttachment[];
  updatedAt: string;
};

export const DEFAULT_NEXT_META_CONFIG: NextMetaConfig = {
  weaponOptions: [
    'MPC-25',
    'Sturmwolf 45',
    'Razor 9mm',
    'Sokol 545',
    'MK.78',
    'XM325',
    'Kilo 141',
    'CR-56 AMAX',
    'LC10',
    'HDR',
  ],
  defaultWeapon: 'MPC-25',
  defaultCategory: 'SMG',
  defaultRole: 'Close range',
  defaultSignal: 'buff',
  defaultPatchNote: 'Season 03 Reloaded: range, recoil and ADS changes opened a new test window.',
  defaultReason: 'The patch improved a stat that matters in real fights, and the attachment setup protects the weapon from its main weakness.',
  defaultConfidence: 70,
  priorityScore: 70,
  defaultAttachments: [
    { slot: 'Muzzle', name: '' },
    { slot: 'Barrel', name: '' },
    { slot: 'Underbarrel', name: '' },
    { slot: 'Magazine', name: '' },
    { slot: 'Optic', name: '' },
    { slot: 'Stock', name: '' },
  ],
  updatedAt: '2026-05-21',
};

const PATCH_SIGNALS: NextMetaPatchSignal[] = ['buff', 'nerf', 'indirect-buff', 'unchanged'];
const RANGE_ROLES: NextMetaRangeRole[] = ['Close range', 'Sniper support', 'Long range', 'Flex'];

function asText(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function asConfidence(value: unknown, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function asWeaponOptions(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const options = value
    .map(item => typeof item === 'string' ? item.trim() : '')
    .filter(Boolean);
  return options.length ? Array.from(new Set(options)).slice(0, 40) : fallback;
}

function asAttachments(value: unknown, fallback: NextMetaAttachment[]) {
  if (!Array.isArray(value)) return fallback;
  const attachments = value
    .map(item => {
      const record = item as Partial<NextMetaAttachment>;
      return {
        slot: asText(record.slot, 'Attachment'),
        name: typeof record.name === 'string' ? record.name.trim() : '',
      };
    })
    .flatMap(item => {
      const slot = item.slot.toLowerCase().replace(/\s+/g, '');
      if (slot === 'optic/stock' || slot === 'opticstock') {
        return [
          { slot: 'Optic', name: item.name },
          { slot: 'Stock', name: '' },
        ];
      }
      return [item];
    })
    .filter(item => item.slot || item.name)
    .slice(0, 8);
  return attachments.length ? attachments : fallback;
}

export function normalizeNextMetaConfig(input: unknown, fallback = DEFAULT_NEXT_META_CONFIG): NextMetaConfig {
  const body = input as Partial<NextMetaConfig>;
  const weaponOptions = asWeaponOptions(body.weaponOptions, fallback.weaponOptions);
  const defaultSignal = PATCH_SIGNALS.includes(body.defaultSignal as NextMetaPatchSignal)
    ? body.defaultSignal as NextMetaPatchSignal
    : fallback.defaultSignal;
  const defaultRole = RANGE_ROLES.includes(body.defaultRole as NextMetaRangeRole)
    ? body.defaultRole as NextMetaRangeRole
    : fallback.defaultRole;

  return {
    weaponOptions,
    defaultWeapon: asText(body.defaultWeapon, weaponOptions[0] || fallback.defaultWeapon),
    defaultCategory: asText(body.defaultCategory, fallback.defaultCategory),
    defaultRole,
    defaultSignal,
    defaultPatchNote: asText(body.defaultPatchNote, fallback.defaultPatchNote),
    defaultReason: asText(body.defaultReason, fallback.defaultReason),
    defaultConfidence: asConfidence(body.defaultConfidence, fallback.defaultConfidence),
    priorityScore: asConfidence(body.priorityScore, fallback.priorityScore),
    defaultAttachments: asAttachments(body.defaultAttachments, fallback.defaultAttachments),
    updatedAt: asText(body.updatedAt, new Date().toISOString().slice(0, 10)),
  };
}

function readLocalNextMetaConfig(): NextMetaConfig {
  try {
    const raw = fs.readFileSync(NEXT_META_CONFIG_FILE, 'utf-8');
    return normalizeNextMetaConfig(JSON.parse(raw));
  } catch {
    return DEFAULT_NEXT_META_CONFIG;
  }
}

function writeLocalNextMetaConfig(config: NextMetaConfig) {
  fs.mkdirSync(path.dirname(NEXT_META_CONFIG_FILE), { recursive: true });
  fs.writeFileSync(NEXT_META_CONFIG_FILE, JSON.stringify(config, null, 2));
}

export async function getNextMetaConfig(): Promise<NextMetaConfig> {
  if (hasUpstash()) {
    const result = await upstashCommand(['GET', NEXT_META_CONFIG_KEY]);
    if (typeof result === 'string') {
      return normalizeNextMetaConfig(JSON.parse(result));
    }
    return readLocalNextMetaConfig();
  }

  return readLocalNextMetaConfig();
}

export async function saveNextMetaConfig(config: unknown): Promise<NextMetaConfig> {
  const normalized = normalizeNextMetaConfig({
    ...(config as Partial<NextMetaConfig>),
    updatedAt: new Date().toISOString().slice(0, 10),
  });

  if (hasUpstash()) {
    await upstashCommand(['SET', NEXT_META_CONFIG_KEY, JSON.stringify(normalized)]);
  } else {
    writeLocalNextMetaConfig(normalized);
  }

  return normalized;
}
