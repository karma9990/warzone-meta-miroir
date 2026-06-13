'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Loadout } from '@/lib/data';
import { calculateMetaScore } from '@/lib/loadoutUtils';
import { getLoadoutPath } from '@/lib/seo';
import { withLocalePath, type Locale } from '@/lib/i18n';

type Props = {
  loadouts: Loadout[];
  locale: Locale;
};

type Lang = 'en' | 'fr' | 'es';

type Answers = {
  mode?: 'resurgence' | 'br' | 'ranked';
  range?: 'close' | 'mid' | 'long';
  priority?: 'aggression' | 'consistency' | 'damage';
  input?: 'controller' | 'mkb';
  experience?: 'beginner' | 'experienced';
};

type QuestionKey = keyof Answers;

const COPY: Record<Lang, {
  eyebrow: string;
  title: string;
  intro: string;
  restart: string;
  resultTitle: string;
  resultSub: string;
  primary: string;
  alts: string;
  back: string;
  step: (a: number, b: number) => string;
  why: string;
}> = {
  en: {
    eyebrow: 'WZPRO // FINDER',
    title: 'FIND YOUR LOADOUT',
    intro: 'Five questions. We rank the meta against the way you actually play.',
    restart: 'Start over',
    resultTitle: 'YOUR BEST MATCH',
    resultSub: 'Ranked from current meta stats against your answers.',
    primary: 'View full build',
    alts: 'Also worth trying',
    back: 'Back',
    step: (a, b) => `Question ${a} of ${b}`,
    why: 'Why this build',
  },
  fr: {
    eyebrow: 'WZPRO // FINDER',
    title: 'TROUVE TA CLASSE',
    intro: 'Cinq questions. On classe la meta selon ta vraie facon de jouer.',
    restart: 'Recommencer',
    resultTitle: 'TA MEILLEURE CLASSE',
    resultSub: 'Classee depuis les stats meta actuelles selon tes reponses.',
    primary: 'Voir la classe complete',
    alts: 'A essayer aussi',
    back: 'Retour',
    step: (a, b) => `Question ${a} sur ${b}`,
    why: 'Pourquoi cette classe',
  },
  es: {
    eyebrow: 'WZPRO // FINDER',
    title: 'ENCUENTRA TU CLASE',
    intro: 'Cinco preguntas. Clasificamos la meta segun como juegas de verdad.',
    restart: 'Empezar de nuevo',
    resultTitle: 'TU MEJOR CLASE',
    resultSub: 'Clasificada desde las stats meta actuales segun tus respuestas.',
    primary: 'Ver la clase completa',
    alts: 'Tambien vale la pena',
    back: 'Atras',
    step: (a, b) => `Pregunta ${a} de ${b}`,
    why: 'Por que esta clase',
  },
};

type Option<T extends string> = { value: T; label: Record<Lang, string>; hint: Record<Lang, string> };
type Question = {
  key: QuestionKey;
  prompt: Record<Lang, string>;
  options: Option<string>[];
};

