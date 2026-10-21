import { AnswerHistoryItem, CategoryId, GameModeId, QuestionItem, SyllableChallenge } from '../types/game';
import { WORDBOMB_SYLLABLES } from '../data/syllables';
import { MISSIONS } from '../data/missions';
import { buildDeck, shuffled } from './deck';
import { createPRNG, getBrasiliaDateKey, hashSeed, validateWordSubmission } from './prng';
import { WordDictionary } from './lexicon';

export type SessionMode = GameModeId | 'mission' | 'review';
export type Phase = 'answering' | 'feedback' | 'paused' | 'finished';
export interface Session {
  id: string;
  mode: SessionMode;
  category: CategoryId;
  missionId?: string;
  dateKey: string;
  relaxed: boolean;
  phase: Phase;
  resumePhase: 'answering' | 'feedback';
  queue: QuestionItem[];
  index: number;
  syllables: SyllableChallenge[];
  words: string[];
  remainingMs: number;
  fuseMs: number;
  fuseTotalMs: number;
  lives: number;
  floor: number;
  safeScore: number;
  riskScore: number;
  streak: number;
  peakCombo: number;
  history: AnswerHistoryItem[];
  notice?: string;
  reason?: string;
}

export interface StartOptions {
  id: string;
  mode: SessionMode;
  category: CategoryId;
  seed: number;
  recent?: string[];
  relaxed?: boolean;
  missionId?: string;
  forcedSyllable?: string;
  review?: QuestionItem[];
  dateKey?: string;
}

export function comboFor(streak: number): number { return streak < 2 ? 1 : streak < 4 ? 1.2 : streak < 6 ? 1.5 : streak < 8 ? 2 : 3; }
export function totalScore(session: Session): number { return session.safeScore + Math.round(session.riskScore / 2); }
export function currentSyllable(session: Session): SyllableChallenge { return session.syllables[session.index % session.syllables.length]; }

export function createSession(options: StartOptions): Session {
  const dateKey = options.dateKey || getBrasiliaDateKey();
  const mission = MISSIONS.find(item => item.id === options.missionId) || MISSIONS[0];
  const seed = options.mode === 'daily' ? hashSeed(`pulse_daily_v11_${dateKey}`) : options.seed;
  const syllables = shuffled(WORDBOMB_SYLLABLES, createPRNG(seed));
  if (options.forcedSyllable) {
    const index = syllables.findIndex(item => item.syl === options.forcedSyllable);
    if (index >= 0) syllables.unshift(...syllables.splice(index, 1));
  }
  const queue = options.mode === 'mission' ? mission.questions
    : options.mode === 'review' ? (options.review || []).slice(0, 15)
    : buildDeck(options.mode === 'daily' ? 'mixed' : options.category, seed, options.recent, options.mode === 'daily');
  return {
    id: options.id, mode: options.mode, category: options.mode === 'daily' ? 'mixed' : options.category,
    missionId: options.mode === 'mission' ? mission.id : undefined, dateKey,
    relaxed: options.mode === 'wordbomb' ? false : options.mode === 'mission' || options.mode === 'review' || Boolean(options.relaxed),
    phase: options.mode === 'review' && queue.length === 0 ? 'finished' : 'answering', resumePhase: 'answering',
    queue, index: 0, syllables, words: [], remainingMs: 60000, fuseMs: 14000, fuseTotalMs: 14000,
    lives: options.mode === 'wordbomb' || options.mode === 'elevator' ? 3 : 0,
    floor: 1, safeScore: 0, riskScore: 0, streak: 0, peakCombo: 1, history: [],
  };
}

function recordQuestion(session: Session, option: number): Session {
  const question = session.queue[session.index];
  if (!question) return { ...session, phase: 'finished', reason: 'Você concluiu as questões disponíveis.' };
  const correct = option === question.correctIndex;
  const streak = correct ? session.streak + 1 : 0;
  const combo = comboFor(streak);
  const points = correct ? Math.round((100 + (question.difficulty - 1) * 40) * combo) : 0;
  const history: AnswerHistoryItem = {
    step: session.history.length + 1, questionId: question.id, prompt: question.prompt,
    userAnswer: option < 0 ? 'Tempo esgotado' : question.options[option],
    correctAnswer: question.options[question.correctIndex], isCorrect: correct, pointsDelta: points,
    explanation: question.explanation, skill: question.skill, transfer: question.transfer, question,
  };
  return { ...session, phase: 'feedback', notice: undefined, streak, peakCombo: Math.max(session.peakCombo, combo),
    riskScore: correct ? session.riskScore + points : 0,
    lives: !correct && session.mode === 'elevator' && !session.relaxed ? Math.max(0, session.lives - 1) : session.lives,
    floor: correct ? session.floor + 1 : session.floor, history: [...session.history, history] };
}

