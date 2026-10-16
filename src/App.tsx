import { useEffect, useRef, useState } from 'react';
import {
  AnswerHistoryItem,
  AppViewId,
  CategoryId,
  GameModeId,
  QuestionItem,
  SyllableChallenge,
} from './types/game';
import { QUESTION_BANK } from './data/questions';
import { PORTUGUESE_WORD_SET, WORDBOMB_SYLLABLES } from './data/syllables';
import {
  createPRNG,
  formatDatePtBr,
  generateProceduralMathQuestion,
  getBrasiliaDateKey,
  hashSeed,
  shuffleQuestionOptions,
  validateWordSubmission,
} from './engine/prng';
import { SoundEngine } from './engine/sound';
import { clearProfileStorage, loadProfile, saveProfile } from './engine/storage';

const COMBO_STEPS = [1.0, 1.0, 1.2, 1.5, 2.0, 2.5, 3.0];
const BASE_POINTS = { 1: 100, 2: 150, 3: 220 } as const;

const MODE_DETAILS: Record<
  GameModeId,
  { name: string; badge: string; summary: string; rules: string; hasMatchClock: boolean; initialLives: number }
> = {
  daily: {
    name: 'Desafio Diário',
    badge: 'Sequência oficial do dia',
    summary: 'Todos os jogadores enfrentam exatamente a mesma sequência hoje (60 segundos).',
    rules: '60s • Todas as categorias • Semente determinística pela data de Brasília',
    hasMatchClock: true,
    initialLives: 0,
  },
  classic: {
    name: 'Partida Rápida (60s)',
    badge: 'Modo Misto ou por Categoria',
    summary: 'Responda desafios sob pressão, acumule multiplicadores até 3.0x e decida quando proteger.',
    rules: '60s • Escolha entre Modo Misto, Matemática, Lógica, Palavras ou Gerais',
    hasMatchClock: true,
    initialLives: 0,
  },
  wordbomb: {
    name: 'Bomba de Sílabas',
    badge: 'Vocabulário sob pressão',
    summary: 'Digite uma palavra válida em português que contenha a sílaba exibida antes do pavio acabar.',
    rules: '60s • 3 vidas • Validação pelo dicionário oficial com suporte a acentos',
    hasMatchClock: true,
    initialLives: 3,
  },
  elevator: {
    name: 'O Elevador',
    badge: 'Sobrevivência progressiva',
    summary: 'Suba o máximo de andares que conseguir com 3 vidas. O tempo por questão diminui a cada andar.',
    rules: 'Sem relógio geral • 3 vidas • Dificuldade e velocidade crescentes',
    hasMatchClock: false,
    initialLives: 3,
  },
};

const CATEGORY_LABELS: Record<CategoryId, string> = {
  mixed: 'Modo Misto (Todas)',
  math: 'Matemática Mental',
  logic: 'Lógica e Padrões',
  words: 'Palavras e Linguagem',
  general: 'Conhecimentos Gerais',
};

interface PostMatchReport {
  mode: GameModeId;
  category: CategoryId;
  dateKey: string;
  finalScore: number;
  safeScore: number;
  salvagedScore: number;
  lostRiskScore: number;
  correctCount: number;
  totalCount: number;
  peakCombo: number;
  banksCount: number;
  isNewRecord: boolean;
  timeline: string;
  shareText: string;
  history: AnswerHistoryItem[];
}

