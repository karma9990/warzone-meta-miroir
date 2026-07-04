import { NextResponse, type NextRequest } from 'next/server';
import { Resend } from 'resend';
import { getLoadouts } from '@/lib/data';
import { recordMetaSnapshot, type MetaChange } from '@/lib/metaHistoryStore';
import { getWeaponWatchers } from '@/lib/weaponWatchStore';
import { broadcastPush } from '@/lib/webPush';
import { absoluteUrl } from '@/lib/siteConfig';
import { hasLLM, llmComplete } from '@/lib/llm';
import { requireCronSecret } from '@/lib/security';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function changeLine(change: MetaChange) {
  const arrow = change.direction === 'up' ? '▲' : '▼';
  return `${arrow} ${change.weapon}: ${change.fromTier} → ${change.toTier}`;
}

// Resume coach genere par le LLM (Groq), avec repli mecanique si indisponible.
async function coachSummary(changes: MetaChange[]): Promise<string | null> {
  if (!hasLLM() || changes.length === 0) return null;

  const facts = changes
    .map((c) => `${c.direction === 'up' ? 'BUFF' : 'NERF'} ${c.weapon}: tier ${c.fromTier}->${c.toTier} (meta ${c.scoreDelta >= 0 ? '+' : ''}${c.scoreDelta})`)
    .join('; ');

  try {
    const { content } = await llmComplete({
      title: 'WZPRO Meta Weapon Watch',
      temperature: 0.4,
      maxTokens: 120,
      messages: [
        {
          role: 'system',
          content: 'You are a Warzone meta coach. Write ONE short punchy English sentence (max 160 characters) summarizing these weapon tier changes for a push notification. No emojis, no markdown, no preamble, just the sentence.',
        },
        { role: 'user', content: facts },
      ],
    });
    const clean = content.replace(/\s+/g, ' ').trim().replace(/^["']|["']$/g, '');
    return clean ? clean.slice(0, 180) : null;
  } catch {
    return null;
  }
}

function digestHtml(changes: MetaChange[], summary?: string | null) {
  const intro = summary
    ? `<p style="font-size:13px;line-height:1.6;margin:0 0 22px;color:#10100e">${summary}</p>`
    : '';
  const rows = changes.map((change) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid rgba(0,0,0,0.1)">
        <p style="font-size:13px;font-weight:800;margin:0;color:${change.direction === 'up' ? '#1f8f4d' : '#c0392b'}">
          ${change.direction === 'up' ? 'BUFF' : 'NERF'} — ${change.weapon}
        </p>
        <p style="font-size:12px;line-height:1.6;opacity:0.7;margin:4px 0 0;color:#10100e">
          Tier ${change.fromTier} → ${change.toTier} (meta ${change.scoreDelta >= 0 ? '+' : ''}${change.scoreDelta})
        </p>
      </td>
    </tr>`).join('');

  return `
    <div style="font-family:monospace;max-width:560px;margin:0 auto;padding:40px 24px;background:#faf7ef;color:#10100e">
      <p style="font-size:11px;letter-spacing:0.2em;opacity:0.45;margin:0 0 24px">WZPRO META / WEAPON WATCH</p>
      <h1 style="font-size:24px;letter-spacing:0.04em;line-height:1.15;margin:0 0 14px;text-transform:uppercase">Meta update on a weapon you follow</h1>
      ${intro}
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:0 0 26px">${rows}</table>
      <a href="${absoluteUrl('/meta-trends')}" style="display:inline-block;background:#163cff;color:#fff;padding:13px 22px;font-size:12px;font-weight:800;letter-spacing:0.12em;text-decoration:none;text-transform:uppercase">See meta trends</a>
      <p style="font-size:11px;opacity:0.42;margin:28px 0 0;line-height:1.6">You receive this because you asked to watch this weapon on wzprometa.com.</p>
    </div>`;
}

async function notifyWatchers(changes: MetaChange[]) {
  if (changes.length === 0 || !process.env.RESEND_API_KEY) return { emails: 0 };

  // Group changes by watcher email so each person gets a single message.
  const perEmail = new Map<string, MetaChange[]>();
  for (const change of changes) {
    const watchers = await getWeaponWatchers(change.weaponId);
    for (const email of watchers) {
      const list = perEmail.get(email) ?? [];
      list.push(change);
      perEmail.set(email, list);
    }
  }

  if (perEmail.size === 0) return { emails: 0 };

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.NEWSLETTER_EMAIL_FROM || process.env.AUTH_EMAIL_FROM || 'WZPRO Meta <noreply@wzprometa.com>';
  let sent = 0;

  // Memoise le resume coach par jeu de changements: plusieurs watchers qui
  // suivent les memes armes partagent un seul appel LLM.
  const summaryCache = new Map<string, Promise<string | null>>();
  const summaryFor = (list: MetaChange[]) => {
    const key = list.map((c) => `${c.weaponId}:${c.toTier}`).sort().join('|');
    let pending = summaryCache.get(key);
    if (!pending) {
      pending = coachSummary(list);
      summaryCache.set(key, pending);
    }
    return pending;
  };

  await Promise.all(
    [...perEmail.entries()].map(async ([email, list]) => {
      try {
        const summary = await summaryFor(list);
        await resend.emails.send({
          from,
          to: process.env.RESEND_TO_OVERRIDE ?? email,
          subject: `WZPRO Meta — ${list.length === 1 ? list[0].weapon : `${list.length} weapons`} changed tier`,
          html: digestHtml(list, summary),
        });
        sent += 1;
      } catch (error) {
        console.error('Weapon watch email failed', error);
      }
    }),
  );

  return { emails: sent };
}

export async function GET(req: NextRequest) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  const loadouts = await getLoadouts();
  const { snapshot, changes } = await recordMetaSnapshot(loadouts);

  const pushSummary = await coachSummary(changes);

  const [emailResult, pushResult] = await Promise.all([
    notifyWatchers(changes),
    changes.length > 0
      ? broadcastPush({
          title: 'WZPRO Meta update',
          body: pushSummary || changes.slice(0, 3).map(changeLine).join('  '),
          url: '/meta-trends',
        })
      : Promise.resolve({ sent: 0, failed: 0 }),
  ]);

  return NextResponse.json({
    date: snapshot.date,
    weapons: Object.keys(snapshot.weapons).length,
    changes: changes.length,
    emails: emailResult.emails,
    push: pushResult,
  });
}
