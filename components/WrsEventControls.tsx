'use client';

import { useRouter } from 'next/navigation';
import type { CompetitionOption } from '@/lib/competitive-data';

type Props = {
  stages: CompetitionOption[];
  phases: CompetitionOption[];
  events: CompetitionOption[];
  selected: {
    year?: CompetitionOption;
    stage?: CompetitionOption;
    phase?: CompetitionOption;
    event?: CompetitionOption;
  };
};

const ONLINE_QUALIFIERS = 'cod:wrs-online-qualifiers';
const ONLINE_REGIONS = ['EU', 'NA', 'Finals'];
const ONLINE_DEFAULT_EVENTS: Record<string, string> = {
  eu: 'round-4---lobby-1',
  na: 'round-3---lobby-1',
  finals: 'na',
};

function buildUrl(params: Record<string, string | undefined>) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });

  const serialized = query.toString();
  return serialized ? `/esport/resurgence-series?${serialized}` : '/esport/resurgence-series';
}

function isOnlineQualifiers(stage?: CompetitionOption) {
  return stage?.value.toLowerCase() === ONLINE_QUALIFIERS;
}

function regionOrder(region: CompetitionOption) {
  const index = ONLINE_REGIONS.findIndex((label) => label.toLowerCase() === region.title.toLowerCase());
  return index === -1 ? ONLINE_REGIONS.length : index;
}

export default function WrsEventControls({ stages, phases, events, selected }: Props) {
  const router = useRouter();

  const stageOptions = stages.filter((stage) => !selected.year?.id || stage.parentId === selected.year.id);
  const phaseOptions = phases
    .filter((phase) => !selected.stage?.id || phase.parentId === selected.stage.id)
    .filter((phase) => !isOnlineQualifiers(selected.stage) || ONLINE_REGIONS.some((label) => label.toLowerCase() === phase.title.toLowerCase()))
    .sort((a, b) => regionOrder(a) - regionOrder(b));
  const eventOptions = events.filter((event) => !selected.phase?.id || event.parentId === selected.phase.id);

  function go(next: Record<string, string | undefined>) {
    router.push(buildUrl({
      year: selected.year?.value,
      stage: selected.stage?.value,
      phase: selected.phase?.value,
      event: selected.event?.value,
      ...next,
    }));
  }

  function defaultEventForPhase(phaseValue: string) {
    if (!isOnlineQualifiers(selected.stage)) return undefined;
    return ONLINE_DEFAULT_EVENTS[phaseValue.toLowerCase()];
  }

  return (
    <div className="competitive-filters wrs-event-controls">
      <label>
        <span>Event</span>
        <select
          aria-label="WRS event group"
          value={selected.stage?.value || ''}
          onChange={(event) => go({
            stage: event.target.value,
            phase: event.target.value.toLowerCase() === ONLINE_QUALIFIERS ? 'eu' : undefined,
            event: event.target.value.toLowerCase() === ONLINE_QUALIFIERS ? ONLINE_DEFAULT_EVENTS.eu : undefined,
          })}
        >
          {stageOptions.map((stage) => (
            <option key={stage.id} value={stage.value}>{stage.title}</option>
          ))}
        </select>
      </label>

      <label>
        <span>Region</span>
        <select
          aria-label="WRS matchmaking region"
          value={selected.phase?.value || ''}
          onChange={(event) => go({ phase: event.target.value, event: defaultEventForPhase(event.target.value) })}
        >
          {phaseOptions.map((phase) => (
            <option key={phase.id} value={phase.value}>{phase.title}</option>
          ))}
        </select>
      </label>

      <label>
        <span>Round / Lobby</span>
        <select
          aria-label="WRS round or lobby"
          value={selected.event?.value || ''}
          onChange={(event) => go({ event: event.target.value })}
        >
          {eventOptions.map((event) => (
            <option key={event.id} value={event.value}>{event.title}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