const QUESTIONS: Question[] = [
  {
    key: 'mode',
    prompt: { en: 'Which mode do you grind?', fr: 'Quel mode tu joues le plus ?', es: 'Que modo juegas mas?' },
    options: [
      { value: 'resurgence', label: { en: 'Resurgence', fr: 'Resurgence', es: 'Resurgence' }, hint: { en: 'Fast, close fights', fr: 'Combats rapides et proches', es: 'Peleas rapidas y cercanas' } },
      { value: 'br', label: { en: 'Battle Royale', fr: 'Battle Royale', es: 'Battle Royale' }, hint: { en: 'Long rotations', fr: 'Longues rotations', es: 'Rotaciones largas' } },
      { value: 'ranked', label: { en: 'Ranked', fr: 'Classe', es: 'Clasificatoria' }, hint: { en: 'Disciplined, mid-long', fr: 'Discipline, moyen-long', es: 'Disciplinado, medio-largo' } },
    ],
  },
  {
    key: 'range',
    prompt: { en: 'Where do you win fights?', fr: 'A quelle distance tu gagnes ?', es: 'A que distancia ganas?' },
    options: [
      { value: 'close', label: { en: 'Up close', fr: 'Au corps a corps', es: 'De cerca' }, hint: { en: 'Push and entry', fr: 'Entry et pression', es: 'Entrada y presion' } },
      { value: 'mid', label: { en: 'Mid range', fr: 'Moyenne portee', es: 'Media distancia' }, hint: { en: 'Flexible duels', fr: 'Duels flexibles', es: 'Duelos flexibles' } },
      { value: 'long', label: { en: 'Long range', fr: 'Longue portee', es: 'Larga distancia' }, hint: { en: 'Hold lanes', fr: 'Tenir les lignes', es: 'Controlar lineas' } },
    ],
  },
  {
    key: 'priority',
    prompt: { en: 'What matters most?', fr: 'Qu est-ce qui compte le plus ?', es: 'Que importa mas?' },
    options: [
      { value: 'aggression', label: { en: 'Speed & movement', fr: 'Vitesse & mouvement', es: 'Velocidad y movimiento' }, hint: { en: 'Mobility first', fr: 'Mobilite d abord', es: 'Movilidad primero' } },
      { value: 'consistency', label: { en: 'Low recoil', fr: 'Faible recul', es: 'Bajo retroceso' }, hint: { en: 'Control first', fr: 'Controle d abord', es: 'Control primero' } },
      { value: 'damage', label: { en: 'Raw damage', fr: 'Degats bruts', es: 'Dano bruto' }, hint: { en: 'Fast TTK', fr: 'TTK rapide', es: 'TTK rapido' } },
    ],
  },
  {
    key: 'input',
    prompt: { en: 'How do you play?', fr: 'Tu joues avec quoi ?', es: 'Con que juegas?' },
    options: [
      { value: 'controller', label: { en: 'Controller', fr: 'Manette', es: 'Mando' }, hint: { en: 'Aim assist tracking', fr: 'Suivi aim assist', es: 'Seguimiento aim assist' } },
      { value: 'mkb', label: { en: 'Mouse & keyboard', fr: 'Clavier-souris', es: 'Raton y teclado' }, hint: { en: 'Precision flicks', fr: 'Flicks precis', es: 'Flicks precisos' } },
    ],
  },
  {
    key: 'experience',
    prompt: { en: 'Your level?', fr: 'Ton niveau ?', es: 'Tu nivel?' },
    options: [
      { value: 'beginner', label: { en: 'Still learning', fr: 'En apprentissage', es: 'Aprendiendo' }, hint: { en: 'Forgiving guns', fr: 'Armes indulgentes', es: 'Armas indulgentes' } },
      { value: 'experienced', label: { en: 'Experienced', fr: 'Experimente', es: 'Experimentado' }, hint: { en: 'High ceiling', fr: 'Haut plafond', es: 'Techo alto' } },
    ],
  },
];

type Target = { damage: number; range: number; mobility: number; control: number };

function targetFromAnswers(answers: Required<Answers>): { target: Target; weights: Target } {
  const target: Target = { damage: 70, range: 60, mobility: 60, control: 70 };
  const weights: Target = { damage: 1, range: 1, mobility: 1, control: 1 };

  if (answers.range === 'close') { target.range = 35; target.mobility = 92; weights.mobility = 2; weights.range = 1.4; }
  else if (answers.range === 'mid') { target.range = 70; target.mobility = 66; weights.range = 1.4; }
  else { target.range = 95; target.mobility = 42; weights.range = 2; }

  if (answers.mode === 'resurgence') { target.mobility = Math.min(100, target.mobility + 8); }
  else if (answers.mode === 'br') { target.range = Math.min(100, target.range + 8); }
  else { target.control = Math.min(100, target.control + 8); weights.control += 0.4; }

  if (answers.priority === 'aggression') { target.mobility = Math.min(100, target.mobility + 10); weights.mobility += 1; }
  else if (answers.priority === 'consistency') { target.control = Math.min(100, target.control + 12); weights.control += 1.2; }
  else { target.damage = Math.min(100, target.damage + 14); weights.damage += 1.2; }

  if (answers.input === 'mkb') { target.range = Math.min(100, target.range + 4); }
  else { target.control = Math.min(100, target.control + 4); }

  if (answers.experience === 'beginner') { target.control = Math.min(100, target.control + 12); weights.control += 0.8; }

  return { target, weights };
}

