import Link from 'next/link';
import CompetitiveNav from '@/components/CompetitiveNav';

export const metadata = {
  title: 'Warzone Esport - WZPRO Meta',
  description: 'Conversation-style guide for starting Warzone tournaments, finding platforms, Discords, scrims, and understanding the competitive circuit.',
};

const tournamentSources = [
  { name: 'CheckMate Gaming', type: 'Cash tournaments', url: 'https://www.checkmategaming.com/de/tournament/cross-platform/warzone', note: 'Wagers, ladders, kill races, solo/duo/trio/quads formats, and cash prizes depending on open events.' },
  { name: 'Console Kings', type: 'Daily tournaments', url: 'https://www.consolekings.com/', note: 'Esports platform with Warzone tournaments, Resurgence Kill Race, cash prizes, and NA+EU regions depending on open events.' },
  { name: 'Repeat.gg', type: 'Leaderboards', url: 'https://support.repeat.gg/hc/en-us/sections/38087540602139-Call-of-Duty-Warzone', note: 'Automated tournaments and challenges, useful for starting solo with less pressure.' },
  { name: 'Battlefy', type: 'Tournament search', url: 'https://help.battlefy.com/en/articles/6950799-finding-tournaments-for-you', note: 'Directory and filters for finding competitions organized by communities or organizations.' },
  { name: 'Challengermode', type: 'Community events', url: 'https://www.challengermode.com/', note: 'Platform to monitor for ladders, community cups, and sponsored events.' },
  { name: 'FACEIT', type: 'Competitive hubs', url: 'https://www.faceit.com/', note: 'Less central for Warzone, but useful for hubs, partner events, or private circuits.' },
  { name: 'Toornament', type: 'Brackets and events', url: 'https://play.toornament.com/en_US/tournaments/', note: 'Tool used by associations, communities, and independent organizers.' },
  { name: 'Tournex', type: 'Warzone hub', url: 'https://app.tournex.it/', note: 'Tournaments, player profiles, teams, live rankings, and ranked-season logic.' },
  { name: 'FHD Tournaments', type: 'Community tournaments', url: 'https://fhdtournaments.com/', note: 'Community Warzone page with rules, support, Discord/email, and a non-affiliation notice.' },
  { name: 'GamerSaloon', type: 'Cash challenges', url: 'https://www.gamersaloon.com/cod/', note: 'Call of Duty/Warzone challenges and tournaments depending on open offers.' },
];

const discordSources = [
  { name: 'Call of Duty: Warzone Discord', url: 'https://discord.com/servers/560422033171808256', note: 'Large public server for LFG, ranked, loadouts, discussion, and first competitive contacts.' },
  { name: 'NA Practice Scrims', url: 'https://discord.com/servers/na-practice-scrims-778438158605615115', note: 'NA server focused on practice customs, scrims, money scrims, player search, and tournament prep.' },
  { name: 'GameFace Warzone Tournaments', url: 'https://discord.com/invite/R4UEUAuesg', note: 'Warzone community with automated tournaments, skill divisions, leaderboards, and cash prizes.' },
  { name: 'COD Central', url: 'https://top.gg/discord/servers/543757449606406149', note: 'Call of Duty/Warzone server useful for finding ranked teammates and daily grind partners.' },
  { name: 'Tournex - Discord Tornei', url: 'https://discord.gg/sMGPMvbdyT', note: 'Discord listed by Tournex for following their Warzone tournaments.' },
];

const starterSteps = [
  'Stabilize your setup: FPS, audio, sensitivity, connection, and no crashes.',
  'Grind ranked to learn rotations, timings, and fights under pressure.',
  'Start with free or low buy-in kill races and leaderboards.',
  'Find a regular duo or trio instead of playing every tournament with randoms.',
  'Join scrim Discords, read the rules, and show up for check-ins.',
  'Review your deaths, write down your mistakes, then queue again. Consistency matters more than one good night.',
];

