export const PRO_TOOL_IDS = [
  'aim-tools',
  'next-meta',
  'pro-movement',
  'how-to-be-a-pro',
  'pro-spawn',
  'pro-opti',
] as const;

export type ProToolId = typeof PRO_TOOL_IDS[number];

export function isProToolId(value: string): value is ProToolId {
  return PRO_TOOL_IDS.includes(value as ProToolId);
}