function categoryFor(answers: Required<Answers>) {
  if (answers.range === 'long' && answers.priority !== 'aggression') return ['Sniper Rifle', 'Marksman Rifle', 'Assault Rifle'];
  if (answers.range === 'close') return ['SMG', 'Assault Rifle'];
  return ['Assault Rifle', 'Marksman Rifle', 'SMG'];
}

function scoreLoadout(loadout: Loadout, target: Target, weights: Target, preferredCats: string[], answers: Required<Answers>) {
  const s = loadout.stats;
  const delta =
    Math.abs(s.damage - target.damage) * weights.damage +
    Math.abs(s.range - target.range) * weights.range +
    Math.abs(s.mobility - target.mobility) * weights.mobility +
    Math.abs(s.control - target.control) * weights.control;

  let bonus = 0;
  if (preferredCats.includes(loadout.category)) bonus += 30;
  if (loadout.tier === 'S') bonus += 18; else if (loadout.tier === 'A') bonus += 9; else if (loadout.tier === 'C') bonus -= 8;
  if (answers.mode === 'resurgence' && loadout.modes?.some((m) => /resurgence|solo|duo|trio/i.test(m))) bonus += 12;
  if (answers.mode === 'br' && loadout.modes?.some((m) => /battle royale|squads/i.test(m))) bonus += 12;
  if (answers.mode === 'ranked' && loadout.modes?.some((m) => /ranked/i.test(m))) bonus += 12;
  if (answers.experience === 'beginner' && loadout.tags?.some((t) => /beginner|easy recoil|forgiving|low recoil/i.test(t))) bonus += 14;
  if (answers.experience === 'beginner' && loadout.tags?.some((t) => /high recoil|high skill/i.test(t))) bonus -= 14;

  // Lower delta is better; convert to an ascending fit score.
  return 1000 - delta + bonus;
}

