'use client';

import { useState, useEffect, useRef } from 'react';

const SPEEDS = {
  slow:   { label: 'SLOW',   bpm: 100, durations: [350, 200, 150, 300] },
  normal: { label: 'NORMAL', bpm: 165, durations: [220, 140, 110, 180] },
  fast:   { label: 'FAST',   bpm: 220, durations: [160, 100,  80, 130] },
} as const;
type SpeedKey = keyof typeof SPEEDS;

const STEPS = [
  { label: 'SPRINT',  sublabel: 'Hold forward',   hint: 'L-stick / W',    color: '#00ff88' },
  { label: 'SLIDE',   sublabel: 'Press crouch',   hint: 'R3 / C',         color: '#ffcc00' },
  { label: 'CANCEL',  sublabel: 'Press jump',     hint: 'X / A / Space',  color: '#ff6644' },
  { label: 'RESET',   sublabel: 'Sprint again',   hint: '',               color: 'rgba(255,255,255,0.15)' },
];

export default function SlideCancelTrainer() {
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState<SpeedKey>('normal');
  const [activeStep, setActiveStep] = useState(0);
  const [cycles, setCycles] = useState(0);
  const stepRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function resetTrainer() {
    clearTimeout(timerRef.current);
    stepRef.current = 0;
    setActiveStep(0);
    setCycles(0);
  }

  useEffect(() => {
    if (!running) {
      clearTimeout(timerRef.current);
      return;
    }

    stepRef.current = 0;

    function tick() {
      const idx = stepRef.current % STEPS.length;
      setActiveStep(idx);
      if (idx === STEPS.length - 1) setCycles(c => c + 1);
      timerRef.current = setTimeout(() => {
        stepRef.current++;
        tick();
      }, SPEEDS[speed].durations[idx]);
    }

    tick();
    return () => clearTimeout(timerRef.current);
  }, [running, speed]);

  const totalDuration = SPEEDS[speed].durations.reduce((a, b) => a + b, 0);

  return (
    <div style={{ border: '1px solid rgba(0,0,0,0.12)', borderRadius: '4px', marginBottom: '2rem', overflow: 'hidden', fontFamily: 'monospace' }}>

      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.1)', background: 'rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.55rem', letterSpacing: '0.2em', opacity: 0.4, marginBottom: '0.3rem' }}>INTERACTIVE TRAINER</div>
          <div style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.08em' }}>SLIDE CANCEL RHYTHM TRAINER</div>
        </div>
        <div style={{ fontSize: '0.55rem', opacity: 0.35, letterSpacing: '0.12em' }}>
          {running ? `CYCLE ${cycles + 1}` : 'READY'}
        </div>
      </div>

      <div style={{ padding: '1.5rem' }}>

        {/* Speed selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.5rem', letterSpacing: '0.12em', opacity: 0.4, marginRight: '0.25rem' }}>SPEED</div>
          {(Object.entries(SPEEDS) as [SpeedKey, typeof SPEEDS[SpeedKey]][]).map(([key, s]) => (
            <button key={key} onClick={() => setSpeed(key)} style={{ padding: '5px 14px', border: `1px solid ${speed === key ? '#00ff88' : 'rgba(0,0,0,0.15)'}`, background: speed === key ? 'rgba(0,255,136,0.08)' : 'transparent', color: speed === key ? '#00ff88' : 'rgba(0,0,0,0.45)', fontFamily: 'monospace', fontSize: '0.55rem', letterSpacing: '0.12em', cursor: 'pointer', borderRadius: '2px' }}>
              {s.label}
            </button>
          ))}
          <div style={{ marginLeft: 'auto', fontSize: '0.55rem', opacity: 0.35, letterSpacing: '0.1em' }}>
            {SPEEDS[speed].bpm} BPM
          </div>
        </div>

        {/* Step cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.6rem', marginBottom: '1.5rem' }}>
          {STEPS.map((step, i) => {
            const isActive = running && activeStep === i;
            return (
              <div key={i} style={{ padding: '1.1rem 0.75rem', border: `1px solid ${isActive ? step.color : 'rgba(0,0,0,0.1)'}`, borderRadius: '3px', background: isActive ? `${step.color}12` : 'transparent', textAlign: 'center', transition: 'all 0.06s', transform: isActive ? 'scale(1.03)' : 'scale(1)' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.06em', color: isActive ? step.color : 'rgba(0,0,0,0.45)', marginBottom: '0.35rem' }}>
                  {step.label}
                </div>
                <div style={{ fontSize: '0.48rem', letterSpacing: '0.1em', opacity: isActive ? 0.8 : 0.4, marginBottom: '0.5rem' }}>
                  {step.sublabel}
                </div>
                {step.hint && (
                  <div style={{ display: 'inline-block', padding: '2px 7px', background: isActive ? `${step.color}20` : 'rgba(0,0,0,0.05)', border: `1px solid ${isActive ? step.color : 'rgba(0,0,0,0.1)'}`, borderRadius: '2px', fontSize: '0.45rem', letterSpacing: '0.08em', color: isActive ? step.color : 'rgba(0,0,0,0.35)' }}>
                    {step.hint}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Timing bar */}
        <div style={{ display: 'flex', height: '3px', borderRadius: '2px', overflow: 'hidden', gap: '2px', marginBottom: '1.5rem' }}>
          {STEPS.map((step, i) => (
            <div key={i} style={{ width: `${(SPEEDS[speed].durations[i] / totalDuration) * 100}%`, background: (running && activeStep === i) ? step.color : 'rgba(0,0,0,0.1)', transition: 'background 0.06s', borderRadius: '2px' }} />
          ))}
        </div>

        {/* Context tip */}
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '2px', marginBottom: '1.25rem' }}>
          <span style={{ fontSize: '0.5rem', opacity: 0.4, letterSpacing: '0.12em' }}>TIP — </span>
          <span style={{ fontSize: '0.57rem', opacity: 0.6, lineHeight: 1.7 }}>
            {speed === 'slow'
              ? 'Learn the sequence at this pace. Move up only when the timing becomes automatic.'
              : speed === 'normal'
              ? 'Competitive match rhythm. Slide to cancel in under 250ms total.'
              : 'Advanced level: chain several slide cancels without losing speed between inputs.'}
          </span>
        </div>

        {/* Start/Stop */}
        <button onClick={() => {
          resetTrainer();
          setRunning(r => !r);
        }} style={{ width: '100%', padding: '0.85rem', background: running ? 'rgba(255,70,70,0.06)' : 'rgba(0,255,136,0.06)', border: `1px solid ${running ? 'rgba(255,70,70,0.4)' : '#00ff88'}`, borderRadius: '3px', fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.18em', color: running ? 'rgba(255,80,80,0.9)' : '#00ff88', cursor: 'pointer' }}>
          {running ? 'STOP' : 'START TRAINER'}
        </button>
      </div>
    </div>
  );
}
