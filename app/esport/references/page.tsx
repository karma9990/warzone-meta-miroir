import Link from 'next/link';
import LocalizedSafariBar from '@/components/LocalizedSafariBar';
import { withLocalePath } from '@/lib/i18n';
import { getRequestLocale } from '@/lib/requestLocale';

export const metadata = {
  title: 'Warzone Tournament References - WZPRO Meta',
  description: 'Link directory for finding Warzone tournaments, grind Discords, scrims, platforms, and official resources.',
};

const officialLinks = [
  {
    name: 'COD: Warzone Resurgence Series 2026 - Official Rules',
    url: 'https://www.callofduty.com/content/dam/atvi/callofduty/esports-new/world-series-of-warzone/CODWRS-Rules-2026.pdf',
    note: 'Official COD:WRS 2026 rules. Read them to understand official formats, restrictions, eligibility, and player obligations.',
  },
  {
    name: 'Liquipedia - Call of Duty S-Tier Tournaments',
    url: 'https://liquipedia.net/callofduty/S-Tier_Tournaments',
    note: 'History and schedule of major Call of Duty/Warzone tournaments tracked by Liquipedia.',
  },
];

const tournamentSites = [
  {
    name: 'CheckMate Gaming',
    url: 'https://www.checkmategaming.com/de/tournament/cross-platform/warzone',
    note: 'Wagers, ladders, Warzone tournaments, kill races, and cash prizes depending on open events.',
  },
  {
    name: 'Console Kings',
    url: 'https://www.consolekings.com/',
    note: 'Esports platform with daily tournaments, Call of Duty/Warzone games, Resurgence Kill Race, cash prizes, and NA+EU regions depending on events.',
  },
  {
    name: 'Repeat.gg - Warzone Help Center',
    url: 'https://support.repeat.gg/hc/en-us/sections/38087540602139-Call-of-Duty-Warzone',
    note: 'Warzone support for account connection, leaderboard tournaments, and frequently asked questions.',
  },
  {
    name: 'Battlefy - Finding tournaments',
    url: 'https://help.battlefy.com/en/articles/6950799-finding-tournaments-for-you',
    note: 'Official Battlefy help for searching tournaments with filters and preferences.',
  },
  {
    name: 'Challengermode',
    url: 'https://www.challengermode.com/',
    note: 'Platform to monitor for cups, ladders, community events, and sponsored competitions.',
  },
  {
    name: 'FACEIT',
    url: 'https://www.faceit.com/',
    note: 'Competitive hubs and partner events. Less central for Warzone, but important in the ESL/FACEIT ecosystem.',
  },
  {
    name: 'Toornament',
    url: 'https://play.toornament.com/en_US/tournaments/',
    note: 'Directory and bracket tool used by independent organizers, associations, and communities.',
  },
  {
    name: 'Tournex',
    url: 'https://app.tournex.it/',
    note: 'Warzone hub with tournaments, teams, player profiles, live rankings, and ranked season.',
  },
  {
    name: 'FHD Tournaments',
    url: 'https://fhdtournaments.com/',
    note: 'Community Warzone tournaments, rules, support, Discord/email, and displayed non-affiliation notice.',
  },
  {
    name: 'GamerSaloon',
    url: 'https://gamersaloons.com/',
    note: 'Gaming cash challenges and tournaments, with Call of Duty/Warzone offers depending on availability.',
  },
  {
    name: 'BrainBrawl - Weekly Warzone / Combat Cup rules',
    url: 'https://www.brainbrawl.app/WeeklyWarzone-CombatCup-Rules.pdf',
    note: 'Example of a recent community ruleset for understanding weekly formats.',
  },
];

const discordLinks = [
  {
    name: 'Call of Duty: Warzone Discord',
    url: 'https://discord.com/servers/560422033171808256',
    note: 'Large public Warzone server for LFG, ranked, discussion, loadouts, and first contacts.',
  },
  {
    name: 'NA Practice Scrims',
    url: 'https://discord.com/servers/na-practice-scrims-778438158605615115',
    note: 'NA scrims, practice customs, money scrims, tournament prep, and player search.',
  },
  {
    name: 'GameFace Warzone Tournaments',
    url: 'https://discordservers.com/server/774664150952443904',
    note: 'Warzone community focused on tournaments, teammates, cash prizes, and competitive progression.',
  },
  {
    name: 'COD Central',
    url: 'https://top.gg/discord/servers/543757449606406149',
    note: 'Call of Duty/Warzone server for ranked, LFG, teammates, and daily grinding.',
  },
  {
    name: 'Tournex - Discord Tornei',
    url: 'https://discord.gg/sMGPMvbdyT',
    note: 'Discord listed by Tournex for following their Warzone tournaments.',
  },
  {
    name: 'DiscordServers - Warzone scrims',
    url: 'https://discordservers.com/browse/warzone%20scrims',
    note: 'Search for public Discord servers around Warzone scrims. Invites may change.',
  },
];

