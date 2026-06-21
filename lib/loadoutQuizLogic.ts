import type { Loadout } from './data';
import { calculateMetaScore } from './loadoutUtils';

export type QuizAnswers = {
  mode?: 'resurgence' | 'br' | 'ranked';
  range?: 'close' | 'mid' | 'long';
  priority?: 'aggression' | 'consistency' | 'damage';
  input?: 'controller' | 'mkb';
  experience?: 'beginner' | 'experienced';
};

export type CompleteQuizAnswers = Required<QuizAnswers>;

type Target = { damage: number; range: number; mobility: number; control: number };

export type RankedQuizLoadout = {
  loadout: Loadout;
  fit: number;
  aiReason?: string;
};

export function isCompleteQuizAnswers(answers: QuizAnswers): answers is CompleteQuizAnswers {
  return Boolean(answers.mode && answers.range && answers.priority && answers.input && answers.experience);
}

function targetFromAnswers(answers: CompleteQuizAnswers): { target: Target; weights: Target } {
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

function categoryFor(answers: CompleteQuizAnswers) {
  if (answers.range === 'long' && answers.priority !== 'aggression') return ['Sniper Rifle', 'Marksman Rifle', 'Assault Rifle', 'LMG'];
  if (answers.range === 'close') return ['SMG', 'Assault Rifle'];
  return ['Assault Rifle', 'Marksman Rifle', 'SMG', 'LMG'];
}

function scoreLoadout(loadout: Loadout, target: Target, weights: Target, preferredCats: string[], answers: CompleteQuizAnswers) {
  const s = loadout.stats;
  const delta =
    Math.abs(s.damage - target.damage) * weights.damage +
    Math.abs(s.range - target.range) * weights.range +
    Math.abs(s.mobility - target.mobility) * weights.mobility +
    Math.abs(s.control - target.control) * weights.control;

  let bonus = 0;
  if (preferredCats.includes(loadout.category)) bonus += 30;
  if (loadout.tier === 'S') bonus += 28; else if (loadout.tier === 'A') bonus += 12; else if (loadout.tier === 'B') bonus -= 18; else bonus -= 45;
  if (loadout.attachments.length >= 5) bonus += 18; else bonus -= 80;
  if (!loadout.notes && loadout.attachments.length === 0) bonus -= 100;
  if (answers.mode === 'resurgence' && loadout.modes?.some((m) => /resurgence|solo|duo|trio/i.test(m))) bonus += 12;
  if (answers.mode === 'br' && loadout.modes?.some((m) => /battle royale|squads/i.test(m))) bonus += 12;
  if (answers.mode === 'ranked' && loadout.modes?.some((m) => /ranked/i.test(m))) bonus += 12;
  if (answers.experience === 'beginner' && loadout.tags?.some((t) => /beginner|easy recoil|forgiving|low recoil/i.test(t))) bonus += 14;
  if (answers.experience === 'beginner' && loadout.tags?.some((t) => /high recoil|high skill/i.test(t))) bonus -= 14;

  return 1000 - delta + bonus;
}

export function rankQuizLoadouts(loadouts: Loadout[], answers: CompleteQuizAnswers, limit = 3): RankedQuizLoadout[] {
  const { target, weights } = targetFromAnswers(answers);
  const cats = categoryFor(answers);
  return [...loadouts]
    .map((loadout) => ({ loadout, fit: scoreLoadout(loadout, target, weights, cats, answers) }))
    .sort((a, b) => b.fit - a.fit || calculateMetaScore(b.loadout) - calculateMetaScore(a.loadout))
    .slice(0, limit);
}

export function quizCandidateLoadouts(loadouts: Loadout[], answers: CompleteQuizAnswers, limit = 10): RankedQuizLoadout[] {
  const ranked = rankQuizLoadouts(
    loadouts.filter((loadout) => {
      if (loadout.attachments.length < 5) return false;
      if (loadout.tier !== 'S' && loadout.tier !== 'A') return false;
      return calculateMetaScore(loadout) >= 72;
    }),
    answers,
    limit
  );

  return ranked.length ? ranked : rankQuizLoadouts(loadouts, answers, limit);
}
