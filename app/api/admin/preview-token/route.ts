import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { SignJWT } from 'jose';
import { ADMIN_PREVIEW_COOKIE, isAuthenticated } from '@/lib/auth';
import { absoluteUrl } from '@/lib/siteConfig';
import { getJwtSecret, readJsonBody, secureCookieOptions } from '@/lib/security';
import { isProToolId } from '@/lib/toolAccess';

const SECRET = getJwtSecret();

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = await readJsonBody<{ toolId?: unknown }>(req);
  if ('error' in parsed) return parsed.error;
  const toolId = typeof parsed.data.toolId === 'string' ? parsed.data.toolId : '';

  if (!isProToolId(toolId)) {
    return NextResponse.json({ error: 'Invalid tool ID' }, { status: 400 });
  }

  const token = await new SignJWT({ toolId, adminPreview: true, tokenUse: 'admin-preview', jti: randomUUID() })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer('wzpro-meta')
    .setAudience('wzpro-meta-admin-preview')
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(SECRET);

  const res = NextResponse.json({ url: absoluteUrl(`/tools/${toolId}?preview=1`) });
  res.cookies.set(ADMIN_PREVIEW_COOKIE, token, secureCookieOptions(60 * 10));
  return res;
}
