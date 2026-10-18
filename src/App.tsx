import { useEffect, useRef, useState } from 'react';
import {
  AnswerHistoryItem,
  AvatarId,
  CategoryId,
  GameModeId,
  LanguageCode,
  NavTabId,
  QuestionItem,
  SyllableChallenge,
} from './types/game';
import { QUESTION_BANK } from './data/questions';
import { PORTUGUESE_WORD_SET, WORDBOMB_SYLLABLES } from './data/syllables';
import { AVATAR_CATALOG, I18N_STRINGS } from './data/avatars';
import {
  createPRNG,
  generateProceduralMathQuestion,
  getBrasiliaDateKey,
  hashSeed,
  shuffleQuestionOptions,
  validateWordSubmission,
} from './engine/prng';
import { SoundEngine } from './engine/sound';
import { clearProfileStorage, getSeasonRankInfo, loadProfile, saveProfile } from './engine/storage';
import { ArenaCanvasFX, ArenaCanvasFXHandle } from './components/ArenaCanvasFX';

const COMBO_STEPS = [1.0, 1.0, 1.2, 1.5, 2.0, 2.5, 3.0];
const BASE_POINTS = { 1: 100, 2: 150, 3: 220 } as const;

interface RoomEntry {
  id: string;
  hostName: string;
  avatarId: AvatarId;
  mode: GameModeId;
  category: CategoryId;
  modeLabel: string;
  playersRatio: string;
  wppBadge?: string;
}

const FEATURED_ROOMS: RoomEntry[] = [
  {
    id: 'r1',
    hostName: 'Bomba de Sílabas — Oficial',
    avatarId: 'shiba',
    mode: 'wordbomb',
    category: 'words',
    modeLabel: 'Original',
    playersRatio: '18/32',
    wppBadge: '< 500 WPP',
  },
  {
    id: 'r2',
    hostName: 'Desafio Diário Global',
    avatarId: 'cybercat',
    mode: 'daily',
    category: 'mixed',
    modeLabel: 'Chain Word',
    playersRatio: '24/32',
  },
  {
    id: 'r3',
    hostName: 'Torre do Elevador (3 Vidas)',
    avatarId: 'kitsune',
    mode: 'elevator',
    category: 'mixed',
    modeLabel: 'Dungeon',
    playersRatio: '12/32',
  },
  {
    id: 'r4',
    hostName: 'Arena Trivia — Pulso Misto',
    avatarId: 'owl',
    mode: 'classic',
    category: 'mixed',
    modeLabel: 'Trivia',
    playersRatio: '9/32',
  },
  {
    id: 'r5',
    hostName: 'Cálculo Rápido & Lógica',
    avatarId: 'astro',
    mode: 'classic',
    category: 'math',
    modeLabel: 'Original',
    playersRatio: '14/32',
    wppBadge: ' Rápido',
  },
  {
    id: 'r6',
    hostName: 'Mestres do Vocabulário',
    avatarId: 'dragon',
    mode: 'classic',
    category: 'words',
    modeLabel: 'Chain Word',
    playersRatio: '7/32',
  },
  {
    id: 'r7',
    hostName: 'Conhecimentos Gerais Turbo',
    avatarId: 'witch',
    mode: 'classic',
    category: 'general',
    modeLabel: 'Trivia',
    playersRatio: '11/32',
  },
];

