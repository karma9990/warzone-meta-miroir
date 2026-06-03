import { randomUUID } from 'crypto';
import { resolveMx } from 'node:dns/promises';
import { SignJWT, jwtVerify } from 'jose';
import { Resend } from 'resend';
import type { NextRequest } from 'next/server';
import { getSiteOrigin, type OAuthProvider, type UserSession } from '@/lib/userAuth';
import { getJwtSecret } from '@/lib/security';

const SECRET = getJwtSecret();
const EMAIL_AUTH_TOKEN_USE = 'email-auth';

const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com',
  '20minutemail.com',
  'anonaddy.com',
  'dispostable.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'mailinator.com',
  'maildrop.cc',
  'moakt.com',
  'sharklasers.com',
  'temp-mail.org',
  'tempmail.com',
  'throwawaymail.com',
  'trashmail.com',
  'yopmail.com',
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type EmailAuthPurpose = 'magic' | 'verify-account' | 'password-reset';

export type EmailAuthPayload = {
  email: string;
  jti: string;
  purpose?: EmailAuthPurpose;
};

export function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function validateEmailAddress(email: string) {
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return 'Enter a valid email address.';
  }

  const [localPart, domain] = email.split('@');
  if (!localPart || !domain || localPart.length > 64) {
    return 'Enter a valid email address.';
  }

  if (localPart.includes('+')) {
    return 'Email aliases are not accepted. Use your main inbox address.';
  }

  if (DISPOSABLE_DOMAINS.has(domain)) {
    return 'Temporary email addresses are not accepted.';
  }

  return null;
}

export async function validateEmailDomain(email: string) {
  const domain = email.split('@')[1];
  try {
    const records = await resolveMx(domain);
    if (!records.length) {
      return 'This email domain cannot receive mail.';
    }
  } catch {
    return 'This email domain cannot be verified.';
  }

  return null;
}

export async function createEmailAuthToken(email: string, purpose: EmailAuthPurpose = 'magic') {
  return new SignJWT({ email, jti: randomUUID(), purpose, tokenUse: EMAIL_AUTH_TOKEN_USE })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer('wzpro-meta')
    .setAudience('wzpro-meta-email-auth')
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(SECRET);
}

export async function verifyEmailAuthToken(token: string): Promise<EmailAuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET, {
      algorithms: ['HS256'],
      issuer: 'wzpro-meta',
      audience: 'wzpro-meta-email-auth',
    });
    if (
      payload.tokenUse !== EMAIL_AUTH_TOKEN_USE ||
      typeof payload.email !== 'string' ||
      typeof payload.jti !== 'string' ||
      (payload.purpose !== 'magic' && payload.purpose !== 'verify-account' && payload.purpose !== 'password-reset')
    ) {
      return null;
    }

    const email = normalizeEmail(payload.email);
    if (validateEmailAddress(email)) {
      return null;
    }

    return {
      email,
      jti: payload.jti,
      purpose: payload.purpose,
    };
  } catch {
    return null;
  }
}

