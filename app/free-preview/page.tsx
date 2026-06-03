import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free Preview | WZPRO Meta',
  description: 'Preview selected Warzone meta tools, guides and performance insights before upgrading.',
};
import LocalizedLink from '@/components/LocalizedLink';
import { getSiteContent } from '@/lib/siteContent';

const freeItems = [
  {
    title: 'Weekly meta newsletter',
    eyebrow: 'Every week',
    body: 'A compact read on what changed, what matters, and what to test first before you waste sessions on stale setups.',
  },
  {
    title: 'Patch notes digest',
    eyebrow: 'After updates',
    body: 'Patch changes translated into practical loadout, perk, movement, map-control and settings decisions.',
  },
  {
    title: 'Resurgence map updates',
    eyebrow: 'Map flow',
    body: 'Rotation, spawn, power-position and regain notes when the playable flow changes across Resurgence maps.',
  },
  {
    title: 'New weapon tier alerts',
    eyebrow: 'Meta shifts',
    body: 'Early signals when a weapon climbs, falls, or needs a fresh attachment pass after tuning changes.',
  },
  {
    title: 'Community tips & tricks',
    eyebrow: 'Player notes',
    body: 'Useful setups, routines and small improvements collected for regular players who want cleaner games.',
  },
];

const patchHighlights = [
  {
    title: 'Black Ops Royale refresh',
    body: 'Black Ops Royale returned to playlist rotation with Hot Pursuit-style updates: stronger Last Stand health and Attachment Kits from Finishers or Target Uplink Terminal activity.',
  },
  {
    title: 'Endgame pressure increased',
    body: 'Final gas now clears Stims, Self-Revives and PDS from ground loot, which makes late circles less about gas stalling and more about position, trade timing and clean pushes.',
  },
  {
    title: 'Resurgence loot changed',
    body: 'Rebirth Island and Havens Hollow now share base/reusable box loot tables, with lower perk and Armor Satchel drop rates plus duplicate equipment prevention in normal boxes.',
  },
  {
    title: 'Cash is easier to read',
    body: 'Common cash piles moved from $250 to $300 and death cash now rounds to the nearest $100, making quick buy-station calls cleaner during fights.',
  },
];

const metaSignals = [
  ['MPC-25', 'Buff watch', 'More damage and range in the first two damage bands. Treat it as a stronger close-range test pick.'],
  ['Razor 9mm', 'Control nerf', 'ADS is slower and recoil increased in BR/Resurgence, so it is less automatic as a comfort SMG.'],
  ['Sturmwolf 45', 'Rising SMG', 'ADS improved from 190ms to 170ms, with a small range gain. Worth testing for aggressive Resurgence.'],
  ['MK.78', 'Long-range buff', 'Max range improved to 58m, ADS improved, and key recoil/barrel attachments got stronger.'],
  ['Sokol 545', 'Long-range buff', 'Range bands stretched hard and bullet velocity improved, making it a serious control/range candidate.'],
  ['XM325', 'Control buff', 'Range improved and horizontal recoil/deviation dropped by 12%, so it should feel steadier at mid-long range.'],
];

const mapNotes = [
  'Prematch Rejoin is now enabled in standard playlists and rejoin support extends through the end of the match, excluding Ranked Play.',
  'Avalon final-circle logic was adjusted toward more consistent competitive endgame areas.',
  'Avalon free Loadout Drop locations were adjusted so public-event drops should be less likely to land in awkward or unreachable spots.',
  'Weapon drops from eliminated players now have a 5-minute cleanup protection window unless the owner disconnects or is fully eliminated.',
];

const weeklyChecklist = [
  'Re-test your close-range slot: MPC-25 and Sturmwolf 45 are the first two SMGs to try after this tuning pass.',
  'Keep one stable long-range build ready: Sokol 545, MK.78 and XM325 all received changes that reward control-focused players.',
  'Play final circles earlier: with gas-stall items removed from final gas, rotate before you need the bailout.',
  'In Resurgence, do not assume perk/satchel comfort from boxes. Secure loadout, buy station and regain routes sooner.',
];

