import Link from 'next/link';
import CompetitiveNav from '@/components/CompetitiveNav';
import LocalizedLink from '@/components/LocalizedLink';
import LocalizedSafariBar from '@/components/LocalizedSafariBar';
import LocalizedText from '@/components/LocalizedText';

type Active = 'top250' | 'calendar' | 'wsow' | 'resurgence' | 'ewc' | 'pullze';

export type TeamRow = {
  rank: number;
  team: string;
  players: string;
  kills?: number;
  points?: number;
  tone?: 'gold' | 'silver' | 'bronze' | 'green' | 'pink';
  unavailable?: boolean;
};

type CompetitivePageShellProps = {
  active: Active;
  eyebrow: string;
  title: string;
  accent: string;
  description: string;
  logoText: string;
  year?: string;
  filters: string[];
  tabs?: string[];
  format?: string;
  status?: string;
  scoreLabel?: string;
  metricLabel?: string;
  sourceName: string;
  sourceUrl: string;
  stats: Array<{ label: string; value: string }>;
  rows: TeamRow[];
  sourceNote?: string;
  live?: boolean;
};

const toneClass = {
  gold: 'is-gold',
  silver: 'is-silver',
  bronze: 'is-bronze',
  green: 'is-green',
  pink: 'is-pink',
};

