'use client';

import { useState, useEffect, useRef } from 'react';

const SPEEDS = {
  slow:   { label: 'SLOW',   bpm: 100, durations: [350, 200, 150, 300] },
  normal: { label: 'NORMAL', bpm: 165, durations: [220, 140, 110, 180] },
  fast:   { label: 'FAST',   bpm: 220, durations: [160, 100,  80, 130] },
} as const;
type SpeedKey = keyof typeof SPEEDS;

type TrainerState = {
  activeStep: number;
  cycles: number;
};

const STEPS = [
  { label: 'SPRINT',  sublabel: 'Hold forward',   hint: 'L-stick / W',    color: '#00ff88' },
  { label: 'SLIDE',   sublabel: 'Press crouch',   hint: 'R3 / C',         color: '#ffcc00' },
  { label: 'CANCEL',  sublabel: 'Press jump',     hint: 'X / A / Space',  color: '#ff6644' },
  { label: 'RESET',   sublabel: 'Sprint again',   hint: '',               color: 'rgba(255,255,255,0.15)' },
];

export default function SlideCancelTrainer() {
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState<SpeedKey>('normal');
  const [trainer, setTrainer] = useState<TrainerState>({ activeStep: 0, cycles: 0 });
  const stepRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { activeStep, cycles } = trainer;

  function resetTrainer() {
    clearTimeout(timerRef.current);
    stepRef.current = 0;
    setTrainer({ activeStep: 0, cycles: 0 });
  }

  useEffect(() => {
    if (!running) {
      clearTimeout(timerRef.current);
      return;
    }

    stepRef.current = 0;

    function tick() {
      const idx = stepRef.current % STEPS.length;
      setTrainer((current) => ({
        activeStep: idx,
        cycles: idx === STEPS.length - 1 ? current.cycles + 1 : current.cycles,
      }));
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
    <div className="border border-black/12 rounded mb-8 overflow-hidden font-mono">
      <div className="px-6 py-5 border-b border-black/10 bg-black/2 flex justify-between items-center">
        <div>
          <div className="text-xs tracking-normal opacity-40 mb-1">INTERACTIVE TRAINER</div>
          <div className="text-base font-bold tracking-normal">SLIDE CANCEL RHYTHM TRAINER</div>
        </div>
        <div className="text-xs opacity-35 tracking-normal">
          {running ? `CYCLE ${cycles + 1}` : 'READY'}
        </div>
      </div>

      <div className="p-6">
        {/* Speed selector */}
        <div className="flex items-center gap-2 mb-8">
          <div className="text-xs tracking-normal opacity-40 mr-1">SPEED</div>
          {(Object.entries(SPEEDS) as [SpeedKey, typeof SPEEDS[SpeedKey]][]).map(([key, s]) => (
            <button type="button" key={key} onClick={() => { resetTrainer(); setRunning(false); setSpeed(key); }}
              className="font-mono text-xs tracking-normal cursor-pointer rounded-sm"
              style={{
                padding: '5px 14px',
                border: `1px solid ${speed === key ? '#00ff88' : 'rgba(0,0,0,0.15)'}`,
                background: speed === key ? 'rgba(0,255,136,0.08)' : 'transparent',
                color: speed === key ? '#00ff88' : 'rgba(0,0,0,0.45)',
              }}
            >
              {s.label}
            </button>
          ))}
          <div className="ml-auto text-xs opacity-35 tracking-normal">
            {SPEEDS[speed].bpm} BPM
          </div>
        </div>

        {/* Step cards */}
        <div className="grid grid-cols-4 gap-[0.6rem] mb-6">
          {STEPS.map((step, i) => {
            const isActive = running && activeStep === i;
            return (
              <div key={step.label} className="text-center transition-all duration-[60ms]"
                style={{
                  padding: '1.1rem 0.75rem',
                  border: `1px solid ${isActive ? step.color : 'rgba(0,0,0,0.1)'}`,
                  borderRadius: '3px',
                  background: isActive ? `${step.color}12` : 'transparent',
                  transform: isActive ? 'scale(1.03)' : 'scale(1)',
                }}
              >
                <div className="text-[0.78rem] font-bold tracking-normal mb-1.5"
                  style={{ color: isActive ? step.color : 'rgba(0,0,0,0.45)' }}
                >
                  {step.label}
                </div>
                <div className="text-xs tracking-normal mb-2"
                  style={{ opacity: isActive ? 0.8 : 0.4 }}
                >
                  {step.sublabel}
                </div>
                {step.hint && (
                  <div className="inline-block text-xs tracking-normal rounded-sm px-[7px] py-[2px]"
                    style={{
                      background: isActive ? `${step.color}20` : 'rgba(0,0,0,0.05)',
                      border: `1px solid ${isActive ? step.color : 'rgba(0,0,0,0.1)'}`,
                      color: isActive ? step.color : 'rgba(0,0,0,0.35)',
                    }}
                  >
                    {step.hint}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Timing bar */}
        <div className="flex h-[3px] rounded-sm overflow-hidden gap-0.5 mb-6">
          {STEPS.map((step, i) => (
            <div key={i} className="rounded-sm"
              style={{
                width: `${(SPEEDS[speed].durations[i] / totalDuration) * 100}%`,
                background: (running && activeStep === i) ? step.color : 'rgba(0,0,0,0.1)',
                transition: 'background 0.06s',
              }}
            />
          ))}
        </div>

        {/* Context tip */}
        <div className="mb-5 rounded-sm"
          style={{ padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}
        >
          <span className="text-xs opacity-40 tracking-normal">TIP — </span>
          <span className="text-xs opacity-60 leading-relaxed">
            {speed === 'slow'
              ? 'Learn the sequence at this pace. Move up only when the timing becomes automatic.'
              : speed === 'normal'
              ? 'Competitive match rhythm. Slide to cancel in under 250ms total.'
              : 'Advanced level: chain several slide cancels without losing speed between inputs.'}
          </span>
        </div>

        {/* Start/Stop */}
        <button type="button" onClick={() => {
          resetTrainer();
          setRunning(r => !r);
        }}
          className="w-full font-mono text-xs tracking-normal cursor-pointer rounded-sm"
          style={{
            padding: '0.85rem',
            background: running ? 'rgba(255,70,70,0.06)' : 'rgba(0,255,136,0.06)',
            border: `1px solid ${running ? 'rgba(255,70,70,0.4)' : '#00ff88'}`,
            color: running ? 'rgba(255,80,80,0.9)' : '#00ff88',
          }}
        >
          {running ? 'STOP' : 'START TRAINER'}
        </button>
      </div>
    </div>
  );
}
