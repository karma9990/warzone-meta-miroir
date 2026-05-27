'use client';

import { useState } from 'react';

interface Answer {
  playstyle: 'aggressive' | 'balanced' | 'precision' | null;
  feel: 'too-slow' | 'correct' | 'too-fast' | null;
  controller: 'new' | 'worn' | 'drifting' | null;
  experience: 'beginner' | 'intermediate' | 'veteran' | null;
  platform: 'console' | 'pc-controller' | 'pc-mkb' | null;
}

interface Result {
  sensitivityH: number;
  sensitivityV: number;
  leftStickMin: number;
  leftStickMax: number;
  rightStickMin: number;
  rightStickMax: number;
  triggerLeft: number;
  triggerRight: number;
  aimAssist: string;
  responseCurve: string;
  note: string;
}

const QUESTIONS = [
  {
    key: 'playstyle',
    label: '01 — PLAYSTYLE',
    question: 'What is your primary playstyle?',
    options: [
      { value: 'aggressive', label: 'Aggressive', desc: 'I push, slide cancel, close-range fights under 20m' },
      { value: 'balanced', label: 'Balanced', desc: 'Mix of mid and close range, adaptive approach' },
      { value: 'precision', label: 'Precision', desc: 'Sniper support, holding angles, long-range fights' },
    ],
  },
  {
    key: 'feel',
    label: '02 — CURRENT FEEL',
    question: 'How does your current sensitivity feel in gunfights?',
    options: [
      { value: 'too-slow', label: 'Too slow', desc: 'I struggle to track fast enemies at close range' },
      { value: 'correct', label: 'Roughly correct', desc: 'Feels ok but my aim is inconsistent' },
      { value: 'too-fast', label: 'Too fast', desc: 'I overshoot and overcorrect constantly' },
    ],
  },
  {
    key: 'controller',
    label: '03 — CONTROLLER CONDITION',
    question: 'What is the condition of your controller joystick?',
    options: [
      { value: 'new', label: 'New / like new', desc: 'No drift, sticks feel tight and precise' },
      { value: 'worn', label: 'Slightly worn', desc: 'Occasional minor drift, but manageable' },
      { value: 'drifting', label: 'Drifting', desc: 'Noticeable drift — camera moves on its own' },
    ],
  },
  {
    key: 'experience',
    label: '04 — EXPERIENCE',
    question: 'How long have you been playing FPS games on controller?',
    options: [
      { value: 'beginner', label: 'Under 1 year', desc: 'Still building muscle memory' },
      { value: 'intermediate', label: '1 to 3 years', desc: 'Comfortable, looking to improve consistency' },
      { value: 'veteran', label: '3+ years', desc: 'Muscle memory is established, fine-tuning' },
    ],
  },
  {
    key: 'platform',
    label: '05 — PLATFORM',
    question: 'What platform are you playing on?',
    options: [
      { value: 'console', label: 'Console', desc: 'PS4 / PS5 / Xbox — playing on a TV' },
      { value: 'pc-controller', label: 'PC with controller', desc: 'Monitor setup, controller input' },
      { value: 'pc-mkb', label: 'PC — mouse & keyboard', desc: 'Full mouse and keyboard setup' },
    ],
  },
];