const competitivePageStyles = `
  .competitive-nav {
    border-color: var(--tm-line);
    background:
      linear-gradient(180deg, rgba(239, 238, 232, 0.96), rgba(229, 228, 220, 0.92)),
      var(--tm-paper);
    color: var(--tm-ink);
    box-shadow: none;
  }

  .competitive-kicker {
    color: var(--tm-muted);
  }

  .competitive-nav a {
    color: var(--tm-ink);
    border-color: rgba(16, 16, 14, 0.10);
    background: rgba(239, 238, 232, 0.42);
  }

  .competitive-nav a:hover {
    border-color: var(--tm-ink);
    background: rgba(22, 60, 255, 0.06);
  }

  .competitive-nav a.is-active {
    border-color: var(--tm-blue);
    background: var(--tm-blue);
    color: var(--tm-paper);
    box-shadow: none;
  }

  .competitive-icon,
  .competitive-nav a.is-active .competitive-icon {
    color: currentColor;
  }

  .competitive-page {
    position: relative;
    z-index: 3;
    max-width: 1380px;
    min-height: 100vh;
    margin: 0 auto;
    padding: 3.2rem 2rem 6rem;
    color: var(--tm-ink);
    font-family: var(--tm-mono);
    background:
      linear-gradient(90deg, rgba(16, 16, 14, 0.055) 1px, transparent 1px),
      linear-gradient(rgba(16, 16, 14, 0.04) 1px, transparent 1px),
      var(--tm-paper);
    background-size: 96px 96px, 96px 96px, auto;
    box-shadow: 0 0 0 100vmax var(--tm-paper);
    clip-path: inset(0 -100vmax);
  }

  .competitive-page::before {
    position: absolute;
    inset: 0;
    z-index: -1;
    content: "";
    pointer-events: none;
    background: linear-gradient(180deg, rgba(239, 238, 232, 0.52), rgba(239, 238, 232, 0.92) 34%, rgba(239, 238, 232, 1));
  }

  .competitive-hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 2rem;
    align-items: start;
    margin-bottom: 2rem;
  }

  .competitive-hero p {
    margin: 0 0 0.35rem;
    color: var(--tm-blue);
    font-size: 0.7rem;
    font-weight: 900;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .competitive-hero h1 {
    margin: 0;
    max-width: 980px;
    color: var(--tm-ink);
    font-family: "Bisou Expanded", var(--tm-mono);
    font-size: clamp(2.15rem, 6vw, 5.4rem);
    font-weight: 900;
    letter-spacing: 0;
    line-height: 0.86;
    text-transform: uppercase;
  }

  .competitive-hero h1 span { color: var(--tm-blue); }

  .competitive-hero small {
    display: block;
    max-width: 920px;
    margin-top: 1.2rem;
    color: var(--tm-muted);
    font-size: 0.86rem;
    line-height: 1.65;
  }

  .competitive-logo {
    display: grid;
    min-width: 88px;
    min-height: 88px;
    place-items: center;
    border: 1px solid var(--tm-ink);
    color: var(--tm-ink);
    font-family: var(--tm-mono);
    font-size: 1rem;
    font-weight: 900;
    text-align: center;
    text-transform: uppercase;
  }

  .competitive-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 2rem;
  }

  .competitive-actions button,
  .competitive-actions a,
  .competitive-actions > span {
    display: inline-grid;
    min-height: 42px;
    place-items: center;
    padding: 0 1.25rem;
    border: 1px solid var(--tm-line);
    border-radius: 0;
    background: rgba(239, 238, 232, 0.76);
    color: var(--tm-ink);
    font-family: var(--tm-mono);
    font-size: 0.72rem;
    font-weight: 700;
    text-decoration: none;
  }

  .competitive-actions .is-primary {
    border-color: var(--tm-blue);
    background: var(--tm-blue);
    color: var(--tm-paper);
  }

  .competitive-actions > span {
    margin-left: auto;
    background: var(--tm-ink);
    color: var(--tm-paper);
  }

  .competitive-board {
    display: grid;
    gap: 1rem;
    padding-top: 1.8rem;
    border-top: 1px solid var(--tm-line);
  }

  .competitive-filters {
    display: grid;
    grid-template-columns: repeat(3, minmax(180px, 1fr)) minmax(240px, 1fr);
    gap: 1rem;
  }

  .competitive-filters button,
  .competitive-filters select,
  .competitive-filters input {
    width: 100%;
    min-height: 46px;
    padding: 0 0.9rem;
    border: 1px solid var(--tm-line);
    border-radius: 0;
    background: rgba(239, 238, 232, 0.72);
    color: var(--tm-ink);
    font: inherit;
    font-size: 0.78rem;
    text-align: left;
  }

  .competitive-filters select {
    appearance: none;
    background:
      linear-gradient(45deg, transparent 50%, var(--tm-muted) 50%) calc(100% - 18px) 50% / 6px 6px no-repeat,
      linear-gradient(135deg, var(--tm-muted) 50%, transparent 50%) calc(100% - 14px) 50% / 6px 6px no-repeat,
      rgba(239, 238, 232, 0.72);
    cursor: pointer;
  }

  .wrs-event-controls {
    grid-template-columns: repeat(3, minmax(180px, 1fr));
  }

  .wrs-search-row {
    grid-template-columns: minmax(240px, 1fr);
  }

  .competitive-filters label { display: block; }
  .wrs-event-controls label {
    display: grid;
    gap: 0.35rem;
  }

  .wrs-event-controls label > span {
    color: var(--tm-muted);
    font-family: var(--tm-mono);
    font-size: 0.58rem;
    font-weight: 900;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .competitive-filters input::placeholder { color: rgba(16, 16, 14, 0.42); }

  .competitive-tabs {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .competitive-tabs.is-meta-only {
    justify-content: flex-end;
   }

  .competitive-tabs > div {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .competitive-tabs button,
  .competitive-tabs a {
    display: inline-grid;
    place-items: center;
    min-height: 38px;
    padding: 0 1rem;
    border: 1px solid var(--tm-line);
    border-radius: 0;
    background: rgba(239, 238, 232, 0.54);
    color: var(--tm-ink);
    font: inherit;
    font-size: 0.78rem;
    text-decoration: none;
  }

  .competitive-tabs .is-selected,
  .competitive-tabs .is-live {
    border-color: var(--tm-blue);
    background: rgba(22, 60, 255, 0.08);
    color: var(--tm-blue);
  }

  .competitive-tabs .is-live { font-weight: 900; }
  .competitive-tabs p { margin: 0; color: var(--tm-muted); font-size: 0.78rem; }
  .competitive-tabs strong { color: var(--tm-ink); }
  .competitive-tabs span { margin-left: 1rem; color: var(--tm-blue); font-weight: 800; }

  .competitive-live-strip {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 0.8rem;
    min-height: 32px;
    padding: 0 0.9rem;
    border: 1px solid var(--tm-blue);
    background: rgba(22, 60, 255, 0.08);
    color: var(--tm-ink);
    font-size: 0.68rem;
    text-align: center;
  }

  .competitive-live-strip span {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: var(--tm-blue);
  }

  .competitive-live-strip button {
    border: 0;
    border-radius: 4px;
    background: var(--tm-blue);
    color: var(--tm-paper);
    font: inherit;
    font-size: 0.68rem;
    font-weight: 800;
  }

  .competitive-stat-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
    margin: 1rem 0;
  }

  .competitive-stat-grid article {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 66px;
    padding: 0 1.2rem;
    border: 1px solid var(--tm-line);
    border-radius: 0;
    background: rgba(239, 238, 232, 0.74);
  }

  .competitive-stat-grid span {
    color: var(--tm-muted);
    font-size: 0.7rem;
    font-weight: 900;
    text-transform: uppercase;
  }

  .competitive-stat-grid strong {
    color: var(--tm-ink);
    font-size: 1.25rem;
    font-weight: 950;
  }

  .competitive-ranking {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem;
  }

  .competitive-ranking article {
    display: grid;
    grid-template-columns: 52px minmax(0, 1fr) 90px 120px;
    align-items: center;
    gap: 0.75rem;
    min-height: 60px;
    padding: 0 1rem;
    border: 1px solid var(--tm-line);
    border-radius: 0;
    background: rgba(239, 238, 232, 0.82);
  }

  .competitive-ranking.is-dense article,
  .competitive-ranking.is-dense article:nth-child(-n + 3) {
    grid-column: auto;
    min-height: 52px;
  }

  .competitive-ranking article:nth-child(-n + 3) {
    grid-column: 1 / -1;
    min-height: 66px;
  }

  .competitive-ranking .is-gold,
  .competitive-ranking .is-silver,
  .competitive-ranking .is-bronze,
  .competitive-ranking .is-green,
  .competitive-ranking .is-pink {
    border-left: 5px solid var(--tm-blue);
    background: linear-gradient(90deg, rgba(22, 60, 255, 0.10), rgba(239, 238, 232, 0.82));
  }

  .competitive-ranking .is-empty {
    opacity: 0.52;
    background: rgba(239, 238, 232, 0.42);
  }

  .competitive-ranking b { color: var(--tm-blue); font-size: 1rem; }

  .competitive-ranking div strong {
    display: block;
    color: var(--tm-ink);
    font-family: var(--tm-mono);
    font-size: 1.02rem;
    font-weight: 950;
  }

  .competitive-ranking div span {
    display: block;
    margin-top: 0.24rem;
    color: var(--tm-muted);
    font-size: 0.68rem;
    text-transform: uppercase;
  }

  .competitive-ranking p {
    margin: 0;
    color: var(--tm-muted);
    font-size: 0.72rem;
    text-align: right;
  }

  .competitive-ranking p strong { color: var(--tm-ink); font-size: 1rem; }

  .competitive-source {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--tm-line);
    color: var(--tm-muted);
    font-size: 0.68rem;
  }

  .competitive-source a {
    color: var(--tm-blue);
    font-weight: 900;
    text-decoration: none;
  }

  .event-now h1,
  .past-events h2 {
    margin: 0 0 1rem;
    color: var(--tm-ink);
    font-family: var(--tm-mono);
    font-size: 1.45rem;
    font-weight: 950;
  }

  .event-now h1 span { color: var(--tm-blue); }

  .event-now article,
  .past-events article {
    padding: 2rem;
    border: 1px solid var(--tm-line);
    border-radius: 0;
    background: rgba(239, 238, 232, 0.78);
  }

  .event-tags { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; }

  .event-tags span,
  .past-events article span {
    display: inline-grid;
    min-height: 26px;
    place-items: center;
    padding: 0 0.65rem;
    border: 1px solid var(--tm-line);
    border-radius: 0;
    color: var(--tm-muted);
    font-size: 0.68rem;
  }

  .event-tags span:first-child {
    border-color: var(--tm-blue);
    background: var(--tm-blue);
    color: var(--tm-paper);
    font-weight: 900;
  }

  .event-card-head {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 2rem;
    margin-bottom: 1.4rem;
  }

  .event-card-head h2 { margin: 0 0 0.5rem; color: var(--tm-ink); font-size: 1.9rem; font-weight: 950; }
  .event-card-head p,
  .past-events p { margin: 0; color: var(--tm-muted); font-size: 0.78rem; }
  .event-card-head strong { color: var(--tm-blue); font-size: 0.8rem; text-align: right; }

  .event-started,
  .event-standings {
    margin-top: 1rem;
    padding: 1.2rem;
    border: 1px solid var(--tm-line);
    border-radius: 0;
    background: rgba(16, 16, 14, 0.035);
    color: var(--tm-ink);
  }

  .event-standings h3 { margin: 0 0 0.8rem; color: var(--tm-ink); font-size: 0.8rem; }

  .event-standings div {
    display: grid;
    grid-template-columns: 36px minmax(0, 1fr) 180px 90px;
    gap: 0.75rem;
    align-items: center;
    min-height: 30px;
  }

  .event-standings span {
    display: grid;
    width: 26px;
    height: 26px;
    place-items: center;
    border-radius: 0;
    background: var(--tm-blue);
    color: var(--tm-paper);
    font-weight: 900;
  }

  .event-standings b,
  .event-standings strong { color: var(--tm-ink); font-size: 0.78rem; }
  .event-standings em { color: var(--tm-blue); font-style: normal; font-weight: 900; text-align: right; }

  .event-now article > a {
    display: inline-grid;
    min-height: 40px;
    place-items: center;
    margin-top: 1.5rem;
    padding: 0 1.4rem;
    border: 1px solid var(--tm-blue);
    border-radius: 0;
    background: var(--tm-blue);
    color: var(--tm-paper);
    font-size: 0.78rem;
    font-weight: 950;
    text-decoration: none;
  }

  .past-events { margin-top: 2.4rem; }
  .past-events article { border-color: var(--tm-line); background: rgba(239, 238, 232, 0.6); }
  .past-events article + article { margin-top: 1rem; }
  .past-events article div { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
  .past-events h3 { margin: 0 0 0.8rem; color: var(--tm-ink); font-size: 1.1rem; }

  .wrs-grid {
    display: grid;
    grid-template-columns: minmax(320px, 0.92fr) minmax(420px, 1.38fr);
    gap: 1.4rem;
  }

  .wrs-live-wrap {
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr);
    border: 1px solid var(--tm-line);
    background: rgba(239, 238, 232, 0.74);
  }

  .wrs-live-wrap .wrs-panel {
    border: 0;
    border-left: 1px solid var(--tm-line);
    background: transparent;
  }

  .wrs-vertical-label {
    display: grid;
    place-items: center;
    color: var(--tm-blue);
    font-size: 0.74rem;
    font-weight: 950;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    writing-mode: vertical-rl;
    transform: rotate(180deg);
  }

  .wrs-panel {
    border: 1px solid var(--tm-line);
    background: rgba(239, 238, 232, 0.74);
  }

  .wrs-panel header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    min-height: 48px;
    padding: 0 1rem;
    border-bottom: 1px solid var(--tm-line);
  }

  .wrs-panel h2 {
    margin: 0;
    color: var(--tm-ink);
    font-family: var(--tm-mono);
    font-size: 0.9rem;
    font-weight: 950;
    text-transform: uppercase;
  }

  .wrs-panel header span {
    color: var(--tm-muted);
    font-size: 0.7rem;
    font-weight: 900;
    text-transform: uppercase;
  }

  .wrs-live-list {
    display: grid;
  }

  .wrs-live-row {
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr) 82px;
    gap: 0.8rem;
    align-items: center;
    min-height: 68px;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--tm-line);
  }

  .wrs-live-row.is-winner {
    border-left: 5px solid var(--tm-blue);
    background: rgba(22, 60, 255, 0.08);
  }

  .wrs-rank {
    color: var(--tm-blue);
    font-size: 1rem;
    font-weight: 950;
  }

  .wrs-live-row strong {
    display: block;
    color: var(--tm-ink);
    font-size: 0.88rem;
    font-weight: 950;
    text-transform: uppercase;
  }

  .wrs-live-row small {
    display: block;
    margin-top: 0.2rem;
    color: var(--tm-muted);
    font-size: 0.66rem;
    line-height: 1.35;
    text-transform: uppercase;
  }

  .wrs-points {
    color: var(--tm-ink);
    font-size: 1rem;
    font-weight: 950;
    text-align: right;
  }

  .wrs-points span {
    display: block;
    color: var(--tm-muted);
    font-size: 0.6rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  .wrs-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.72rem;
  }

  .wrs-table th,
  .wrs-table td {
    padding: 0.72rem 0.8rem;
    border-bottom: 1px solid var(--tm-line);
    color: var(--tm-ink);
    text-align: left;
  }

  .wrs-table th {
    color: var(--tm-muted);
    font-size: 0.64rem;
    font-weight: 950;
    text-transform: uppercase;
  }

  .wrs-table td:last-child,
  .wrs-table th:last-child {
    text-align: right;
  }

  .wrs-status {
    display: inline-grid;
    min-height: 24px;
    place-items: center;
    padding: 0 0.55rem;
    border: 1px solid var(--tm-line);
    color: var(--tm-muted);
    font-size: 0.62rem;
    font-weight: 900;
  }

  .wrs-detail-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.75rem;
  }

  .wrs-detail-card {
    padding: 1rem;
    border: 1px solid var(--tm-line);
    background: rgba(239, 238, 232, 0.62);
  }

  .wrs-detail-card strong {
    display: block;
    margin-bottom: 0.3rem;
    color: var(--tm-ink);
    font-size: 0.78rem;
    font-weight: 950;
    text-transform: uppercase;
  }

  .wrs-detail-card p {
    margin: 0 0 0.7rem;
    color: var(--tm-muted);
    font-size: 0.64rem;
    line-height: 1.45;
    text-transform: uppercase;
  }

  .wrs-detail-card dl {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.35rem 0.75rem;
    margin: 0;
    color: var(--tm-ink);
    font-size: 0.68rem;
  }

  .wrs-detail-card dt { color: var(--tm-muted); }
  .wrs-detail-card dd { margin: 0; font-weight: 900; }

  .wrs-overall-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.4rem;
  }

  .wrs-overall-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.72rem;
  }

  .wrs-overall-table th,
  .wrs-overall-table td {
    padding: 0.62rem 1rem;
    border-bottom: 1px solid var(--tm-line);
    color: var(--tm-ink);
    text-align: left;
  }

  .wrs-overall-table th {
    color: var(--tm-muted);
    font-size: 0.64rem;
    font-weight: 950;
    text-transform: uppercase;
  }

  .wrs-overall-table th:last-child,
  .wrs-overall-table td:last-child {
    text-align: center;
    width: 120px;
  }

  @media (max-width: 980px) {
    .competitive-page { padding: 2rem 1rem 4rem; }
    .competitive-hero,
    .competitive-filters,
    .competitive-stat-grid,
    .competitive-ranking { grid-template-columns: 1fr; }
    .competitive-tabs { display: grid; }
    .competitive-actions { flex-wrap: wrap; }
    .competitive-actions > span { margin-left: 0; }
    .competitive-ranking article,
    .competitive-ranking article:nth-child(-n + 3),
    .event-standings div { grid-template-columns: 38px minmax(0, 1fr); }
    .competitive-ranking p,
    .event-standings strong,
    .event-standings em { text-align: left; }
    .wrs-grid,
    .wrs-overall-grid,
    .wrs-detail-grid { grid-template-columns: 1fr; }
    .wrs-table { min-width: 640px; }
    .wrs-panel { overflow-x: auto; }
  }
`;

