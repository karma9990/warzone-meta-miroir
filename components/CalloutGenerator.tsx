'use client';

import { useState } from 'react';

type MapId = 'rebirth' | 'haven';

interface Callout {
  zone: string;
  callout: string;
  short: string;
  sub: { spot: string; call: string }[];
}

const MAPS: Record<MapId, { label: string; callouts: Callout[] }> = {
  rebirth: {
    label: 'Rebirth Island',
    callouts: [
      {
        zone: 'Bioweapons', callout: 'BIO', short: 'BIO',
        sub: [
          { spot: 'Bioweapons rooftop',        call: 'BIO ROOF' },
          { spot: 'Bioweapons north entrance',  call: 'BIO NORTH' },
          { spot: 'Bioweapons south stairs',    call: 'BIO STAIRS' },
          { spot: 'Bioweapons east window',     call: 'BIO EAST WINDOW' },
        ],
      },
      {
        zone: 'Prison', callout: 'PRISON', short: 'PRISON',
        sub: [
          { spot: 'Prison tower top',     call: 'TOWER' },
          { spot: 'Prison courtyard',     call: 'YARD' },
          { spot: 'Prison west doorframe', call: 'PRISON WEST DOOR' },
          { spot: 'Prison north corridor', call: 'NORTH HALL' },
        ],
      },
      {
        zone: 'Headquaters', callout: 'HQ', short: 'HQ',
        sub: [
          { spot: 'HQ rooftop',         call: 'HQ ROOF' },
          { spot: 'HQ main entrance',   call: 'HQ FRONT' },
          { spot: 'HQ courtyard',       call: 'HQ YARD' },
          { spot: 'HQ west side',       call: 'HQ WEST' },
        ],
      },
      {
        zone: 'Control Center', callout: 'CONTROL', short: 'CTRL',
        sub: [
          { spot: 'Control top floor',     call: 'CTRL TOP' },
          { spot: 'Control ground level',  call: 'CTRL GROUND' },
          { spot: 'Control east window',   call: 'CTRL WINDOW' },
        ],
      },
      {
        zone: 'Chemical Engineer', callout: 'CHEM', short: 'CHEM',
        sub: [
          { spot: 'Chemical rooftop',      call: 'CHEM ROOF' },
          { spot: 'Chemical ground floor', call: 'CHEM GROUND' },
        ],
      },
      {
        zone: 'Industry', callout: 'INDUSTRY', short: 'INDUSTRY',
        sub: [
          { spot: 'Industry rooftop',  call: 'IND ROOF' },
          { spot: 'Industry entrance', call: 'IND DOOR' },
        ],
      },
      {
        zone: 'Harbor', callout: 'HARBOR', short: 'HARBOR',
        sub: [
          { spot: 'Harbor dock',   call: 'HARBOR DOCK' },
          { spot: 'Harbor rooftop', call: 'HARBOR ROOF' },
        ],
      },
      {
        zone: 'Factory', callout: 'FACTORY', short: 'FACTORY',
        sub: [
          { spot: 'Factory roof',   call: 'FACTORY ROOF' },
          { spot: 'Factory south',  call: 'FACTORY SOUTH' },
        ],
      },
      {
        zone: 'Living Quarters', callout: 'LIVING', short: 'LIVING',
        sub: [
          { spot: 'Living Quarters rooftop', call: 'LIVING ROOF' },
          { spot: 'Living Quarters south',   call: 'LIVING SOUTH' },
        ],
      },
      {
        zone: 'Dock', callout: 'DOCK', short: 'DOCK',
        sub: [
          { spot: 'Dock building', call: 'DOCK BUILDING' },
          { spot: 'Dock water edge', call: 'DOCK WATER' },
        ],
      },
      {
        zone: 'Stronghold', callout: 'STRONGHOLD', short: 'STRONG',
        sub: [
          { spot: 'Stronghold building', call: 'STRONG BUILDING' },
          { spot: 'Stronghold roof',     call: 'STRONG ROOF' },
        ],
      },
      {
        zone: 'Turbines', callout: 'TURBINES', short: 'TURBINES',
        sub: [
          { spot: 'Turbines center', call: 'TURBINES CENTER' },
          { spot: 'Turbines east',   call: 'TURBINES EAST' },
        ],
      },
    ],
  },
  haven: {
    label: 'Haven Hollow',
    callouts: [
      {
        zone: 'Mansion', callout: 'MANSION', short: 'MANSION',
        sub: [
          { spot: 'Mansion rooftop',      call: 'MANSION ROOF' },
          { spot: 'Mansion front door',   call: 'MANSION FRONT' },
          { spot: 'Mansion basement',     call: 'MANSION BASEMENT' },
          { spot: 'Mansion east balcony', call: 'MANSION BALCONY' },
        ],
      },
      {
        zone: 'Train Station', callout: 'TRAIN', short: 'TRAIN',
        sub: [
          { spot: 'Train Station platform', call: 'TRAIN PLATFORM' },
          { spot: 'Train Station building', call: 'TRAIN BUILDING' },
          { spot: 'Train Station west',     call: 'TRAIN WEST' },
        ],
      },
      {
        zone: 'Basin / Barn', callout: 'BASIN', short: 'BASIN',
        sub: [
          { spot: 'Basin open field',  call: 'BASIN OPEN' },
          { spot: 'Basin building',    call: 'BASIN BUILDING' },
          { spot: 'Basin north edge',  call: 'BASIN NORTH' },
        ],
      },
      {
        zone: 'Main Street', callout: 'MAIN', short: 'MAIN',
        sub: [
          { spot: 'Main Street rooftop', call: 'MAIN ROOF' },
          { spot: 'Main Street alley',   call: 'MAIN ALLEY' },
          { spot: 'Main Street east end', call: 'MAIN EAST' },
        ],
      },
      {
        zone: 'Lumbermill', callout: 'LUMBER', short: 'LUMBER',
        sub: [
          { spot: 'Lumbermill upper floor', call: 'LUMBER TOP' },
          { spot: 'Lumbermill ground',      call: 'LUMBER GROUND' },
          { spot: 'Lumbermill northeast',   call: 'LUMBER NE' },
        ],
      },
      {
        zone: 'Research Center', callout: 'RESEARCH', short: 'RESEARCH',
        sub: [
          { spot: 'Research rooftop',   call: 'RESEARCH ROOF' },
          { spot: 'Research entrance',  call: 'RESEARCH DOOR' },
        ],
      },
      {
        zone: 'Pond', callout: 'POND', short: 'POND',
        sub: [
          { spot: 'Pond rooftop',     call: 'POND ROOF' },
          { spot: 'Pond waterside',   call: 'POND WATER' },
        ],
      },
      {
        zone: 'Riverboat', callout: 'RIVER', short: 'RIVER',
        sub: [
          { spot: 'Riverboat deck',   call: 'RIVER DECK' },
          { spot: 'Riverboat south',  call: 'RIVER SOUTH' },
        ],
      },
      {
        zone: 'Coal Depot', callout: 'COAL', short: 'COAL',
        sub: [
          { spot: 'Coal Depot top',    call: 'COAL TOP' },
          { spot: 'Coal Depot ground', call: 'COAL GROUND' },
        ],
      },
    ],
  },
};

