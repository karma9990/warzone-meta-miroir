import { randomUUID } from 'crypto';
import { SignJWT } from 'jose';
import { SITE_URL } from '@/lib/siteConfig';
import { getJwtSecret } from '@/lib/security';
import { PRO_TOOL_IDS } from '@/lib/toolAccess';
import type { Purchase } from '@/lib/paymentConfig';

export const PRO_TOOLS = PRO_TOOL_IDS.map((id) => ({
  id,
  name: id.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join(' '),
}));

const ACCESS_TOKEN_USE = 'tool-access-link';

export function buildProToolLinks(token: string) {
  return PRO_TOOLS.map(tool => `
    <p style="margin:0 0 8px">
      <a href="${SITE_URL}/tools/${tool.id}?token=${token}" style="color:#0000ff;font-size:12px;text-decoration:none">${tool.name}</a>
    </p>
  `).join('');
}

export async function createAccessToken(purchase: Purchase, email: string) {
  const tokenPayload = purchase.type === 'pro'
    ? { access: 'pro', email, claim: 'tool-access', tokenUse: ACCESS_TOKEN_USE, jti: randomUUID() }
    : purchase.type === 'companion'
      ? { access: 'companion', email, claim: 'tool-access', tokenUse: ACCESS_TOKEN_USE, jti: randomUUID() }
      : { toolId: purchase.id, email, claim: 'tool-access', tokenUse: ACCESS_TOKEN_USE, jti: randomUUID() };

  return new SignJWT(tokenPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer('wzpro-meta')
    .setAudience('wzpro-meta-tool-access')
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecret());
}

export function buildAccessUrl(purchase: Purchase, token: string) {
  if (purchase.type === 'pro') return `${SITE_URL}/tools/aim-tools?token=${token}`;
  if (purchase.type === 'companion') return `${SITE_URL}/account?token=${token}`;
  return `${SITE_URL}/tools/${purchase.id}?token=${token}`;
}