export function EsportChrome({ active, children }: { active: Active; children: React.ReactNode }) {
  return (
    <>
      <style>{competitivePageStyles}</style>
      <div className="pt-technical-backdrop" aria-hidden="true" />
      <LocalizedSafariBar
        active="esport"
        readout={['COMPETITION // WARZONE', 'LEADERBOARDS: ACTIVE', 'STATUS: LIVE']}
      />
      <CompetitiveNav active={active} />
      {children}
    </>
  );
}

export function CompetitiveLeaderboardPage({
  active,
  eyebrow,
  title,
  accent,
  description,
  logoText,
  year = '2026',
  format,
  status,
  scoreLabel = 'Points',
  metricLabel = 'Kills',
  sourceName,
  sourceUrl,
  stats,
  rows,
  sourceNote = 'Snapshot rebuilt for WZ Meta from public competitive data.',
  live = false,
}: CompetitivePageShellProps) {
  const formatScore = (score?: number) => {
    if (typeof score !== 'number') return '-';

    return active === 'top250'
      ? Math.round(score).toLocaleString('en-US')
      : Number.isInteger(score)
        ? score.toString()
        : score.toFixed(1);
  };

  return (
    <EsportChrome active={active}>
      <main className="competitive-page">
        <header className="competitive-hero">
          <div>
            <p>{eyebrow}</p>
            <h1>{title} <span>{accent}</span></h1>
            <small>{description}</small>
          </div>
          <div className="competitive-logo">{logoText}</div>
        </header>

        <div className="competitive-actions">
          <button type="button" className="is-primary">
            <LocalizedText values={{ en: 'Event Leaderboards', fr: 'Classements evenement', es: 'Clasificaciones del evento', de: 'Event-Ranglisten', it: 'Classifiche evento', pt: 'Rankings do evento', nl: 'Eventranglijsten', pl: 'Rankingi wydarzenia', ja: 'イベントランキング' }} />
          </button>
          <LocalizedLink href="/esport/calendar">
            <LocalizedText values={{ en: 'Calendar', fr: 'Calendrier', es: 'Agenda', de: 'Kalender', it: 'Programma', pt: 'Agenda', nl: 'Kalender', pl: 'Kalendarz', ja: 'カレンダー' }} />
          </LocalizedLink>
          <span>{year}</span>
        </div>

        <section className="competitive-board">
          <div className="competitive-tabs is-meta-only">
            <p>
              <LocalizedText values={{ en: 'Format', fr: 'Format', es: 'Formato', de: 'Format', it: 'Formato', pt: 'Formato', nl: 'Formaat', pl: 'Format', ja: '形式' }} />: <strong>{format ?? (active === 'pullze' ? 'Regular Customs' : 'Match Point')}</strong>
              <span><LocalizedText values={{ en: 'Status', fr: 'Statut', es: 'Estado', de: 'Status', it: 'Stato', pt: 'Estado', nl: 'Status', pl: 'Status', ja: '状態' }} />: {status ?? (live ? <LocalizedText values={{ en: 'Live Event', fr: 'Evenement live', es: 'Evento en vivo', de: 'Live-Event', it: 'Evento live', pt: 'Evento ao vivo', nl: 'Live event', pl: 'Wydarzenie live', ja: 'ライブイベント' }} /> : <LocalizedText values={{ en: 'Finished', fr: 'Termine', es: 'Terminado', de: 'Beendet', it: 'Finito', pt: 'Finalizado', nl: 'Afgelopen', pl: 'Zakonczone', ja: '終了' }} />)}</span>
            </p>
          </div>

          {live && (
            <div className="competitive-live-strip">
              <span />
              <LocalizedText values={{ en: 'Automated live view. No need to refresh. Data updates approximately every 10 seconds.', fr: 'Vue live automatisee. Pas besoin de rafraichir. Les donnees se mettent a jour environ toutes les 10 secondes.', es: 'Vista en vivo automatica. No hace falta actualizar. Los datos cambian aproximadamente cada 10 segundos.', de: 'Automatische Live-Ansicht. Kein Aktualisieren noetig. Daten etwa alle 10 Sekunden.', it: 'Vista live automatica. Non serve aggiornare. Dati circa ogni 10 secondi.', pt: 'Vista ao vivo automatica. Nao precisa atualizar. Dados a cada 10 segundos.', nl: 'Automatische liveweergave. Verversen is niet nodig. Data elke 10 seconden.', pl: 'Automatyczny widok live. Nie trzeba odswiezac. Dane co okolo 10 sekund.', ja: '自動ライブ表示です。更新不要で、約10秒ごとにデータが更新されます。' }} />
              <button type="button"><LocalizedText values={{ en: 'Full Screen', fr: 'Plein ecran', es: 'Pantalla completa', de: 'Vollbild', it: 'Schermo intero', pt: 'Tela cheia', nl: 'Volledig scherm', pl: 'Pelny ekran', ja: '全画面' }} /></button>
            </div>
          )}

          <div className="competitive-stat-grid">
            {stats.map((stat) => (
              <article key={stat.label}>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </article>
            ))}
          </div>

          <div className={`competitive-ranking${rows.length > 24 ? ' is-dense' : ''}`}>
            {rows.map((row) => (
              <article
                key={`${row.rank}-${row.team}`}
                className={`${row.tone ? toneClass[row.tone] : ''}${row.unavailable ? ' is-empty' : ''}`}
              >
                <b>{row.rank}</b>
                <div>
                  <strong>{row.team}</strong>
                  <span>{row.players}</span>
                </div>
                <p>{metricLabel} <strong>{row.kills ?? '-'}</strong></p>
                <p>{scoreLabel} <strong>{formatScore(row.points)}</strong></p>
              </article>
            ))}
          </div>

          <div className="competitive-source">
            <span>{sourceNote}</span>
            <Link href={sourceUrl}>Source: {sourceName}</Link>
          </div>
        </section>
      </main>
    </EsportChrome>
  );
}

