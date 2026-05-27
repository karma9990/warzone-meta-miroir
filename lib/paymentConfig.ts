import { isProToolId, type ProToolId } from '@/lib/toolAccess';

export type Purchase =
  | { type: 'pro'; name: string; priceId: string }
  | { type: 'tool'; id: ProToolId; name: string; priceId: string };

const DEFAULT_PRICE_IDS: Record<'pro' | ProToolId, string> = {
  pro: 'pri_01kr6r0r43eprf8xmj8e1s5dzf',
  'aim-tools': 'pri_01kr6tsvfsekx29tp80smcx1as',
  'next-meta': 'pri_01kr6txq3xhypkxn588r0y99xj',
  'pro-movement': 'pri_01kr6tzyymcvbfa1yztpnnnk2r',
  'how-to-be-a-pro': 'pri_01kr6v1g040h0712s2wty8k8q0',
  'pro-spawn': 'pri_01kr6v2y405g71trjncsjjaqz3',
  'pro-opti': 'pri_01kr6v4613d1x1gaj4qe1kytfj',
};

const ENV_KEYS: Record<'pro' | ProToolId, string> = {
  pro: 'PADDLE_PRICE_ID_PRO',
  'aim-tools': 'PADDLE_PRICE_ID_AIM_TOOLS',
  'next-meta': 'PADDLE_PRICE_ID_NEXT_META',
  'pro-movement': 'PADDLE_PRICE_ID_PRO_MOVEMENT',
  'how-to-be-a-pro': 'PADDLE_PRICE_ID_HOW_TO_BE_A_PRO',
  'pro-spawn': 'PADDLE_PRICE_ID_PRO_SPAWN',
  'pro-opti': 'PADDLE_PRICE_ID_PRO_OPTI',
};

const PUBLIC_ENV_KEYS: Record<'pro' | ProToolId, string> = {
  pro: 'NEXT_PUBLIC_PADDLE_PRICE_ID_PRO',
  'aim-tools': 'NEXT_PUBLIC_PADDLE_PRICE_ID_AIM_TOOLS',
  'next-meta': 'NEXT_PUBLIC_PADDLE_PRICE_ID_NEXT_META',
  'pro-movement': 'NEXT_PUBLIC_PADDLE_PRICE_ID_PRO_MOVEMENT',
  'how-to-be-a-pro': 'NEXT_PUBLIC_PADDLE_PRICE_ID_HOW_TO_BE_A_PRO',
  'pro-spawn': 'NEXT_PUBLIC_PADDLE_PRICE_ID_PRO_SPAWN',
  'pro-opti': 'NEXT_PUBLIC_PADDLE_PRICE_ID_PRO_OPTI',
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

function priceIdFor(key: 'pro' | ProToolId) {
  const envValue = process.env[ENV_KEYS[key]]
    ?? process.env[PUBLIC_ENV_KEYS[key]];
  if (process.env.NODE_ENV === 'production' && !envValue) {
    throw new Error(`${ENV_KEYS[key]} or ${PUBLIC_ENV_KEYS[key]} must be configured in production.`);
  }
  return envValue || DEFAULT_PRICE_IDS[key];
}

export function getPurchaseCatalog(): Purchase[] {
  return [
    { type: 'pro', name: NAMES.pro, priceId: priceIdFor('pro') },
    ...Object.keys(DEFAULT_PRICE_IDS)
      .filter(isProToolId)
      .map((id) => ({
        type: 'tool' as const,
        id,
        name: NAMES[id],
        priceId: priceIdFor(id),
      })),
  ];
}

export function getPurchaseByPriceId(priceId: string): Purchase | null {
  return getPurchaseCatalog().find((purchase) => purchase.priceId === priceId) || null;
}

export function validatePaymentConfig() {
  getPurchaseCatalog();
  if (process.env.NODE_ENV === 'production' && !process.env.PADDLE_WEBHOOK_SECRET) {
    throw new Error('PADDLE_WEBHOOK_SECRET must be configured in production.');
  }
}
