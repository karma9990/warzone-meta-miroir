import Link from 'next/link';
import { redirect } from 'next/navigation';
import AccountActions from '@/components/AccountActions';
import AccountLoadoutPrefs from '@/components/AccountLoadoutPrefs';
import AccountProfileForm from '@/components/AccountProfileForm';
import StatsTracker from '@/components/StatsTracker';
import { getLoadouts } from '@/lib/data';
import { getEntitlements, type EntitlementRecord } from '@/lib/entitlementStore';
import { emptyProfile, getProfile } from '@/lib/profileStore';
import { PRO_TOOL_IDS, type ProToolId } from '@/lib/toolAccess';
import { getUserSession } from '@/lib/userAuth';

export const dynamic = 'force-dynamic';

const TOOL_LABELS: Record<ProToolId, { name: string; tag: string; desc: string }> = {
  'aim-tools': {
    name: 'Aim Tools',
    tag: 'PRECISION',
    desc: 'Sensitivity, ADS, dead zone, recoil and aim training utilities.',
  },
  'next-meta': {
    name: 'Next Meta',
    tag: 'INTEL',
    desc: 'Meta shift notes, perk reads and equipment direction.',
  },
  'pro-movement': {
    name: 'Pro Movement',
    tag: 'MECHANICS',
    desc: 'Slide cancel, peeking, rotation timing and high ground control.',
  },
  'how-to-be-a-pro': {
    name: 'How To Be A Pro',
    tag: 'MINDSET',
    desc: 'Training structure, VOD review, habits and performance tracking.',
  },
  'pro-spawn': {
    name: 'Pro Spawn',
    tag: 'MAP CONTROL',
    desc: 'Spawn control, hot drop plans and resurgence map routes.',
  },
  'pro-opti': {
    name: 'Pro Opti',
    tag: 'PERFORMANCE',
    desc: 'PC, Windows, graphics, audio, network and latency optimisation.',
  },
};

function mergeEntitlements(records: Array<EntitlementRecord | null>) {
  const tools = new Set<ProToolId>();
  let pro = false;
  let updatedAt = '';

  for (const record of records) {
    if (!record) continue;
    if (record.pro) pro = true;
    for (const tool of record.tools) tools.add(tool);
    if (record.updatedAt > updatedAt) updatedAt = record.updatedAt;
  }

  return {
    pro,
    tools: Array.from(tools),
    updatedAt,
  };
}