export function CompetitiveCalendarPage() {
  const liveTeams = [
    ['1', 'Niasen / iheedz / kingchawk', 'Ravens', '159.6'],
    ['2', 'Newbz / Dongy / Hisoka', 'Team Falcons', '151.2'],
    ['3', 'Almond / zSmit / Shifty', 'Twisted Minds', '134'],
  ];

  return (
    <EsportChrome active="calendar">
      <main className="competitive-page">
        <section className="event-now">
          <h1><span>LIVE</span> Live Warzone Event Now</h1>
          <article>
            <div className="event-tags">
              <span>LIVE</span>
              <span>2026</span>
              <span>COD:WRS Atlanta</span>
              <span>Finals</span>
            </div>
            <div className="event-card-head">
              <div>
                <h2>LAN Finals</h2>
                <p>Resurgence - LAN Atlanta</p>
              </div>
              <strong>WARZONE<br />RESURGENCE<br />SERIES</strong>
            </div>
            <div className="event-started">Started at May 17, 2026, 12:00 PM</div>
            <div className="event-standings">
              <h3>Current Standings</h3>
              {liveTeams.map(([rank, players, team, points]) => (
                <div key={rank}>
                  <span>{rank}</span>
                  <b>{players}</b>
                  <strong>{team}</strong>
                  <em>{points}</em>
                </div>
              ))}
            </div>
            <LocalizedLink href="/esport/resurgence-series">
              <LocalizedText values={{ en: 'Leaderboards', fr: 'Classements', es: 'Clasificaciones', de: 'Ranglisten', it: 'Classifiche', pt: 'Rankings', nl: 'Ranglijsten', pl: 'Rankingi', ja: 'ランキング' }} />
            </LocalizedLink>
            <div className="competitive-source">
              <span>Event snapshot rebuilt for WZ Meta from public competitive data.</span>
              <Link href="https://codmunity.gg/calendar">Source: CODMunity Calendar</Link>
            </div>
          </article>
        </section>

        <section className="past-events">
          <h2>Past Warzone Events</h2>
          {['LAN Open', 'Global LAN Finals', 'EWC Final'].map((event, index) => (
            <article key={event}>
              <div>
                <span>{index === 0 ? 'COD:WRS Atlanta' : index === 1 ? 'WSOW 2025' : 'EWC 2025'}</span>
                <span>{index === 0 ? 'Round 2' : 'Finals'}</span>
              </div>
              <h3>{event}</h3>
              <p>{index === 0 ? 'May 16, 2026, 8:51 PM' : index === 1 ? 'Global LAN - finished' : 'Riyadh LAN - finished'}</p>
            </article>
          ))}
        </section>
      </main>
    </EsportChrome>
  );
}
