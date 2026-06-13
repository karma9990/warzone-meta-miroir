import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import { hasUpstash, upstashCommand } from '@/lib/upstash';
import type { UserSession } from '@/lib/userAuth';

const DEVICES_FILE = path.join(process.cwd(), 'data', 'companion-devices.json');
const KEY_PREFIX = 'wz:companion:';
const FLOW_TTL_SECONDS = 10 * 60;

export type CompanionDevice = {
  deviceId: string;
  userId: string;
  userName: string;
  email?: string;
  deviceName: string;
  createdAt: string;
  lastSeenAt: string;
  revoked: boolean;
};

export type CompanionFlow = {
  code: string;
  deviceId: string;
  deviceName: string;
  createdAt: string;
  expiresAt: string;
  authorizedAt?: string;
  userId?: string;
  userName?: string;
  email?: string;
};

type CompanionStoreData = {
  flows: CompanionFlow[];
  devices: CompanionDevice[];
};

function nowIso() {
  return new Date().toISOString();
}

function code() {
  return randomBytes(4).toString('hex').toUpperCase();
}

function deviceId() {
  return `wzd_${randomBytes(16).toString('hex')}`;
}

function expiry() {
  return new Date(Date.now() + FLOW_TTL_SECONDS * 1000).toISOString();
}

function cleanDeviceName(value: unknown) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text.slice(0, 80) || 'PC WZPRO';
}

function readLocalStore(): CompanionStoreData {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Local companion storage is disabled in production. Configure Upstash Redis.');
  }

  try {
    const data = JSON.parse(fs.readFileSync(DEVICES_FILE, 'utf-8')) as Partial<CompanionStoreData>;
    return {
      flows: Array.isArray(data.flows) ? data.flows : [],
      devices: Array.isArray(data.devices) ? data.devices : [],
    };
  } catch {
    return { flows: [], devices: [] };
  }
}

function writeLocalStore(data: CompanionStoreData) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Local companion storage is disabled in production. Configure Upstash Redis.');
  }

  fs.writeFileSync(DEVICES_FILE, JSON.stringify(data, null, 2));
}

function activeFlows(flows: CompanionFlow[]) {
  const now = Date.now();
  return flows.filter((flow) => new Date(flow.expiresAt).getTime() > now);
}

function normalizeFlow(input: CompanionFlow): CompanionFlow {
  return {
    code: input.code,
    deviceId: input.deviceId,
    deviceName: cleanDeviceName(input.deviceName),
    createdAt: input.createdAt || nowIso(),
    expiresAt: input.expiresAt || expiry(),
    authorizedAt: input.authorizedAt,
    userId: input.userId,
    userName: input.userName,
    email: input.email,
  };
}

function normalizeDevice(input: CompanionDevice): CompanionDevice {
  return {
    deviceId: input.deviceId,
    userId: input.userId,
    userName: input.userName || 'WZPRO Player',
    email: input.email,
    deviceName: cleanDeviceName(input.deviceName),
    createdAt: input.createdAt || nowIso(),
    lastSeenAt: input.lastSeenAt || nowIso(),
    revoked: Boolean(input.revoked),
  };
}

export async function createCompanionFlow(input: { deviceName?: string }) {
  const flow = normalizeFlow({
    code: code(),
    deviceId: deviceId(),
    deviceName: cleanDeviceName(input.deviceName),
    createdAt: nowIso(),
    expiresAt: expiry(),
  });

  if (hasUpstash()) {
    await upstashCommand(['SET', `${KEY_PREFIX}flow:${flow.code}`, JSON.stringify(flow), 'EX', FLOW_TTL_SECONDS]);
    return flow;
  }

  const store = readLocalStore();
  store.flows = [...activeFlows(store.flows).filter((entry) => entry.code !== flow.code), flow];
  writeLocalStore(store);
  return flow;
}

export async function getCompanionFlow(codeInput: string) {
  const cleanCode = codeInput.trim().toUpperCase();
  if (!cleanCode) return null;

  if (hasUpstash()) {
    const value = await upstashCommand(['GET', `${KEY_PREFIX}flow:${cleanCode}`]);
    return typeof value === 'string' ? normalizeFlow(JSON.parse(value) as CompanionFlow) : null;
  }

  const store = readLocalStore();
  store.flows = activeFlows(store.flows);
  writeLocalStore(store);
  return store.flows.find((flow) => flow.code === cleanCode) || null;
}