function wordTimeout(session: Session): Session {
  const syllable = currentSyllable(session);
  const history: AnswerHistoryItem = { step: session.history.length + 1, prompt: `Uma palavra com ${syllable.syl}`, userAnswer: 'Tempo esgotado', correctAnswer: syllable.samples[0], isCorrect: false, pointsDelta: 0, explanation: `Exemplos válidos para ${syllable.syl}: ${syllable.hint}.`, skill: 'Vocabulário' };
  return { ...session, phase: 'feedback', lives: Math.max(0, session.lives - 1), riskScore: 0, streak: 0, history: [...session.history, history] };
}

export type SessionAction =
  | { type: 'START'; options: StartOptions }
  | { type: 'TICK'; elapsed: number }
  | { type: 'ANSWER'; option: number }
  | { type: 'WORD'; raw: string; dictionary: WordDictionary }
  | { type: 'NEXT' }
  | { type: 'BANK' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'FINISH'; reason?: string };

export function sessionReducer(session: Session | null, action: SessionAction): Session | null {
  if (action.type === 'START') return createSession(action.options);
  if (!session || session.phase === 'finished') return session;
  if (action.type === 'PAUSE') return session.phase === 'paused' ? session : { ...session, phase: 'paused', resumePhase: session.phase };
  if (action.type === 'RESUME') return session.phase === 'paused' ? { ...session, phase: session.resumePhase } : session;
  if (action.type === 'FINISH') return { ...session, phase: 'finished', reason: action.reason || 'Partida encerrada.' };
  if (session.phase === 'paused') return session;
  if (action.type === 'TICK') {
    if (session.phase !== 'answering' || session.relaxed || !Number.isFinite(action.elapsed) || action.elapsed <= 0) return session;
    const timed = session.mode === 'classic' || session.mode === 'wordbomb';
    const remainingMs = timed ? Math.max(0, session.remainingMs - action.elapsed) : session.remainingMs;
    const fuseMs = Math.max(0, session.fuseMs - action.elapsed);
    const next = { ...session, remainingMs, fuseMs };
    if (timed && remainingMs <= 0) return { ...next, phase: 'finished', reason: 'Os 60 segundos de ação terminaram.' };
    if (fuseMs <= 0) return session.mode === 'wordbomb' ? wordTimeout(next) : recordQuestion(next, -1);
    return next;
  }
  if (action.type === 'NEXT' && session.phase === 'feedback') {
    const index = session.index + 1;
    if ((session.mode === 'wordbomb' || session.mode === 'elevator') && !session.relaxed && session.lives <= 0) return { ...session, phase: 'finished', reason: 'Acabaram as vidas.' };
    if (session.mode !== 'wordbomb' && index >= session.queue.length) return { ...session, phase: 'finished', reason: 'Você concluiu esta sequência.' };
    if (session.mode === 'wordbomb' && session.relaxed && index >= 12) return { ...session, phase: 'finished', reason: 'Treino de 12 palavras concluído.' };
    const fuseTotalMs = session.mode === 'elevator' ? Math.max(7000, 14000 - Math.floor(index / 4) * 1000) : 14000;
    return { ...session, phase: 'answering', index, notice: undefined, fuseMs: fuseTotalMs, fuseTotalMs };
  }
  if (action.type === 'BANK' && session.phase === 'answering' && session.riskScore > 0) return { ...session, safeScore: session.safeScore + session.riskScore, riskScore: 0, notice: 'Pontos protegidos. Seu combo continua.' };
  if (session.phase !== 'answering') return session;
  if (action.type === 'ANSWER' && session.mode !== 'wordbomb' && Number.isInteger(action.option) && action.option >= 0 && action.option <= 3) return recordQuestion(session, action.option);
  if (action.type === 'WORD' && session.mode === 'wordbomb') {
    const validation = validateWordSubmission(action.raw, currentSyllable(session).syl, new Set(session.words), action.dictionary);
    if (!validation.valid) return { ...session, notice: validation.reason };
    const spelling = action.dictionary.spelling(validation.normalized) || action.raw.trim();
    const streak = session.streak + 1;
    const points = Math.round((100 + Math.min(60, validation.normalized.length * 5)) * comboFor(streak));
    const syllable = currentSyllable(session).syl;
    const history: AnswerHistoryItem = { step: session.history.length + 1, prompt: `Uma palavra com ${syllable}`, userAnswer: spelling, correctAnswer: spelling, isCorrect: true, pointsDelta: points, explanation: `“${spelling}” contém a sequência ${syllable}. Observe a grafia com os acentos.`, skill: 'Vocabulário' };
    return { ...session, phase: 'feedback', notice: undefined, streak, peakCombo: Math.max(session.peakCombo, comboFor(streak)), riskScore: session.riskScore + points, words: [...session.words, validation.normalized], history: [...session.history, history] };
  }
  return session;
}