function calculate(answers: Answer): Result {
  // Warzone sensitivity range: 1.55 – 2.25, steps of 0.05
  let base = 1.90;

  if (answers.playstyle === 'aggressive') base = 2.10;
  else if (answers.playstyle === 'balanced') base = 1.90;
  else if (answers.playstyle === 'precision') base = 1.70;

  if (answers.feel === 'too-slow') base += 0.15;
  else if (answers.feel === 'too-fast') base -= 0.15;

  if (answers.experience === 'beginner') base -= 0.10;
  else if (answers.experience === 'veteran') base += 0.10;

  // Dead zone defaults — new / like new controller (optimal values)
  let leftStickMin = 1;
  let leftStickMax = 75;
  let rightStickMin = 5;
  let rightStickMax = 99;
  const triggerLeft = 0;
  const triggerRight = 0;
  let controllerNote = '';

  if (answers.controller === 'worn') {
    base += 0.10;
    leftStickMin = 6;
    leftStickMax = 75;
    rightStickMin = 10;
    rightStickMax = 99;
    controllerNote = ' Your worn joystick requires a higher minimum dead zone to filter drift — prioritise replacing it.';
  } else if (answers.controller === 'drifting') {
    base += 0.15;
    leftStickMin = 14;
    leftStickMax = 75;
    rightStickMin = 18;
    rightStickMax = 99;
    controllerNote = ' Your joystick is drifting — replace it as soon as possible. The dead zone workaround costs you responsiveness.';
  }

  // Round to nearest 0.05, clamp strictly to 1.55–2.25
  const sens = Math.min(2.25, Math.max(1.55, Math.round(base * 20) / 20));

  const aimAssist = answers.playstyle === 'precision' ? 'Precision' : 'Black Ops';

  let note = '';
  if (answers.platform === 'pc-mkb') {
    note = 'You are on mouse & keyboard — sensitivity settings above apply to controller only. For mouse, target 3–5 inches per 360° and disable aim assist entirely.';
  } else if (answers.platform === 'pc-controller') {
    note = 'On PC with a controller, make sure Raw Input is enabled and V-Sync is off for minimum input lag.' + controllerNote;
  } else {
    note = 'On console, set your TV to Game Mode to reduce display latency by 20–40ms before anything else.' + controllerNote;
  }

  return {
    sensitivityH: sens,
    sensitivityV: sens,
    leftStickMin,
    leftStickMax,
    rightStickMin,
    rightStickMax,
    triggerLeft,
    triggerRight,
    aimAssist,
    responseCurve: 'Linear',
    note,
  };
}