export async function authorizeCompanionFlow(codeInput: string, user: UserSession) {
  const flow = await getCompanionFlow(codeInput);
  if (!flow || new Date(flow.expiresAt).getTime() <= Date.now()) return null;

  const authorized = normalizeFlow({
    ...flow,
    authorizedAt: nowIso(),
    userId: user.sub,
    userName: user.name,
    email: user.email,
  });
  const device = normalizeDevice({
    deviceId: authorized.deviceId,
    userId: user.sub,
    userName: user.name,
    email: user.email,
    deviceName: authorized.deviceName,
    createdAt: nowIso(),
    lastSeenAt: nowIso(),
    revoked: false,
  });

  if (hasUpstash()) {
    await upstashCommand(['SET', `${KEY_PREFIX}flow:${authorized.code}`, JSON.stringify(authorized), 'EX', FLOW_TTL_SECONDS]);
    await upstashCommand(['SET', `${KEY_PREFIX}device:${device.deviceId}`, JSON.stringify(device)]);
    await upstashCommand(['SADD', `${KEY_PREFIX}user:${user.sub}:devices`, device.deviceId]);
    return { flow: authorized, device };
  }

  const store = readLocalStore();
  store.flows = activeFlows(store.flows).map((entry) => entry.code === authorized.code ? authorized : entry);
  const deviceIndex = store.devices.findIndex((entry) => entry.deviceId === device.deviceId);
  if (deviceIndex >= 0) store.devices[deviceIndex] = device;
  else store.devices.push(device);
  writeLocalStore(store);
  return { flow: authorized, device };
}

export async function getCompanionDevice(id: string) {
  if (!id) return null;

  if (hasUpstash()) {
    const value = await upstashCommand(['GET', `${KEY_PREFIX}device:${id}`]);
    return typeof value === 'string' ? normalizeDevice(JSON.parse(value) as CompanionDevice) : null;
  }

  return readLocalStore().devices.map(normalizeDevice).find((device) => device.deviceId === id) || null;
}

export async function listCompanionDevices(userId: string) {
  if (hasUpstash()) {
    const ids = await upstashCommand(['SMEMBERS', `${KEY_PREFIX}user:${userId}:devices`]);
    if (!Array.isArray(ids)) return [];
    const devices = await Promise.all(ids.filter((id): id is string => typeof id === 'string').map(getCompanionDevice));
    return devices.filter((device): device is CompanionDevice => Boolean(device)).sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
  }

  return readLocalStore().devices
    .map(normalizeDevice)
    .filter((device) => device.userId === userId)
    .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
}

export async function touchCompanionDevice(device: CompanionDevice) {
  const next = normalizeDevice({ ...device, lastSeenAt: nowIso() });

  if (hasUpstash()) {
    await upstashCommand(['SET', `${KEY_PREFIX}device:${next.deviceId}`, JSON.stringify(next)]);
    await upstashCommand(['SADD', `${KEY_PREFIX}user:${next.userId}:devices`, next.deviceId]);
    return next;
  }

  const store = readLocalStore();
  store.devices = store.devices.map((entry) => entry.deviceId === next.deviceId ? next : entry);
  writeLocalStore(store);
  return next;
}

export async function revokeCompanionDevice(input: { userId: string; deviceId: string }) {
  const device = await getCompanionDevice(input.deviceId);
  if (!device || device.userId !== input.userId) return null;
  const revoked = normalizeDevice({ ...device, revoked: true, lastSeenAt: nowIso() });

  if (hasUpstash()) {
    await upstashCommand(['SET', `${KEY_PREFIX}device:${revoked.deviceId}`, JSON.stringify(revoked)]);
    return revoked;
  }

  const store = readLocalStore();
  store.devices = store.devices.map((entry) => entry.deviceId === revoked.deviceId ? revoked : entry);
  writeLocalStore(store);
  return revoked;
}
