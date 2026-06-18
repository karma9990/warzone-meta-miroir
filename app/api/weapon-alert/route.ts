import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { isAuthenticated } from '@/lib/auth';
import type { Loadout } from '@/lib/data';
import { getLoadouts } from '@/lib/data';
import { calculateMetaScore } from '@/lib/loadoutUtils';
import { rateLimit } from '@/lib/rateLimit';
import { readJsonBody } from '@/lib/security';
import { absoluteUrl } from '@/lib/siteConfig';
import { findLoadoutByRouteId, getLoadoutPath } from '@/lib/seo';
import { getWeaponWatchers } from '@/lib/weaponWatchStore';

export const dynamic = 'force-dynamic';

type AlertBody = { weaponId?: unknown };

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function alertHtml(loadout: Loadout) {
  const buildUrl = absoluteUrl(getLoadoutPath(loadout));
  const weapon = escapeHtml(loadout.weapon);
  const score = calculateMetaScore(loadout);
  const attachments = loadout.attachments
    .map((attachment) => `<li style="margin:0 0 4px">${escapeHtml(attachment.slot)}: <strong>${escapeHtml(attachment.name)}</strong></li>`)
    .join('');

  return `
    <div style="font-family:monospace;max-width:560px;margin:0 auto;padding:40px 24px;background:#faf7ef;color:#10100e">
      <p style="font-size:11px;letter-spacing:0.2em;opacity:0.45;margin:0 0 28px">WZPRO META / META ALERT</p>
      <h1 style="font-size:24px;letter-spacing:0.04em;line-height:1.14;margin:0 0 14px;text-transform:uppercase">${weapon} meta updated</h1>
      <p style="font-size:13px;line-height:1.75;opacity:0.7;margin:0 0 22px">
        The <strong>${weapon}</strong> build you are watching changed. It is now ranked
        <strong>Tier ${escapeHtml(loadout.tier)}</strong> / ${escapeHtml(loadout.playstyle)} with a ${score} meta score.
      </p>
      <ul style="list-style:none;padding:0;margin:0 0 26px;font-size:12px;line-height:1.6;opacity:0.78">${attachments}</ul>
      <a href="${buildUrl}" style="display:inline-block;background:#163cff;color:#fff;padding:14px 24px;font-size:12px;font-weight:800;letter-spacing:0.12em;text-decoration:none;text-transform:uppercase">
        Open the updated build
      </a>
      <p style="font-size:11px;opacity:0.42;margin:30px 0 0;line-height:1.6">
        You receive this because you follow ${weapon} on WZPRO Meta. Open the build above and tap the watch button again to stop these alerts.
      </p>
    </div>
  `;
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limited = await rateLimit(req, 'weapon-alert', 20, 10 * 60_000);
  if (limited) return limited;

  const parsed = await readJsonBody<AlertBody>(req);
  if ('error' in parsed) return parsed.error;

  const weaponId = typeof parsed.data.weaponId === 'string' ? parsed.data.weaponId.trim() : '';
  if (!weaponId) {
    return NextResponse.json({ error: 'weaponId is required.' }, { status: 400 });
  }

  const loadouts = await getLoadouts();
  const loadout = findLoadoutByRouteId(loadouts, weaponId);
  if (!loadout) {
    return NextResponse.json({ error: 'Unknown weapon.' }, { status: 404 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Email sending is not configured.' }, { status: 503 });
  }

  const watchers = await getWeaponWatchers(loadout.weaponId || loadout.id);
  if (watchers.length === 0) {
    return NextResponse.json({ sent: 0, watchers: 0 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.NEWSLETTER_EMAIL_FROM || process.env.AUTH_EMAIL_FROM || 'WZPRO Meta <noreply@wzprometa.com>';
  const subject = `${loadout.weapon} meta updated on WZPRO Meta`;
  const html = alertHtml(loadout);

  // Send one email per watcher so the recipient list is never exposed.
  const results = await Promise.allSettled(
    watchers.map((email) =>
      resend.emails.send({
        from,
        to: process.env.RESEND_TO_OVERRIDE ?? email,
        subject,
        html,
      }),
    ),
  );

  const sent = results.filter((result) => result.status === 'fulfilled' && !result.value.error).length;
  const failed = watchers.length - sent;
  if (failed > 0) {
    console.error(`weapon-alert: ${failed}/${watchers.length} emails failed for ${loadout.weaponId || loadout.id}`);
  }

  return NextResponse.json({ sent, failed, watchers: watchers.length });
}
