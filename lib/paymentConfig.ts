import { isProToolId, type ProToolId } from '@/lib/toolAccess';

export type Purchase =
  | { type: 'pro'; key: 'pro'; name: string; productId: string }
  | { type: 'tool'; key: ProToolId; id: ProToolId; name: string; productId: string };

const PRODUCT_KEYS = [
  'pro',
  'aim-tools',
  'next-meta',
  'pro-movement',
  'how-to-be-a-pro',
  'pro-spawn',
  'pro-opti',
] as const satisfies Array<'pro' | ProToolId>;

const ENV_KEYS: Record<'pro' | ProToolId, string> = {
  pro: 'POLAR_PRODUCT_ID_PRO',
  'aim-tools': 'POLAR_PRODUCT_ID_AIM_TOOLS',
  'next-meta': 'POLAR_PRODUCT_ID_NEXT_META',
  'pro-movement': 'POLAR_PRODUCT_ID_PRO_MOVEMENT',
  'how-to-be-a-pro': 'POLAR_PRODUCT_ID_HOW_TO_BE_A_PRO',
  'pro-spawn': 'POLAR_PRODUCT_ID_PRO_SPAWN',
  'pro-opti': 'POLAR_PRODUCT_ID_PRO_OPTI',
};

const NAMES: Record<'pro' | ProToolId, string> = {
  pro: 'WZ Meta Pro Access',
  'aim-tools': 'Aim Tools',
  'next-meta': 'Next Meta',
  'pro-movement': 'Pro Movement',
  'how-to-be-a-pro': 'How To Be A Pro',
  'pro-spawn': 'Pro Spawn',
  'pro-opti': 'Pro Opti',
};

function productIdFor(key: 'pro' | ProToolId) {
  const envValue = process.env[ENV_KEYS[key]];
  if (process.env.NODE_ENV === 'production' && !envValue) {
    throw new Error(`${ENV_KEYS[key]} must be configured in production.`);
  }
  return envValue || '';
}

export function getPurchaseCatalog(): Purchase[] {
  return [
    { type: 'pro', key: 'pro', name: NAMES.pro, productId: productIdFor('pro') },
    ...PRODUCT_KEYS
      .filter(isProToolId)
      .map((id) => ({
        type: 'tool' as const,
        key: id,
        id,
        name: NAMES[id],
        productId: productIdFor(id),
      })),
  ];
}

export function getPurchaseByKey(key: string): Purchase | null {
  return getPurchaseCatalog().find((purchase) => purchase.key === key) || null;
}

export function getPurchaseByProductId(productId: string): Purchase | null {
  return getPurchaseCatalog().find((purchase) => purchase.productId === productId) || null;
}

export function validatePaymentConfig() {
  getPurchaseCatalog();
  if (process.env.NODE_ENV === 'production' && !process.env.POLAR_ACCESS_TOKEN) {
    throw new Error('POLAR_ACCESS_TOKEN must be configured in production.');
  }
  if (process.env.NODE_ENV === 'production' && !process.env.POLAR_WEBHOOK_SECRET) {
    throw new Error('POLAR_WEBHOOK_SECRET must be configured in production.');
  }
}