export async function sendEmailAuthLink(
  req: NextRequest,
  email: string,
  purpose: EmailAuthPurpose = 'magic'
) {
  if (!process.env.RESEND_API_KEY) {
    return { error: new Error('Email service is not configured.') };
  }

  const token = await createEmailAuthToken(email, purpose);
  const verifyUrl = `${getSiteOrigin(req)}/api/email-auth/verify?token=${encodeURIComponent(token)}`;
  const resend = new Resend(process.env.RESEND_API_KEY);

  return resend.emails.send({
    from: process.env.AUTH_EMAIL_FROM || 'WZPRO Meta <noreply@wzprometa.com>',
    to: process.env.RESEND_TO_OVERRIDE ?? email,
    subject: purpose === 'verify-account' ? 'Verify your WZPRO Meta email' : 'Your WZPRO Meta sign-in link',
    html: `
      <div style="font-family:monospace;max-width:520px;margin:0 auto;padding:40px 24px;background:#faf7ef;color:#10100e">
        <p style="font-size:11px;letter-spacing:0.2em;opacity:0.45;margin:0 0 32px">WZPRO META / ACCOUNT ACCESS</p>
        <h1 style="font-size:28px;letter-spacing:0.04em;margin:0 0 16px;text-transform:uppercase">Confirm your email</h1>
        <p style="font-size:13px;line-height:1.7;opacity:0.68;margin:0 0 28px">
          Click this secure link to ${purpose === 'verify-account' ? 'verify your account' : 'sign in or create your WZPRO Meta account'}. The link expires in 15 minutes.
        </p>
        <a href="${verifyUrl}" style="display:inline-block;background:#163cff;color:#fff;padding:14px 24px;font-family:monospace;font-size:12px;font-weight:700;text-decoration:none;text-transform:uppercase">
          Sign in to WZPRO Meta
        </a>
        <p style="font-size:11px;opacity:0.38;margin:30px 0 0;line-height:1.6">
          If you did not request this, ignore this email.
        </p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(req: NextRequest, email: string) {
  if (!process.env.RESEND_API_KEY) {
    return { error: new Error('Email service is not configured.') };
  }

  const token = await createEmailAuthToken(email, 'password-reset');
  const resetUrl = `${getSiteOrigin(req)}/reset-password?token=${encodeURIComponent(token)}`;
  const resend = new Resend(process.env.RESEND_API_KEY);

  return resend.emails.send({
    from: process.env.AUTH_EMAIL_FROM || 'WZPRO Meta <noreply@wzprometa.com>',
    to: process.env.RESEND_TO_OVERRIDE ?? email,
    subject: 'Reset your WZPRO Meta password',
    html: `
      <div style="font-family:monospace;max-width:520px;margin:0 auto;padding:40px 24px;background:#faf7ef;color:#10100e">
        <p style="font-size:11px;letter-spacing:0.2em;opacity:0.45;margin:0 0 32px">WZPRO META / PASSWORD RECOVERY</p>
        <h1 style="font-size:28px;letter-spacing:0.04em;margin:0 0 16px;text-transform:uppercase">Reset your password</h1>
        <p style="font-size:13px;line-height:1.7;opacity:0.68;margin:0 0 28px">
          Click this secure link to choose a new password for your WZPRO Meta account. The link expires in 15 minutes.
        </p>
        <a href="${resetUrl}" style="display:inline-block;background:#163cff;color:#fff;padding:14px 24px;font-family:monospace;font-size:12px;font-weight:700;text-decoration:none;text-transform:uppercase">
          Reset password
        </a>
        <p style="font-size:11px;opacity:0.38;margin:30px 0 0;line-height:1.6">
          If you did not request this, ignore this email.
        </p>
      </div>
    `,
  });
}

function getProviderLabel(provider: OAuthProvider) {
  if (provider === 'battlenet') return 'Battle.net';
  if (provider === 'apple') return 'Apple';
  return 'Google';
}

export async function sendOAuthWelcomeEmail(req: NextRequest, user: UserSession) {
  if (!user.email || user.provider === 'email') {
    return null;
  }
  if (!process.env.RESEND_API_KEY) {
    return { error: new Error('Email service is not configured.') };
  }

  const providerLabel = getProviderLabel(user.provider);
  const homeUrl = getSiteOrigin(req);
  const resend = new Resend(process.env.RESEND_API_KEY);

  return resend.emails.send({
    from: process.env.AUTH_EMAIL_FROM || 'WZPRO Meta <noreply@wzprometa.com>',
    to: process.env.RESEND_TO_OVERRIDE ?? user.email,
    subject: 'Your WZPRO Meta sign-up is confirmed',
    html: `
      <div style="font-family:monospace;max-width:520px;margin:0 auto;padding:40px 24px;background:#faf7ef;color:#10100e">
        <p style="font-size:11px;letter-spacing:0.2em;opacity:0.45;margin:0 0 32px">WZPRO META / ACCOUNT CREATED</p>
        <h1 style="font-size:28px;letter-spacing:0.04em;margin:0 0 16px;text-transform:uppercase">Sign-up confirmed</h1>
        <p style="font-size:13px;line-height:1.7;opacity:0.68;margin:0 0 28px">
          Your WZPRO Meta account has been created with ${providerLabel}. Keep this link to return to the site, then sign in again with the same provider whenever you come back.
        </p>
        <a href="${homeUrl}" style="display:inline-block;background:#163cff;color:#fff;padding:14px 24px;font-family:monospace;font-size:12px;font-weight:700;text-decoration:none;text-transform:uppercase">
          Go to WZPRO Meta
        </a>
        <p style="font-size:11px;opacity:0.38;margin:30px 0 0;line-height:1.6">
          If you did not create this account, you can ignore this email.
        </p>
      </div>
    `,
  });
}