export default function CalloutGenerator() {
  const [map, setMap] = useState<MapId>('rebirth');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const data = MAPS[map];
  const filtered = data.callouts.filter(c =>
    c.zone.toLowerCase().includes(search.toLowerCase()) ||
    c.callout.toLowerCase().includes(search.toLowerCase())
  );

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="border border-black/12 rounded mb-12 overflow-hidden font-mono">
      <div className="px-6 py-5 border-b border-black/10 bg-black/2">
        <div className="text-xs tracking-normal opacity-40 mb-1">COMMUNICATION</div>
        <div className="text-base font-bold tracking-normal">CALLOUT GENERATOR</div>
      </div>

      <div className="flex border-b border-black/10 items-center">
        {(['rebirth', 'haven'] as MapId[]).map(m => (
          <button type="button" key={m} onClick={() => { setMap(m); setExpanded(null); setSearch(''); }}
            className="font-mono text-xs tracking-normal cursor-pointer bg-transparent border-none"
            style={{
              padding: '0.75rem 1.5rem',
              borderBottom: map === m ? '2px solid currentColor' : '2px solid transparent',
              color: map === m ? 'inherit' : 'rgba(0,0,0,0.35)',
              fontWeight: map === m ? 700 : 400,
            }}
          >{MAPS[m].label.toUpperCase()}</button>
        ))}
        <div className="ml-auto px-4">
          <input aria-label="Input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search zone..."
            className="font-mono text-xs px-2 py-1 border border-black/15 rounded-sm bg-transparent w-[140px]"
          />
        </div>
      </div>

      <div>
        {filtered.map((c) => (
          <div key={c.zone} className="border-b border-black/6 last:border-none">
            <div role="button" tabIndex={0}
              onClick={() => setExpanded(expanded === c.zone ? null : c.zone)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setExpanded(expanded === c.zone ? null : c.zone);
                }
              }}
              className="flex justify-between items-center px-6 cursor-pointer select-none"
              style={{ paddingTop: '0.85rem', paddingBottom: '0.85rem' }}
            >
              <div className="flex gap-4 items-center">
                <span className="text-xs font-bold tracking-normal">{c.zone}</span>
                <span className="text-xs tracking-normal px-1.5 py-0.5 border border-black/12 rounded-sm opacity-50">{c.callout}</span>
              </div>
              <div className="flex gap-2 items-center">
                <button type="button" onClick={e => { e.stopPropagation(); copy(c.callout, c.zone); }}
                  className="font-mono text-xs cursor-pointer rounded-sm"
                  style={{
                    padding: '3px 8px',
                    border: '1px solid rgba(0,0,0,0.12)',
                    background: copied === c.zone ? 'rgba(0,255,136,0.1)' : 'transparent',
                    color: copied === c.zone ? '#00ff88' : 'inherit',
                  }}
                >
                  {copied === c.zone ? 'COPIED' : 'COPY'}
                </button>
                <span className="text-xs opacity-30">{expanded === c.zone ? '▲' : '▼'}</span>
              </div>
            </div>
            {expanded === c.zone && (
              <div className="px-6 pb-[0.9rem] grid grid-cols-2 gap-1">
                {c.sub.map(s => (
                  <div key={s.spot} className="flex justify-between items-center px-2 py-1 bg-black/3 rounded-sm">
                    <span className="text-xs opacity-60">{s.spot}</span>
                    <div className="flex gap-2 items-center">
                      <span className="text-xs font-bold tracking-normal">{s.call}</span>
                      <button type="button" onClick={() => copy(s.call, s.call)}
                        className="font-mono text-xs cursor-pointer rounded-sm"
                        style={{
                          padding: '2px 6px',
                          border: '1px solid rgba(0,0,0,0.1)',
                          background: copied === s.call ? 'rgba(0,255,136,0.1)' : 'transparent',
                          color: copied === s.call ? '#00ff88' : 'inherit',
                        }}
                      >
                        {copied === s.call ? '✓' : 'COPY'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="px-6 py-2.5 border-t border-black/8 text-xs tracking-normal opacity-30">
        STANDARDIZED CALLOUTS FOR COMPETITIVE COMMUNICATION — SHARE WITH YOUR SQUAD
      </div>
    </div>
  );
}