function ReferenceGroup({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: Array<{ name: string; url: string; note: string }>;
}) {
  return (
    <section className="ref-group">
      <div className="ref-group-head">
        <span>{String(items.length).padStart(2, '0')} LINKS</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="ref-grid">
        {items.map((item) => (
          <a key={item.name} href={item.url} target="_blank" rel="noreferrer" className="ref-card">
            <span>{new URL(item.url).hostname.replace('www.', '')}</span>
            <strong>{item.name}</strong>
            <p>{item.note}</p>
          </a>
        ))}
      </div>
    </section>
  );
}

export default async function EsportReferencesPage() {
  const locale = await getRequestLocale();
  const href = (path: string) => withLocalePath(path, locale);

  return (
    <>
      <div className="pt-technical-backdrop" aria-hidden="true" />

      <LocalizedSafariBar
        active="esport"
        searchPlaceholder={locale === 'es' ? 'Referencias, Discords, torneos' : locale === 'fr' ? 'References, Discords, tournois' : 'References, Discords, tournaments'}
        readout={['WARZONE // REFERENCES', 'LINKS: ACTIVE', 'VERIFY BEFORE JOINING']}
      />

      <main className="refs-main">
        <header className="refs-hero">
          <div className="pt-header-tag">TOURNAMENT REFERENCES</div>
          <h1>REFERENCES</h1>
          <p>
            A practical directory for finding Warzone tournaments, grind Discords, scrims, platforms, and official resources.
            Tournament links move often: always verify the rules before paying or joining.
          </p>
          <Link href={href('/esport')}>Back to the conversation</Link>
        </header>

        <section className="refs-warning">
          <span>CHECK FIRST</span>
          <p>
            Before signing up: verify the date, region, age requirement, fees, payment methods,
            refunds, anti-cheat, score reporting, and recent activity on the Discord or site.
          </p>
        </section>

        <ReferenceGroup
          title="Official and Major Events"
          description="Useful resources for understanding official rules, visible circuits, and major tournaments."
          items={officialLinks}
        />

        <ReferenceGroup
          title="Tournament Sites"
          description="Platforms or directories where you can search for small tournaments, cash prizes, brackets, leaderboards, or community events."
          items={tournamentSites}
        />

        <ReferenceGroup
          title="Discords and NA Grind"
          description="Public servers or Discord directories for finding LFG, ranked stacks, scrims, customs, and tournament announcements."
          items={discordLinks}
        />

      </main>

      <style>{`
        .refs-main {
          max-width: 1180px;
          margin: 0 auto;
          padding: 5rem 2rem 6rem;
          color: #10100e;
          font-family: var(--font-mono, monospace);
        }

        .refs-hero {
          max-width: 980px;
          margin-bottom: 2rem;
        }

        .refs-hero h1 {
          margin: 0.35rem 0 1rem;
          font-size: clamp(4rem, 12vw, 10rem);
          line-height: 0.82;
          text-transform: uppercase;
        }

        .refs-hero p,
        .refs-warning p,
        .ref-group-head p,
        .ref-card p {
          color: rgba(16,16,14,0.68);
          font-size: 0.86rem;
          line-height: 1.7;
        }

        .refs-hero a {
          display: inline-grid;
          min-height: 46px;
          place-items: center;
          margin-top: 1rem;
          padding: 0 1rem;
          border: 1px solid #10100e;
          color: #10100e;
          font-size: 0.78rem;
          font-weight: 900;
          text-decoration: none;
          text-transform: uppercase;
        }

        .refs-hero a:hover {
          background: #10100e;
          color: #efeee8;
        }

        .refs-warning {
          display: grid;
          grid-template-columns: 150px minmax(0, 1fr);
          gap: 1rem;
          margin-bottom: 2.5rem;
          padding: 1rem 0;
          border-top: 1px solid rgba(16,16,14,0.18);
          border-bottom: 1px solid rgba(16,16,14,0.18);
        }

        .refs-warning span,
        .ref-group-head span,
        .ref-card span {
          color: #163cff;
          font-size: 0.68rem;
          font-weight: 900;
          text-transform: uppercase;
        }

        .ref-group {
          margin-bottom: 3rem;
          padding-top: 2rem;
          border-top: 1px solid rgba(16,16,14,0.18);
        }

        .ref-group-head {
          max-width: 860px;
          margin-bottom: 1rem;
        }

        .ref-group-head h2 {
          margin: 0.65rem 0 0.75rem;
          font-size: clamp(2rem, 5vw, 4.8rem);
          line-height: 0.88;
          text-transform: uppercase;
        }

        .ref-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1px;
          background: rgba(16,16,14,0.15);
        }

        .ref-card {
          display: grid;
          gap: 0.8rem;
          min-height: 230px;
          padding: 1.1rem;
          background: rgba(239,238,232,0.68);
          color: #10100e;
          text-decoration: none;
        }

        .ref-card:hover {
          background: #10100e;
          color: #efeee8;
        }

        .ref-card strong {
          font-size: 1.2rem;
          line-height: 1;
          text-transform: uppercase;
        }

        .ref-card p {
          align-self: end;
          margin: 0;
        }

        .ref-card:hover p,
        .ref-card:hover span {
          color: currentColor;
          opacity: 0.72;
        }

        @media (max-width: 900px) {
          .refs-warning {
            display: block;
          }

          .ref-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
