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
import { ArenaCanvasFX, ArenaCanvasFXHandle } from './components/ArenaCanvasFX';

const COMBO_STEPS = [1.0, 1.0, 1.2, 1.5, 2.0, 2.5, 3.0];
const BASE_POINTS = { 1: 100, 2: 150, 3: 220 } as const;

const MODE_DETAILS: Record<
  GameModeId,
  {
    code: string;
    name: string;
    badge: string;
    summary: string;
    rules: string;
    color: string;
    hasMatchClock: boolean;
    initialLives: number;
  }
> = {
  wordbomb: {
    code: 'SYL',
    name: 'Bomba de Sílabas',
    badge: 'MODO ESTRELA • DIGITAÇÃO RÁPIDA',
    summary: 'O reator sorteia uma sílaba e o pavio começa a queimar! Digite qualquer palavra válida antes que exploda.',
    rules: '60 Segundos • 3 Vidas • Dicionário Oficial de 17.600+ palavras',
    color: '#22D3EE',
    hasMatchClock: true,
    initialLives: 3,
  },
  daily: {
    code: '24H',
    name: 'Desafio Diário',
    badge: 'SEMENTE OFICIAL DO DIA',
    summary: 'Todos os jogadores enfrentam exatamente a mesma sequência hoje. Dispute a maior pontuação e compartilhe!',
    rules: '60 Segundos • Todas as Áreas • Virada à meia-noite (Brasília)',
    color: '#10B981',
    hasMatchClock: true,
    initialLives: 0,
  },
  elevator: {
    code: 'ELV',
    name: 'O Elevador',
    badge: 'TORRE DE SOBREVIVÊNCIA',
    summary: 'Suba andares infinitos com 3 vidas. A cada andar vencido o reator acelera a velocidade do pavio!',
    rules: 'Sem Relógio Geral • 3 Vidas • Velocidade Progressiva',
    color: '#F43F5E',
    hasMatchClock: false,
    initialLives: 3,
  },
  classic: {
    code: '60S',
    name: 'Arena Turbo 60s',
    badge: 'VELOCIDADE & COMBO 3.0X',
    summary: 'Bateria eletrizante de desafios rápidos. Suba seu multiplicador até 3.0x e decida a hora exata de blindar o cofre!',
    rules: '60 Segundos • Escolha Modo Misto ou sua categoria favorita',
    color: '#FACC15',
    hasMatchClock: true,
    initialLives: 0,
  },
};

