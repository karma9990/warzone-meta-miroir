import { Resend } from 'resend';
import { NextRequest, NextResponse } from 'next/server';
import { absoluteUrl } from '@/lib/siteConfig';
import { normalizeEmail, validateEmailAddress } from '@/lib/emailAuth';
import { readJsonBody } from '@/lib/security';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, 'payment-link', 4, 10 * 60_000);
  if (limited) return limited;

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Email service is not configured.' }, { status: 503 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const parsed = await readJsonBody<{ email?: unknown }>(req);
  if ('error' in parsed) return parsed.error;

  const email = normalizeEmail(parsed.data.email);
  const emailError = validateEmailAddress(email);
  if (emailError) {
    return NextResponse.json({ error: emailError }, { status: 400 });
  }

  // In test mode without a verified domain, Resend only accepts the Resend account email as the recipient.
  // RESEND_TO_OVERRIDE permet de forcer un destinataire de test.
  const to = process.env.RESEND_TO_OVERRIDE ?? email;

  const { error } = await resend.emails.send({
    from: 'WZ Meta <onboarding@resend.dev>',
    to,
    subject: 'Your WZ Meta Pro payment link',
    html: `
      <div style="font-family:monospace;max-width:520px;margin:0 auto;padding:40px 24px;background:#f5f5f0;color:#0a0a08">
        <p style="font-size:11px;letter-spacing:0.2em;opacity:0.4;margin:0 0 32px">WZ META / PRO TIER</p>
        <h1 style="font-size:28px;letter-spacing:0.08em;margin:0 0 16px">YOUR PRO ACCESS LINK</h1>
        <p style="font-size:13px;line-height:1.7;opacity:0.65;margin:0 0 32px">
          You requested Pro access to WZ Meta. Click the button below to complete your payment of <strong>50 € / month</strong>.
        </p>
        <a href="${process.env.PAYMENT_LINK_URL || absoluteUrl('/pro-access')}" style="display:inline-block;background:#0000ff;color:#fff;padding:14px 28px;font-family:monospace;font-size:12px;letter-spacing:0.14em;text-decoration:none;text-transform:uppercase">
          COMPLETE PAYMENT →
        </a>
        <p style="font-size:11px;opacity:0.35;margin:32px 0 0;line-height:1.6">
          If you did not request this, ignore this email.<br>
          This link expires in 24 hours.
        </p>
      </div>
    `,
  });

  if (error) {
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