export default async function FreePreviewPage() {
  const { freePreview } = await getSiteContent();

  return (
    <>
      <main className="fp-main">
        <div className="fp-back">
          <LocalizedLink href="/pro-tools">{freePreview.backLabel}</LocalizedLink>
        </div>

        <section className="fp-hero" aria-labelledby="free-preview-title">
          <p className="fp-kicker">{freePreview.kicker}</p>
          <h1 id="free-preview-title">{freePreview.title}</h1>
          <p className="fp-lead">
            {freePreview.lead}
          </p>
          <div className="fp-actions">
            <LocalizedLink href="/subscribe" className="fp-btn fp-btn--primary">{freePreview.primaryCta}</LocalizedLink>
            <LocalizedLink href="/pro-access" className="fp-btn">{freePreview.secondaryCta}</LocalizedLink>
          </div>
        </section>

        <section className="fp-grid" aria-label="Free newsletter contents">
          {freeItems.map(item => (
            <article key={item.title} className="fp-card">
              <span>{item.eyebrow}</span>
              <h2>{item.title}</h2>
              <p>{item.body}</p>
            </article>
          ))}
        </section>

        <section className="fp-current" aria-labelledby="current-briefing-title">
          <div className="fp-current-head">
            <div>
              <p className="fp-kicker">Current free briefing</p>
              <h2 id="current-briefing-title">Warzone Season 03 Reloaded</h2>
            </div>
            <div className="fp-current-meta">
              <span>Patch checked: May 21, 2026</span>
              <a href="https://www.callofduty.com/patchnotes/2026/04/call-of-duty-bo7-warzone-season-03-reloaded-patch-notes" target="_blank" rel="noreferrer">
                Official patch notes
              </a>
            </div>
          </div>

          <div className="fp-patch-grid">
            {patchHighlights.map(item => (
              <article key={item.title} className="fp-patch-card">
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="fp-two-col" aria-label="Meta and map notes">
          <div className="fp-panel">
            <p className="fp-kicker">New weapon tier alerts</p>
            <h2>Meta signals to test</h2>
            <div className="fp-table">
              {metaSignals.map(([weapon, status, note]) => (
                <div key={weapon} className="fp-row">
                  <strong>{weapon}</strong>
                  <span>{status}</span>
                  <p>{note}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="fp-panel">
            <p className="fp-kicker">Resurgence map updates</p>
            <h2>Map and regain notes</h2>
            <ul className="fp-list">
              {mapNotes.map(note => <li key={note}>{note}</li>)}
            </ul>
          </div>
        </section>

        <section className="fp-checklist" aria-labelledby="weekly-checklist-title">
          <div>
            <p className="fp-kicker">Community tips & tricks</p>
            <h2 id="weekly-checklist-title">This week&apos;s quick checklist</h2>
          </div>
          <ol>
            {weeklyChecklist.map(item => <li key={item}>{item}</li>)}
          </ol>
        </section>

        <section className="fp-sample" aria-labelledby="sample-briefing-title">
          <div>
            <p className="fp-kicker">Sample briefing</p>
            <h2 id="sample-briefing-title">What a free email looks like</h2>
          </div>
          <div className="fp-briefing">
            <p><strong>Meta signal:</strong> check weapon tiers after every balancing patch before locking a ranked loadout.</p>
            <p><strong>Map note:</strong> track regain routes and squad spacing when Resurgence zones pull away from safe rooftops.</p>
            <p><strong>Player tip:</strong> keep one low-recoil build and one mobility build ready so you can adapt without rebuilding mid-session.</p>
          </div>
        </section>
      </main>

      <style>{`
        .fp-main {
          max-width: 1040px;
          margin: 0 auto;
          padding: 4.5rem 1.5rem 6rem;
        }

        .fp-back a,
        .fp-kicker,
        .fp-btn,
        .fp-card span {
          font-family: var(--font-mono, monospace);
          text-transform: uppercase;
        }

        .fp-back a {
          color: inherit;
          font-size: 0.65rem;
          letter-spacing: 0.16em;
          opacity: 0.45;
          text-decoration: none;
        }

        .fp-back a:hover { opacity: 0.9; }

        .fp-hero {
          padding: 4rem 0 3rem;
          border-bottom: 1px solid rgba(0, 0, 0, 0.12);
        }

        .fp-kicker {
          margin: 0 0 1rem;
          font-size: 0.65rem;
          letter-spacing: 0.2em;
          opacity: 0.45;
        }

        .fp-hero h1 {
          margin: 0;
          max-width: 760px;
          font-family: var(--font-mono, monospace);
          font-size: clamp(2.4rem, 8vw, 5.6rem);
          line-height: 0.92;
          letter-spacing: 0;
          text-transform: uppercase;
        }

        .fp-lead {
          max-width: 640px;
          margin: 1.5rem 0 0;
          font-family: var(--font-mono, monospace);
          font-size: 0.86rem;
          line-height: 1.8;
          opacity: 0.68;
        }

        .fp-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          margin-top: 2rem;
        }

        .fp-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          padding: 0.85rem 1.1rem;
          border: 1px solid rgba(0, 0, 0, 0.2);
          color: inherit;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-decoration: none;
        }

        .fp-btn--primary {
          background: #10100e;
          border-color: #10100e;
          color: #fff;
        }

        .fp-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          border-left: 1px solid rgba(0, 0, 0, 0.12);
          margin-top: 3rem;
        }

        .fp-card {
          min-height: 250px;
          padding: 1.25rem;
          border-top: 1px solid rgba(0, 0, 0, 0.12);
          border-right: 1px solid rgba(0, 0, 0, 0.12);
          border-bottom: 1px solid rgba(0, 0, 0, 0.12);
          background: rgba(255, 255, 255, 0.28);
        }

        .fp-card span {
          display: block;
          margin-bottom: 1.8rem;
          font-size: 0.58rem;
          letter-spacing: 0.18em;
          opacity: 0.42;
        }

        .fp-card h2 {
          margin: 0 0 0.85rem;
          font-family: var(--font-mono, monospace);
          font-size: 0.95rem;
          line-height: 1.3;
          letter-spacing: 0;
          text-transform: uppercase;
        }

        .fp-card p,
        .fp-briefing p {
          margin: 0;
          font-family: var(--font-mono, monospace);
          font-size: 0.72rem;
          line-height: 1.75;
          opacity: 0.64;
        }

        .fp-sample {
          display: grid;
          grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
          gap: 2rem;
          margin-top: 3rem;
          padding-top: 3rem;
          border-top: 1px solid rgba(0, 0, 0, 0.12);
        }

        .fp-sample h2 {
          margin: 0;
          font-family: var(--font-mono, monospace);
          font-size: clamp(1.4rem, 4vw, 2.4rem);
          line-height: 1.05;
          letter-spacing: 0;
          text-transform: uppercase;
        }

        .fp-briefing {
          display: grid;
          gap: 1rem;
          padding: 1.5rem;
          border: 1px solid rgba(0, 0, 0, 0.12);
          background: rgba(0, 0, 0, 0.035);
        }

        .fp-current {
          margin-top: 3rem;
          padding-top: 3rem;
          border-top: 1px solid rgba(0, 0, 0, 0.12);
        }

        .fp-current-head {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .fp-current h2,
        .fp-panel h2,
        .fp-checklist h2 {
          margin: 0;
          font-family: var(--font-mono, monospace);
          font-size: clamp(1.4rem, 4vw, 2.6rem);
          line-height: 1.05;
          letter-spacing: 0;
          text-transform: uppercase;
        }

        .fp-current-meta {
          display: grid;
          gap: 0.5rem;
          justify-items: end;
          font-family: var(--font-mono, monospace);
          font-size: 0.65rem;
          line-height: 1.5;
          text-transform: uppercase;
        }

        .fp-current-meta span {
          opacity: 0.5;
        }

        .fp-current-meta a {
          color: #163cff;
          letter-spacing: 0.1em;
          text-decoration: none;
        }

        .fp-patch-grid,
        .fp-two-col {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          border-left: 1px solid rgba(0, 0, 0, 0.12);
        }

        .fp-patch-card,
        .fp-panel,
        .fp-checklist {
          border: 1px solid rgba(0, 0, 0, 0.12);
          border-left: 0;
          background: rgba(255, 255, 255, 0.24);
        }

        .fp-patch-card {
          min-height: 210px;
          padding: 1.25rem;
        }

        .fp-patch-card h3 {
          margin: 0 0 0.9rem;
          font-family: var(--font-mono, monospace);
          font-size: 0.9rem;
          line-height: 1.35;
          letter-spacing: 0;
          text-transform: uppercase;
        }

        .fp-patch-card p,
        .fp-row p,
        .fp-list li,
        .fp-checklist li {
          margin: 0;
          font-family: var(--font-mono, monospace);
          font-size: 0.72rem;
          line-height: 1.75;
          opacity: 0.64;
        }

        .fp-two-col {
          grid-template-columns: 1.2fr 0.8fr;
          margin-top: 3rem;
        }

        .fp-panel {
          padding: 1.5rem;
        }

        .fp-table {
          display: grid;
          gap: 0;
          margin-top: 1.5rem;
          border-top: 1px solid rgba(0, 0, 0, 0.1);
        }

        .fp-row {
          display: grid;
          grid-template-columns: 0.7fr 0.55fr 1.75fr;
          gap: 1rem;
          padding: 0.9rem 0;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
          align-items: start;
        }

        .fp-row strong,
        .fp-row span {
          font-family: var(--font-mono, monospace);
          font-size: 0.7rem;
          line-height: 1.45;
          text-transform: uppercase;
        }

        .fp-row span {
          color: #163cff;
        }

        .fp-list {
          display: grid;
          gap: 0.9rem;
          margin: 1.5rem 0 0;
          padding: 0;
          list-style: none;
        }

        .fp-list li {
          padding-left: 1.1rem;
          position: relative;
        }

        .fp-list li::before {
          content: '-';
          position: absolute;
          left: 0;
          opacity: 0.45;
        }

        .fp-checklist {
          display: grid;
          grid-template-columns: 0.75fr 1.25fr;
          gap: 2rem;
          margin-top: 3rem;
          padding: 1.5rem;
          border-left: 1px solid rgba(0, 0, 0, 0.12);
        }

        .fp-checklist ol {
          display: grid;
          gap: 0.85rem;
          margin: 0;
          padding-left: 1.2rem;
        }

        .fp-briefing strong {
          opacity: 1;
        }

        @media (max-width: 900px) {
          .fp-grid,
          .fp-patch-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .fp-current-head,
          .fp-sample,
          .fp-two-col,
          .fp-checklist {
            grid-template-columns: 1fr;
            display: grid;
          }

          .fp-current-meta {
            justify-items: start;
          }

          .fp-row {
            grid-template-columns: 1fr;
            gap: 0.35rem;
          }
        }

        @media (max-width: 560px) {
          .fp-main {
            padding: 3rem 1rem 4rem;
          }

          .fp-hero {
            padding-top: 3rem;
          }

          .fp-grid,
          .fp-patch-grid {
            grid-template-columns: 1fr;
          }

          .fp-card {
            min-height: 0;
          }

          .fp-actions,
          .fp-btn {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}