export default function LoadoutQuiz({ loadouts, locale }: Props) {
  const lang: Lang = locale === 'fr' ? 'fr' : locale === 'es' ? 'es' : 'en';
  const t = COPY[lang];
  const [answers, setAnswers] = useState<Answers>({});
  const [step, setStep] = useState(0);

  const complete = QUESTIONS.every((q) => answers[q.key]);

  const ranked = useMemo(() => {
    if (!complete) return [];
    const full = answers as Required<Answers>;
    const { target, weights } = targetFromAnswers(full);
    const cats = categoryFor(full);
    return [...loadouts]
      .map((loadout) => ({ loadout, fit: scoreLoadout(loadout, target, weights, cats, full) }))
      .sort((a, b) => b.fit - a.fit || calculateMetaScore(b.loadout) - calculateMetaScore(a.loadout))
      .slice(0, 3);
  }, [answers, complete, loadouts]);

  function choose(key: QuestionKey, value: string) {
    setAnswers((current) => ({ ...current, [key]: value }));
    if (step < QUESTIONS.length - 1) setStep(step + 1);
  }

  function reset() {
    setAnswers({});
    setStep(0);
  }

  const href = (path: string) => withLocalePath(path, locale);
  const current = QUESTIONS[step];

  function whyLine(loadout: Loadout) {
    const bits: string[] = [];
    if (loadout.tags?.length) bits.push(loadout.tags.slice(0, 2).join(', '));
    bits.push(`tier ${loadout.tier}`);
    bits.push(`meta ${calculateMetaScore(loadout)}`);
    return bits.join(' / ');
  }

  return (
    <main className="quiz-page">
      <header className="quiz-head">
        <span>{t.eyebrow}</span>
        <h1>{t.title}</h1>
        <p>{t.intro}</p>
      </header>

      {!complete ? (
        <section className="quiz-card" aria-live="polite">
          <div className="quiz-progress">
            <span>{t.step(step + 1, QUESTIONS.length)}</span>
            <div className="quiz-bar"><i style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }} /></div>
          </div>
          <h2>{current.prompt[lang]}</h2>
          <div className="quiz-options">
            {current.options.map((option) => (
              <button
                key={option.value}
                type="button"
                className={answers[current.key] === option.value ? 'is-active' : ''}
                onClick={() => choose(current.key, option.value)}
              >
                <strong>{option.label[lang]}</strong>
                <span>{option.hint[lang]}</span>
              </button>
            ))}
          </div>
          {step > 0 && (
            <button type="button" className="quiz-back" onClick={() => setStep(step - 1)}>
              ← {t.back}
            </button>
          )}
        </section>
      ) : (
        <section className="quiz-result">
          <div className="quiz-result-head">
            <span>{t.resultTitle}</span>
            <p>{t.resultSub}</p>
          </div>
          {ranked[0] && (
            <article className="quiz-primary">
              <div className="quiz-primary-meta">
                <span className="quiz-tier" data-tier={ranked[0].loadout.tier}>{ranked[0].loadout.tier}</span>
                <span>{ranked[0].loadout.category}</span>
                <strong>{calculateMetaScore(ranked[0].loadout)}</strong>
              </div>
              <h2>{ranked[0].loadout.weapon}</h2>
              <p className="quiz-why">{t.why}: {whyLine(ranked[0].loadout)}</p>
              <div className="quiz-attachments">
                {ranked[0].loadout.attachments.slice(0, 5).map((a) => (
                  <span key={`${a.slot}-${a.name}`}>{a.name}</span>
                ))}
              </div>
              <Link className="quiz-cta" href={href(getLoadoutPath(ranked[0].loadout))}>{t.primary} →</Link>
            </article>
          )}
          {ranked.length > 1 && (
            <div className="quiz-alts">
              <span className="quiz-alts-label">{t.alts}</span>
              <div className="quiz-alts-grid">
                {ranked.slice(1).map(({ loadout }) => (
                  <Link key={loadout.id} className="quiz-alt" href={href(getLoadoutPath(loadout))}>
                    <span className="quiz-tier" data-tier={loadout.tier}>{loadout.tier}</span>
                    <strong>{loadout.weapon}</strong>
                    <span>{loadout.category} / meta {calculateMetaScore(loadout)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          <button type="button" className="quiz-back" onClick={reset}>↺ {t.restart}</button>
        </section>
      )}

      <style>{`
        .quiz-page { max-width: 760px; margin: 0 auto; padding: 5rem 1.5rem 6rem; font-family: var(--font-mono, monospace); color: var(--tm-ink, #10100e); }
        .quiz-head span { color: #163cff; font-size: 0.7rem; font-weight: 900; letter-spacing: 0.18em; text-transform: uppercase; }
        .quiz-head h1 { margin: 0.4rem 0 0; font-size: clamp(2rem, 7vw, 3.6rem); letter-spacing: 0.04em; line-height: 0.95; }
        .quiz-head p { margin: 0.9rem 0 0; max-width: 48ch; color: rgba(16,16,14,0.6); line-height: 1.6; }
        .quiz-card, .quiz-result { margin-top: 2.4rem; border: 1px solid rgba(22,60,255,0.28); background: var(--theme-panel, rgba(239,238,232,0.82)); padding: 1.6rem; }
        .quiz-progress { display: flex; align-items: center; gap: 1rem; font-size: 0.68rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.6; }
        .quiz-bar { flex: 1; height: 4px; background: rgba(16,16,14,0.12); }
        .quiz-bar i { display: block; height: 100%; background: #163cff; transition: width 0.3s ease; }
        .quiz-card h2 { margin: 1.4rem 0 1.2rem; font-size: clamp(1.3rem, 4vw, 1.9rem); letter-spacing: 0.02em; }
        .quiz-options { display: grid; gap: 0.7rem; }
        .quiz-options button { display: grid; gap: 0.25rem; text-align: left; border: 1px solid rgba(16,16,14,0.16); background: transparent; color: inherit; cursor: pointer; font: inherit; padding: 0.9rem 1rem; transition: border-color 0.15s ease, background 0.15s ease; }
        .quiz-options button:hover, .quiz-options button.is-active { border-color: #163cff; background: rgba(22,60,255,0.08); }
        .quiz-options button strong { font-size: 1rem; letter-spacing: 0.02em; }
        .quiz-options button span { font-size: 0.74rem; color: rgba(16,16,14,0.55); }
        .quiz-back { margin-top: 1.2rem; border: none; background: none; color: rgba(16,16,14,0.6); cursor: pointer; font: inherit; font-size: 0.74rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; padding: 0; }
        .quiz-back:hover { color: #163cff; }
        .quiz-result-head span { color: #163cff; font-size: 0.7rem; font-weight: 900; letter-spacing: 0.16em; text-transform: uppercase; }
        .quiz-result-head p { margin: 0.4rem 0 0; color: rgba(16,16,14,0.6); font-size: 0.84rem; }
        .quiz-primary { margin-top: 1.4rem; border-top: 1px solid rgba(16,16,14,0.12); padding-top: 1.4rem; }
        .quiz-primary-meta { display: flex; align-items: center; gap: 0.8rem; font-size: 0.74rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(16,16,14,0.55); }
        .quiz-primary-meta strong { margin-left: auto; color: #163cff; font-size: 1.6rem; }
        .quiz-tier { display: inline-grid; place-items: center; min-width: 26px; height: 26px; padding: 0 6px; background: #163cff; color: #fff; font-weight: 900; }
        .quiz-tier[data-tier="A"] { background: #1f8f4d; }
        .quiz-tier[data-tier="B"] { background: #b8860b; }
        .quiz-tier[data-tier="C"] { background: #8a8a82; }
        .quiz-primary h2 { margin: 0.7rem 0 0; font-size: clamp(2rem, 7vw, 3.4rem); letter-spacing: 0.02em; text-transform: uppercase; line-height: 0.95; }
        .quiz-why { margin: 0.5rem 0 0; font-size: 0.78rem; color: rgba(16,16,14,0.55); text-transform: uppercase; letter-spacing: 0.04em; }
        .quiz-attachments { display: flex; flex-wrap: wrap; gap: 0.45rem; margin-top: 1rem; }
        .quiz-attachments span { border: 1px solid rgba(16,16,14,0.14); padding: 0.3rem 0.6rem; font-size: 0.74rem; color: rgba(16,16,14,0.7); }
        .quiz-cta { display: inline-grid; min-height: 44px; place-items: center; margin-top: 1.3rem; padding: 0 1.4rem; border: 1px solid #163cff; background: #163cff; color: #fff; font-size: 0.74rem; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; text-decoration: none; }
        .quiz-alts { margin-top: 1.8rem; }
        .quiz-alts-label { font-size: 0.68rem; font-weight: 900; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(16,16,14,0.5); }
        .quiz-alts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.7rem; margin-top: 0.7rem; }
        .quiz-alt { display: grid; gap: 0.3rem; border: 1px solid rgba(16,16,14,0.14); padding: 0.8rem; text-decoration: none; color: inherit; }
        .quiz-alt:hover { border-color: #163cff; }
        .quiz-alt strong { font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.02em; }
        .quiz-alt > span:last-child { font-size: 0.72rem; color: rgba(16,16,14,0.55); }
        @media (max-width: 540px) { .quiz-alts-grid { grid-template-columns: 1fr; } }
        :global(:root[data-theme="dark"]) .quiz-head p,
        :global(:root[data-theme="dark"]) .quiz-options button span,
        :global(:root[data-theme="dark"]) .quiz-result-head p,
        :global(:root[data-theme="dark"]) .quiz-primary-meta,
        :global(:root[data-theme="dark"]) .quiz-why,
        :global(:root[data-theme="dark"]) .quiz-attachments span,
        :global(:root[data-theme="dark"]) .quiz-alt > span:last-child { color: rgba(255,255,255,0.6); }
        :global(:root[data-theme="dark"]) .quiz-options button,
        :global(:root[data-theme="dark"]) .quiz-attachments span,
        :global(:root[data-theme="dark"]) .quiz-alt { border-color: rgba(255,255,255,0.16); }
      `}</style>
    </main>
  );
}