export default function SettingsCalculator() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answer>({
    playstyle: null, feel: null, controller: null, experience: null, platform: null,
  });
  const [result, setResult] = useState<Result | null>(null);

  const keys = ['playstyle', 'feel', 'controller', 'experience', 'platform'] as const;
  const currentQ = QUESTIONS[step];

  function handleSelect(value: string) {
    const key = keys[step];
    const next = { ...answers, [key]: value };
    setAnswers(next);

    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      setResult(calculate(next as Answer));
    }
  }

  function reset() {
    setStep(0);
    setAnswers({ playstyle: null, feel: null, controller: null, experience: null, platform: null });
    setResult(null);
  }

  return (
    <div style={{ border: '1px solid rgba(0,0,0,0.15)', background: 'rgba(0,0,0,0.02)', marginBottom: '3rem' }}>
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontFamily: 'monospace', fontSize: '0.55rem', letterSpacing: '0.2em', opacity: 0.4 }}>EXCLUSIVE TOOL</span>
          <h2 style={{ fontFamily: 'monospace', fontSize: '0.95rem', letterSpacing: '0.1em', margin: '0.25rem 0 0' }}>PERSONALIZED SETTINGS CALCULATOR</h2>
        </div>
        {result && (
          <button onClick={reset} style={{ fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: '0.12em', background: 'transparent', border: '1px solid rgba(0,0,0,0.2)', padding: '0.4rem 0.8rem', cursor: 'pointer', opacity: 0.5 }}>
            RESTART
          </button>
        )}
      </div>

      {!result ? (
        <div style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem' }}>
            {QUESTIONS.map((_, i) => (
              <div key={i} style={{ flex: 1, height: '2px', background: i <= step ? 'blue' : 'rgba(0,0,0,0.1)', transition: 'background 0.2s' }} />
            ))}
          </div>

          <p style={{ fontFamily: 'monospace', fontSize: '0.55rem', letterSpacing: '0.18em', opacity: 0.35, margin: '0 0 0.4rem' }}>{currentQ.label}</p>
          <p style={{ fontFamily: 'monospace', fontSize: '0.82rem', letterSpacing: '0.04em', margin: '0 0 1.25rem', lineHeight: 1.5 }}>{currentQ.question}</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {currentQ.options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                style={{ textAlign: 'left', padding: '0.9rem 1.1rem', border: '1px solid rgba(0,0,0,0.12)', background: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontFamily: 'monospace', transition: 'border-color 0.15s, background 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'blue'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,255,0.03)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,0,0,0.12)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.5)'; }}
              >
                <div style={{ fontSize: '0.78rem', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>{opt.label}</div>
                <div style={{ fontSize: '0.65rem', opacity: 0.45, lineHeight: 1.4 }}>{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ padding: '1.5rem' }}>
          <p style={{ fontFamily: 'monospace', fontSize: '0.55rem', letterSpacing: '0.18em', opacity: 0.35, margin: '0 0 1.25rem' }}>YOUR RECOMMENDED SETTINGS</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1px', background: 'rgba(0,0,0,0.1)', border: '1px solid rgba(0,0,0,0.1)', marginBottom: '1rem' }}>
            {[
              { label: 'SENSITIVITY H', value: String(result.sensitivityH) },
              { label: 'SENSITIVITY V', value: String(result.sensitivityV) },
              { label: 'AIM ASSIST TYPE', value: result.aimAssist },
              { label: 'RESPONSE CURVE', value: result.responseCurve },
            ].map((item) => (
              <div key={item.label} style={{ background: 'rgba(245,245,240,0.9)', padding: '1rem 1.1rem' }}>
                <div style={{ fontFamily: 'monospace', fontSize: '0.5rem', letterSpacing: '0.18em', opacity: 0.35, marginBottom: '0.4rem' }}>{item.label}</div>
                <div style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 700, color: 'blue', letterSpacing: '0.05em' }}>{item.value}</div>
              </div>
            ))}
          </div>

          <p style={{ fontFamily: 'monospace', fontSize: '0.5rem', letterSpacing: '0.18em', opacity: 0.35, margin: '0 0 0.5rem' }}>DEAD ZONES</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1px', background: 'rgba(0,0,0,0.1)', border: '1px solid rgba(0,0,0,0.1)', marginBottom: '1.25rem' }}>
            {[
              { label: 'LEFT STICK MIN', value: String(result.leftStickMin) },
              { label: 'LEFT STICK MAX', value: String(result.leftStickMax) },
              { label: 'RIGHT STICK MIN', value: String(result.rightStickMin) },
              { label: 'RIGHT STICK MAX', value: String(result.rightStickMax) },
              { label: 'TRIGGER LEFT', value: String(result.triggerLeft) },
              { label: 'TRIGGER RIGHT', value: String(result.triggerRight) },
            ].map((item) => (
              <div key={item.label} style={{ background: 'rgba(245,245,240,0.9)', padding: '1rem 1.1rem' }}>
                <div style={{ fontFamily: 'monospace', fontSize: '0.5rem', letterSpacing: '0.18em', opacity: 0.35, marginBottom: '0.4rem' }}>{item.label}</div>
                <div style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 700, color: 'blue', letterSpacing: '0.05em' }}>{item.value}</div>
              </div>
            ))}
          </div>

          <p style={{ fontFamily: 'monospace', fontSize: '0.68rem', lineHeight: 1.75, opacity: 0.55, margin: '0 0 1.25rem' }}>
            {result.note}
          </p>

          <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '1rem' }}>
            <p style={{ fontFamily: 'monospace', fontSize: '0.62rem', lineHeight: 1.8, opacity: 0.4, margin: 0 }}>
              These settings are a starting point — not a final answer. Every player&apos;s hands, hardware, and muscle memory are different. Apply these values, play 10 full sessions, then fine-tune based on what you actually feel in gunfights. This calculator is designed as a calibrated baseline for players who do not know where to start — experienced players should treat it as a reference and adjust from there.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
