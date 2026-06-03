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
  let base = 1.90;

  if (answers.playstyle === 'aggressive') base = 2.10;
  else if (answers.playstyle === 'balanced') base = 1.90;
  else if (answers.playstyle === 'precision') base = 1.70;

  if (answers.feel === 'too-slow') base += 0.15;
  else if (answers.feel === 'too-fast') base -= 0.15;

  if (answers.experience === 'beginner') base -= 0.10;
  else if (answers.experience === 'veteran') base += 0.10;

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
      setStep((current) => current + 1);
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
    <div className="border border-black/15 bg-black/2 mb-12">
      <div className="px-6 py-4 border-b border-black/10 flex justify-between items-center">
        <div>
          <span className="font-mono text-xs tracking-normal opacity-40">EXCLUSIVE TOOL</span>
          <h2 className="font-mono text-sm tracking-normal mt-1">PERSONALIZED SETTINGS CALCULATOR</h2>
        </div>
        {result && (
          <button type="button" onClick={reset}
            className="font-mono text-xs tracking-normal bg-transparent border border-black/20 px-3 py-1.5 cursor-pointer opacity-50"
          >
            RESTART
          </button>
        )}
      </div>

      {!result ? (
        <div className="p-6">
          <div className="flex gap-1 mb-6">
            {QUESTIONS.map((_, i) => (
              <div key={i} className="flex-1 h-0.5 transition-[background] duration-200"
                style={{ background: i <= step ? 'blue' : 'rgba(0,0,0,0.1)' }}
              />
            ))}
          </div>

          <p className="font-mono text-xs tracking-normal opacity-35 mb-1.5">{currentQ.label}</p>
          <p className="font-mono text-sm tracking-normal mb-5 leading-relaxed">{currentQ.question}</p>

          <div className="flex flex-col gap-2">
            {currentQ.options.map((opt) => (
              <button type="button" key={opt.value} onClick={() => handleSelect(opt.value)}
                className="font-mono text-left cursor-pointer transition-[border-color,background] duration-150"
                style={{ padding: '0.9rem 1.1rem', border: '1px solid rgba(0,0,0,0.12)', background: 'rgba(255,255,255,0.5)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'blue'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,255,0.03)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,0,0,0.12)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.5)'; }}
              >
                <div className="text-[0.78rem] tracking-normal mb-0.5">{opt.label}</div>
                <div className="text-xs opacity-45 leading-relaxed">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-6">
          <p className="font-mono text-xs tracking-normal opacity-35 mb-5">YOUR RECOMMENDED SETTINGS</p>

          <div className="grid gap-px mb-4 border border-black/10"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', background: 'rgba(0,0,0,0.1)' }}
          >
            {[
              { label: 'SENSITIVITY H', value: String(result.sensitivityH) },
              { label: 'SENSITIVITY V', value: String(result.sensitivityV) },
              { label: 'AIM ASSIST TYPE', value: result.aimAssist },
              { label: 'RESPONSE CURVE', value: result.responseCurve },
            ].map((item) => (
              <div key={item.label} className="px-[1.1rem] py-4"
                style={{ background: 'rgba(245,245,240,0.9)' }}
              >
                <div className="font-mono text-xs tracking-normal opacity-35 mb-1.5">{item.label}</div>
                <div className="font-mono text-lg font-bold tracking-normal" style={{ color: 'blue' }}>{item.value}</div>
              </div>
            ))}
          </div>

          <p className="font-mono text-xs tracking-normal opacity-35 mb-2">DEAD ZONES</p>
          <div className="grid gap-px mb-5 border border-black/10"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', background: 'rgba(0,0,0,0.1)' }}
          >
            {[
              { label: 'LEFT STICK MIN', value: String(result.leftStickMin) },
              { label: 'LEFT STICK MAX', value: String(result.leftStickMax) },
              { label: 'RIGHT STICK MIN', value: String(result.rightStickMin) },
              { label: 'RIGHT STICK MAX', value: String(result.rightStickMax) },
              { label: 'TRIGGER LEFT', value: String(result.triggerLeft) },
              { label: 'TRIGGER RIGHT', value: String(result.triggerRight) },
            ].map((item) => (
              <div key={item.label} className="px-[1.1rem] py-4"
                style={{ background: 'rgba(245,245,240,0.9)' }}
              >
                <div className="font-mono text-xs tracking-normal opacity-35 mb-1.5">{item.label}</div>
                <div className="font-mono text-lg font-bold tracking-normal" style={{ color: 'blue' }}>{item.value}</div>
              </div>
            ))}
          </div>

          <p className="font-mono text-xs leading-relaxed opacity-55 mb-5">{result.note}</p>

          <div className="border-t border-black/8 pt-4">
            <p className="font-mono text-xs leading-relaxed opacity-40">
              These settings are a starting point — not a final answer. Every player&apos;s hands, hardware, and muscle memory are different. Apply these values, play 10 full sessions, then fine-tune based on what you actually feel in gunfights. This calculator is designed as a calibrated baseline for players who do not know where to start — experienced players should treat it as a reference and adjust from there.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
