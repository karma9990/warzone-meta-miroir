import Link from 'next/link';

export const metadata = {
  title: 'Set-up - WZPRO Meta',
  description: 'Gaming setup tiers for Warzone players: PC, console, monitor, network, and settings targets.',
};

const affiliateBacklog = [
  'ExitLag',
  'Razer',
  'Logitech G',
  'SteelSeries',
  'KontrolFreek',
  'Secretlab',
  'Herman Miller Gaming',
  'Green Man Gaming',
  'Fanatical',
  'CDKeys',
];

void affiliateBacklog;

const amazonSearch = (query: string) => `https://www.amazon.fr/s?k=${encodeURIComponent(query)}`;

const setupBuilds = [
  {
    label: 'Starter 1080p',
    title: 'Clean 120 FPS target',
    note: 'For players who want Warzone smooth without building an expensive station. Aim for low/competitive settings and stable 1% lows.',
    specs: [
      ['CPU', 'Ryzen 5 5600 / i5-12400F class', 'Ryzen 5 5600 i5 12400F'],
      ['GPU', 'RTX 3060 / RX 6600 XT class', 'RTX 3060 RX 6600 XT'],
      ['RAM', '16 GB DDR4, dual channel minimum', '16GB DDR4 3200 dual channel'],
      ['Monitor', '1080p 144 Hz', 'monitor 1080p 144hz gaming'],
      ['Storage', 'NVMe SSD with room for COD updates', '1TB NVMe SSD gaming'],
      ['Network', 'Ethernet, no Wi-Fi if possible', 'cat 6 ethernet cable gaming'],
      ['Screen', '24-inch 1080p 144 Hz low input lag', '24 inch 1080p 144hz gaming monitor'],
      ['Ethernet', 'Cat 6 cable, short and direct to router', 'cat 6 ethernet cable gaming 5m'],
      ['Controller', 'SCUF-style back paddle controller', 'SCUF controller back paddles PS5 Xbox PC'],
      ['IEM', 'Wired IEMs for clean footsteps', 'gaming IEM wired earphones'],
    ],
  },
  {
    label: 'Ranked 1440p',
    title: 'Competitive 165 FPS target',
    note: 'The best balance for serious ranked: sharper image than 1080p, high refresh, and enough CPU headroom for busy endgames.',
    specs: [
      ['CPU', 'Ryzen 5 7600 / i5-13600K class', 'Ryzen 5 7600 i5 13600K'],
      ['GPU', 'RTX 4070 / RX 7800 XT class', 'RTX 4070 RX 7800 XT'],
      ['RAM', '32 GB DDR5 preferred', '32GB DDR5 6000 gaming ram'],
      ['Monitor', '1440p 165-180 Hz', 'monitor 1440p 165hz gaming'],
      ['Audio', 'Closed-back headset or IEMs with clear mids/highs', 'closed back gaming headset footsteps'],
      ['Input', 'Controller with low deadzone or light FPS mouse', 'pro controller fps mouse gaming'],
      ['Screen', '27-inch 1440p 165-180 Hz IPS', '27 inch 1440p 165hz IPS gaming monitor'],
      ['Ethernet', 'Cat 6 or Cat 7 cable for stable packet flow', 'cat 7 ethernet cable gaming'],
      ['Controller', 'SCUF-style paddles for jump/slide binds', 'SCUF Reflex Xbox Instinct controller paddles'],
      ['IEM', 'IEMs with clear mids and low bass bleed', 'IEM gaming earphones footsteps'],
    ],
  },
  {
    label: 'Pro 240 Hz',
    title: 'High FPS sweat setup',
    note: 'For players chasing the most responsive feel. The goal is not pretty graphics: it is consistent frame pacing, low latency, and no stutter.',
    specs: [
      ['CPU', 'Ryzen 7 7800X3D / newer X3D class', 'Ryzen 7 7800X3D'],
      ['GPU', 'RTX 4080 Super / RX 7900 XTX class', 'RTX 4080 Super RX 7900 XTX'],
      ['RAM', '32 GB DDR5 tuned, dual channel', '32GB DDR5 6000 CL30'],
      ['Monitor', '1080p or 1440p 240 Hz', '240hz gaming monitor 1440p'],
      ['Cooling', 'Strong airflow, stable boost clocks', 'PC case airflow CPU cooler gaming'],
      ['Settings', 'Competitive low, VRAM budget controlled', 'gaming PC optimization accessories'],
      ['Screen', '240 Hz display with low response time', '240hz gaming monitor low input lag'],
      ['Ethernet', 'Shielded Cat 7 cable if routed near power cables', 'shielded cat 7 ethernet cable gaming'],
      ['Controller', 'SCUF-style pro controller with rear paddles', 'SCUF pro controller paddles PC PS5 Xbox'],
      ['IEM', 'Low-latency wired IEMs for ranked focus', 'wired gaming IEM low latency'],
    ],
  },
  {
    label: 'Console',
    title: 'PS5 / Xbox Series setup',
    note: 'A console setup can be very strong if the display and network are right. Focus on 120 Hz support, clean input, and stable connection.',
    specs: [
      ['Console', 'PS5 / Xbox Series X preferred', 'PS5 Xbox Series X'],
      ['Display', '1080p or 1440p 120 Hz with low input lag', '120hz gaming monitor PS5 Xbox Series X'],
      ['Cable', 'HDMI 2.1 for compatible displays', 'HDMI 2.1 cable PS5 Xbox Series X'],
      ['Controller', 'Fresh sticks, checked dead zones', 'PS5 Xbox pro controller'],
      ['Audio', 'Stereo headset, avoid muddy bass EQ', 'console gaming headset stereo'],
      ['Network', 'Ethernet to router', 'cat 6 ethernet cable gaming'],
      ['Screen', '120 Hz console-ready monitor with HDMI 2.1', 'PS5 Xbox Series X 120hz gaming monitor HDMI 2.1'],
      ['Ethernet', 'Cat 6 cable from console to router', 'cat 6 ethernet cable PS5 Xbox'],
      ['Controller', 'SCUF-style paddle controller for console', 'SCUF controller PS5 Xbox paddles'],
      ['IEM', 'Wired IEMs compatible with controller jack', 'wired IEM earphones PS5 Xbox controller'],
    ],
  },
];