const CATEGORY_LABELS: Record<CategoryId, string> = {
  mixed: 'Pulso Misto (Todas)',
  math: 'Matemática Mental',
  logic: 'Lógica & Padrões',
  words: 'Palavras & Idioma',
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

  const fxRef = useRef<ArenaCanvasFXHandle | null>(null);
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
    mode: 'wordbomb' as GameModeId,
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
        ? createPRNG(hashSeed(`THE_PULSE_GAME_${todayKey}`))
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
      `⚡ The Pulse Game — ${modeTitle}`,
      `🏆 Pontos: ${finalScore} (🛡️ Cofre: ${st.safeScore} | ⚡ Bônus Final: +${salvagedScore})`,
      `🔥 Combo Máx: ${st.peakCombo.toFixed(1)}x • 🎯 Acertos: ${st.correctCount}/${st.totalCount}`,
      `📊 Mapa: ${timelineStr}`,
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
    fxRef.current?.spawnBurst('#10B981', 24);

    setFeedback({
      visible: true,
      tone: 'positive',
      title: `🛡️ +${amount} PONTOS BLINDADOS NO COFRE!${hadHighStreak ? ' (+1,5s DE TEMPO EXTRA!)' : ''}`,
      detail: 'Seus pontos estão 100% garantidos. O multiplicador voltou para 1.0x.',
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
      fxRef.current?.spawnShockwave('#22D3EE');

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
        title: `✓ ACERTOU! +${earned} PTS EM RISCO (COMBO ${st.combo.toFixed(1)}X)`,
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
      fxRef.current?.spawnBurst('#F43F5E', 24);

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
            ? `💥 PAVIO ESGOTADO! ${lost > 0 ? `-${lost} PTS EM RISCO PERDIDOS!` : ''}`
            : `✕ SOBRECARGA! ${lost > 0 ? `-${lost} PTS EM RISCO PERDIDOS!` : 'COMBO REINICIADO!'}`,
        detail: `Correta: ${q.options[q.correctIndex]} — ${q.explanation}`,
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
      fxRef.current?.spawnBurst('#F43F5E', 14);
      setFeedback({
        visible: true,
        tone: 'error',
        title: '✕ PALAVRA RECUSADA PELO REATOR',
        detail: validation.reason || 'Digite uma palavra válida da língua portuguesa.',
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
      prompt: `Sílaba [${st.currentSyllable.syl}]`,
      userAnswer: validation.normalized,
      correctAnswer: st.currentSyllable.samples.slice(0, 3).join(', '),
      isCorrect: true,
      pointsDelta: earned,
      explanation: `Palavra aceita (${validation.normalized.length} letras).`,
    });

    setStreak(st.streak);
    setCombo(st.combo);
    setRiskScore(st.riskScore);
    SoundEngine.hit(st.streak);
    fxRef.current?.spawnShockwave('#22D3EE');

    loadStepChallenge(currentSessionId);
    setFeedback({
      visible: true,
      tone: 'positive',
      title: `✓ "${validation.normalized}" DETONOU A BOMBA! +${earned} PTS (${st.combo.toFixed(1)}X)`,
      detail: 'Pressione TAB a qualquer momento para blindar seus pontos em risco no Cofre Seguro!',
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
            fxRef.current?.spawnBurst('#F43F5E', 26);

            historyRef.current.push({
              step: st.totalCount,
              prompt: `Sílaba [${st.currentSyllable.syl}]`,
              userAnswer: 'Pavio explodiu',
              correctAnswer: st.currentSyllable.samples.slice(0, 4).join(', '),
              isCorrect: false,
              pointsDelta: -lost,
              explanation: `Exemplos possíveis: ${st.currentSyllable.samples.slice(0, 4).join(', ')}.`,
            });

            setFeedback({
              visible: true,
              tone: 'error',
              title: `💥 A BOMBA EXPLODIU! -1 VIDA ${lost > 0 ? `E -${lost} PTS PERDIDOS!` : ''}`,
              detail: `Você podia digitar: ${st.currentSyllable.samples.slice(0, 4).join(', ')}.`,
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

  const fuseRatio = Math.max(0, Math.min(1, fuseClock / fuseTotal));
  const fusePercent = fuseRatio * 100;
  const dialDashOffset = 502 * (1 - fuseRatio);

  const copyText = (text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedBanner(true);
    setTimeout(() => setCopiedBanner(false), 2000);
  };

  return (
    <div className="game-shell">
      {/* BARRA SUPERIOR DE ENTRETENIMENTO */}
      <header className="game-topbar">
        <div className="game-topbar-inner">
          <button
            type="button"
            className="logo-lockup-btn"
            onClick={() => {
              if (inMatch) abortMatchToHome();
              setLastReport(null);
              setActiveView('home');
            }}
          >
            <svg width="42" height="42" viewBox="0 0 64 64" aria-hidden="true">
              <rect width="64" height="64" rx="16" fill="#161B26" stroke="#6366F1" strokeWidth="3.5" />
              <circle cx="32" cy="32" r="20" fill="none" stroke="#22D3EE" strokeWidth="2" strokeDasharray="5 4" />
              <path
                d="M11 32H21L26 16L33 48L39 24L43 32H53"
                fill="none"
                stroke="#22D3EE"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="32" cy="32" r="4" fill="#F43F5E" />
            </svg>
            <span className="logo-title">THE PULSE GAME</span>
          </button>

          <nav className="topbar-nav" aria-label="Menu do jogo">
            <button
              type="button"
              className={`nav-pill-btn ${activeView === 'home' && !inMatch ? 'active' : ''}`}
              onClick={() => {
                if (inMatch) abortMatchToHome();
                setLastReport(null);
                setActiveView('home');
              }}
            >
              Modos
            </button>
            <button
              type="button"
              className={`nav-pill-btn ${activeView === 'rules' && !inMatch ? 'active' : ''}`}
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
              className={`nav-pill-btn ${activeView === 'stats' && !inMatch ? 'active' : ''}`}
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
              className={`nav-pill-btn ${activeView === 'library' && !inMatch ? 'active' : ''}`}
              onClick={() => {
                if (inMatch) abortMatchToHome();
                setLastReport(null);
                setActiveView('library');
              }}
            >
              Dicionário
            </button>
            <button
              type="button"
              className="sound-toggle-btn"
              onClick={() => setProfile(p => ({ ...p, soundEnabled: !p.soundEnabled }))}
            >
              {profile.soundEnabled ? '🔊 Som ON' : '🔇 Mudo'}
            </button>
          </nav>
        </div>
      </header>

      <main className="game-main">
        {inMatch ? (
          /* =========================================================
             ARENA DE JOGO ATIVA (COM CANVAS FX E REATOR CENTRAL)
             ========================================================= */
          <div className="arena-stage-wrap" aria-live="polite">
            <ArenaCanvasFX ref={fxRef} reducedMotion={profile.reducedMotion} />

            {/* HUD SUPERIOR DA ARENA */}
            <div className="arena-hud-top">
              <div>
                <div className="stage-badge">{MODE_DETAILS[matchRef.current.mode].name}</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-body)', marginTop: '6px' }}>
                  {matchRef.current.mode === 'elevator'
                    ? `Andar #${floor} • Velocidade Progressiva`
                    : `Rodada #${matchRef.current.totalCount + 1}`}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                {MODE_DETAILS[matchRef.current.mode].initialLives > 0 && (
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--arcade-coral)' }}>
                    {[0, 1, 2].map(i => (
                      <span key={i} style={{ opacity: i < lives ? 1 : 0.25, marginRight: '4px' }}>
                        ♥
                      </span>
                    ))}
                  </div>
                )}

                {MODE_DETAILS[matchRef.current.mode].hasMatchClock && (
                  <div className={`arena-timer-big ${matchClock <= 10 ? 'danger' : ''}`}>
                    {matchClock.toFixed(1)}s
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-arcade-secondary"
                  onClick={() => {
                    matchRef.current.paused = !matchRef.current.paused;
                    setIsPaused(matchRef.current.paused);
                  }}
                >
                  {isPaused ? '▶ Retomar' : '⏸ Pausar'}
                </button>
                <button type="button" className="btn-arcade-secondary" onClick={abortMatchToHome}>
                  ✕ Sair
                </button>
              </div>
            </div>

            {/* PAINEL DE COFRE SEGURO VS RISCO + BOTÃO TÁTIL DE BLINDAGEM */}
            <div className="arena-vaults-grid">
              <div className="vault-panel safe-vault">
                <div className="vault-head">
                  <span>🛡️ Cofre Seguro</span>
                  <span>Garantido</span>
                </div>
                <div className="vault-digits">{safeScore}</div>
              </div>

              <button
                type="button"
                className={`btn-bank-reactor ${riskScore > 0 ? 'armed' : ''}`}
                disabled={riskScore <= 0 || isPaused}
                onClick={handleProtectPulse}
              >
                <span style={{ fontSize: '1.15rem', fontWeight: 900 }}>
                  🛡️ BLINDAR PONTOS AGORA
                </span>
                <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                  {riskScore > 0
                    ? `Salvar +${riskScore} pts [ESPAÇO / TAB]`
                    : 'Acumule acertos para blindar'}
                </span>
              </button>

              <div className="vault-panel risk-vault">
                <div className="vault-head">
                  <span>⚡ Em Risco</span>
                  <span>Combo {combo.toFixed(1)}x</span>
                </div>
                <div className="vault-digits">{riskScore}</div>
              </div>
            </div>

            {/* PALCO DO REATOR OU PAUSA */}
            {isPaused ? (
              <div className="Selected-mode-stage" style={{ textAlign: 'center', alignItems: 'center' }}>
                <h2 className="stage-big-title">Jogo Pausado</h2>
                <p className="stage-desc">O tempo está congelado. Pronto para voltar à arena?</p>
                <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button
                    type="button"
                    className="btn-arcade-play"
                    onClick={() => {
                      matchRef.current.paused = false;
                      setIsPaused(false);
                    }}
                  >
                    ▶ Continuar Jogo
                  </button>
                  <button type="button" className="btn-arcade-secondary" onClick={() => startNewMatch()}>
                    ↻ Reiniciar Partida
                  </button>
                </div>
              </div>
            ) : (
              <section className="reactor-stage-card">
                <div className="fuse-bar-track">
                  <div
                    className={`fuse-bar-fill ${fusePercent < 30 ? 'danger' : ''}`}
                    style={{ width: `${fusePercent}%` }}
                  />
                </div>

                <div className="reactor-body">
                  {/* NÚCLEO CIRCULAR ESTILO WORDBOMB */}
                  <div className="bomb-dial-wrap">
                    <svg className="bomb-dial-svg" viewBox="0 0 180 180">
                      <circle className="bomb-dial-bg" cx="90" cy="90" r="80" />
                      <circle
                        className={`bomb-dial-fg ${fuseRatio < 0.3 ? 'danger' : ''}`}
                        cx="90"
                        cy="90"
                        r="80"
                        style={{ strokeDashoffset: dialDashOffset }}
                      />
                    </svg>
                    <div className="bomb-dial-core">
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-body)' }}>
                        {matchRef.current.mode === 'wordbomb' ? 'SÍLABA' : `COMBO ${streak}X`}
                      </span>
                      <div className="bomb-core-syl">
                        {matchRef.current.mode === 'wordbomb' ? currentSyllable.syl : `${combo.toFixed(1)}x`}
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.98rem', fontWeight: 800, color: 'var(--arcade-gold)' }}>
                        {fuseClock.toFixed(1)}s
                      </span>
                    </div>
                  </div>

                  {matchRef.current.mode === 'wordbomb' ? (
                    <>
                      <h2 className="arena-question-title">
                        Digite uma palavra contendo <span style={{ color: 'var(--arcade-cyan)' }}>{currentSyllable.syl}</span>
                      </h2>
                      <p style={{ fontSize: '1.02rem', color: 'var(--text-body)', textAlign: 'center' }}>
                        {currentSyllable.hint}
                      </p>

                      <div className="wordbomb-input-bar">
                        <input
                          type="text"
                          className="wordbomb-field"
                          placeholder="DIGITE AQUI..."
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
                        />
                        <button type="button" className="btn-arcade-play" onClick={handleWordBombSubmit}>
                          Detonar [Enter]
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <h2 className="arena-question-title">{currentQuestion?.prompt}</h2>

                      <div className="arcade-options-grid">
                        {currentQuestion?.options.map((optText, idx) => {
                          const isAnswered = selectedOption !== null;
                          const isCorrect = isAnswered && idx === currentQuestion.correctIndex;
                          const isWrong = isAnswered && selectedOption === idx && idx !== currentQuestion.correctIndex;

                          return (
                            <button
                              key={idx}
                              type="button"
                              className={`arcade-opt-btn ${isCorrect ? 'correct' : ''} ${
                                isWrong ? 'wrong' : ''
                              }`}
                              disabled={isAnswered}
                              onClick={() => handleAnswerOption(idx)}
                            >
                              <span className="arcade-opt-key">{idx + 1}</span>
                              <span>{optText}</span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {feedback?.visible && (
                    <div className={`arena-toast ${feedback.tone}`} role="status">
                      <div className="arena-toast-title">{feedback.title}</div>
                      <div style={{ fontSize: '1.02rem', color: 'var(--text-bright)' }}>{feedback.detail}</div>
                      {matchRef.current.inFeedback && matchRef.current.mode !== 'wordbomb' && (
                        <div style={{ marginTop: '8px' }}>
                          <button
                            type="button"
                            className="btn-arcade-secondary"
                            onClick={() => loadStepChallenge(sessionIdRef.current)}
                          >
                            Próximo Desafio [Enter] →
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
          /* =========================================================
             RELATÓRIO DE FIM DE PARTIDA (VIBRANTE E CLARO)
             ========================================================= */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <section className="Selected-mode-stage">
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <span className="stage-badge">{MODE_DETAILS[lastReport.mode].name}</span>
                {lastReport.isNewRecord && (
                  <span className="stage-badge" style={{ color: 'var(--arcade-gold)', borderColor: 'var(--arcade-gold)' }}>
                    🏆 NOVO RECORDE PESSOAL!
                  </span>
                )}
              </div>

              <div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-body)' }}>
                  PONTUAÇÃO FINAL CONQUISTADA
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '3.6rem',
                    fontWeight: 800,
                    color: 'var(--arcade-cyan)',
                    lineHeight: 1.05,
                  }}
                >
                  {lastReport.finalScore} PTS
                </div>
                <p style={{ fontSize: '1.05rem', color: 'var(--text-body)', marginTop: '8px' }}>
                  🛡️ Cofre Seguro: <strong>{lastReport.safeScore} pts</strong> • ⚡ Salvos no fim (50%):{' '}
                  <strong>+{lastReport.salvagedScore} pts</strong>
                </p>
              </div>

              <div className="stats-cards-grid">
                <div className="stat-card-box">
                  <span className="stat-card-num">
                    {lastReport.correctCount}/{lastReport.totalCount}
                  </span>
                  <span className="stat-card-label">Acertos</span>
                </div>
                <div className="stat-card-box">
                  <span className="stat-card-num">{lastReport.peakCombo.toFixed(1)}x</span>
                  <span className="stat-card-label">Combo Máximo</span>
                </div>
                <div className="stat-card-box">
                  <span className="stat-card-num">{lastReport.banksCount}</span>
                  <span className="stat-card-label">Blindagens</span>
                </div>
                <div className="stat-card-box">
                  <span className="stat-card-num" style={{ fontSize: '1.35rem' }}>
                    {lastReport.timeline}
                  </span>
                  <span className="stat-card-label">Mapa da Partida</span>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: 'var(--bg-stage)',
                  border: '2px solid var(--border-subtle)',
                  borderRadius: '16px',
                  padding: '18px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
                  <strong style={{ fontSize: '1.05rem' }}>Compartilhar com Amigos</strong>
                  <button
                    type="button"
                    className="btn-arcade-secondary"
                    onClick={() => copyText(lastReport.shareText)}
                  >
                    {copiedBanner ? '✓ Copiado!' : '📋 Copiar Placar'}
                  </button>
                </div>
                <pre style={{ fontFamily: 'var(--font-mono)', fontSize: '0.96rem', whiteSpace: 'pre-wrap' }}>
                  {lastReport.shareText}
                </pre>
              </div>

              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-arcade-play"
                  onClick={() => startNewMatch(lastReport.mode, lastReport.category)}
                >
                  ↻ Jogar Novamente
                </button>
                <button
                  type="button"
                  className="btn-arcade-secondary"
                  onClick={() => {
                    setLastReport(null);
                    setActiveView('home');
                  }}
                >
                  Trocar de Modo
                </button>
              </div>
            </section>
          </div>
        ) : activeView === 'home' ? (
          /* =========================================================
             LOBBY CENTRAL DE ENTRETENIMENTO (ESTILO WORDBOMB.IO)
             ========================================================= */
          <>
            {/* 4 CARDS VISUAIS DE MODO NO TOPO */}
            <section className="mode-tiles-grid" aria-label="Seleção rápida de modo">
              {(Object.keys(MODE_DETAILS) as GameModeId[]).map(mKey => {
                const info = MODE_DETAILS[mKey];
                const isSelected = profile.selectedMode === mKey;
                return (
                  <button
                    key={mKey}
                    type="button"
                    className={`mode-tile-btn ${isSelected ? 'selected' : ''}`}
                    onClick={() => setProfile(p => ({ ...p, selectedMode: mKey }))}
                  >
                    <span className="mode-tile-icon" style={{ color: info.color }}>
                      {info.code}
                    </span>
                    <span className="mode-tile-name">{info.name}</span>
                    <span className="mode-tile-best">★ {profile.bestScores[mKey] || 0} pts</span>
                  </button>
                );
              })}
            </section>

            {/* PALCO DE LANÇAMENTO DO MODO SELECIONADO */}
            <section className="Selected-mode-stage">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <span className="stage-badge">{MODE_DETAILS[profile.selectedMode].badge}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-body)' }}>
                  {formatDatePtBr(todayKey)}
                </span>
              </div>

              <div>
                <h1 className="stage-big-title">{MODE_DETAILS[profile.selectedMode].name}</h1>
                <p className="stage-desc" style={{ marginTop: '8px' }}>
                  {MODE_DETAILS[profile.selectedMode].summary}
                </p>
              </div>

              {profile.selectedMode === 'classic' && (
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '10px', color: 'var(--text-body)' }}>
                    Escolha o tema da partida:
                  </div>
                  <div className="cat-pills-row">
                    {(Object.keys(CATEGORY_LABELS) as CategoryId[]).map(cat => (
                      <button
                        key={cat}
                        type="button"
                        className={`cat-pill ${profile.selectedCategory === cat ? 'active' : ''}`}
                        onClick={() => setProfile(p => ({ ...p, selectedCategory: cat }))}
                      >
                        {CATEGORY_LABELS[cat]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-arcade-play"
                  onClick={() => startNewMatch(profile.selectedMode, profile.selectedCategory)}
                >
                  ▶ JOGAR {MODE_DETAILS[profile.selectedMode].name.toUpperCase()}
                </button>

                {profile.selectedMode === 'daily' && todayDailyRecord && (
                  <button
                    type="button"
                    className="btn-arcade-secondary"
                    onClick={() => copyText(todayDailyRecord.shareText)}
                  >
                    {copiedBanner ? '✓ Copiado!' : `📋 Compartilhar Hoje (${todayDailyRecord.score} pts)`}
                  </button>
                )}
              </div>
            </section>

            {/* LISTA DE ARENAS PRONTAS ESTILO WORDBOMB ROOMS */}
            <section className="quick-rooms-list" aria-label="Arenas disponíveis">
              {(Object.keys(MODE_DETAILS) as GameModeId[]).map(mKey => {
                const info = MODE_DETAILS[mKey];
                return (
                  <div key={mKey} className="quick-room-card">
                    <div className="quick-room-left">
                      <div
                        className="quick-room-badge"
                        style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: info.color }}
                      >
                        {info.code}
                      </div>
                      <div>
                        <div className="quick-room-title">{info.name}</div>
                        <div className="quick-room-sub">{info.rules}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-arcade-secondary"
                      onClick={() => startNewMatch(mKey, profile.selectedCategory)}
                    >
                      Entrar →
                    </button>
                  </div>
                );
              })}
            </section>
          </>
        ) : activeView === 'rules' ? (
          <section className="Selected-mode-stage">
            <h1 className="stage-big-title">Como Dominar a Arena</h1>
            <p className="stage-desc">
              Em <strong>The Pulse Game</strong>, saber a resposta é só metade do jogo — a outra metade é decidir a hora exata de blindar seus pontos antes que o reator exploda!
            </p>
            <div className="quick-rooms-list">
              <div className="quick-room-card">
                <div>
                  <div className="quick-room-title" style={{ color: 'var(--arcade-cyan)' }}>
                    1. Acertos Aceleram seu Multiplicador (Até 3.0x)
                  </div>
                  <div className="quick-room-sub">
                    Cada resposta certa soma pontos provisórios no painel <strong>Em Risco</strong> e sobe seu combo: 1.0x → 1.2x → 1.5x → 2.0x → 2.5x → 3.0x.
                  </div>
                </div>
              </div>
              <div className="quick-room-card">
                <div>
                  <div className="quick-room-title" style={{ color: 'var(--arcade-emerald)' }}>
                    2. Blindar no Cofre Seguro [Tecla ESPAÇO ou TAB]
                  </div>
                  <div className="quick-room-sub">
                    Aperte <strong>BLINDAR PONTOS</strong> a qualquer momento para transferir 100% dos pontos em risco para o seu Cofre Seguro. Blindar um combo de 4+ acertos ainda dá <strong>+1,5s de bônus no relógio!</strong>
                  </div>
                </div>
              </div>
              <div className="quick-room-card">
                <div>
                  <div className="quick-room-title" style={{ color: 'var(--arcade-coral)' }}>
                    3. Cuidado com a Explosão do Pavio!
                  </div>
                  <div className="quick-room-sub">
                    Se você errar ou o pavio zerar, todos os pontos que estavam <em>Em Risco</em> desaparecem! Os pontos já guardados no Cofre Seguro nunca são perdidos.
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : activeView === 'stats' ? (
          <section className="Selected-mode-stage">
            <h1 className="stage-big-title">Seus Recordes e Estatísticas</h1>
            <div className="stats-cards-grid">
              <div className="stat-card-box">
                <span className="stat-card-num">{Math.max(0, ...Object.values(profile.bestScores))}</span>
                <span className="stat-card-label">Maior Pontuação</span>
              </div>
              <div className="stat-card-box">
                <span className="stat-card-num">{profile.highestComboEver.toFixed(1)}x</span>
                <span className="stat-card-label">Combo Máximo</span>
              </div>
              <div className="stat-card-box">
                <span className="stat-card-num">{overallAccuracy}%</span>
                <span className="stat-card-label">Precisão Geral</span>
              </div>
              <div className="stat-card-box">
                <span className="stat-card-num">{profile.matchesPlayed}</span>
                <span className="stat-card-label">Partidas Jogadas</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '10px' }}>
              <button
                type="button"
                className="btn-arcade-secondary"
                onClick={() => setProfile(p => ({ ...p, reducedMotion: !p.reducedMotion }))}
              >
                Partículas &amp; Efeitos: {profile.reducedMotion ? 'Reduzidos' : 'Máximos (60 FPS)'}
              </button>
              <button
                type="button"
                className="btn-arcade-secondary"
                style={{ color: 'var(--arcade-coral)', borderColor: 'var(--arcade-coral)' }}
                onClick={() => setProfile(clearProfileStorage())}
              >
                Zerar Recordes Locais
              </button>
            </div>
          </section>
        ) : (
          <section className="Selected-mode-stage">
            <h1 className="stage-big-title">
              Dicionário Oficial ({PORTUGUESE_WORD_SET.size} palavras)
            </h1>
            <p className="stage-desc">
              Teste qualquer palavra abaixo para conferir se ela é aceita pelo reator da <strong>Bomba de Sílabas</strong>:
            </p>
            <div className="wordbomb-input-bar" style={{ maxWidth: '100%' }}>
              <input
                type="text"
                className="wordbomb-field"
                placeholder="CONSULTAR PALAVRA..."
                value={wordCheckInput}
                onChange={e => setWordCheckInput(e.target.value)}
              />
            </div>
            {wordCheckInput.trim().length >= 2 && (
              <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                {PORTUGUESE_WORD_SET.has(
                  wordCheckInput
                    .trim()
                    .toUpperCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                ) ? (
                  <span style={{ color: 'var(--arcade-emerald)' }}>
                    ✓ Palavra válida e aprovada pelo dicionário do jogo!
                  </span>
                ) : (
                  <span style={{ color: 'var(--arcade-coral)' }}>
                    ✕ Palavra não encontrada ou bloqueada pelo filtro de segurança.
                  </span>
                )}
              </div>
            )}

            <div style={{ marginTop: '12px' }}>
              <div className="cat-pills-row" style={{ marginBottom: '16px' }}>
                {(Object.keys(CATEGORY_LABELS) as CategoryId[]).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    className={`cat-pill ${libraryCatFilter === cat ? 'active' : ''}`}
                    onClick={() => setLibraryCatFilter(cat)}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
              <div className="quick-rooms-list">
                {QUESTION_BANK.filter(
                  q => libraryCatFilter === 'mixed' || q.category === libraryCatFilter
                ).map(q => (
                  <div key={q.id} className="quick-room-card">
                    <div>
                      <div className="quick-room-title">{q.prompt}</div>
                      <div className="quick-room-sub" style={{ color: 'var(--arcade-emerald)', fontWeight: 700 }}>
                        ✓ Resposta: {q.options[q.correctIndex]} — {q.explanation}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="game-footer">
        <strong>THE PULSE GAME</strong> • Atalhos rápidos: <strong>[1–4]</strong> Responder •{' '}
        <strong>[ESPAÇO / TAB]</strong> Blindar Cofre • <strong>[ESC]</strong> Pausar
      </footer>
    </div>
  );
}