function formatDate(value: string) {
  if (!value) return 'No purchase recorded yet';
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export default async function AccountPage() {
  const user = await getUserSession();
  if (!user) redirect('/sign-in');

  const userEntitlements = await getEntitlements(user.sub);
  const emailEntitlements = user.email ? await getEntitlements(user.email.toLowerCase()) : null;
  const profile = await getProfile(user.sub) || emptyProfile({
    userId: user.sub,
    email: user.email,
    name: user.name,
    picture: user.picture,
  });
  const entitlements = mergeEntitlements([userEntitlements, emailEntitlements]);
  const loadouts = getLoadouts();
  const unlockedTools = entitlements.pro ? [...PRO_TOOL_IDS] : entitlements.tools;
  const unlockedCount = unlockedTools.length;

  return (
    <>
      <main className="account-main">
        <div className="account-back">
          <Link href="/">WZPRO Meta</Link>
        </div>

        <header className="account-header">
          <div>
            <p className="account-kicker">ACCOUNT ACCESS</p>
            <h1>YOUR ACCOUNT</h1>
            <p className="account-sub">
              Manage your profile, purchased Pro tools and performance tracker from one place.
            </p>
          </div>
          <AccountActions />
        </header>

        <section className="account-grid">
          <article className="account-panel account-profile">
            <span className="account-panel-tag">PROFILE</span>
            <h2>{user.name}</h2>
            <dl>
              <div>
                <dt>Email</dt>
                <dd>{user.email || 'No email provided'}</dd>
              </div>
              <div>
                <dt>Provider</dt>
                <dd>{user.provider === 'google' ? 'Google OAuth' : user.provider === 'battlenet' ? 'Battle.net OAuth' : user.provider === 'apple' ? 'Apple OAuth' : 'Email account'}</dd>
              </div>
              <div>
                <dt>Access</dt>
                <dd>{entitlements.pro ? 'Full Pro subscription' : unlockedCount > 0 ? `${unlockedCount} tool${unlockedCount > 1 ? 's' : ''} unlocked` : 'Free account'}</dd>
              </div>
              <div>
                <dt>Last update</dt>
                <dd>{formatDate(entitlements.updatedAt)}</dd>
              </div>
            </dl>
          </article>

          <article className="account-panel account-summary">
            <span className="account-panel-tag">PURCHASES</span>
            <strong>{unlockedCount}/6</strong>
            <p>
              {entitlements.pro
                ? 'Every Pro tool is available while the subscription is active.'
                : unlockedCount > 0
                  ? 'Your purchased monthly tools are available from this account.'
                  : 'No paid Pro tool is linked to this account yet.'}
            </p>
            <Link href="/tools-individual">Browse tools</Link>
          </article>
        </section>

        <section className="account-section">
          <div className="account-section-head">
            <span>BILLING</span>
            <h2>Access history</h2>
            <p>Current account entitlements linked to your user ID and email.</p>
          </div>
          <div className="account-history">
            <article>
              <span>Status</span>
              <strong>{entitlements.pro ? 'Full Pro subscription' : unlockedCount > 0 ? 'Individual tools' : 'Free account'}</strong>
              <small>{formatDate(entitlements.updatedAt)}</small>
            </article>
            <article>
              <span>Unlocked tools</span>
              <strong>{unlockedCount}/6</strong>
              <small>{unlockedTools.length ? unlockedTools.map((toolId) => TOOL_LABELS[toolId].name).join(', ') : 'No paid tools linked yet'}</small>
            </article>
          </div>
        </section>

        <section className="account-section" id="public-profile-settings">
          <AccountProfileForm profile={profile} />
        </section>

        <section className="account-section">
          <div className="account-section-head">
            <span>LOADOUTS</span>
            <h2>Favorites and private notes</h2>
            <p>Favorite builds for quick access and keep account-synced notes only you can see.</p>
          </div>
          <AccountLoadoutPrefs
            loadouts={loadouts}
            initialFavorites={profile.favoriteLoadouts}
            initialNotes={profile.loadoutNotes}
          />
        </section>

        <section className="account-section">
          <div className="account-section-head">
            <span>LIBRARY</span>
            <h2>Your Pro Tools</h2>
          </div>
          <div className="account-tools">
            {PRO_TOOL_IDS.map((toolId) => {
              const tool = TOOL_LABELS[toolId];
              const unlocked = entitlements.pro || entitlements.tools.includes(toolId);
              return (
                <article key={toolId} className={`account-tool ${unlocked ? 'is-unlocked' : 'is-locked'}`}>
                  <div>
                    <span>{tool.tag}</span>
                    <h3>{tool.name}</h3>
                    <p>{tool.desc}</p>
                  </div>
                  {unlocked ? (
                    <Link href={`/tools/${toolId}`}>Open tool</Link>
                  ) : (
                    <Link href="/tools-individual">Unlock</Link>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className="account-section">
          <div className="account-section-head">
            <span>TRACKER</span>
            <h2>Performance Log</h2>
            <p>Saved to your account, with a local browser copy as fallback.</p>
            {profile.pseudo && profile.privacy.publicProfile && profile.privacy.stats ? (
              <Link className="account-share-stats" href={`/profile/${profile.pseudo}/stats`}>
                Open share card
              </Link>
            ) : (
              <Link className="account-share-stats account-share-stats--setup" href="#public-profile-settings">
                Set pseudo to share
              </Link>
            )}
          </div>
          <StatsTracker initialEntries={profile.statsEntries} syncToAccount />
        </section>
      </main>

      <style>{`
        .account-main {
          max-width: 980px;
          margin: 0 auto;
          padding: 4rem 2rem 6rem;
        }

        .account-back a,
        .account-kicker,
        .account-panel-tag,
        .account-section-head span,
        .account-tool span {
          font-family: var(--font-mono, monospace);
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .account-back a {
          color: inherit;
          font-size: 0.65rem;
          opacity: 0.45;
          text-decoration: none;
        }

        .account-header {
          display: flex;
          justify-content: space-between;
          gap: 1.5rem;
          align-items: end;
          border-bottom: 1px solid rgba(0,0,0,0.14);
          padding: 3rem 0 2rem;
          margin-bottom: 2rem;
        }

        .account-kicker,
        .account-panel-tag,
        .account-section-head span,
        .account-tool span {
          color: blue;
          font-size: 0.6rem;
          margin: 0 0 0.45rem;
        }

        .account-header h1 {
          font-family: var(--font-mono, monospace);
          font-size: clamp(2.1rem, 6vw, 4rem);
          letter-spacing: 0.1em;
          line-height: 0.95;
          margin: 0 0 1rem;
        }

        .account-sub,
        .account-summary p,
        .account-tool p,
        .account-section-head p {
          font-family: var(--font-mono, monospace);
          font-size: 0.78rem;
          line-height: 1.7;
          opacity: 0.62;
          margin: 0;
        }

        .account-share-stats {
          display: inline-grid;
          min-height: 40px;
          place-items: center;
          margin-top: 0.75rem;
          padding: 0 0.85rem;
          border: 1px solid rgba(22,60,255,0.28);
          background: #163cff;
          color: #fff;
          font-family: var(--font-mono, monospace);
          font-size: 0.68rem;
          font-weight: 950;
          text-decoration: none;
          text-transform: uppercase;
        }

        .account-share-stats--setup {
          background: transparent;
          color: #163cff;
        }

        .account-action {
          min-height: 42px;
          padding: 0 1rem;
          border: 1px solid rgba(0,0,0,0.18);
          background: rgba(0,0,0,0.06);
          color: inherit;
          cursor: pointer;
          font-family: var(--font-mono, monospace);
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .account-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.4fr) minmax(260px, 0.6fr);
          gap: 1px;
          border: 1px solid rgba(0,0,0,0.12);
          background: rgba(0,0,0,0.12);
          margin-bottom: 3rem;
        }

        .account-panel {
          background: rgba(240,240,235,0.74);
          padding: 1.5rem;
        }

        .account-profile h2 {
          font-family: var(--font-mono, monospace);
          font-size: 1.25rem;
          letter-spacing: 0.08em;
          margin: 0 0 1.25rem;
        }

        .account-profile dl {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1px;
          background: rgba(0,0,0,0.1);
          border: 1px solid rgba(0,0,0,0.1);
          margin: 0;
        }

        .account-profile div {
          background: rgba(250,247,239,0.68);
          padding: 0.85rem;
          min-width: 0;
        }

        .account-profile dt {
          font-family: var(--font-mono, monospace);
          font-size: 0.52rem;
          letter-spacing: 0.14em;
          opacity: 0.42;
          text-transform: uppercase;
          margin-bottom: 0.35rem;
        }

        .account-profile dd {
          font-family: var(--font-mono, monospace);
          font-size: 0.72rem;
          margin: 0;
          overflow-wrap: anywhere;
        }

        .account-summary {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .account-summary strong {
          color: blue;
          font-family: var(--font-mono, monospace);
          font-size: 3rem;
          line-height: 1;
        }

        .account-summary a,
        .account-tool a {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          padding: 0 1rem;
          background: blue;
          color: white;
          font-family: var(--font-mono, monospace);
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-decoration: none;
          text-transform: uppercase;
        }

        .account-section {
          margin-top: 3rem;
        }

        .account-profile-form {
          display: grid;
          gap: 2.5rem;
          font-family: var(--font-mono, monospace);
        }

        .account-edit-block {
          display: grid;
          gap: 1rem;
        }

        .account-edit-head {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: end;
        }

        .account-edit-head h2 {
          margin: 0;
          font-size: 1.55rem;
          font-weight: 400;
          letter-spacing: 0;
        }

        .account-edit-head p,
        .account-profile-actions p {
          margin: 0;
          color: rgba(16,16,14,0.48);
          font-size: 0.68rem;
          font-style: italic;
          line-height: 1.5;
        }

        .account-general-grid {
          display: grid;
          grid-template-columns: 120px minmax(0, 1fr) minmax(0, 1fr);
          gap: 0.75rem;
          align-items: end;
        }

        .account-avatar-card {
          grid-row: span 2;
          display: grid;
          min-height: 120px;
          place-items: center;
          align-content: center;
          gap: 0.45rem;
          border: 1px solid rgba(22,60,255,0.4);
          background: rgba(22,60,255,0.04);
          color: var(--tm-ink, #10100e);
          text-align: center;
          overflow: hidden;
        }

        .account-avatar-card i {
          width: 54px;
          height: 54px;
          border-radius: 999px;
          background-position: center;
          background-size: cover;
        }

        .account-avatar-card span {
          display: grid;
          width: 54px;
          height: 54px;
          place-items: center;
          border-radius: 999px;
          background: rgba(16,16,14,0.12);
          color: blue;
          font-size: 0.82rem;
          font-weight: 950;
        }

        .account-avatar-card strong {
          max-width: 100%;
          padding: 0 0.35rem;
          font-size: 0.66rem;
          overflow-wrap: anywhere;
        }

        .account-two-col {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.75rem;
        }

        .account-avatar-crop,
        .account-privacy-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.75rem;
        }

        .account-privacy-grid {
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        }

        .account-public-switch {
          min-height: 42px;
          border: 1px solid rgba(0,0,0,0.14);
          background: rgba(16,16,14,0.055);
          color: rgba(16,16,14,0.72);
          cursor: pointer;
          font-family: var(--font-mono, monospace);
          font-size: 0.68rem;
          font-weight: 900;
          padding: 0 1rem;
          text-transform: uppercase;
        }

        .account-public-switch.is-public {
          border-color: rgba(22,60,255,0.45);
          background: rgba(22,60,255,0.1);
          color: #163cff;
        }

        .account-public-switch.is-private {
          border-color: rgba(195,38,38,0.34);
          background: rgba(195,38,38,0.08);
          color: #a12222;
        }

        .account-profile-form label {
          display: grid;
          gap: 0.35rem;
          color: rgba(16,16,14,0.52);
          font-size: 0.67rem;
          font-weight: 900;
          text-transform: uppercase;
        }

        .account-profile-form input,
        .account-profile-form select,
        .account-profile-form textarea {
          width: 100%;
          min-height: 42px;
          border: 1px solid rgba(0,0,0,0.12);
          border-radius: 0;
          background: rgba(16,16,14,0.055);
          color: inherit;
          font: inherit;
          font-size: 0.72rem;
          padding: 0 0.7rem;
        }

        .account-profile-form input[type="range"] {
          min-height: 28px;
          padding: 0;
          accent-color: blue;
        }

        .account-toggle {
          min-height: 44px;
          display: flex !important;
          grid-template-columns: auto 1fr;
          align-items: center;
          gap: 0.6rem !important;
          border: 1px solid rgba(0,0,0,0.12);
          background: rgba(16,16,14,0.035);
          padding: 0 0.75rem;
        }

        .account-toggle input {
          width: 16px;
          min-height: 16px;
          accent-color: blue;
        }

        .account-profile-form textarea {
          min-height: 110px;
          padding-top: 0.75rem;
          resize: vertical;
        }

        .account-profile-actions {
          display: flex;
          gap: 1rem;
          align-items: center;
          justify-content: space-between;
        }

        .account-profile-action-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .account-profile-actions button {
          min-height: 42px;
          border: 0;
          background: blue;
          color: white;
          cursor: pointer;
          font: inherit;
          font-size: 0.68rem;
          font-weight: 900;
          padding: 0 1.15rem;
          text-transform: uppercase;
        }

        .account-profile-actions .account-public-switch {
          border: 1px solid rgba(22,60,255,0.45);
          background: transparent;
          color: #163cff;
        }

        .account-profile-actions .account-public-switch.is-private {
          border-color: rgba(195,38,38,0.34);
          color: #a12222;
        }

        .account-profile-actions button:disabled {
          opacity: 0.62;
          cursor: not-allowed;
        }

        .account-profile-actions p.is-error {
          color: #c32626;
        }

        .account-loadout-prefs {
          display: grid;
          gap: 1rem;
          font-family: var(--font-mono, monospace);
        }

        .account-history {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1px;
          border: 1px solid rgba(0,0,0,0.12);
          background: rgba(0,0,0,0.12);
          font-family: var(--font-mono, monospace);
        }

        .account-history article {
          display: grid;
          gap: 0.5rem;
          background: rgba(240,240,235,0.74);
          padding: 1.1rem;
        }

        .account-history span {
          color: blue;
          font-size: 0.62rem;
          font-weight: 950;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .account-history strong {
          font-size: 1rem;
          text-transform: uppercase;
        }

        .account-history small {
          color: rgba(16,16,14,0.5);
          font-size: 0.7rem;
          line-height: 1.55;
        }

        .account-favorites {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          min-height: 42px;
          align-items: center;
        }

        .account-favorites a {
          display: inline-flex;
          gap: 0.5rem;
          align-items: center;
          border: 1px solid rgba(22,60,255,0.24);
          color: inherit;
          padding: 0.5rem 0.7rem;
          text-decoration: none;
        }

        .account-favorites span {
          color: blue;
          font-weight: 950;
        }

        .account-favorites p,
        .account-loadout-status {
          margin: 0;
          color: rgba(16,16,14,0.48);
          font-size: 0.72rem;
        }

        .account-loadout-pref-list {
          display: grid;
          gap: 1px;
          border: 1px solid rgba(0,0,0,0.12);
          background: rgba(0,0,0,0.12);
        }

        .account-loadout-pref-list article {
          display: grid;
          grid-template-columns: minmax(220px, 0.8fr) minmax(0, 1.2fr);
          gap: 1rem;
          background: rgba(240,240,235,0.74);
          padding: 1rem;
        }

        .account-loadout-pref-list article > div {
          display: grid;
          gap: 0.35rem;
          align-content: start;
        }

        .account-loadout-pref-list button {
          width: fit-content;
          border: 1px solid blue;
          background: transparent;
          color: blue;
          cursor: pointer;
          font: inherit;
          font-size: 0.62rem;
          font-weight: 900;
          padding: 0.35rem 0.55rem;
          text-transform: uppercase;
        }

        .account-loadout-pref-list a {
          color: inherit;
          font-size: 0.86rem;
          font-weight: 950;
          text-decoration: none;
          text-transform: uppercase;
        }

        .account-loadout-pref-list small {
          color: rgba(16,16,14,0.48);
          font-size: 0.66rem;
        }

        .account-loadout-pref-list textarea {
          min-height: 86px;
          border: 1px solid rgba(0,0,0,0.12);
          background: rgba(16,16,14,0.045);
          color: inherit;
          font: inherit;
          font-size: 0.72rem;
          padding: 0.75rem;
          resize: vertical;
        }

        .account-profile-form input[type="file"] {
          padding: 0.72rem 0.7rem;
        }

        .account-profile-form input::file-selector-button {
          border: 0;
          background: blue;
          color: white;
          cursor: pointer;
          font: inherit;
          font-size: 0.62rem;
          font-weight: 900;
          margin-right: 0.75rem;
          padding: 0.42rem 0.7rem;
          text-transform: uppercase;
        }

        .account-section-head {
          margin-bottom: 1.25rem;
        }

        .account-section-head h2 {
          font-family: var(--font-mono, monospace);
          font-size: 1.5rem;
          letter-spacing: 0.1em;
          margin: 0 0 0.5rem;
          text-transform: uppercase;
        }

        .account-tools {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1px;
          border: 1px solid rgba(0,0,0,0.12);
          background: rgba(0,0,0,0.12);
        }

        .account-tool {
          background: rgba(240,240,235,0.74);
          padding: 1.25rem;
          display: flex;
          align-items: start;
          justify-content: space-between;
          gap: 1rem;
          min-height: 150px;
        }

        .account-tool.is-locked {
          opacity: 0.58;
        }

        .account-tool h3 {
          font-family: var(--font-mono, monospace);
          font-size: 1rem;
          letter-spacing: 0.08em;
          margin: 0 0 0.65rem;
          text-transform: uppercase;
        }

        .account-tool.is-locked a {
          background: rgba(0,0,0,0.1);
          color: inherit;
        }

        @media (max-width: 760px) {
          .account-header,
          .account-tool {
            flex-direction: column;
            align-items: stretch;
          }

          .account-grid,
          .account-tools,
          .account-history,
          .account-profile dl,
          .account-general-grid,
          .account-two-col,
          .account-avatar-crop,
          .account-loadout-pref-list article {
            grid-template-columns: 1fr;
          }

          .account-avatar-card {
            grid-row: auto;
          }

          .account-edit-head,
          .account-profile-actions {
            display: grid;
            justify-content: stretch;
          }
        }
      `}</style>
    </>
  );
}