export default function App() {
  const [profile, setProfile] = useState(() => loadProfile());
  const [activeView, setActiveView] = useState<AppViewId>('home');

  const [inMatch, setInMatch] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [matchClock, setMatchClock] = useState(60.0);
  const [fuseClock, setFuseClock] = useState(10.0);
  const [fuseTotal, setFuseTotal] = useState(10.0);
  const [lives, setLives] = useState(3);
  const [floor, setFloor] = useState(1);

  const [safeScore, setSafeScore] = useState(0);
  const [riskScore, setRiskScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [combo, setCombo] = useState(1.0);

  const [currentQuestion, setCurrentQuestion] = useState<QuestionItem | null>(null);
  const [currentSyllable, setCurrentSyllable] = useState<SyllableChallenge>(WORDBOMB_SYLLABLES[0]);
  const [typedWord, setTypedWord] = useState('');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{
    visible: boolean;
    tone: 'positive' | 'error';
    title: string;
    detail: string;
  } | null>(null);

  const [lastReport, setLastReport] = useState<PostMatchReport | null>(null);
  const [copiedBanner, setCopiedBanner] = useState(false);

  const [wordCheckInput, setWordCheckInput] = useState('');
  const [libraryCatFilter, setLibraryCatFilter] = useState<CategoryId>('mixed');

  const sessionIdRef = useRef(0);
  const transitionTimerRef = useRef<number | null>(null);
  const rngRef = useRef<() => number>(Math.random);
  const usedQuestionIdsRef = useRef<Set<string>>(new Set());
  const usedSyllablesRef = useRef<Set<string>>(new Set());
  const usedWordsRef = useRef<Set<string>>(new Set());
  const historyRef = useRef<AnswerHistoryItem[]>([]);
  const timelineMarksRef = useRef<string[]>([]);

  const matchRef = useRef({
    active: false,
    paused: false,
    inFeedback: false,
    mode: 'daily' as GameModeId,
    category: 'mixed' as CategoryId,
    dateKey: getBrasiliaDateKey(),
    matchClock: 60.0,
    fuseClock: 10.0,
    fuseTotal: 10.0,
    lives: 3,
    floor: 1,
    safeScore: 0,
    riskScore: 0,
    lostRiskScore: 0,
    streak: 0,
    combo: 1.0,
    peakCombo: 1.0,
    banksCount: 0,
    correctCount: 0,
    totalCount: 0,
    currentQuestion: null as QuestionItem | null,
    currentSyllable: WORDBOMB_SYLLABLES[0],
  });

  useEffect(() => {
    SoundEngine.enabled = profile.soundEnabled;
    document.body.classList.toggle('reduced-motion', profile.reducedMotion);
    saveProfile(profile);
  }, [profile]);

  const clearPendingTransition = () => {
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
  };

  const selectNextQuestion = (
    mode: GameModeId,
    category: CategoryId,
    currentStreak: number,
    serial: number
  ): QuestionItem => {
    const allowedCats =
      mode === 'daily' || category === 'mixed' ? ['math', 'logic', 'words', 'general'] : [category];
    const targetDiff: 1 | 2 | 3 = currentStreak < 2 ? 1 : currentStreak < 5 ? 2 : 3;

    let pool = QUESTION_BANK.filter(
      q =>
        allowedCats.includes(q.category) &&
        q.difficulty === targetDiff &&
        !usedQuestionIdsRef.current.has(q.id)
    );

    if (pool.length === 0) {
      pool = QUESTION_BANK.filter(
        q => allowedCats.includes(q.category) && !usedQuestionIdsRef.current.has(q.id)
      );
    }

    if (pool.length === 0) {
      return generateProceduralMathQuestion(rngRef.current, targetDiff, serial);
    }

    const picked = pool[Math.floor(rngRef.current() * pool.length)];
    usedQuestionIdsRef.current.add(picked.id);
    return shuffleQuestionOptions(picked, rngRef.current);
  };

  const selectNextSyllable = (): SyllableChallenge => {
    let pool = WORDBOMB_SYLLABLES.filter(s => !usedSyllablesRef.current.has(s.syl));
    if (pool.length === 0) {
      usedSyllablesRef.current.clear();
      pool = WORDBOMB_SYLLABLES;
    }
    const picked = pool[Math.floor(rngRef.current() * pool.length)];
    usedSyllablesRef.current.add(picked.syl);
    return picked;
  };

  const loadStepChallenge = (activeSessionId: number) => {
    if (sessionIdRef.current !== activeSessionId || !matchRef.current.active) return;
    clearPendingTransition();

    const st = matchRef.current;
    st.inFeedback = false;
    setSelectedOption(null);
    setFeedback(null);

    if (st.mode === 'wordbomb') {
      const syl = selectNextSyllable();
      st.currentSyllable = syl;
      const nextFuse = Math.max(6.0, 11.0 - Math.floor(st.correctCount / 3) * 0.6);
      st.fuseTotal = nextFuse;
      st.fuseClock = nextFuse;

      setCurrentSyllable(syl);
      setFuseTotal(nextFuse);
      setFuseClock(nextFuse);
      setTypedWord('');
    } else {
      const q = selectNextQuestion(st.mode, st.category, st.streak, st.totalCount + 1);
      st.currentQuestion = q;
      const baseTime = q.difficulty === 1 ? 11.0 : q.difficulty === 2 ? 10.0 : 9.0;
      const elevatorPenalty = st.mode === 'elevator' ? Math.min(3.5, Math.floor((st.floor - 1) / 4) * 0.5) : 0;
      const nextFuse = Math.max(5.0, baseTime - elevatorPenalty);

      st.fuseTotal = nextFuse;
      st.fuseClock = nextFuse;

      setCurrentQuestion(q);
      setFuseTotal(nextFuse);
      setFuseClock(nextFuse);
    }
  };

  const startNewMatch = (modeOverride?: GameModeId, categoryOverride?: CategoryId) => {
    clearPendingTransition();
    sessionIdRef.current += 1;
    const currentSessionId = sessionIdRef.current;

    const mode = modeOverride ?? profile.selectedMode;
    const category = categoryOverride ?? profile.selectedCategory;
    const todayKey = getBrasiliaDateKey();

    rngRef.current =
      mode === 'daily'
        ? createPRNG(hashSeed(`PULSO_BRASILIA_${todayKey}`))
        : createPRNG((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);

    usedQuestionIdsRef.current.clear();
    usedSyllablesRef.current.clear();
    usedWordsRef.current.clear();
    historyRef.current = [];
    timelineMarksRef.current = [];

    const initialLives = MODE_DETAILS[mode].initialLives;

    matchRef.current = {
      active: true,
      paused: false,
      inFeedback: false,
      mode,
      category,
      dateKey: todayKey,
      matchClock: 60.0,
      fuseClock: 10.0,
      fuseTotal: 10.0,
      lives: initialLives,
      floor: 1,
      safeScore: 0,
      riskScore: 0,
      lostRiskScore: 0,
      streak: 0,
      combo: 1.0,
      peakCombo: 1.0,
      banksCount: 0,
      correctCount: 0,
      totalCount: 0,
      currentQuestion: null,
      currentSyllable: WORDBOMB_SYLLABLES[0],
    };

    setProfile(prev => ({ ...prev, selectedMode: mode, selectedCategory: category }));
    setLastReport(null);
    setIsPaused(false);
    setMatchClock(60.0);
    setLives(initialLives);
    setFloor(1);
    setSafeScore(0);
    setRiskScore(0);
    setStreak(0);
    setCombo(1.0);
    setInMatch(true);

    loadStepChallenge(currentSessionId);
  };

  const abortMatchToHome = () => {
    clearPendingTransition();
    sessionIdRef.current += 1;
    matchRef.current.active = false;
    setInMatch(false);
    setIsPaused(false);
    setFeedback(null);
  };

  const concludeMatch = () => {
    clearPendingTransition();
    const st = matchRef.current;
    if (!st.active) return;
    st.active = false;
    sessionIdRef.current += 1;

    setInMatch(false);
    setIsPaused(false);
    SoundEngine.finish();

    const salvagedScore = Math.round(st.riskScore * 0.5);
    const dissipated = st.riskScore - salvagedScore;
    const totalLostRisk = st.lostRiskScore + dissipated;
    const finalScore = st.safeScore + salvagedScore;

    const prevModeBest = profile.bestScores[st.mode] || 0;
    const isNewRecord = finalScore > prevModeBest && finalScore > 0;
    const timelineStr = timelineMarksRef.current.length > 0 ? timelineMarksRef.current.join('') : '—';

    const modeTitle =
      st.mode === 'daily'
        ? `Desafio Diário (${st.dateKey})`
        : st.mode === 'classic'
        ? `${MODE_DETAILS.classic.name} - ${CATEGORY_LABELS[st.category]}`
        : MODE_DETAILS[st.mode].name;

    const shareText = [
      `Pulso — ${modeTitle}`,
      `Pontuação: ${finalScore} pts (Protegidos: ${st.safeScore} | Salvos no fim: +${salvagedScore})`,
      `Acertos: ${st.correctCount}/${st.totalCount} • Combo máx: ${st.peakCombo.toFixed(1)}x`,
      `Ritmo: ${timelineStr}`,
    ].join('\n');

    setProfile(prev => {
      const updatedDaily = { ...prev.dailyHistory };
      if (st.mode === 'daily' && !updatedDaily[st.dateKey]) {
        updatedDaily[st.dateKey] = {
          dateKey: st.dateKey,
          score: finalScore,
          safeScore: st.safeScore,
          salvagedScore,
          correctCount: st.correctCount,
          totalCount: st.totalCount,
          peakCombo: st.peakCombo,
          timeline: timelineStr,
          shareText,
        };
      }

      return {
        ...prev,
        matchesPlayed: prev.matchesPlayed + 1,
        totalQuestionsAnswered: prev.totalQuestionsAnswered + st.totalCount,
        totalQuestionsCorrect: prev.totalQuestionsCorrect + st.correctCount,
        highestComboEver: Math.max(prev.highestComboEver, st.peakCombo),
        bestScores: {
          ...prev.bestScores,
          [st.mode]: Math.max(prev.bestScores[st.mode] || 0, finalScore),
        },
        bestCategoryScores:
          st.mode === 'classic'
            ? {
                ...prev.bestCategoryScores,
                [st.category]: Math.max(prev.bestCategoryScores[st.category] || 0, finalScore),
              }
            : prev.bestCategoryScores,
        dailyHistory: updatedDaily,
      };
    });

    setLastReport({
      mode: st.mode,
      category: st.category,
      dateKey: st.dateKey,
      finalScore,
      safeScore: st.safeScore,
      salvagedScore,
      lostRiskScore: totalLostRisk,
      correctCount: st.correctCount,
      totalCount: st.totalCount,
      peakCombo: st.peakCombo,
      banksCount: st.banksCount,
      isNewRecord,
      timeline: timelineStr,
      shareText,
      history: [...historyRef.current],
    });
  };

  const handleProtectPulse = () => {
    const st = matchRef.current;
    if (!st.active || st.paused || st.riskScore <= 0) return;

    const amount = st.riskScore;
    const hadHighStreak = st.streak >= 4 && MODE_DETAILS[st.mode].hasMatchClock;

    st.safeScore += amount;
    st.riskScore = 0;
    st.streak = 0;
    st.combo = 1.0;
    st.banksCount += 1;
    timelineMarksRef.current.push('🛡️');

    if (hadHighStreak) {
      st.matchClock = Math.min(60.0, st.matchClock + 1.5);
      setMatchClock(st.matchClock);
    }

    setSafeScore(st.safeScore);
    setRiskScore(0);
    setStreak(0);
    setCombo(1.0);
    SoundEngine.bank();

    setFeedback({
      visible: true,
      tone: 'positive',
      title: `🛡️ +${amount} pontos protegidos no cofre!${hadHighStreak ? ' (+1,5s de bônus no relógio)' : ''}`,
      detail: 'Os pontos protegidos estão garantidos até o fim da partida. Multiplicador reiniciado para 1.0x.',
    });
  };

  const handleAnswerOption = (optionIdx: number) => {
    const st = matchRef.current;
    if (!st.active || st.paused || st.inFeedback || !st.currentQuestion) return;

    const currentSessionId = sessionIdRef.current;
    st.inFeedback = true;
    st.totalCount += 1;
    setSelectedOption(optionIdx);

    const q = st.currentQuestion;
    const isCorrect = optionIdx === q.correctIndex;

    if (isCorrect) {
      st.correctCount += 1;
      st.streak += 1;
      st.floor += 1;
      st.combo = COMBO_STEPS[Math.min(st.streak, COMBO_STEPS.length - 1)];
      st.peakCombo = Math.max(st.peakCombo, st.combo);

      const speedRatio = Math.max(0, Math.min(1, st.fuseClock / st.fuseTotal));
      const speedBonus = Math.round(50 * speedRatio);
      const earned = Math.round((BASE_POINTS[q.difficulty] + speedBonus) * st.combo);
      st.riskScore += earned;
      timelineMarksRef.current.push('🟢');

      setStreak(st.streak);
      setFloor(st.floor);
      setCombo(st.combo);
      setRiskScore(st.riskScore);
      SoundEngine.hit(st.streak);

      historyRef.current.push({
        step: st.totalCount,
        prompt: q.prompt,
        userAnswer: q.options[optionIdx],
        correctAnswer: q.options[q.correctIndex],
        isCorrect: true,
        pointsDelta: earned,
        explanation: q.explanation,
      });

      setFeedback({
        visible: true,
        tone: 'positive',
        title: `Correto! +${earned} pts em risco (Multiplicador ${st.combo.toFixed(1)}x)`,
        detail: q.explanation,
      });

      transitionTimerRef.current = window.setTimeout(() => {
        loadStepChallenge(currentSessionId);
      }, 950);
    } else {
      const lost = st.riskScore;
      st.lostRiskScore += lost;
      st.riskScore = 0;
      st.streak = 0;
      st.combo = 1.0;
      timelineMarksRef.current.push('🔴');

      if (MODE_DETAILS[st.mode].initialLives > 0) {
        st.lives = Math.max(0, st.lives - 1);
        setLives(st.lives);
      }

      setRiskScore(0);
      setStreak(0);
      setCombo(1.0);
      SoundEngine.error();

      const userChoiceLabel = optionIdx >= 0 ? q.options[optionIdx] : 'Tempo esgotado';
      historyRef.current.push({
        step: st.totalCount,
        prompt: q.prompt,
        userAnswer: userChoiceLabel,
        correctAnswer: q.options[q.correctIndex],
        isCorrect: false,
        pointsDelta: -lost,
        explanation: q.explanation,
      });

      setFeedback({
        visible: true,
        tone: 'error',
        title:
          optionIdx === -1
            ? `Tempo da questão esgotado! ${lost > 0 ? `-${lost} pts em risco perdidos.` : ''}`
            : `Resposta incorreta! ${lost > 0 ? `-${lost} pts em risco perdidos.` : 'Combo reiniciado.'}`,
        detail: `Resposta correta: ${q.options[q.correctIndex]}. ${q.explanation}`,
      });

      if (MODE_DETAILS[st.mode].initialLives > 0 && st.lives <= 0) {
        transitionTimerRef.current = window.setTimeout(() => {
          if (sessionIdRef.current === currentSessionId) concludeMatch();
        }, 1250);
      } else {
        transitionTimerRef.current = window.setTimeout(() => {
          loadStepChallenge(currentSessionId);
        }, 1450);
      }
    }
  };

  const handleWordBombSubmit = () => {
    const st = matchRef.current;
    if (!st.active || st.paused || st.inFeedback || st.mode !== 'wordbomb') return;

    const validation = validateWordSubmission(
      typedWord,
      st.currentSyllable.syl,
      usedWordsRef.current,
      PORTUGUESE_WORD_SET
    );

    if (!validation.valid) {
      SoundEngine.error();
      setFeedback({
        visible: true,
        tone: 'error',
        title: 'Palavra não aceita',
        detail: validation.reason || 'Tente outra palavra válida do português.',
      });
      return;
    }

    const currentSessionId = sessionIdRef.current;
    usedWordsRef.current.add(validation.normalized);
    st.totalCount += 1;
    st.correctCount += 1;
    st.streak += 1;
    st.combo = COMBO_STEPS[Math.min(st.streak, COMBO_STEPS.length - 1)];
    st.peakCombo = Math.max(st.peakCombo, st.combo);

    const lengthBonus = Math.min(80, validation.normalized.length * 10);
    const earned = Math.round((110 + lengthBonus) * st.combo);
    st.riskScore += earned;
    timelineMarksRef.current.push('🟢');

    historyRef.current.push({
      step: st.totalCount,
      prompt: `Sílaba "${st.currentSyllable.syl}"`,
      userAnswer: validation.normalized,
      correctAnswer: st.currentSyllable.samples.slice(0, 3).join(', '),
      isCorrect: true,
      pointsDelta: earned,
      explanation: `Palavra válida com ${validation.normalized.length} letras.`,
    });

    setStreak(st.streak);
    setCombo(st.combo);
    setRiskScore(st.riskScore);
    SoundEngine.hit(st.streak);

    loadStepChallenge(currentSessionId);
    setFeedback({
      visible: true,
      tone: 'positive',
      title: `"${validation.normalized}" aceita! +${earned} pts em risco (${st.combo.toFixed(1)}x)`,
      detail: 'Continue acertando ou pressione ESPAÇO/TAB para proteger os pontos no cofre.',
    });
  };

  useEffect(() => {
    if (!inMatch) return;
    let lastTime = performance.now();
    let lastUrgentSecond = -1;
    let rafId = 0;

    const tick = (now: number) => {
      const st = matchRef.current;
      if (!st.active) return;

      const dt = Math.min(0.1, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;

      if (!st.paused && !st.inFeedback) {
        if (MODE_DETAILS[st.mode].hasMatchClock) {
          st.matchClock = Math.max(0, st.matchClock - dt);
          setMatchClock(st.matchClock);

          if (st.matchClock <= 10.0 && st.matchClock > 0) {
            const sec = Math.ceil(st.matchClock);
            if (sec !== lastUrgentSecond) {
              lastUrgentSecond = sec;
              SoundEngine.tickUrgent();
            }
          }

          if (st.matchClock <= 0) {
            concludeMatch();
            return;
          }
        }

        st.fuseClock = Math.max(0, st.fuseClock - dt);
        setFuseClock(st.fuseClock);

        if (st.fuseClock <= 0) {
          if (st.mode === 'wordbomb') {
            const currentSessionId = sessionIdRef.current;
            st.inFeedback = true;
            st.totalCount += 1;
            const lost = st.riskScore;
            st.lostRiskScore += lost;
            st.riskScore = 0;
            st.streak = 0;
            st.combo = 1.0;
            st.lives = Math.max(0, st.lives - 1);
            timelineMarksRef.current.push('🔴');

            setRiskScore(0);
            setStreak(0);
            setCombo(1.0);
            setLives(st.lives);
            SoundEngine.error();

            historyRef.current.push({
              step: st.totalCount,
              prompt: `Sílaba "${st.currentSyllable.syl}"`,
              userAnswer: 'Tempo esgotado',
              correctAnswer: st.currentSyllable.samples.slice(0, 4).join(', '),
              isCorrect: false,
              pointsDelta: -lost,
              explanation: `Exemplos possíveis: ${st.currentSyllable.samples.slice(0, 4).join(', ')}.`,
            });

            setFeedback({
              visible: true,
              tone: 'error',
              title: `Tempo esgotado! -1 vida ${lost > 0 ? `e -${lost} pts em risco` : ''}`,
              detail: `Exemplos para "${st.currentSyllable.syl}": ${st.currentSyllable.samples.slice(0, 4).join(', ')}.`,
            });

            if (st.lives <= 0) {
              transitionTimerRef.current = window.setTimeout(() => {
                if (sessionIdRef.current === currentSessionId) concludeMatch();
              }, 1250);
            } else {
              transitionTimerRef.current = window.setTimeout(() => {
                loadStepChallenge(currentSessionId);
              }, 1350);
            }
          } else {
            handleAnswerOption(-1);
          }
          return;
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [inMatch]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!matchRef.current.active) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        matchRef.current.paused = !matchRef.current.paused;
        setIsPaused(matchRef.current.paused);
        return;
      }

      if (matchRef.current.paused) return;

      if (e.key === 'Tab' || (e.code === 'Space' && matchRef.current.mode !== 'wordbomb')) {
        e.preventDefault();
        if (matchRef.current.riskScore > 0) {
          handleProtectPulse();
        } else if (matchRef.current.inFeedback) {
          loadStepChallenge(sessionIdRef.current);
        }
        return;
      }

      if (matchRef.current.mode !== 'wordbomb') {
        if (matchRef.current.inFeedback && e.key === 'Enter') {
          e.preventDefault();
          loadStepChallenge(sessionIdRef.current);
          return;
        }
        if (e.key === '1' || e.key.toUpperCase() === 'A') {
          e.preventDefault();
          handleAnswerOption(0);
        } else if (e.key === '2' || e.key.toUpperCase() === 'B') {
          e.preventDefault();
          handleAnswerOption(1);
        } else if (e.key === '3' || e.key.toUpperCase() === 'C') {
          e.preventDefault();
          handleAnswerOption(2);
        } else if (e.key === '4' || e.key.toUpperCase() === 'D') {
          e.preventDefault();
          handleAnswerOption(3);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const todayKey = getBrasiliaDateKey();
  const todayDailyRecord = profile.dailyHistory[todayKey];
  const overallAccuracy =
    profile.totalQuestionsAnswered > 0
      ? Math.round((profile.totalQuestionsCorrect / profile.totalQuestionsAnswered) * 100)
      : 0;

  const fusePercent = Math.max(0, Math.min(100, (fuseClock / fuseTotal) * 100));

  const copyText = (text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedBanner(true);
    setTimeout(() => setCopiedBanner(false), 2000);
  };

  return (
    <div className="pulso-shell">
      <header className="pulso-header">
        <div className="pulso-header-inner">
          <button
            type="button"
            className="brand-btn"
            onClick={() => {
              if (inMatch) abortMatchToHome();
              setLastReport(null);
              setActiveView('home');
            }}
          >
            <div className="brand-mark" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M2 12H6L9 5L14 19L17 10L19 12H22"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <span className="brand-name">Pulso</span>
              <span className="brand-tagline">Pense rápido. Vá mais longe.</span>
            </div>
          </button>

          <nav className="header-nav" aria-label="Navegação principal">
            <button
              type="button"
              className={`nav-btn ${activeView === 'home' && !inMatch ? 'active' : ''}`}
              onClick={() => {
                if (inMatch) abortMatchToHome();
                setLastReport(null);
                setActiveView('home');
              }}
            >
              Jogar
            </button>
            <button
              type="button"
              className={`nav-btn ${activeView === 'rules' && !inMatch ? 'active' : ''}`}
              onClick={() => {
                if (inMatch) abortMatchToHome();
                setLastReport(null);
                setActiveView('rules');
              }}
            >
              Como Jogar
            </button>
            <button
              type="button"
              className={`nav-btn ${activeView === 'stats' && !inMatch ? 'active' : ''}`}
              onClick={() => {
                if (inMatch) abortMatchToHome();
                setLastReport(null);
                setActiveView('stats');
              }}
            >
              Recordes
            </button>
            <button
              type="button"
              className={`nav-btn ${activeView === 'library' && !inMatch ? 'active' : ''}`}
              onClick={() => {
                if (inMatch) abortMatchToHome();
                setLastReport(null);
                setActiveView('library');
              }}
            >
              Conteúdo
            </button>
            <button
              type="button"
              className="nav-btn nav-btn-sound"
              aria-pressed={profile.soundEnabled}
              onClick={() => setProfile(p => ({ ...p, soundEnabled: !p.soundEnabled }))}
            >
              {profile.soundEnabled ? 'Som: Ativo' : 'Som: Mudo'}
            </button>
          </nav>
        </div>
      </header>

      <main className="pulso-main">
        {inMatch ? (
          <div className="match-container" aria-live="polite">
            <div className="match-hud-bar">
              <div>
                <div className="eyebrow-badge">{MODE_DETAILS[matchRef.current.mode].name}</div>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {matchRef.current.mode === 'elevator'
                    ? `Andar #${floor} • Dificuldade progressiva`
                    : `Questão #${matchRef.current.totalCount + 1}`}
                </div>
              </div>

              <div className="hud-clock-box">
                {MODE_DETAILS[matchRef.current.mode].initialLives > 0 && (
                  <div
                    style={{ marginRight: '14px', fontWeight: 700, color: 'var(--state-error)' }}
                    aria-label={`${lives} vidas restantes`}
                  >
                    Vidas: {'♥ '.repeat(lives) || '0'}
                  </div>
                )}
                {MODE_DETAILS[matchRef.current.mode].hasMatchClock && (
                  <div
                    className={`hud-clock-number ${matchClock <= 10 ? 'urgent' : ''}`}
                    aria-label="Tempo restante da partida"
                  >
                    {matchClock.toFixed(1)}s
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ minHeight: '40px', padding: '6px 14px' }}
                  onClick={() => {
                    matchRef.current.paused = !matchRef.current.paused;
                    setIsPaused(matchRef.current.paused);
                  }}
                >
                  {isPaused ? 'Retomar' : 'Pausar'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ minHeight: '40px', padding: '6px 14px' }}
                  onClick={abortMatchToHome}
                >
                  Sair
                </button>
              </div>
            </div>

            <div className="vaults-bar">
              <div className="vault-box safe">
                <div className="vault-label">
                  <span>Pontos Protegidos</span>
                  <span>Garantidos</span>
                </div>
                <div className="vault-score">{safeScore}</div>
              </div>

              <button
                type="button"
                className={`btn-protect-pulse ${riskScore > 0 ? 'ready' : ''}`}
                disabled={riskScore <= 0 || isPaused}
                onClick={handleProtectPulse}
              >
                <span>Proteger Pontos Agora</span>
                <span style={{ fontSize: '0.78rem', fontWeight: 500 }}>
                  {riskScore > 0
                    ? `Guardar +${riskScore} pts no cofre [Espaço / Tab]`
                    : 'Acerte para acumular pontos em risco'}
                </span>
              </button>

              <div className="vault-box risk">
                <div className="vault-label">
                  <span>Pontos em Risco</span>
                  <span>Combo {combo.toFixed(1)}x</span>
                </div>
                <div className="vault-score">{riskScore}</div>
              </div>
            </div>

            {isPaused ? (
              <div className="surface-card" style={{ textAlign: 'center', padding: '40px 24px' }}>
                <h2 className="hero-title">Partida Pausada</h2>
                <p className="hero-description" style={{ margin: '10px 0 24px' }}>
                  O cronômetro está parado. Quando estiver pronto, retome a partida.
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      matchRef.current.paused = false;
                      setIsPaused(false);
                    }}
                  >
                    Continuar Partida
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => startNewMatch()}>
                    Reiniciar Partida
                  </button>
                </div>
              </div>
            ) : (
              <section className="challenge-card">
                <div className="fuse-progress-track" aria-hidden="true">
                  <div
                    className={`fuse-progress-fill ${fusePercent < 30 ? 'danger' : ''}`}
                    style={{ width: `${fusePercent}%` }}
                  />
                </div>

                <div className="challenge-body">
                  <div className="challenge-meta">
                    <span>
                      {matchRef.current.mode === 'wordbomb'
                        ? 'Bomba de Sílabas • Dicionário Oficial'
                        : `${CATEGORY_LABELS[currentQuestion?.category || 'mixed']} • Nível ${
                            currentQuestion?.difficulty || 1
                          }`}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>
                      Tempo da questão: {fuseClock.toFixed(1)}s
                    </span>
                  </div>

                  {matchRef.current.mode === 'wordbomb' ? (
                    <>
                      <p style={{ textAlign: 'center', fontFamily: 'var(--font-serif)', fontSize: '1.15rem', color: 'var(--text-secondary)' }}>
                        Digite uma palavra em português que contenha a sílaba:
                      </p>
                      <div className="syllable-badge-large">{currentSyllable.syl}</div>
                      <p style={{ textAlign: 'center', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                        {currentSyllable.hint}
                      </p>

                      <div className="word-input-row">
                        <input
                          type="text"
                          className="word-text-input"
                          placeholder="Digite a palavra..."
                          value={typedWord}
                          onChange={e => {
                            SoundEngine.keyClick();
                            setTypedWord(e.target.value);
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleWordBombSubmit();
                            }
                          }}
                          autoFocus
                          aria-label={`Digite uma palavra com a sílaba ${currentSyllable.syl}`}
                        />
                        <button type="button" className="btn-primary" onClick={handleWordBombSubmit}>
                          Confirmar
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <h2 className="challenge-prompt">{currentQuestion?.prompt}</h2>

                      <div className="options-grid">
                        {currentQuestion?.options.map((optText, idx) => {
                          const isAnswered = selectedOption !== null;
                          const isCorrect = isAnswered && idx === currentQuestion.correctIndex;
                          const isWrong = isAnswered && selectedOption === idx && idx !== currentQuestion.correctIndex;

                          return (
                            <button
                              key={idx}
                              type="button"
                              className={`option-button ${isCorrect ? 'state-correct' : ''} ${
                                isWrong ? 'state-wrong' : ''
                              }`}
                              disabled={isAnswered}
                              onClick={() => handleAnswerOption(idx)}
                            >
                              <span className="option-key">{idx + 1}</span>
                              <span>{optText}</span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {feedback?.visible && (
                    <div className={`feedback-box ${feedback.tone}`} role="status">
                      <div className="feedback-title">{feedback.title}</div>
                      <div style={{ fontSize: '0.94rem', color: 'var(--text-primary)' }}>{feedback.detail}</div>
                      {matchRef.current.inFeedback && matchRef.current.mode !== 'wordbomb' && (
                        <div style={{ marginTop: '6px' }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ minHeight: '38px', padding: '6px 12px', fontSize: '0.86rem' }}
                            onClick={() => loadStepChallenge(sessionIdRef.current)}
                          >
                            Próxima questão [Enter] →
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        ) : lastReport ? (
          <div className="match-container">
            <section className="surface-card hero-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <span className="eyebrow-badge">{MODE_DETAILS[lastReport.mode].name}</span>
                {lastReport.isNewRecord && (
                  <span
                    className="eyebrow-badge"
                    style={{ backgroundColor: 'var(--state-positive-soft)', color: 'var(--state-positive)' }}
                  >
                    ★ Novo Recorde Pessoal
                  </span>
                )}
              </div>

              <div>
                <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Pontuação Final
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '3.4rem',
                    fontWeight: 700,
                    color: 'var(--brand-terracotta-text)',
                    lineHeight: 1.05,
                  }}
                >
                  {lastReport.finalScore} pts
                </div>
                <p style={{ marginTop: '6px', color: 'var(--text-secondary)' }}>
                  Protegidos no cofre: <strong>{lastReport.safeScore} pts</strong> • Salvos no fim do tempo (50%):{' '}
                  <strong>+{lastReport.salvagedScore} pts</strong> • Perdidos em risco:{' '}
                  <strong>{lastReport.lostRiskScore} pts</strong>
                </p>
              </div>

              <div className="stats-summary-grid">
                <div className="stat-metric-card">
                  <span className="stat-metric-val">
                    {lastReport.correctCount}/{lastReport.totalCount}
                  </span>
                  <span className="stat-metric-lbl">Acertos na Partida</span>
                </div>
                <div className="stat-metric-card">
                  <span className="stat-metric-val">{lastReport.peakCombo.toFixed(1)}x</span>
                  <span className="stat-metric-lbl">Maior Multiplicador</span>
                </div>
                <div className="stat-metric-card">
                  <span className="stat-metric-val">{lastReport.banksCount}</span>
                  <span className="stat-metric-lbl">Proteções Realizadas</span>
                </div>
                <div className="stat-metric-card">
                  <span className="stat-metric-val" style={{ fontSize: '1.2rem' }}>
                    {lastReport.timeline}
                  </span>
                  <span className="stat-metric-lbl">Mapa de Ritmo</span>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: 'var(--bg-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '10px',
                    flexWrap: 'wrap',
                    marginBottom: '8px',
                  }}
                >
                  <strong style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem' }}>Compartilhar Resultado</strong>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ minHeight: '38px', padding: '6px 14px' }}
                    onClick={() => copyText(lastReport.shareText)}
                  >
                    {copiedBanner ? '✓ Copiado!' : 'Copiar Resumo'}
                  </button>
                </div>
                <pre
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.84rem',
                    whiteSpace: 'pre-wrap',
                    color: 'var(--text-primary)',
                  }}
                >
                  {lastReport.shareText}
                </pre>
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => startNewMatch(lastReport.mode, lastReport.category)}
                >
                  Jogar Novamente
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setLastReport(null);
                    setActiveView('home');
                  }}
                >
                  Escolher Outro Modo
                </button>
              </div>
            </section>

            <section className="surface-card">
              <h3 className="section-heading">Revisão das Questões ({lastReport.history.length})</h3>
              {lastReport.history.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>Nenhuma questão respondida nesta sessão.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {lastReport.history.map(item => (
                    <div
                      key={item.step}
                      className={`feedback-box ${item.isCorrect ? 'positive' : 'error'}`}
                    >
                      <div className="feedback-title">
                        #{item.step} • {item.prompt}
                      </div>
                      <div style={{ fontSize: '0.92rem' }}>
                        {item.isCorrect ? (
                          <span>
                            ✓ Sua resposta: <strong>{item.userAnswer}</strong> (+{item.pointsDelta} pts)
                          </span>
                        ) : (
                          <span>
                            ✕ Sua resposta: <strong>{item.userAnswer}</strong> • Correta:{' '}
                            <strong>{item.correctAnswer}</strong>
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                        {item.explanation}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : activeView === 'home' ? (
          <div className="home-grid">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <section className="surface-card hero-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <span className="eyebrow-badge">
                    {MODE_DETAILS[profile.selectedMode].badge}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {formatDatePtBr(todayKey)}
                  </span>
                </div>

                <div>
                  <h1 className="hero-title">{MODE_DETAILS[profile.selectedMode].name}</h1>
                  <p className="hero-description" style={{ marginTop: '6px' }}>
                    {MODE_DETAILS[profile.selectedMode].summary}
                  </p>
                </div>

                {profile.selectedMode === 'classic' && (
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                      Escolha a categoria da partida:
                    </div>
                    <div className="category-chips" role="group" aria-label="Categorias">
                      {(Object.keys(CATEGORY_LABELS) as CategoryId[]).map(cat => (
                        <button
                          key={cat}
                          type="button"
                          className={`cat-chip ${profile.selectedCategory === cat ? 'active' : ''}`}
                          onClick={() => setProfile(p => ({ ...p, selectedCategory: cat }))}
                        >
                          {CATEGORY_LABELS[cat]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => startNewMatch(profile.selectedMode, profile.selectedCategory)}
                  >
                    Iniciar {MODE_DETAILS[profile.selectedMode].name}
                  </button>

                  {profile.selectedMode === 'daily' && todayDailyRecord && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => copyText(todayDailyRecord.shareText)}
                    >
                      {copiedBanner
                        ? '✓ Resultado copiado!'
                        : `Compartilhar hoje (${todayDailyRecord.score} pts)`}
                    </button>
                  )}
                </div>
              </section>

              <section>
                <div className="section-heading">
                  <span>Modos de Jogo</span>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.84rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                    4 experiências disponíveis
                  </span>
                </div>

                <div className="modes-list">
                  {(Object.keys(MODE_DETAILS) as GameModeId[]).map(modeKey => {
                    const info = MODE_DETAILS[modeKey];
                    const isSelected = profile.selectedMode === modeKey;
                    const best = profile.bestScores[modeKey] || 0;

                    return (
                      <button
                        key={modeKey}
                        type="button"
                        className={`mode-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => setProfile(p => ({ ...p, selectedMode: modeKey }))}
                      >
                        <div className="mode-card-header">
                          <span className="mode-card-title">{info.name}</span>
                          <span className="mode-card-record">Recorde: {best} pts</span>
                        </div>
                        <p className="mode-card-desc">{info.summary}</p>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {info.rules}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            <aside style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <section className="surface-card">
                <h2 className="section-heading">Dinâmica do Pulso</h2>
                <div className="steps-list">
                  <div className="step-row">
                    <div className="step-num">1</div>
                    <div>
                      <strong style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem' }}>Responda sob pressão</strong>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Cada acerto acumula pontos provisórios e eleva seu multiplicador de combo até <strong>3.0x</strong>.
                      </p>
                    </div>
                  </div>
                  <div className="step-row">
                    <div className="step-num">2</div>
                    <div>
                      <strong style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem' }}>Proteja no momento certo</strong>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Acione <strong>Proteger Pontos</strong> (ou <code>Espaço</code> / <code>Tab</code>) para transferir 100% dos pontos em risco para o cofre seguro.
                      </p>
                    </div>
                  </div>
                  <div className="step-row">
                    <div className="step-num">3</div>
                    <div>
                      <strong style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem' }}>Evite a sobrecarga</strong>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Errar uma questão ou deixar o tempo esgotar zera os pontos ainda não protegidos.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="surface-card">
                <h2 className="section-heading">Resumo Pessoal</h2>
                <div className="stats-summary-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                  <div className="stat-metric-card">
                    <span className="stat-metric-val">
                      {Math.max(0, ...Object.values(profile.bestScores))}
                    </span>
                    <span className="stat-metric-lbl">Maior Pontuação</span>
                  </div>
                  <div className="stat-metric-card">
                    <span className="stat-metric-val">{profile.highestComboEver.toFixed(1)}x</span>
                    <span className="stat-metric-lbl">Combo Máximo</span>
                  </div>
                  <div className="stat-metric-card">
                    <span className="stat-metric-val">{overallAccuracy}%</span>
                    <span className="stat-metric-lbl">Precisão Geral</span>
                  </div>
                  <div className="stat-metric-card">
                    <span className="stat-metric-val">{profile.matchesPlayed}</span>
                    <span className="stat-metric-lbl">Partidas Concluídas</span>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        ) : activeView === 'rules' ? (
          <section className="surface-card" style={{ maxWidth: '740px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <h1 className="hero-title">Regras e Sistema de Pontuação</h1>
            <p className="hero-description">
              O Pulso combina velocidade de raciocínio com tomada de decisão estratégica. Veja como cada ação afeta o seu placar:
            </p>
            <div className="steps-list">
              <div className="step-row">
                <div className="step-num">1</div>
                <div>
                  <strong style={{ fontFamily: 'var(--font-serif)', fontSize: '1.08rem' }}>Pontuação Base e Velocidade</strong>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.94rem' }}>
                    Desafios de Nível 1 valem 100 pts, Nível 2 valem 150 pts e Nível 3 valem 220 pts, acrescidos de até +50 pts conforme o tempo restante da questão.
                  </p>
                </div>
              </div>
              <div className="step-row">
                <div className="step-num">2</div>
                <div>
                  <strong style={{ fontFamily: 'var(--font-serif)', fontSize: '1.08rem' }}>Escada de Multiplicadores (1.0x a 3.0x)</strong>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.94rem' }}>
                    Respostas corretas consecutivas elevam o multiplicador: 1.0x → 1.2x → 1.5x → 2.0x → 2.5x → 3.0x.
                  </p>
                </div>
              </div>
              <div className="step-row">
                <div className="step-num">3</div>
                <div>
                  <strong style={{ fontFamily: 'var(--font-serif)', fontSize: '1.08rem' }}>Proteger Pontos e Bônus de Tempo (+1,5s)</strong>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.94rem' }}>
                    Ao proteger seus pontos em risco, 100% deles vão para o Cofre Seguro e o multiplicador reinicia em 1.0x. Proteger uma sequência de 4 ou mais acertos concede +1,5 segundo extra no relógio.
                  </p>
                </div>
              </div>
              <div className="step-row">
                <div className="step-num">4</div>
                <div>
                  <strong style={{ fontFamily: 'var(--font-serif)', fontSize: '1.08rem' }}>Fim de Tempo da Partida (Salvamento de 50%)</strong>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.94rem' }}>
                    Quando os 60 segundos terminam, metade (50%) dos pontos que ficaram em risco é salva automaticamente.
                  </p>
                </div>
              </div>
            </div>
          </section>
        ) : activeView === 'stats' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '840px', margin: '0 auto' }}>
            <section className="surface-card">
              <h1 className="section-heading">Recordes por Modo de Jogo</h1>
              <div className="stats-summary-grid">
                {(Object.keys(MODE_DETAILS) as GameModeId[]).map(m => (
                  <div key={m} className="stat-metric-card">
                    <span className="stat-metric-val">{profile.bestScores[m] || 0}</span>
                    <span className="stat-metric-lbl">{MODE_DETAILS[m].name}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="surface-card">
              <h2 className="section-heading">Preferências e Acessibilidade</h2>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setProfile(p => ({ ...p, soundEnabled: !p.soundEnabled }))}
                >
                  Efeitos Sonoros: {profile.soundEnabled ? 'Ativados' : 'Desativados'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setProfile(p => ({ ...p, reducedMotion: !p.reducedMotion }))}
                >
                  Animações Reduzidas: {profile.reducedMotion ? 'Sim' : 'Não'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ color: 'var(--state-error)', borderColor: 'var(--state-error)' }}
                  onClick={() => setProfile(clearProfileStorage())}
                >
                  Zerar Recordes Locais
                </button>
              </div>
            </section>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <section className="surface-card">
              <h1 className="section-heading">
                Verificador do Dicionário ({PORTUGUESE_WORD_SET.size} vocábulos validados)
              </h1>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Consulte se uma palavra (com ou sem acentuação) é aceita no modo Bomba de Sílabas:
              </p>
              <div className="word-input-row">
                <input
                  type="text"
                  className="word-text-input"
                  placeholder="Digite uma palavra para consultar..."
                  value={wordCheckInput}
                  onChange={e => setWordCheckInput(e.target.value)}
                />
              </div>
              {wordCheckInput.trim().length >= 2 && (
                <div style={{ marginTop: '12px', fontWeight: 600 }}>
                  {PORTUGUESE_WORD_SET.has(
                    wordCheckInput
                      .trim()
                      .toUpperCase()
                      .normalize('NFD')
                      .replace(/[\u0300-\u036f]/g, '')
                  ) ? (
                    <span style={{ color: 'var(--state-positive)' }}>
                      ✓ Palavra válida e aceita pelo dicionário oficial do Pulso.
                    </span>
                  ) : (
                    <span style={{ color: 'var(--state-error)' }}>
                      ✕ Palavra não encontrada no dicionário oficial.
                    </span>
                  )}
                </div>
              )}
            </section>

            <section className="surface-card">
              <div className="section-heading">
                <span>Biblioteca de Questões ({QUESTION_BANK.length})</span>
              </div>
              <div className="category-chips" style={{ marginBottom: '16px' }}>
                {(Object.keys(CATEGORY_LABELS) as CategoryId[]).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    className={`cat-chip ${libraryCatFilter === cat ? 'active' : ''}`}
                    onClick={() => setLibraryCatFilter(cat)}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {QUESTION_BANK.filter(
                  q => libraryCatFilter === 'mixed' || q.category === libraryCatFilter
                ).map(q => (
                  <div key={q.id} className="feedback-box">
                    <div className="feedback-title">
                      [{CATEGORY_LABELS[q.category]} • Nível {q.difficulty}] {q.prompt}
                    </div>
                    <div style={{ fontSize: '0.92rem', color: 'var(--state-positive)', fontWeight: 600 }}>
                      Resposta: {q.options[q.correctIndex]}
                    </div>
                    <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>{q.explanation}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>

      <footer className="pulso-footer">
        Pulso • Atalhos de teclado: <strong>1–4</strong> responder • <strong>Espaço / Tab</strong> proteger pontos •{' '}
        <strong>Esc</strong> pausar
      </footer>
    </div>
  );
}