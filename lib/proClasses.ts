import fs from 'fs';
import path from 'path';
import { hasUpstash, upstashCommand } from './upstash';

const PRO_CLASSES_FILE = path.join(process.cwd(), 'data', 'pro-classes.json');
const PRO_CLASSES_KEY = 'wz:pro-classes';

export interface ProWeapon {
  name: string;
  image: string;
  attachments: string;
}

export interface ProClass {
  name: string;
  team: string;
  role: string;
  photo: string;
  weapon1: ProWeapon;
  weapon2: ProWeapon;
  utility1: string;
  utility2: string;
  perk1: string;
  perk2: string;
  perk3: string;
}

export interface ProClassesContent {
  updatedAt: string;
  sourceUrl: string;
  sourceTitle: string;
  classes: ProClass[];
}

function text(value: unknown, fallback = '', max = 500) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : fallback;
}

function weapon(value: unknown): ProWeapon {
  const body = (value ?? {}) as Partial<ProWeapon>;
  return {
    name: text(body.name, '', 80),
    image: text(body.image, '', 240),
    attachments: text(body.attachments, '', 900),
  };
}

function proClass(value: unknown): ProClass {
  const body = (value ?? {}) as Partial<ProClass>;
  return {
    name: text(body.name, '', 80),
    team: text(body.team, '', 80),
    role: text(body.role, '', 100),
    photo: text(body.photo, '', 240),
    weapon1: weapon(body.weapon1),
    weapon2: weapon(body.weapon2),
    utility1: text(body.utility1, '', 80),
    utility2: text(body.utility2, '', 80),
    perk1: text(body.perk1, '', 80),
    perk2: text(body.perk2, '', 80),
    perk3: text(body.perk3, '', 80),
  };
}

export function normalizeProClassesContent(input: unknown): ProClassesContent {
  if (Array.isArray(input)) {
    return {
      updatedAt: '',
      sourceUrl: '',
      sourceTitle: '',
      classes: input.map(proClass).filter((entry) => entry.name || entry.weapon1.name || entry.weapon2.name),
    };
  }

  const body = (input ?? {}) as Partial<ProClassesContent>;
  const classes = Array.isArray(body.classes) ? body.classes : [];
  return {
    updatedAt: text(body.updatedAt, '', 40),
    sourceUrl: text(body.sourceUrl, '', 300),
    sourceTitle: text(body.sourceTitle, '', 200),
    classes: classes.map(proClass).filter((entry) => entry.name || entry.weapon1.name || entry.weapon2.name),
  };
}

function readLocalProClasses() {
  try {
    return normalizeProClassesContent(JSON.parse(fs.readFileSync(PRO_CLASSES_FILE, 'utf-8')));
  } catch {
    return normalizeProClassesContent([]);
  }
}

function writeLocalProClasses(content: ProClassesContent) {
  fs.mkdirSync(path.dirname(PRO_CLASSES_FILE), { recursive: true });
  fs.writeFileSync(PRO_CLASSES_FILE, JSON.stringify(content.classes, null, 2));
}

export async function getProClassesContent(): Promise<ProClassesContent> {
  if (hasUpstash()) {
    const result = await upstashCommand(['GET', PRO_CLASSES_KEY]);
    if (typeof result === 'string') return normalizeProClassesContent(JSON.parse(result));
  }

  return readLocalProClasses();
}

export async function saveProClassesContent(input: unknown): Promise<ProClassesContent> {
  const next = normalizeProClassesContent(input);

  if (hasUpstash()) {
    await upstashCommand(['SET', PRO_CLASSES_KEY, JSON.stringify(next)]);
  } else {
    writeLocalProClasses(next);
  }

  return next;
}
