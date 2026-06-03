import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { normalizeEmail, validateEmailAddress, validateEmailDomain } from '@/lib/emailAuth';
import { saveNewsletterSubscriber } from '@/lib/newsletterStore';
import { rateLimit, rateLimitIdentifier } from '@/lib/rateLimit';
import { readJsonBody } from '@/lib/security';
import { absoluteUrl } from '@/lib/siteConfig';

type NewsletterBody = {
  email?: unknown;
};

const newsletterItems = [
  ['Weekly meta newsletter', 'A compact weekly read on what changed, what matters, and what to test first.'],
  ['Patch notes digest', 'Patch changes translated into practical loadout, perk, movement and settings decisions.'],
  ['Resurgence map updates', 'Rotation, spawn and map-control notes when the playable flow changes.'],
  ['New weapon tier alerts', 'Early signals when a weapon climbs, falls, or needs a fresh attachment pass.'],
  ['Community tips & tricks', 'Useful setups, routines and small improvements collected for regular players.'],
];

function newsletterHtml(email: string) {
  const rows = newsletterItems.map(([title, body]) => `
    <tr>
      <td style="padding:14px 0;border-bottom:1px solid rgba(0,0,0,0.1)">
        <p style="font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 6px;color:#10100e">${title}</p>
        <p style="font-size:12px;line-height:1.65;opacity:0.68;margin:0;color:#10100e">${body}</p>
      </td>
    </tr>
  `).join('');

  return `
    <div style="font-family:monospace;max-width:560px;margin:0 auto;padding:40px 24px;background:#faf7ef;color:#10100e">
      <p style="font-size:11px;letter-spacing:0.2em;opacity:0.45;margin:0 0 28px">WZPRO META / FREE NEWSLETTER</p>
      <h1 style="font-size:26px;letter-spacing:0.05em;line-height:1.12;margin:0 0 14px;text-transform:uppercase">You are on the free list</h1>
      <p style="font-size:13px;line-height:1.75;opacity:0.7;margin:0 0 26px">
        You subscribed with <strong>${email}</strong>. No credit card, no Pro charge, just the free updates promised on the site.
      </p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:0 0 28px">
        ${rows}
      </table>
      <a href="${absoluteUrl('/free-preview')}" style="display:inline-block;background:#163cff;color:#fff;padding:14px 24px;font-size:12px;font-weight:800;letter-spacing:0.12em;text-decoration:none;text-transform:uppercase">
        Open Free Previews
      </a>
      <p style="font-size:11px;opacity:0.42;margin:30px 0 0;line-height:1.6">
        You can unsubscribe at any time by replying to this email with "unsubscribe".
      </p>
    </div>
  `;
}

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, 'newsletter', 8, 10 * 60_000);
  if (limited) return limited;

  const parsed = await readJsonBody<NewsletterBody>(req);
  if ('error' in parsed) return parsed.error;

  const email = normalizeEmail(parsed.data.email);
  const emailError = validateEmailAddress(email) || await validateEmailDomain(email);
  if (emailError) {
    return NextResponse.json({ error: emailError }, { status: 400 });
  }

  const emailLimit = await rateLimitIdentifier('newsletter-email', email, 3, 60 * 60_000);
  if (emailLimit) return emailLimit;

  const { alreadySubscribed } = await saveNewsletterSubscriber({ email });

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: process.env.NEWSLETTER_EMAIL_FROM || process.env.AUTH_EMAIL_FROM || 'WZPRO Meta <noreply@wzprometa.com>',
      to: process.env.RESEND_TO_OVERRIDE ?? email,
      subject: alreadySubscribed ? 'WZPRO Meta free newsletter is already active' : 'Welcome to the WZPRO Meta free newsletter',
      html: newsletterHtml(email),
    });

    if (error) {
      console.error('Newsletter confirmation email failed', error);
      return NextResponse.json({ error: 'Subscription saved, but the confirmation email could not be sent.' }, { status: 202 });
    }
  }

  return NextResponse.json({
    ok: true,
    alreadySubscribed,
  });
}