export default function App() {
  const [profile, setProfile] = useState(() => loadProfile());
  const [activeTab, setActiveTab] = useState<NavTabId>('rooms');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Estado da partida ativa
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

  const [postMatchModal, setPostMatchModal] = useState<{
    finalScore: number;
    safeScore: number;
    salvagedScore: number;
    coinsEarned: number;
    peakCombo: number;
    shareText: string;
  } | null>(null);

  const [wordSearchQuery, setWordSearchQuery] = useState('');

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
    streak: 0,
    combo: 1.0,
    peakCombo: 1.0,
    correctCount: 0,
    totalCount: 0,
    currentQuestion: null as QuestionItem | null,
    currentSyllable: WORDBOMB_SYLLABLES[0],
  });

  useEffect(() => {
    SoundEngine.volume = profile.sfxVolume / 100;
    document.body.classList.toggle('reduced-motion', profile.reducedMotion);
    saveProfile(profile);
  }, [profile]);

  const t = I18N_STRINGS[profile.language] || I18N_STRINGS.pt;
  const currentAvatar = AVATAR_CATALOG.find(a => a.id === profile.avatarId) || AVATAR_CATALOG[0];
  const rankInfo = getSeasonRankInfo(profile.careerXP);

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

    const initialLives = mode === 'wordbomb' || mode === 'elevator' ? 3 : 0;

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
      streak: 0,
      combo: 1.0,
      peakCombo: 1.0,
      correctCount: 0,
      totalCount: 0,
      currentQuestion: null,
      currentSyllable: WORDBOMB_SYLLABLES[0],
    };

    setProfile(prev => ({ ...prev, selectedMode: mode, selectedCategory: category }));
    setPostMatchModal(null);
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
    const finalScore = st.safeScore + salvagedScore;
    const coinsEarned = Math.max(10, Math.round(finalScore / 20));
    const timelineStr = timelineMarksRef.current.length > 0 ? timelineMarksRef.current.join('') : '—';

    const shareText = [
      `⚡ The Pulse Game — ${st.mode.toUpperCase()} (${st.dateKey})`,
      `🏆 ${finalScore} pts (🛡️ Cofre: ${st.safeScore} | ⚡ Bônus: +${salvagedScore})`,
      `🔥 Combo Máx: ${st.peakCombo.toFixed(1)}x • 🎯 ${st.correctCount}/${st.totalCount}`,
      `📊 ${timelineStr}`,
    ].join('\n');

    setProfile(prev => ({
      ...prev,
      coins: prev.coins + coinsEarned,
      careerXP: prev.careerXP + finalScore,
      matchesPlayed: prev.matchesPlayed + 1,
      totalQuestionsAnswered: prev.totalQuestionsAnswered + st.totalCount,
      totalQuestionsCorrect: prev.totalQuestionsCorrect + st.correctCount,
      highestComboEver: Math.max(prev.highestComboEver, st.peakCombo),
      bestScores: {
        ...prev.bestScores,
        [st.mode]: Math.max(prev.bestScores[st.mode] || 0, finalScore),
      },
    }));

    setPostMatchModal({
      finalScore,
      safeScore: st.safeScore,
      salvagedScore,
      coinsEarned,
      peakCombo: st.peakCombo,
      shareText,
    });
  };

  const handleProtectPulse = () => {
    const st = matchRef.current;
    if (!st.active || st.paused || st.riskScore <= 0) return;

    const amount = st.riskScore;
    const hadHighStreak = st.streak >= 4 && st.mode !== 'elevator';

    st.safeScore += amount;
    st.riskScore = 0;
    st.streak = 0;
    st.combo = 1.0;
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
    fxRef.current?.spawnBurst('#22C55E', 24);

    setFeedback({
      visible: true,
      tone: 'positive',
      title: `🛡️ +${amount} PTS BLINDADOS NO COFRE!${hadHighStreak ? ' (+1,5s EXTRA)' : ''}`,
      detail: 'Seus pontos estão 100% seguros.',
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
      fxRef.current?.spawnShockwave('#38BDF8');

      setFeedback({
        visible: true,
        tone: 'positive',
        title: `✓ +${earned} PTS EM RISCO (${st.combo.toFixed(1)}X)`,
        detail: q.explanation,
      });

      transitionTimerRef.current = window.setTimeout(() => {
        loadStepChallenge(currentSessionId);
      }, 900);
    } else {
      const lost = st.riskScore;
      st.riskScore = 0;
      st.streak = 0;
      st.combo = 1.0;
      timelineMarksRef.current.push('🔴');

      if (st.mode === 'elevator' || st.mode === 'wordbomb') {
        st.lives = Math.max(0, st.lives - 1);
        setLives(st.lives);
      }

      setRiskScore(0);
      setStreak(0);
      setCombo(1.0);
      SoundEngine.error();
      fxRef.current?.spawnBurst('#F43F5E', 24);

      setFeedback({
        visible: true,
        tone: 'error',
        title: `✕ SOBRECARGA! ${lost > 0 ? `-${lost} PTS PERDIDOS` : ''}`,
        detail: `Correta: ${q.options[q.correctIndex]} — ${q.explanation}`,
      });

      if ((st.mode === 'elevator' || st.mode === 'wordbomb') && st.lives <= 0) {
        transitionTimerRef.current = window.setTimeout(() => {
          if (sessionIdRef.current === currentSessionId) concludeMatch();
        }, 1200);
      } else {
        transitionTimerRef.current = window.setTimeout(() => {
          loadStepChallenge(currentSessionId);
        }, 1400);
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
        title: '✕ PALAVRA RECUSADA',
        detail: validation.reason || 'Digite uma palavra válida.',
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

    setStreak(st.streak);
    setCombo(st.combo);
    setRiskScore(st.riskScore);
    SoundEngine.hit(st.streak);
    fxRef.current?.spawnShockwave('#38BDF8');

    loadStepChallenge(currentSessionId);
    setFeedback({
      visible: true,
      tone: 'positive',
      title: `✓ "${validation.normalized}" ACEITA! +${earned} PTS (${st.combo.toFixed(1)}X)`,
      detail: 'Aperte TAB para blindar seus pontos no Cofre Seguro!',
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
        if (st.mode !== 'elevator') {
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

            setFeedback({
              visible: true,
              tone: 'error',
              title: '💥 A BOMBA EXPLODIU! -1 VIDA',
              detail: `Exemplos possíveis: ${st.currentSyllable.samples.slice(0, 4).join(', ')}.`,
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
        }
        return;
      }

      if (matchRef.current.mode !== 'wordbomb') {
        if (e.key === '1' || e.key.toUpperCase() === 'A') handleAnswerOption(0);
        else if (e.key === '2' || e.key.toUpperCase() === 'B') handleAnswerOption(1);
        else if (e.key === '3' || e.key.toUpperCase() === 'C') handleAnswerOption(2);
        else if (e.key === '4' || e.key.toUpperCase() === 'D') handleAnswerOption(3);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const cycleLanguage = () => {
    const order: LanguageCode[] = ['pt', 'en', 'es'];
    const nextIdx = (order.indexOf(profile.language) + 1) % order.length;
    setProfile(p => ({ ...p, language: order[nextIdx] }));
  };

  const fuseRatio = Math.max(0, Math.min(1, fuseClock / fuseTotal));
  const dialDashOffset = 502 * (1 - fuseRatio);

  return (
    <div className="wb-app-shell">
      {/* =========================================================
          1. BARRA SUPERIOR IDÊNTICA AO WORDBOMB.IO (ZERO BOTÃO DE MUTE)
         ========================================================= */}
      <header className="wb-navbar">
        <div className="wb-nav-left">
          <button
            type="button"
            className="wb-hamburger-btn"
            onClick={() => setSettingsOpen(true)}
            title={t.settingsTitle}
            aria-label={t.settingsTitle}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </button>

          <button
            type="button"
            className="wb-brand-logo"
            onClick={() => {
              if (inMatch) abortMatchToHome();
              setActiveTab('rooms');
            }}
            title="The Pulse Game"
          >
            <svg width="42" height="42" viewBox="0 0 64 64">
              <rect width="64" height="64" rx="15" fill="#151922" stroke="#5865F2" strokeWidth="3" />
              <circle cx="32" cy="34" r="17" fill="#0B0D12" stroke="#38BDF8" strokeWidth="2" />
              <path
                d="M14 34H23L27 21L33 47L38 28L42 34H50"
                fill="none"
                stroke="#38BDF8"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="45" cy="15" r="4.5" fill="#F43F5E" />
            </svg>
          </button>

          <nav className="wb-tabs-row" aria-label="Navegação Principal">
            {(
              [
                ['rooms', t.rooms],
                ['ranked', t.ranked],
                ['shop', t.shop],
                ['inventory', t.inventory],
                ['words', t.words],
                ['syllables', t.syllables],
              ] as [NavTabId, string][]
            ).map(([tabKey, label]) => (
              <button
                key={tabKey}
                type="button"
                className={`wb-tab-btn ${activeTab === tabKey && !inMatch ? 'active' : ''}`}
                onClick={() => {
                  if (inMatch) abortMatchToHome();
                  setActiveTab(tabKey);
                }}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="wb-nav-right">
          {/* Contador de Moedas Douradas */}
          <div className="wb-currency-pill" title="Moedas">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" fill="#FBBF24" stroke="#D97706" strokeWidth="2" />
              <circle cx="12" cy="12" r="6" fill="none" stroke="#FEF3C7" strokeWidth="1.5" />
            </svg>
            <span>{profile.coins}</span>
          </div>

          {/* Contador de Chaves + Botão + */}
          <div className="wb-currency-pill" title="Chaves de Cofre">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2.4">
              <circle cx="7.5" cy="15.5" r="4.5" />
              <path d="M10.7 12.3L20 3" />
              <path d="M16 7l3 3" />
            </svg>
            <span>{profile.keys}</span>
            <button
              type="button"
              className="wb-plus-mini"
              onClick={() => {
                if (inMatch) abortMatchToHome();
                setActiveTab('shop');
              }}
              title="Obter mais chaves"
            >
              +
            </button>
          </div>

          {/* Botão Perfil Iluminado */}
          <button
            type="button"
            className="wb-illuminated-btn"
            onClick={() => setProfileModalOpen(true)}
          >
            {profile.username}
          </button>

          {/* Sino de Notificações */}
          <button
            type="button"
            className="wb-bell-btn"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            title="Novidades e Atualizações"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 22c1.1 0 2-.9 2-2h-4a2 2 0 0 0 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
            </svg>
            <span className="wb-bell-dot" />
          </button>

          {/* Foto de Perfil Redonda Bonitinha */}
          <button
            type="button"
            className="wb-avatar-trigger"
            onClick={() => setProfileModalOpen(true)}
            title="Trocar Foto de Perfil"
          >
            {currentAvatar.renderSvg()}
          </button>

          {/* Seletor de Idioma com Bandeira */}
          <button
            type="button"
            className="wb-lang-trigger"
            onClick={cycleLanguage}
            title="Mudar Idioma / Change Language"
          >
            <span>{t.flag}</span>
            <span>{t.label}</span>
          </button>
        </div>
      </header>

      {/* =========================================================
          2. CONTEÚDO CENTRAL
         ========================================================= */}
      <main className="wb-center-column">
        {inMatch ? (
          <div className="arena-stage-wrap">
            <ArenaCanvasFX ref={fxRef} reducedMotion={profile.reducedMotion} />

            <div className="arena-hud-bar">
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 900 }}>
                  {matchRef.current.mode === 'wordbomb'
                    ? 'Bomba de Sílabas'
                    : matchRef.current.mode === 'daily'
                    ? 'Desafio Diário Oficial'
                    : matchRef.current.mode === 'elevator'
                    ? `O Elevador • Andar #${floor}`
                    : 'Arena Clássica 60s'}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                {(matchRef.current.mode === 'wordbomb' || matchRef.current.mode === 'elevator') && (
                  <div style={{ fontSize: '1.35rem', color: 'var(--wb-coral)', fontWeight: 900 }}>
                    {[0, 1, 2].map(i => (
                      <span key={i} style={{ opacity: i < lives ? 1 : 0.25, marginRight: '4px' }}>
                        ♥
                      </span>
                    ))}
                  </div>
                )}

                {matchRef.current.mode !== 'elevator' && (
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '2rem',
                      fontWeight: 800,
                      color: matchClock <= 10 ? 'var(--wb-coral)' : 'var(--wb-text-bright)',
                    }}
                  >
                    {matchClock.toFixed(1)}s
                  </div>
                )}

                <button type="button" className="wb-lang-trigger" onClick={abortMatchToHome}>
                  ✕ Sair
                </button>
              </div>
            </div>

            <div className="arena-vaults-row">
              <div className="vault-card safe">
                <div className="vault-title">
                  <span>🛡️ Cofre Seguro</span>
                  <span>100% Garantido</span>
                </div>
                <div className="vault-value" style={{ color: 'var(--wb-emerald)' }}>
                  {safeScore}
                </div>
              </div>

              <button
                type="button"
                className="wb-illuminated-btn"
                style={{ height: '100%', minHeight: '64px', fontSize: '1.08rem', gridColumn: 'span 1' }}
                disabled={riskScore <= 0}
                onClick={handleProtectPulse}
              >
                🛡️ Blindar +{riskScore} pts [TAB]
              </button>

              <div className="vault-card risk">
                <div className="vault-title">
                  <span>⚡ Em Risco</span>
                  <span>Combo {combo.toFixed(1)}x</span>
                </div>
                <div className="vault-value" style={{ color: 'var(--wb-gold)' }}>
                  {riskScore}
                </div>
              </div>
            </div>

            <section className="arena-core-box">
              <div className="bomb-dial">
                <svg className="bomb-svg" viewBox="0 0 180 180">
                  <circle cx="90" cy="90" r="80" fill="#0B0D12" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                  <circle
                    cx="90"
                    cy="90"
                    r="80"
                    fill="none"
                    stroke={fuseRatio < 0.3 ? '#F43F5E' : '#38BDF8'}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray="502"
                    style={{ strokeDashoffset: dialDashOffset }}
                  />
                </svg>
                <div className="bomb-core-circle">
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--wb-text-muted)' }}>
                    {matchRef.current.mode === 'wordbomb' ? 'SÍLABA' : `COMBO ${streak}X`}
                  </span>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '2.4rem',
                      fontWeight: 800,
                      color: 'var(--wb-cyan)',
                    }}
                  >
                    {matchRef.current.mode === 'wordbomb' ? currentSyllable.syl : `${combo.toFixed(1)}x`}
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', color: 'var(--wb-gold)' }}>
                    {fuseClock.toFixed(1)}s
                  </span>
                </div>
              </div>

              {matchRef.current.mode === 'wordbomb' ? (
                <>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.65rem', textAlign: 'center' }}>
                    Digite uma palavra que contenha <span style={{ color: 'var(--wb-cyan)' }}>{currentSyllable.syl}</span>
                  </h2>
                  <p style={{ color: 'var(--wb-text-muted)', fontSize: '1rem' }}>{currentSyllable.hint}</p>

                  <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '520px' }}>
                    <input
                      type="text"
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
                      placeholder="DIGITE A PALAVRA..."
                      style={{
                        flex: 1,
                        height: '54px',
                        backgroundColor: 'var(--wb-bg)',
                        border: '2px solid var(--wb-indigo-light)',
                        borderRadius: '12px',
                        padding: '0 18px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '1.35rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                      }}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="wb-illuminated-btn"
                      style={{ height: '54px', padding: '0 24px', fontSize: '1.05rem' }}
                      onClick={handleWordBombSubmit}
                    >
                      Enviar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.65rem', textAlign: 'center' }}>
                    {currentQuestion?.prompt}
                  </h2>

                  <div className="options-2col">
                    {currentQuestion?.options.map((optText, idx) => {
                      const isAnswered = selectedOption !== null;
                      const isCorrect = isAnswered && idx === currentQuestion.correctIndex;
                      const isWrong = isAnswered && selectedOption === idx && idx !== currentQuestion.correctIndex;

                      return (
                        <button
                          key={idx}
                          type="button"
                          className={`opt-push-btn ${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`}
                          disabled={isAnswered}
                          onClick={() => handleAnswerOption(idx)}
                        >
                          <span
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              backgroundColor: 'var(--wb-bg)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontFamily: 'var(--font-mono)',
                              color: 'var(--wb-cyan)',
                            }}
                          >
                            {idx + 1}
                          </span>
                          <span>{optText}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {feedback?.visible && (
                <div
                  style={{
                    width: '100%',
                    padding: '14px 18px',
                    borderRadius: '12px',
                    backgroundColor:
                      feedback.tone === 'positive' ? 'rgba(34, 197, 94, 0.16)' : 'rgba(244, 63, 94, 0.16)',
                    border: `1px solid ${feedback.tone === 'positive' ? '#22C55E' : '#F43F5E'}`,
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{feedback.title}</div>
                  <div style={{ color: 'var(--wb-text-body)', fontSize: '0.96rem', marginTop: '2px' }}>
                    {feedback.detail}
                  </div>
                </div>
              )}
            </section>
          </div>
        ) : activeTab === 'rooms' ? (
          <>
            {/* 4 MINI-WIDGETS NO TOPO FIÉIS À CAPTURA DO WORDBOMB.IO */}
            <div className="wb-top-widgets">
              <button
                type="button"
                className={`wb-widget-card ${profile.selectedMode === 'daily' ? 'active' : ''}`}
                onClick={() => startNewMatch('daily')}
              >
                <div className="wb-widget-art" style={{ background: 'linear-gradient(180deg, #143321 0%, #151922 100%)' }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <span style={{ background: '#22C55E', color: '#052E16', padding: '3px 7px', borderRadius: '5px', fontFamily: 'var(--font-mono)', fontWeight: 900 }}>R</span>
                    <span style={{ background: '#EAB308', color: '#422006', padding: '3px 7px', borderRadius: '5px', fontFamily: 'var(--font-mono)', fontWeight: 900 }}>A</span>
                  </div>
                </div>
                <div className="wb-widget-footer">DAILY</div>
              </button>

              <button
                type="button"
                className={`wb-widget-card ${profile.selectedMode === 'elevator' ? 'active' : ''}`}
                onClick={() => startNewMatch('elevator')}
              >
                <div className="wb-widget-art" style={{ background: 'linear-gradient(180deg, #3B1826 0%, #151922 100%)' }}>
                  <span style={{ background: '#F43F5E', color: '#FFF', padding: '3px 10px', borderRadius: '5px', fontFamily: 'var(--font-mono)', fontWeight: 900 }}>▲▲</span>
                </div>
                <div className="wb-widget-footer">ELEVATOR</div>
              </button>

              <button
                type="button"
                className={`wb-widget-card ${profile.selectedMode === 'wordbomb' ? 'active' : ''}`}
                onClick={() => startNewMatch('wordbomb')}
              >
                <div className="wb-widget-art" style={{ background: 'linear-gradient(180deg, #1D1B4B 0%, #151922 100%)' }}>
                  <span style={{ background: '#6366F1', color: '#FFF', padding: '3px 9px', borderRadius: '999px', fontFamily: 'var(--font-mono)', fontWeight: 900 }}>SYL</span>
                </div>
                <div className="wb-widget-footer">SCAPES</div>
              </button>

              <button
                type="button"
                className="wb-widget-card"
                onClick={() => setSettingsOpen(true)}
              >
                <div className="wb-widget-art" style={{ background: 'linear-gradient(180deg, #3740A6 0%, #242B70 100%)' }}>
                  <span style={{ fontSize: '1.35rem' }}>⚙️</span>
                </div>
                <div className="wb-widget-footer">OPÇÕES</div>
              </button>
            </div>

            {/* DUPLA DE BOTÕES PRINCIPAIS: CREATE ROOM + SEASON 12 RANKED */}
            <div className="wb-hero-buttons">
              <button
                type="button"
                className="wb-illuminated-btn wb-create-room-btn"
                onClick={() => startNewMatch(profile.selectedMode, profile.selectedCategory)}
              >
                {t.createRoom}
              </button>

              <button
                type="button"
                className="wb-season-ranked-btn"
                onClick={() => setActiveTab('ranked')}
              >
                <div className="wb-season-tv-icon">^_^</div>
                <div className="wb-season-labels">
                  <span className="wb-season-top">{rankInfo.season}</span>
                  <span className="wb-season-main">RANKED</span>
                </div>
              </button>
            </div>

            {/* LISTA DE SALAS FIEL AO WORDBOMB.IO */}
            <div className="wb-room-stack">
              {FEATURED_ROOMS.map(room => {
                const av = AVATAR_CATALOG.find(a => a.id === room.avatarId) || AVATAR_CATALOG[0];
                return (
                  <div key={room.id} className="wb-room-item">
                    <div className="wb-room-left">
                      <div className="wb-room-thumb">{av.renderSvg()}</div>
                      <div className="wb-room-details">
                        <div className="wb-room-name">{room.hostName}</div>
                        <div className="wb-room-meta">
                          <span className="wb-mode-tag">
                            <span style={{ color: 'var(--wb-cyan)' }}>◈</span> {room.modeLabel}
                          </span>
                          <span>• 👥 {room.playersRatio}</span>
                          {room.wppBadge && <span>• {room.wppBadge}</span>}
                          <span className="wb-status-started">• {t.started}</span>
                          <span>• 🌐 {t.multiLang}</span>
                        </div>
                      </div>
                    </div>

                    <div className="wb-room-right">
                      <span className="wb-eye-icon" title="Inspecionar Regras">
                        👁
                      </span>
                      <button
                        type="button"
                        className="wb-illuminated-btn wb-join-button"
                        onClick={() => startNewMatch(room.mode, room.category)}
                      >
                        {t.joinBtn}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : activeTab === 'ranked' ? (
          <div className="wb-room-stack">
            <div className="wb-room-item" style={{ padding: '26px', flexDirection: 'column', alignItems: 'flex-start', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '16px', overflow: 'hidden' }}>
                  {currentAvatar.renderSvg()}
                </div>
                <div>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--wb-emerald)', fontWeight: 800 }}>
                    {rankInfo.season} • {rankInfo.division}
                  </span>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem' }}>
                    {profile.username} — {profile.careerXP} XP
                  </h2>
                  <p style={{ color: 'var(--wb-text-muted)' }}>
                    Próxima promoção em {rankInfo.nextXp} XP • Recorde Bomba de Sílabas: {profile.bestScores.wordbomb} pts
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="wb-illuminated-btn"
                style={{ height: '48px', padding: '0 28px', fontSize: '1.05rem' }}
                onClick={() => startNewMatch('wordbomb')}
              >
                Iniciar Partida Ranqueada
              </button>
            </div>
          </div>
        ) : activeTab === 'shop' || activeTab === 'inventory' ? (
          <div className="wb-room-stack">
            <div className="wb-room-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '16px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem' }}>
                  Coleção de Avatares &amp; Fotos de Perfil
                </h2>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--wb-gold)', fontWeight: 800 }}>
                  Saldo: {profile.coins} Moedas
                </span>
              </div>
              <div className="avatar-picker-grid">
                {AVATAR_CATALOG.map(av => {
                  const unlocked = profile.unlockedAvatars.includes(av.id) || av.priceCoins === 0;
                  const equipped = profile.avatarId === av.id;
                  return (
                    <button
                      key={av.id}
                      type="button"
                      className={`avatar-choice-card ${equipped ? 'selected' : ''}`}
                      onClick={() => {
                        if (unlocked) {
                          setProfile(p => ({ ...p, avatarId: av.id }));
                        } else if (profile.coins >= av.priceCoins) {
                          setProfile(p => ({
                            ...p,
                            coins: p.coins - av.priceCoins,
                            unlockedAvatars: [...p.unlockedAvatars, av.id],
                            avatarId: av.id,
                          }));
                        }
                      }}
                    >
                      <div style={{ width: '64px', height: '64px', borderRadius: '14px', overflow: 'hidden' }}>
                        {av.renderSvg()}
                      </div>
                      <strong style={{ fontSize: '0.96rem' }}>{av.name}</strong>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.86rem', color: equipped ? 'var(--wb-emerald)' : 'var(--wb-gold)' }}>
                        {equipped ? '✓ Equipado' : unlocked ? 'Desbloqueado' : `🪙 ${av.priceCoins}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : activeTab === 'words' ? (
          <div className="wb-room-stack">
            <div className="wb-room-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '14px', padding: '24px' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem' }}>
                Verificador Oficial de Palavras ({PORTUGUESE_WORD_SET.size} vocábulos)
              </h2>
              <input
                type="text"
                value={wordSearchQuery}
                onChange={e => setWordSearchQuery(e.target.value)}
                placeholder="Digite uma palavra para verificar no dicionário..."
                style={{
                  height: '52px',
                  backgroundColor: 'var(--wb-bg)',
                  border: '2px solid var(--wb-border-strong)',
                  borderRadius: '12px',
                  padding: '0 16px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1.15rem',
                  textTransform: 'uppercase',
                }}
              />
              {wordSearchQuery.trim().length >= 2 && (
                <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>
                  {PORTUGUESE_WORD_SET.has(
                    wordSearchQuery
                      .trim()
                      .toUpperCase()
                      .normalize('NFD')
                      .replace(/[\u0300-\u036f]/g, '')
                  ) ? (
                    <span style={{ color: 'var(--wb-emerald)' }}>✓ Palavra aceita e validada no dicionário!</span>
                  ) : (
                    <span style={{ color: 'var(--wb-coral)' }}>✕ Palavra não encontrada ou bloqueada.</span>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="wb-room-stack">
            {WORDBOMB_SYLLABLES.map(item => (
              <div key={item.syl} className="wb-room-item">
                <div className="wb-room-left">
                  <div
                    className="wb-room-thumb"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'var(--wb-bg)',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 900,
                      color: 'var(--wb-cyan)',
                    }}
                  >
                    {item.syl}
                  </div>
                  <div className="wb-room-details">
                    <div className="wb-room-name">Sílaba "{item.syl}"</div>
                    <div className="wb-room-meta">{item.hint}</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="wb-illuminated-btn wb-join-button"
                  onClick={() => startNewMatch('wordbomb')}
                >
                  Treinar
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* =========================================================
          3. MODAL DE CONFIGURAÇÕES COMPLETO (HAMBURGER MENU)
         ========================================================= */}
      {settingsOpen && (
        <div className="wb-modal-backdrop" onClick={() => setSettingsOpen(false)}>
          <div className="wb-modal-panel" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.45rem' }}>{t.settingsTitle}</h2>
              <button type="button" className="wb-lang-trigger" onClick={() => setSettingsOpen(false)}>
                ✕ Fechar
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="wb-room-item">
                <div>
                  <div className="wb-room-name">Idioma da Interface</div>
                  <div className="wb-room-meta">Português (BR), English (US), Español</div>
                </div>
                <button type="button" className="wb-illuminated-btn" onClick={cycleLanguage}>
                  {t.flag} {t.label}
                </button>
              </div>

              <div className="wb-room-item">
                <div>
                  <div className="wb-room-name">Intensidade dos Efeitos Sonoros</div>
                  <div className="wb-room-meta">Volume atual do sintetizador: {profile.sfxVolume}%</div>
                </div>
                <input
                  type="range"
                  min={15}
                  max={100}
                  value={profile.sfxVolume}
                  onChange={e => setProfile(p => ({ ...p, sfxVolume: Number(e.target.value) }))}
                />
              </div>

              <div className="wb-room-item">
                <div>
                  <div className="wb-room-name">Partículas e Ondas de Choque (60 FPS)</div>
                  <div className="wb-room-meta">Ativar explosões luminosas no Canvas da Arena</div>
                </div>
                <button
                  type="button"
                  className="wb-lang-trigger"
                  onClick={() => setProfile(p => ({ ...p, reducedMotion: !p.reducedMotion }))}
                >
                  {profile.reducedMotion ? 'Reduzido' : 'Ultra 60 FPS'}
                </button>
              </div>

              <div className="wb-room-item">
                <div>
                  <div className="wb-room-name">Redefinir Dados Locais</div>
                  <div className="wb-room-meta">Restaurar estatísticas e recordes para o padrão</div>
                </div>
                <button
                  type="button"
                  className="wb-lang-trigger"
                  style={{ color: 'var(--wb-coral)', borderColor: 'var(--wb-coral)' }}
                  onClick={() => {
                    setProfile(clearProfileStorage());
                    setSettingsOpen(false);
                  }}
                >
                  Resetar Conta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          4. MODAL DE PERFIL & ESCOLHA DE FOTOS DE PERFIL BONITINHAS
         ========================================================= */}
      {profileModalOpen && (
        <div className="wb-modal-backdrop" onClick={() => setProfileModalOpen(false)}>
          <div className="wb-modal-panel" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.45rem' }}>
                Seu Perfil &amp; Avatares
              </h2>
              <button type="button" className="wb-lang-trigger" onClick={() => setProfileModalOpen(false)}>
                ✓ Salvar
              </button>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '6px' }}>
                Nome de Exibição:
              </label>
              <input
                type="text"
                value={profile.username}
                maxLength={18}
                onChange={e => setProfile(p => ({ ...p, username: e.target.value }))}
                style={{
                  width: '100%',
                  height: '46px',
                  backgroundColor: 'var(--wb-bg)',
                  border: '1px solid var(--wb-border-strong)',
                  borderRadius: '10px',
                  padding: '0 14px',
                  fontWeight: 700,
                }}
              />
            </div>

            <div>
              <div style={{ fontWeight: 700, marginBottom: '10px' }}>
                Escolha sua Foto de Perfil:
              </div>
              <div className="avatar-picker-grid">
                {AVATAR_CATALOG.map(av => (
                  <button
                    key={av.id}
                    type="button"
                    className={`avatar-choice-card ${profile.avatarId === av.id ? 'selected' : ''}`}
                    onClick={() => setProfile(p => ({ ...p, avatarId: av.id }))}
                  >
                    <div style={{ width: '56px', height: '56px', borderRadius: '14px', overflow: 'hidden' }}>
                      {av.renderSvg()}
                    </div>
                    <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>{av.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          5. MODAL PÓS-PARTIDA
         ========================================================= */}
      {postMatchModal && (
        <div className="wb-modal-backdrop" onClick={() => setPostMatchModal(null)}>
          <div className="wb-modal-panel" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--wb-cyan)', fontWeight: 800 }}>
                  FIM DE PARTIDA • +{postMatchModal.coinsEarned} MOEDAS
                </span>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem' }}>
                  {postMatchModal.finalScore} Pontos
                </h2>
              </div>
              <button
                type="button"
                className="wb-illuminated-btn"
                onClick={() => {
                  const m = profile.selectedMode;
                  setPostMatchModal(null);
                  startNewMatch(m, profile.selectedCategory);
                }}
              >
                Jogar Novamente
              </button>
            </div>
            <pre
              style={{
                backgroundColor: 'var(--wb-bg)',
                padding: '14px',
                borderRadius: '10px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.92rem',
                whiteSpace: 'pre-wrap',
              }}
            >
              {postMatchModal.shareText}
            </pre>
          </div>
        </div>
      )}

      {/* =========================================================
          6. RODAPÉ PROFISSIONAL CORPORATIVO (SEM ATALHOS DE TECLADO)
         ========================================================= */}
      <footer className="wb-pro-footer">
        <div className="wb-pro-footer-inner">
          <div>{t.footerRights}</div>
          <div className="wb-footer-links">
            <button type="button" className="wb-footer-link" onClick={() => setSettingsOpen(true)}>
              {t.terms}
            </button>
            <button type="button" className="wb-footer-link" onClick={() => setSettingsOpen(true)}>
              {t.privacy}
            </button>
            <span style={{ color: 'var(--wb-emerald)', fontWeight: 700 }}>● {t.status}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}