const roadmap = [
  ['01', 'Public matches', 'mechanical basics, aim, movement, confidence'],
  ['02', 'Serious ranked', 'rotations, pressure, real fights, teammates'],
  ['03', 'Small tournaments', 'rules, check-in, scoring, proof'],
  ['04', 'Small cash prizes', 'playing cleanly with stakes'],
  ['05', 'Private customs', 'more disciplined lobbies, prepared teams'],
  ['06', 'Regular scrims', 'network, reputation, stable roster'],
  ['07', 'Official qualifiers', 'WSOW, EWC, regional open qualifiers'],
  ['08', 'LAN / major events', 'showcase level, audience, consistent results'],
];

const formats = [
  { name: 'Kill Race', note: 'The most accessible format: you have a time window or a set number of games to get as many kills as possible.' },
  { name: 'Leaderboard', note: 'The platform keeps your best games. Great for starting solo and understanding scoring.' },
  { name: 'Customs', note: 'Private lobby with registered players. Closer to serious competition because everyone plays the same lobby.' },
  { name: 'Scrims', note: 'Practice sessions organized through Discords. This is where teams recruit and players get noticed.' },
];

const platformAdvice = [
  { name: 'Tournex', route: 'Tournament -> team -> lobby/custom', note: 'Interesting for teams, live rankings, and competitive hub structure.' },
  { name: 'Discords', route: 'Rules -> announcement -> support ticket', note: 'Essential for scrims, LFG, customs, and competitive networking.' },
];

const moneyReality = [
  'At first, do not chase money. Chase tournament experience.',
  'Early winnings are often small: 20, 50, 100, and sometimes nothing for a long time.',
  'Players who last often combine competition, streaming, clips, coaching, sponsors, or an org.',
  'Your first real goal: become reliable enough to get invited into serious customs.',
];

const ecosystemReality = [
  'GameBattles shut down in January 2024, so part of the old COD center disappeared.',
  'The scene became more Discord-driven, more network-based, more customs-focused, and more content-driven.',
  'Activision has more control over major official events, rights, image, sponsors, and rules.',
  'Warzone is hard to turn into an esport: loot, zones, servers, meta, crossplay, and cheating make the amateur layer more fragile.',
];

function PlayerBubble({ children }: { children: React.ReactNode }) {
  return (
    <article className="chat-row chat-row--player">
      <div className="chat-avatar" aria-hidden="true"><span /></div>
      <div className="chat-bubble chat-bubble--player">
        <span>PLAYER</span>
        <p>{children}</p>
      </div>
    </article>
  );
}

function WzBubble({ children }: { children: React.ReactNode }) {
  return (
    <article className="chat-row chat-row--wz">
      <div className="chat-bubble chat-bubble--wz">
        <span>WZPRO</span>
        {children}
      </div>
    </article>
  );
}