const checklist = [
  'Ethernet cable before any software tweak.',
  'Stable FPS cap before chasing average FPS.',
  'Headset EQ that keeps footsteps clear, not bass-heavy.',
  'Controller dead zones checked every few weeks.',
  'One sensitivity profile kept long enough to build muscle memory.',
  'Router QoS enabled only if it actually improves packet loss.',
];

export default function SetUpPage() {
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
          <Link href="/set-up" aria-current="page">Set-up</Link>
          <Link href="/esport">Esport</Link>
          <Link href="/community">Community</Link>
        </nav>
        <label>
          <span>Search</span>
          <input placeholder="Gear, software, setup" />
        </label>
        <div className="nav-readout" aria-hidden="true">
          <span>SETUP // WARZONE</span>
          <span>GEAR: CURATED</span>
          <span>OPTI: PRACTICAL</span>
        </div>
      </div>

      <main className="setup-main">
        <header className="setup-hero">
          <div className="pt-header-tag">OPERATOR SETUP</div>
          <h1>SET-UP</h1>
          <p>
            Gaming setups that make Warzone run well: stable FPS, readable audio, low input lag,
            and a clean network before chasing expensive accessories.
          </p>
        </header>

        <section className="setup-checklist" aria-label="Setup baseline">
          <div>
            <span>BASELINE FIRST</span>
            <h2>Before buying anything</h2>
          </div>
          <ul>
            {checklist.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>

        <section className="setup-grid" aria-label="Warzone gaming setup tiers">
          {setupBuilds.map((build) => (
            <article className="setup-card" key={build.label}>
              <span>{build.label}</span>
              <h2>{build.title}</h2>
              <p>{build.note}</p>
              <div className="setup-spec-list">
                {build.specs.map(([name, value, query]) => (
                  <a
                    className="setup-spec-row"
                    href={amazonSearch(query)}
                    key={`${build.label}-${name}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <strong>{name}</strong>
                    <small>{value}</small>
                  </a>
                ))}
              </div>
            </article>
          ))}
        </section>
      </main>
    </>
  );
}
