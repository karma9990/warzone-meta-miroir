import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { getAdminPassword, getJwtSecret } from '@/lib/security';

const SECRET = getJwtSecret();
const ADMIN_TOKEN_USE = 'admin-session';
export const ADMIN_COOKIE = '__Host-wz_admin';
export const ADMIN_PREVIEW_COOKIE = '__Host-wz_admin_preview';

export const ADMIN_PASSWORD = getAdminPassword();

export async function createToken(): Promise<string> {
  return await new SignJWT({ role: 'admin', tokenUse: ADMIN_TOKEN_USE })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer('wzpro-meta')
    .setAudience('wzpro-meta-admin')
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, SECRET, {
      algorithms: ['HS256'],
      issuer: 'wzpro-meta',
      audience: 'wzpro-meta-admin',
    });
    return payload.role === 'admin' && payload.tokenUse === ADMIN_TOKEN_USE;
  } catch {
    return false;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return verifyToken(token);
}
