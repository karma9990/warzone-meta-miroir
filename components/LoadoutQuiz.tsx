'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Loadout } from '@/lib/data';
import { calculateMetaScore } from '@/lib/loadoutUtils';
import { getLoadoutPath } from '@/lib/seo';
import { withLocalePath, type Locale } from '@/lib/i18n';
import { isCompleteQuizAnswers, rankQuizLoadouts, type QuizAnswers, type RankedQuizLoadout } from '@/lib/loadoutQuizLogic';

type Props = {
  loadouts: Loadout[];
  locale: Locale;
};

type Lang = 'en' | 'fr' | 'es';

type QuestionKey = keyof QuizAnswers;

type QuizAttachment = {
  slot: string;
  name: string;
};

type DisplayRecommendation = {
  id: string;
  weapon: string;
  category: string;
  tier: Loadout['tier'];
  metaScore?: number;
  attachments: QuizAttachment[];
  reason?: string;
  loadout?: Loadout;
};

type ApiRecommendation = {
  id?: string;
  weapon?: string;
  category?: string;
  tier?: Loadout['tier'];
  metaScore?: number;
  reason?: string;
  attachments?: QuizAttachment[];
};

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

export default function LoadoutQuiz({ loadouts, locale }: Props) {
  const lang: Lang = locale === 'fr' ? 'fr' : locale === 'es' ? 'es' : 'en';
  const t = COPY[lang];
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [step, setStep] = useState(0);
  const [aiRanked, setAiRanked] = useState<DisplayRecommendation[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const complete = isCompleteQuizAnswers(answers);
  const requestKey = complete ? JSON.stringify(answers) : '';

  const ranked = useMemo(() => {
    if (!complete) return [];
    return rankQuizLoadouts(loadouts, answers, 3);
  }, [answers, complete, loadouts]);

  const whyLine = useCallback((loadout: Loadout) => {
    const bits: string[] = [];
    if (loadout.tags?.length) bits.push(loadout.tags.slice(0, 2).join(', '));
    bits.push(`tier ${loadout.tier}`);
    bits.push(`meta ${calculateMetaScore(loadout)}`);
    return bits.join(' / ');
  }, []);

  const toDisplayRecommendation = useCallback((item: RankedQuizLoadout): DisplayRecommendation => {
    return {
      id: item.loadout.id,
      weapon: item.loadout.weapon,
      category: item.loadout.category,
      tier: item.loadout.tier,
      metaScore: calculateMetaScore(item.loadout),
      attachments: item.loadout.attachments.slice(0, 5),
      reason: item.aiReason || whyLine(item.loadout),
      loadout: item.loadout,
    };
  }, [whyLine]);

  useEffect(() => {
    if (!complete) return;

    const controller = new AbortController();

    fetch('/api/quiz/recommendation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers, locale }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null) as {
          recommendations?: ApiRecommendation[];
          error?: string;
        } | null;
        if (!response.ok) throw new Error(payload?.error || 'AI recommendation unavailable');
        return payload;
      })
      .then((payload) => {
        const next = (payload?.recommendations ?? [])
          .map((item, index) => {
            const loadout = loadouts.find((candidate) => candidate.id === item.id);
            if (loadout) return toDisplayRecommendation({ loadout, fit: 2000 - index, aiReason: item.reason });
            if (!item.weapon || !item.category || !item.tier || !item.attachments?.length) return null;
            return {
              id: `ai-${index}-${item.weapon.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
              weapon: item.weapon,
              category: item.category,
              tier: item.tier,
              metaScore: item.metaScore,
              attachments: item.attachments.slice(0, 5),
              reason: item.reason,
            } satisfies DisplayRecommendation;
          })
          .filter((item): item is DisplayRecommendation => item !== null)
          .slice(0, 3);

        if (next.length) setAiRanked(next);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setAiError(error instanceof Error ? error.message : 'AI recommendation unavailable');
      })
      .finally(() => {
        if (!controller.signal.aborted) setAiLoading(false);
      });

    return () => controller.abort();
  }, [complete, requestKey, loadouts, locale, answers, toDisplayRecommendation]);

  function choose(key: QuestionKey, value: string) {
    setAiRanked(null);
    setAiError('');
    const nextAnswers = { ...answers, [key]: value };
    if (isCompleteQuizAnswers(nextAnswers)) setAiLoading(true);
    setAnswers(nextAnswers);
    if (step < QUESTIONS.length - 1) setStep(step + 1);
  }

  function reset() {
    setAnswers({});
    setStep(0);
    setAiRanked(null);
    setAiError('');
  }

  const href = (path: string) => withLocalePath(path, locale);
  const current = QUESTIONS[step];
  const displayedRanked = aiRanked ?? ranked.map(toDisplayRecommendation);

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
            <p>
              {aiLoading
                ? (lang === 'fr' ? 'IA WZPRO verifie la meta et les accessoires...' : lang === 'es' ? 'IA WZPRO verifica la meta y los accesorios...' : 'IA WZPRO is checking the meta and attachments...')
                : aiRanked
                  ? (lang === 'fr' ? 'Recommandation IA via OpenRouter, hors base du site si besoin.' : lang === 'es' ? 'Recomendacion IA via OpenRouter, fuera de la base del sitio si hace falta.' : 'AI recommendation via OpenRouter, outside the site database when needed.')
                  : t.resultSub}
            </p>
            {aiError && <small className="quiz-ai-note">{lang === 'fr' ? 'Fallback local actif' : lang === 'es' ? 'Fallback local activo' : 'Local fallback active'}: {aiError}</small>}
          </div>
          {displayedRanked[0] && (
            <article className="quiz-primary">
              <div className="quiz-primary-meta">
                <span className="quiz-tier" data-tier={displayedRanked[0].tier}>{displayedRanked[0].tier}</span>
                <span>{displayedRanked[0].category}</span>
                {displayedRanked[0].metaScore && <strong>{displayedRanked[0].metaScore}</strong>}
              </div>
              <h2>{displayedRanked[0].weapon}</h2>
              <p className="quiz-why">{t.why}: {displayedRanked[0].reason}</p>
              <div className="quiz-attachments">
                {displayedRanked[0].attachments.slice(0, 5).map((a) => (
                  <span key={`${a.slot}-${a.name}`}>{a.slot}: {a.name}</span>
                ))}
              </div>
              {displayedRanked[0].loadout ? (
                <Link className="quiz-cta" href={href(getLoadoutPath(displayedRanked[0].loadout))}>{t.primary} →</Link>
              ) : (
                <span className="quiz-ai-build">{lang === 'fr' ? 'Build IA externe' : lang === 'es' ? 'Build IA externo' : 'External AI build'}</span>
              )}
            </article>
          )}
          {displayedRanked.length > 1 && (
            <div className="quiz-alts">
              <span className="quiz-alts-label">{t.alts}</span>
              <div className="quiz-alts-grid">
                {displayedRanked.slice(1).map((item) => (
                  item.loadout ? (
                    <Link key={item.id} className="quiz-alt" href={href(getLoadoutPath(item.loadout))}>
                      <span className="quiz-tier" data-tier={item.tier}>{item.tier}</span>
                      <strong>{item.weapon}</strong>
                      <span>{item.category}{item.metaScore ? ` / meta ${item.metaScore}` : ''}</span>
                    </Link>
                  ) : (
                    <article key={item.id} className="quiz-alt">
                      <span className="quiz-tier" data-tier={item.tier}>{item.tier}</span>
                      <strong>{item.weapon}</strong>
                      <span>{item.category}{item.metaScore ? ` / meta ${item.metaScore}` : ''}</span>
                    </article>
                  )
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
        .quiz-ai-note { display: block; margin-top: 0.45rem; color: rgba(16,16,14,0.48); font-size: 0.68rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
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
        .quiz-ai-build { display: inline-grid; min-height: 36px; place-items: center; margin-top: 1.3rem; padding: 0 0.9rem; border: 1px solid rgba(22,60,255,0.45); color: #163cff; font-size: 0.68rem; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; }
        .quiz-alts { margin-top: 1.8rem; }
        .quiz-alts-label { font-size: 0.68rem; font-weight: 900; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(16,16,14,0.5); }
        .quiz-alts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.7rem; margin-top: 0.7rem; }
        .quiz-alt { display: grid; gap: 0.3rem; border: 1px solid rgba(16,16,14,0.14); padding: 0.8rem; text-decoration: none; color: inherit; }
        .quiz-alt:hover { border-color: #163cff; }
        .quiz-alt strong { font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.02em; }
        .quiz-alt > span:last-child { font-size: 0.72rem; color: rgba(16,16,14,0.55); }
        @media (max-width: 540px) { .quiz-alts-grid { grid-template-columns: 1fr; } }
        :root[data-theme="dark"] .quiz-head p,
        :root[data-theme="dark"] .quiz-options button span,
        :root[data-theme="dark"] .quiz-result-head p,
        :root[data-theme="dark"] .quiz-ai-note,
        :root[data-theme="dark"] .quiz-primary-meta,
        :root[data-theme="dark"] .quiz-why,
        :root[data-theme="dark"] .quiz-attachments span,
        :root[data-theme="dark"] .quiz-alt > span:last-child { color: rgba(255,255,255,0.6); }
        :root[data-theme="dark"] .quiz-options button,
        :root[data-theme="dark"] .quiz-attachments span,
        :root[data-theme="dark"] .quiz-alt { border-color: rgba(255,255,255,0.16); }
      `}</style>
    </main>
  );
}
