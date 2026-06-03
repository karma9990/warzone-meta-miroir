const PRODUCTS = [
  {
    env: 'POLAR_PRODUCT_ID_PRO',
    key: 'pro',
    name: 'WZ Meta Pro Access',
    description: 'Monthly access to every WZPRO Meta Pro tool.',
    amount: 5000,
  },
  {
    env: 'POLAR_PRODUCT_ID_AIM_TOOLS',
    key: 'aim-tools',
    name: 'Aim Tools',
    description: 'Monthly access to Aim Tools.',
    amount: 900,
  },
  {
    env: 'POLAR_PRODUCT_ID_NEXT_META',
    key: 'next-meta',
    name: 'Next Meta',
    description: 'Monthly access to Next Meta.',
    amount: 900,
  },
  {
    env: 'POLAR_PRODUCT_ID_PRO_MOVEMENT',
    key: 'pro-movement',
    name: 'Pro Movement',
    description: 'Monthly access to Pro Movement.',
    amount: 900,
  },
  {
    env: 'POLAR_PRODUCT_ID_HOW_TO_BE_A_PRO',
    key: 'how-to-be-a-pro',
    name: 'How To Be A Pro',
    description: 'Monthly access to How To Be A Pro.',
    amount: 900,
  },
  {
    env: 'POLAR_PRODUCT_ID_PRO_SPAWN',
    key: 'pro-spawn',
    name: 'Pro Spawn',
    description: 'Monthly access to Pro Spawn.',
    amount: 900,
  },
  {
    env: 'POLAR_PRODUCT_ID_PRO_OPTI',
    key: 'pro-opti',
    name: 'Pro Opti',
    description: 'Monthly access to Pro Opti.',
    amount: 900,
  },
];

const server = process.env.POLAR_SERVER === 'production' ? 'production' : 'sandbox';
const baseUrl = server === 'production' ? 'https://api.polar.sh/v1' : 'https://sandbox-api.polar.sh/v1';
const accessToken = process.env.POLAR_ACCESS_TOKEN;
const webhookUrl = process.env.POLAR_WEBHOOK_URL;
const writeEnv = process.env.POLAR_WRITE_ENV === '1';

if (!accessToken) {
  console.error('Missing POLAR_ACCESS_TOKEN.');
  console.error('Create an Organization Access Token in Polar, then run:');
  console.error('PowerShell: $env:POLAR_ACCESS_TOKEN="polar_oat_..."; $env:POLAR_SERVER="sandbox"; npm.cmd run setup:polar');
  process.exit(1);
}

async function polar(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    throw new Error(`${path} failed with ${response.status}: ${JSON.stringify(data)}`);
  }

  return data;
}

function productBody(product) {
  return {
    name: product.name,
    description: product.description,
    visibility: 'public',
    recurring_interval: 'month',
    recurring_interval_count: 1,
    metadata: {
      purchaseKey: product.key,
      app: 'wzpro-meta',
    },
    prices: [
      {
        amount_type: 'fixed',
        price_currency: 'eur',
        price_amount: product.amount,
      },
    ],
  };
}

const secretEnvValues = {
  POLAR_SERVER: server,
  POLAR_ACCESS_TOKEN: accessToken,
};

const redactedEnvLines = [
  `POLAR_SERVER=${server}`,
  'POLAR_ACCESS_TOKEN=<keep existing local value>',
];

console.log(`Creating Polar products in ${server}...`);

for (const product of PRODUCTS) {
  const created = await polar('/products/', productBody(product));
  const id = created.id || created.product?.id;
  if (!id) {
    throw new Error(`Product ${product.name} was created but no id was returned.`);
  }
  secretEnvValues[product.env] = id;
  redactedEnvLines.push(`${product.env}=${id}`);
  console.log(`Created ${product.name}: ${id}`);
}

if (webhookUrl) {
  const webhook = await polar('/webhooks/endpoints', {
    url: webhookUrl,
    format: 'raw',
    enabled: true,
    name: 'WZPRO Meta access',
    events: ['order.paid', 'subscription.active'],
  });
  const secret = webhook.secret || webhook.webhook_endpoint?.secret || webhook.webhookEndpoint?.secret;
  if (!secret) {
    throw new Error('Webhook endpoint was created but no secret was returned.');
  }
  secretEnvValues.POLAR_WEBHOOK_SECRET = secret;
  redactedEnvLines.push('POLAR_WEBHOOK_SECRET=<created; written locally if --write-env was used>');
  console.log(`Created webhook endpoint: ${webhook.id || webhook.webhook_endpoint?.id || webhook.webhookEndpoint?.id}`);
}

console.log('\nAdd these non-sensitive lines to .env.local. Keep tokens/secrets local only:\n');
console.log(redactedEnvLines.join('\n'));

if (writeEnv) {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const envPath = path.join(process.cwd(), '.env.local');
  let current = '';
  try {
    current = await fs.readFile(envPath, 'utf8');
  } catch {
    current = '';
  }

  const nextValues = Object.fromEntries(
    Object.entries(secretEnvValues),
  );

  const seen = new Set();
  const updatedLines = current.split(/\r?\n/).map((line) => {
    const match = line.match(/^([A-Z0-9_]+)=/);
    if (!match || !(match[1] in nextValues)) return line;
    seen.add(match[1]);
    return `${match[1]}=${nextValues[match[1]]}`;
  });

  for (const [key, value] of Object.entries(nextValues)) {
    if (!seen.has(key)) updatedLines.push(`${key}=${value}`);
  }

  await fs.writeFile(envPath, `${updatedLines.filter((line, index, lines) => line || index < lines.length - 1).join('\n')}\n`);
  console.log('\n.env.local was updated.');
}