export default function EsportPage() {
  return (
    <>
      <div className="pt-technical-backdrop" aria-hidden="true" />

      <div className="safari-bar">
        <Link className="brand-pill" href="/">
          <b>WZ</b>
          <span>Meta</span>
        </Link>
        <nav>
          <Link href="/pro-tools">Pro Tools</Link>
          <Link href="/#all-loadouts">Loadouts</Link>
          <Link href="/set-up">Set-up</Link>
          <Link href="/esport" aria-current="page">Esport</Link>
          <Link href="/community">Community</Link>
        </nav>
        <label>
          <span>Search</span>
          <input placeholder="Competition, tournaments, Discords" />
        </label>
        <div className="nav-readout" aria-hidden="true">
          <span>COMPETITION // WARZONE</span>
          <span>GUIDE: CONVERSATION</span>
          <span>STATUS: LIVE</span>
        </div>
      </div>

      <CompetitiveNav active="calendar" />

      <main className="esport-main">
        <header className="esport-hero">
          <div className="pt-header-tag">COMPETITIVE INTELLIGENCE</div>
          <h1>WARZONE ESPORT</h1>
          <p>A page built like a conversation to understand how to enter Warzone tournaments, find the right sites, join Discords, and progress toward scrims.</p>
        </header>

        <section className="chat-thread" aria-label="Guided conversation about Warzone tournaments">
          <PlayerBubble>Where should I start if I want to play Warzone tournaments?</PlayerBubble>
          <WzBubble>
            <p>Start like a grinder, not like a pro. First you need consistency: ranked, stable setup, solid mental, then small open tournaments.</p>
            <div className="chat-list">
              {starterSteps.map((step, index) => (
                <div key={step}><b>{String(index + 1).padStart(2, '0')}</b><strong>{step}</strong></div>
              ))}
            </div>
          </WzBubble>

          <PlayerBubble>What is the real path into the competitive circuit?</PlayerBubble>
          <WzBubble>
            <p>The modern path is almost never direct. You climb in layers: skill level, network, results, visibility, then qualifiers.</p>
            <div className="roadmap-grid">
              {roadmap.map(([num, title, note]) => (
                <div key={title}>
                  <b>{num}</b>
                  <strong>{title}</strong>
                  <small>{note}</small>
                </div>
              ))}
            </div>
          </WzBubble>

          <PlayerBubble>Which formats should I target at the beginning?</PlayerBubble>
          <WzBubble>
            <p>The best beginner formats teach you the rules without throwing you straight into major private lobbies.</p>
            <div className="mini-card-grid">
              {formats.map((format) => (
                <div key={format.name}>
                  <strong>{format.name}</strong>
                  <p>{format.note}</p>
                </div>
              ))}
            </div>
          </WzBubble>

          <PlayerBubble>Give me the sites that list Warzone competitions.</PlayerBubble>
          <WzBubble>
            <p>Here are the platforms to monitor. Tournaments change often, so always verify date, region, rules, payment, anti-cheat, and refunds.</p>
            <div className="source-grid">
              {tournamentSources.map((source) => (
                <a key={source.name} href={source.url} target="_blank" rel="noreferrer">
                  <span>{source.type}</span>
                  <strong>{source.name}</strong>
                  <p>{source.note}</p>
                </a>
              ))}
            </div>
          </WzBubble>

          <PlayerBubble>List useful Discords for grinding, especially in NA.</PlayerBubble>
          <WzBubble>
            <p>For the NA grind, Discord is essential: LFG, ranked stacks, scrims, customs, announcements, check-ins, and support tickets often go through there.</p>
            <div className="source-grid source-grid--discord">
              {discordSources.map((source) => (
                <a key={source.name} href={source.url} target="_blank" rel="noreferrer">
                  <span>Discord</span>
                  <strong>{source.name}</strong>
                  <p>{source.note}</p>
                </a>
              ))}
            </div>
          </WzBubble>

          <PlayerBubble>Which platform should I choose first?</PlayerBubble>
          <WzBubble>
            <p>Choose based on your goal. If you want to learn without pressure, target leaderboards or kill races. If you want the real competitive rhythm, look for scrims and customs.</p>
            <div className="platform-grid">
              {platformAdvice.map((item) => (
                <div key={item.name}>
                  <span>{item.route}</span>
                  <strong>{item.name}</strong>
                  <p>{item.note}</p>
                </div>
              ))}
            </div>
          </WzBubble>

          <PlayerBubble>Why does the scene feel closed since GameBattles?</PlayerBubble>
          <WzBubble>
            <p>Because the ecosystem changed. Skill still matters, but you also need to be visible, present, and known in the right servers.</p>
            <ul className="chat-bullets">
              {ecosystemReality.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </WzBubble>

          <PlayerBubble>Can you make money quickly?</PlayerBubble>
          <WzBubble>
            <p>Possible, but it is not the right goal at the beginning. The first goal is to get invited into good customs and become a reliable player.</p>
            <ul className="chat-bullets">
              {moneyReality.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </WzBubble>

          <PlayerBubble>So what is my first real goal?</PlayerBubble>
          <WzBubble>
            <p className="final-answer">Become strong, consistent, and reliable enough that people invite you into serious customs. From there, you meet the real competitive scene: scrims, good rosters, small cash prizes, then official qualifiers.</p>
            <Link className="chat-cta" href="/pro-tools">View Pro Tools</Link>
          </WzBubble>
        </section>

        <section className="references-callout">
          <div>
            <span>LINK DIRECTORY</span>
            <h2>Need direct links?</h2>
            <p>Find tournament sites, NA Discords, scrims, platforms, and official resources on a separate page.</p>
          </div>
          <Link href="/esport/references">References</Link>
        </section>
      </main>

      <style>{`
        .esport-main {
          max-width: 1180px;
          margin: 0 auto;
          padding: 5rem 2rem 6rem;
          color: #10100e;
          font-family: var(--font-mono, monospace);
        }

        .esport-hero {
          max-width: 930px;
          margin-bottom: 2rem;
        }

        .esport-hero h1 {
          margin: 0.35rem 0 1rem;
          font-size: clamp(3.8rem, 10vw, 9rem);
          line-height: 0.82;
          letter-spacing: 0;
          text-transform: uppercase;
        }

        .esport-hero p,
        .chat-bubble p,
        .chat-bullets,
        .source-grid p,
        .mini-card-grid p,
        .platform-grid p {
          color: rgba(16,16,14,0.68);
          font-size: 0.86rem;
          line-height: 1.65;
        }

        .chat-thread {
          display: grid;
          gap: 1rem;
        }

        .chat-row {
          display: grid;
          gap: 0.75rem;
          align-items: start;
        }

        .chat-row--player {
          grid-template-columns: 58px minmax(240px, 640px);
          justify-content: start;
        }

        .chat-row--wz {
          grid-template-columns: minmax(260px, 920px);
          justify-content: end;
        }

        .chat-avatar {
          display: grid;
          width: 58px;
          height: 58px;
          place-items: center;
          background: rgba(239,238,232,0.72);
          border: 1px solid rgba(16,16,14,0.14);
        }

        .chat-avatar span {
          display: block;
          width: 32px;
          height: 32px;
          border: 2px solid #10100e;
          border-radius: 999px;
          position: relative;
        }

        .chat-avatar span::before {
          position: absolute;
          inset: 6px 9px auto;
          height: 7px;
          border: 2px solid #10100e;
          border-radius: 999px;
          content: "";
        }

        .chat-avatar span::after {
          position: absolute;
          left: 6px;
          right: 6px;
          bottom: 5px;
          height: 10px;
          border: 2px solid #10100e;
          border-radius: 999px 999px 0 0;
          content: "";
        }

        .chat-bubble {
          position: relative;
          padding: 1rem 1.15rem;
          border: 1px solid rgba(16,16,14,0.14);
          background: rgba(239,238,232,0.72);
        }

        .chat-bubble--wz {
          background: #10100e;
          color: #efeee8;
        }

        .chat-bubble > span {
          display: block;
          margin-bottom: 0.75rem;
          color: #163cff;
          font-size: 0.68rem;
          font-weight: 900;
          text-transform: uppercase;
        }

        .chat-bubble--wz > span {
          color: #7f96ff;
        }

        .chat-bubble--player p {
          margin: 0;
          color: #10100e;
          font-size: clamp(1rem, 2vw, 1.45rem);
          font-weight: 900;
          line-height: 1.2;
        }

        .chat-bubble--wz p,
        .chat-bubble--wz .chat-bullets {
          color: rgba(239,238,232,0.78);
        }

        .chat-list,
        .roadmap-grid,
        .mini-card-grid,
        .source-grid,
        .platform-grid {
          display: grid;
          gap: 1px;
          margin-top: 1rem;
          background: rgba(239,238,232,0.18);
        }

        .chat-list div,
        .roadmap-grid div,
        .mini-card-grid div,
        .platform-grid div,
        .source-grid a {
          display: grid;
          gap: 0.55rem;
          min-height: 130px;
          padding: 1rem;
          background: rgba(239,238,232,0.08);
          color: #efeee8;
          text-decoration: none;
        }

        .chat-list div {
          grid-template-columns: 42px minmax(0, 1fr);
          align-items: start;
          min-height: auto;
        }

        .chat-list b,
        .roadmap-grid b,
        .source-grid span,
        .platform-grid span {
          color: #7f96ff;
          font-size: 0.72rem;
          font-weight: 900;
          text-transform: uppercase;
        }

        .chat-list strong,
        .roadmap-grid strong,
        .mini-card-grid strong,
        .platform-grid strong,
        .source-grid strong {
          color: #efeee8;
          font-size: 1rem;
          line-height: 1.05;
          text-transform: uppercase;
        }

        .roadmap-grid,
        .source-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .mini-card-grid,
        .platform-grid,
        .source-grid--discord {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .roadmap-grid small {
          color: rgba(239,238,232,0.64);
          line-height: 1.45;
        }

        .source-grid a:hover {
          background: rgba(239,238,232,0.16);
        }

        .chat-bullets {
          margin: 1rem 0 0;
          padding: 0;
          list-style: none;
        }

        .chat-bullets li {
          padding: 0.85rem 0;
          border-top: 1px solid rgba(239,238,232,0.18);
        }

        .final-answer {
          color: #efeee8 !important;
          font-size: clamp(1.05rem, 2vw, 1.45rem) !important;
          font-weight: 900;
          line-height: 1.35 !important;
        }

        .chat-cta {
          display: inline-grid;
          width: fit-content;
          min-height: 46px;
          place-items: center;
          margin-top: 1rem;
          padding: 0 1rem;
          border: 1px solid rgba(239,238,232,0.72);
          color: #efeee8;
          font-size: 0.78rem;
          font-weight: 900;
          text-decoration: none;
          text-transform: uppercase;
        }

        .chat-cta:hover {
          background: #efeee8;
          color: #10100e;
        }

        .references-callout {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 2rem;
          margin-top: 3rem;
          padding: 1.4rem;
          border: 2px solid #10100e;
          background: rgba(239,238,232,0.72);
        }

        .references-callout span {
          color: #163cff;
          font-size: 0.7rem;
          font-weight: 900;
          text-transform: uppercase;
        }

        .references-callout h2 {
          margin: 0.6rem 0 0.5rem;
          font-size: clamp(1.8rem, 4vw, 4rem);
          line-height: 0.9;
          text-transform: uppercase;
        }

        .references-callout p {
          max-width: 680px;
          margin: 0;
          color: rgba(16,16,14,0.68);
          font-size: 0.86rem;
          line-height: 1.65;
        }

        .references-callout a {
          display: inline-grid;
          min-height: 56px;
          min-width: 180px;
          place-items: center;
          padding: 0 1.3rem;
          background: #10100e;
          color: #efeee8;
          font-size: 0.9rem;
          font-weight: 900;
          text-decoration: none;
          text-transform: uppercase;
        }

        .references-callout a:hover {
          background: #163cff;
        }

        .chat-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          margin-top: 1rem;
        }

        .chat-actions .chat-cta {
          margin-top: 0;
        }

        .chat-cta--refs {
          border-color: #7f96ff;
          color: #7f96ff;
        }

        @media (max-width: 900px) {
          .chat-row--player,
          .chat-row--wz {
            grid-template-columns: 1fr;
          }

          .chat-avatar {
            display: none;
          }

          .roadmap-grid,
          .mini-card-grid,
          .source-grid,
          .source-grid--discord,
          .platform-grid {
            grid-template-columns: 1fr;
          }

          .references-callout {
            display: grid;
          }
        }
      `}</style>
    </>
  );
}
