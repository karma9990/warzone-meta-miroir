import { Resend } from 'resend';
import { NextRequest, NextResponse } from 'next/server';
import { normalizeEmail, validateEmailAddress } from '@/lib/emailAuth';
import {
  containsBlockedContactLanguage,
  contactCooldownResponse,
  releaseContactCooldown,
  reserveContactCooldown,
} from '@/lib/contactGuard';
import { readJsonBody } from '@/lib/security';
import { SUPPORT_EMAIL } from '@/lib/siteConfig';
import { getUserSession } from '@/lib/userAuth';

type ContactPayload = {
  name?: unknown;
  email?: unknown;
  subject?: unknown;
  requestType?: unknown;
  message?: unknown;
  website?: unknown;
};

const REQUEST_LABELS: Record<string, string> = {
  support: 'Support',
  billing: 'Billing / subscription',
  refund: 'Refund',
  access: 'Access issue',
  legal: 'Legal',
  other: 'Other',
};

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export async function POST(req: NextRequest) {
  const user = await getUserSession();
  if (!user) {
    return NextResponse.json({ error: 'Sign in to send a support message.' }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Email support is not configured yet.' }, { status: 503 });
  }

  const parsed = await readJsonBody<ContactPayload>(req, 8_192);
  if ('error' in parsed) return parsed.error;

  if (cleanText(parsed.data.website, 120)) {
    return NextResponse.json({ ok: true });
  }

  const name = cleanText(parsed.data.name, 80);
  const submittedEmail = normalizeEmail(parsed.data.email);
  const accountEmail = normalizeEmail(user.email);
  const email = accountEmail || submittedEmail;
  const subject = cleanText(parsed.data.subject, 120);
  const requestType = cleanText(parsed.data.requestType, 40);
  const message = cleanText(parsed.data.message, 3000);
  const requestLabel = REQUEST_LABELS[requestType] || REQUEST_LABELS.other;

  if (!name || !subject || !message) {
    return NextResponse.json({ error: 'All required fields must be completed.' }, { status: 400 });
  }

  const emailError = validateEmailAddress(email);
  if (emailError) {
    return NextResponse.json({ error: emailError }, { status: 400 });
  }

  if (accountEmail && submittedEmail && submittedEmail !== accountEmail) {
    return NextResponse.json({ error: 'Use the email attached to your signed-in account.' }, { status: 400 });
  }

  if (message.length < 10) {
    return NextResponse.json({ error: 'The message is too short.' }, { status: 400 });
  }

  if (containsBlockedContactLanguage(name, subject, message)) {
    return NextResponse.json(
      { error: 'Your message contains terms that cannot be sent to support.' },
      { status: 400 }
    );
  }

  const cooldown = await reserveContactCooldown(req, user.sub);
  if (!cooldown.ok) {
    return contactCooldownResponse(cooldown.retryAfter);
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const to = process.env.CONTACT_EMAIL_TO || SUPPORT_EMAIL;
  const from = process.env.CONTACT_EMAIL_FROM || process.env.AUTH_EMAIL_FROM || 'WZ Meta <onboarding@resend.dev>';

  const { error } = await resend.emails.send({
    from,
    to,
    replyTo: email,
    subject: `[WZPRO Meta] ${requestLabel} - ${subject}`,
    text: [
      `Name: ${name}`,
      `Email: ${email}`,
      `Account: ${user.name} (${user.provider})`,
      `User ID: ${user.sub}`,
      `Type: ${requestLabel}`,
      `Subject: ${subject}`,
      '',
      message,
    ].join('\n'),
    html: `
      <div style="font-family:monospace;max-width:640px;margin:0 auto;padding:32px;background:#f5f5f0;color:#10100e">
        <p style="margin:0 0 20px;font-size:11px;letter-spacing:0.18em;opacity:.55;text-transform:uppercase">WZPRO Meta / Contact</p>
        <h1 style="margin:0 0 24px;font-size:24px;line-height:1.2">New contact message</h1>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Account:</strong> ${escapeHtml(user.name)} (${escapeHtml(user.provider)})</p>
        <p><strong>User ID:</strong> ${escapeHtml(user.sub)}</p>
        <p><strong>Type:</strong> ${escapeHtml(requestLabel)}</p>
        <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
        <hr style="border:0;border-top:1px solid rgba(16,16,14,.18);margin:24px 0">
        <p style="white-space:pre-wrap;line-height:1.6">${escapeHtml(message)}</p>
      </div>
    `,
  });

  if (error) {
    await releaseContactCooldown(cooldown.key);
    console.error('Contact email failed', error);
    return NextResponse.json({ error: 'Unable to send the message.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, cooldownSeconds: 10 * 60 });
}
