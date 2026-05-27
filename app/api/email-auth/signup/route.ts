import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, saveUser } from '@/lib/accountStore';
import {
  normalizeEmail,
  sendEmailAuthLink,
  validateEmailAddress,
  validateEmailDomain,
} from '@/lib/emailAuth';
import { readJsonBody } from '@/lib/security';
import { rateLimit } from '@/lib/rateLimit';

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, 'email-signup', 5, 10 * 60_000);
  if (limited) return limited;

  const parsed = await readJsonBody<{
    email?: unknown;
    username?: unknown;
    displayName?: unknown;
    password?: unknown;
    confirmPassword?: unknown;
  }>(req);
  if ('error' in parsed) return parsed.error;
  const body = parsed.data;
  const email = normalizeEmail(body.email);
  const username = cleanText(body.username).toLowerCase();
  const displayName = cleanText(body.displayName);
  const password = cleanText(body.password);
  const confirmPassword = cleanText(body.confirmPassword);

  const emailError = validateEmailAddress(email) || await validateEmailDomain(email);
  if (emailError) {
    return NextResponse.json({ error: emailError }, { status: 400 });
  }

  if (!/^[a-z0-9_]{3,24}$/.test(username)) {
    return NextResponse.json({ error: 'Username must be 3-24 characters: letters, numbers, underscore.' }, { status: 400 });
  }

  if (displayName.length < 2 || displayName.length > 32) {
    return NextResponse.json({ error: 'Display name must be 2-32 characters.' }, { status: 400 });
  }

  if (password.length < 10 || !/[a-z]/i.test(password) || !/[0-9]/.test(password)) {
    return NextResponse.json({ error: 'Password must be at least 10 characters and include letters and numbers.' }, { status: 400 });
  }

  if (password !== confirmPassword) {
    return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 });
  }

  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    return NextResponse.json({ error: 'An account already exists for this email.' }, { status: 409 });
  }

  await saveUser({
    id: randomUUID(),
    email,
    username,
    displayName,
    passwordHash: await bcrypt.hash(password, 12),
    createdAt: new Date().toISOString(),
  });

  const { error } = await sendEmailAuthLink(req, email, 'verify-account');
  if (error) {
    return NextResponse.json({ error: 'Account created, but the verification email could not be sent.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
