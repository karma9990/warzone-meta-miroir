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
    <div style={{ border: '1px solid rgba(0,0,0,0.12)', borderRadius: '4px', marginBottom: '3rem', overflow: 'hidden', fontFamily: 'monospace' }}>
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.1)', background: 'rgba(0,0,0,0.02)' }}>
        <div style={{ fontSize: '0.55rem', letterSpacing: '0.2em', opacity: 0.4, marginBottom: '0.3rem' }}>COMMUNICATION</div>
        <div style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.08em' }}>CALLOUT GENERATOR</div>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.1)', alignItems: 'center' }}>
        {(['rebirth', 'haven'] as MapId[]).map(m => (
          <button key={m} onClick={() => { setMap(m); setExpanded(null); setSearch(''); }} style={{
            padding: '0.75rem 1.5rem', border: 'none',
            borderBottom: map === m ? '2px solid currentColor' : '2px solid transparent',
            background: 'transparent', color: map === m ? 'inherit' : 'rgba(0,0,0,0.35)',
            fontSize: '0.6rem', letterSpacing: '0.15em', cursor: 'pointer', fontFamily: 'monospace', fontWeight: map === m ? 700 : 400,
          }}>{MAPS[m].label.toUpperCase()}</button>
        ))}
        <div style={{ marginLeft: 'auto', padding: '0 1rem' }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)} placeholder="Search zone..."
            style={{ fontFamily: 'monospace', fontSize: '0.6rem', padding: '5px 8px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '2px', background: 'transparent', width: '140px' }}
          />
        </div>
      </div>

      <div>
        {filtered.map((c, i) => (
          <div key={c.zone} style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
            <div
              onClick={() => setExpanded(expanded === c.zone ? null : c.zone)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1.5rem', cursor: 'pointer', userSelect: 'none' }}
            >
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em' }}>{c.zone}</span>
                <span style={{ fontSize: '0.5rem', letterSpacing: '0.15em', padding: '2px 6px', border: '1px solid rgba(0,0,0,0.12)', borderRadius: '2px', opacity: 0.5 }}>{c.callout}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  onClick={e => { e.stopPropagation(); copy(c.callout, c.zone); }}
                  style={{ padding: '3px 8px', border: '1px solid rgba(0,0,0,0.12)', borderRadius: '2px', background: copied === c.zone ? 'rgba(0,255,136,0.1)' : 'transparent', fontSize: '0.5rem', cursor: 'pointer', fontFamily: 'monospace', color: copied === c.zone ? '#00ff88' : 'inherit' }}
                >
                  {copied === c.zone ? 'COPIED' : 'COPY'}
                </button>
                <span style={{ fontSize: '0.5rem', opacity: 0.3 }}>{expanded === c.zone ? '▲' : '▼'}</span>
              </div>
            </div>
            {expanded === c.zone && (
              <div style={{ padding: '0 1.5rem 0.9rem', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem' }}>
                {c.sub.map(s => (
                  <div key={s.spot} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', background: 'rgba(0,0,0,0.03)', borderRadius: '2px' }}>
                    <span style={{ fontSize: '0.55rem', opacity: 0.6 }}>{s.spot}</span>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.06em' }}>{s.call}</span>
                      <button onClick={() => copy(s.call, s.call)} style={{ padding: '2px 6px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '2px', background: copied === s.call ? 'rgba(0,255,136,0.1)' : 'transparent', fontSize: '0.45rem', cursor: 'pointer', fontFamily: 'monospace', color: copied === s.call ? '#00ff88' : 'inherit' }}>
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

      <div style={{ padding: '0.6rem 1.5rem', borderTop: '1px solid rgba(0,0,0,0.08)', fontSize: '0.5rem', letterSpacing: '0.12em', opacity: 0.3 }}>
        STANDARDIZED CALLOUTS FOR COMPETITIVE COMMUNICATION — SHARE WITH YOUR SQUAD
      </div>
    </div>
  );
}
