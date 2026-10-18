import { useEffect, useRef, useState } from 'react';
import {
  AnswerHistoryItem,
  CategoryId,
  GameModeId,
  LanguageCode,
  NavTabId,
  QuestionItem,
  SyllableChallenge,
} from './types/game';
import { QUESTION_BANK } from './data/questions';
import { PORTUGUESE_WORD_SET, WORDBOMB_SYLLABLES } from './data/syllables';
import {
  buildDiceBearUrl,
  CURATED_COMMUNITY_AVATARS,
  DICEBEAR_STYLE_LIST,
  I18N_STRINGS,
  LANGUAGE_OPTIONS,
  PulseBrandLogo,
} from './data/avatars';
import {
  createPRNG,
  generateProceduralMathQuestion,
  getBrasiliaDateKey,
  hashSeed,
  shuffleQuestionOptions,
  validateWordSubmission,
} from './engine/prng';
import { SoundEngine } from './engine/sound';
import { clearProfileStorage, getPlayerLeague, loadProfile, saveProfile } from './engine/storage';
import { ArenaCanvasFX, ArenaCanvasFXHandle } from './components/ArenaCanvasFX';

const COMBO_STEPS = [1.0, 1.0, 1.2, 1.5, 2.0, 2.5, 3.0];
const BASE_POINTS = { 1: 100, 2: 150, 3: 220 } as const;

const ARENA_MODES: {
  id: GameModeId;
  code: string;
  title: string;
  subtitle: string;
  tag: string;
  accent: string;
  bgTint: string;
}[] = [
  {
    id: 'wordbomb',
    code: 'SYL',
    title: 'Bomba Léxica de Sílabas',
    subtitle: 'O núcleo sorteia uma sílaba em tempo real. Digite vocábulos válidos antes que o pavio zere.',
    tag: '3 Vidas • Dicionário Oficial',
    accent: '#22D3EE',
    bgTint: 'rgba(34, 211, 238, 0.14)',
  },
  {
    id: 'daily',
    code: '24H',
    title: 'Pulso Diário Oficial',
    subtitle: 'Sequência determinística única gerada pela data de Brasília. Mesma prova para todos hoje.',
    tag: '60 Segundos • Semente Global',
    accent: '#10B981',
    bgTint: 'rgba(16, 185, 129, 0.14)',
  },
  {
    id: 'elevator',
    code: 'ELV',
    title: 'Torre de Sobrevivência',
    subtitle: 'Suba andares infinitos com 3 vidas. A cada andar superado o reator reduz o tempo de resposta.',
    tag: 'Sem Relógio Geral • Ritmo Crescente',
    accent: '#F43F5E',
    bgTint: 'rgba(244, 63, 94, 0.14)',
  },
  {
    id: 'classic',
    code: '60S',
    title: 'Velocidade Clássica 60s',
    subtitle: 'Acumule combos até 3.0x nas áreas de Matemática, Lógica, Linguagem ou Gerais e blinde seu cofre.',
    tag: '60 Segundos • Multi-Categoria',
    accent: '#818CF8',
    bgTint: 'rgba(129, 140, 248, 0.16)',
  },
];

const CATEGORY_LABELS: Record<CategoryId, string> = {
  mixed: 'Pulso Misto (Todas)',
  math: 'Matemática Mental',
  logic: 'Lógica & Padrões',
  words: 'Palavras & Idioma',
  general: 'Conhecimentos Gerais',
};

export default function App() {
  const [profile, setProfile] = useState(() => loadProfile());
  const [activeTab, setActiveTab] = useState<NavTabId>('play');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

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

  const langMenuRef = useRef<HTMLDivElement | null>(null);
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

  // Fecha o dropdown vertical de idioma ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const t = I18N_STRINGS[profile.language] || I18N_STRINGS.pt;
  const activeLangMeta = LANGUAGE_OPTIONS.find(l => l.code === profile.language) || LANGUAGE_OPTIONS[0];
  const playerAvatarUrl = buildDiceBearUrl(profile.avatarStyle, profile.avatarSeed, profile.avatarBg);
  const leagueInfo = getPlayerLeague(profile.careerXP);

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
    fxRef.current?.spawnBurst('#10B981', 24);

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
      fxRef.current?.spawnShockwave('#22D3EE');

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
    fxRef.current?.spawnShockwave('#22D3EE');

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

  const fuseRatio = Math.max(0, Math.min(1, fuseClock / fuseTotal));
  const dialDashOffset = 502 * (1 - fuseRatio);
  const selectedArenaMeta = ARENA_MODES.find(m => m.id === profile.selectedMode) || ARENA_MODES[0];

  return (
    <div className="pg-shell">
      {/* =========================================================
          1. BARRA SUPERIOR DE ESTÚDIO (SEM BOTÃO DUPLICADO E COM DROPDOWN DE IDIOMA)
         ========================================================= */}
      <header className="pg-navbar">
        <div className="pg-nav-left">
          <button
            type="button"
            className="pg-icon-btn"
            onClick={() => setSettingsOpen(true)}
            title={t.settingsTitle}
            aria-label={t.settingsTitle}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="14" y2="17" />
            </svg>
          </button>

          <button
            type="button"
            className="pg-brand-trigger"
            onClick={() => {
              if (inMatch) abortMatchToHome();
              setActiveTab('play');
            }}
          >
            <PulseBrandLogo size={40} />
            <span className="pg-brand-text">THE PULSE</span>
          </button>

          <nav className="pg-nav-links" aria-label="Navegação Principal">
            {(
              [
                ['play', t.navPlay],
                ['ranked', t.navRanked],
                ['Customize', t.navCustomize],
                ['lexicon', t.navLexicon],
                ['syllables', t.navSyllables],
              ] as [NavTabId, string][]
            ).map(([tabKey, label]) => (
              <button
                key={tabKey}
                type="button"
                className={`pg-nav-tab ${activeTab === tabKey && !inMatch ? 'active' : ''}`}
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

        <div className="pg-nav-right">
          {/* Moedas */}
          <div className="pg-stat-pill" title="Moedas Acumuladas">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#F59E0B">
              <circle cx="12" cy="12" r="10" />
            </svg>
            <span>{profile.coins}</span>
          </div>

          {/* XP / Liga */}
          <div className="pg-stat-pill" title="Experiência de Carreira">
            <span style={{ color: 'var(--pg-cyan-bright)' }}>⚡</span>
            <span>{profile.careerXP} XP</span>
          </div>

          {/* Botão Único Unificado de Perfil (Foto DiceBear + Nome) */}
          <button
            type="button"
            className="pg-profile-unified-btn"
            onClick={() => setProfileModalOpen(true)}
            title={t.profileTitle}
          >
            <div className="pg-avatar-circle">
              <img src={playerAvatarUrl} alt={profile.username} />
            </div>
            <span className="pg-profile-name">{profile.username}</span>
          </button>

          {/* Seletor de Idioma com Lista Vertical Suspensa (Dropdown) */}
          <div className="pg-lang-dropdown-wrap" ref={langMenuRef}>
            <button
              type="button"
              className="pg-lang-btn"
              onClick={() => setLangDropdownOpen(prev => !prev)}
              aria-expanded={langDropdownOpen}
              aria-haspopup="listbox"
            >
              <img src={activeLangMeta.flagUrl} alt={activeLangMeta.short} className="pg-flag-img" />
              <span>{activeLangMeta.short}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {langDropdownOpen && (
              <div className="pg-lang-menu" role="listbox">
                {LANGUAGE_OPTIONS.map(opt => {
                  const isSelected = profile.language === opt.code;
                  return (
                    <button
                      key={opt.code}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={`pg-lang-option ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        setProfile(p => ({ ...p, language: opt.code as LanguageCode }));
                        setLangDropdownOpen(false);
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src={opt.flagUrl} alt={opt.name} className="pg-flag-img" />
                        <span>{opt.name}</span>
                      </div>
                      {isSelected && <span style={{ color: 'var(--pg-cyan-bright)' }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* =========================================================
          2. PALCO CENTRAL DE JOGO
         ========================================================= */}
      <main className="pg-main-container">
        {inMatch ? (
          <div className="arena-stage-wrap">
            <ArenaCanvasFX ref={fxRef} reducedMotion={profile.reducedMotion} />

            <div className="arena-hud-bar">
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 900 }}>
                  {selectedArenaMeta.title}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                {(matchRef.current.mode === 'wordbomb' || matchRef.current.mode === 'elevator') && (
                  <div style={{ fontSize: '1.35rem', color: 'var(--pg-coral)', fontWeight: 900 }}>
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
                      color: matchClock <= 10 ? 'var(--pg-coral)' : 'var(--pg-text-bright)',
                    }}
                  >
                    {matchClock.toFixed(1)}s
                  </div>
                )}

                <button type="button" className="pg-secondary-btn" onClick={abortMatchToHome}>
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
                <div className="vault-value" style={{ color: 'var(--pg-emerald)' }}>
                  {safeScore}
                </div>
              </div>

              <button
                type="button"
                className="pg-illuminated-cta"
                style={{ height: '100%', minHeight: '64px', fontSize: '1.08rem' }}
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
                <div className="vault-value" style={{ color: 'var(--pg-gold)' }}>
                  {riskScore}
                </div>
              </div>
            </div>

            <section className="arena-core-box">
              <div className="bomb-dial">
                <svg className="bomb-svg" viewBox="0 0 180 180">
                  <circle cx="90" cy="90" r="80" fill="#090B10" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                  <circle
                    cx="90"
                    cy="90"
                    r="80"
                    fill="none"
                    stroke={fuseRatio < 0.3 ? '#F43F5E' : '#22D3EE'}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray="502"
                    style={{ strokeDashoffset: dialDashOffset }}
                  />
                </svg>
                <div className="bomb-core-circle">
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--pg-text-muted)' }}>
                    {matchRef.current.mode === 'wordbomb' ? 'SÍLABA' : `COMBO ${streak}X`}
                  </span>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '2.4rem',
                      fontWeight: 800,
                      color: 'var(--pg-cyan-bright)',
                    }}
                  >
                    {matchRef.current.mode === 'wordbomb' ? currentSyllable.syl : `${combo.toFixed(1)}x`}
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', color: 'var(--pg-gold)' }}>
                    {fuseClock.toFixed(1)}s
                  </span>
                </div>
              </div>

              {matchRef.current.mode === 'wordbomb' ? (
                <>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.65rem', textAlign: 'center' }}>
                    Digite uma palavra que contenha{' '}
                    <span style={{ color: 'var(--pg-cyan-bright)' }}>{currentSyllable.syl}</span>
                  </h2>
                  <p style={{ color: 'var(--pg-text-muted)', fontSize: '1rem' }}>{currentSyllable.hint}</p>

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
                        backgroundColor: 'var(--pg-bg)',
                        border: '2px solid var(--pg-indigo-light)',
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
                      className="pg-illuminated-cta"
                      style={{ minHeight: '54px', padding: '0 24px', fontSize: '1.05rem' }}
                      onClick={handleWordBombSubmit}
                    >
                      Detonar
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
                              backgroundColor: 'var(--pg-bg)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontFamily: 'var(--font-mono)',
                              color: 'var(--pg-cyan-bright)',
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
                      feedback.tone === 'positive' ? 'rgba(16, 185, 129, 0.16)' : 'rgba(244, 63, 94, 0.16)',
                    border: `1px solid ${feedback.tone === 'positive' ? '#10B981' : '#F43F5E'}`,
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{feedback.title}</div>
                  <div style={{ color: 'var(--pg-text-body)', fontSize: '0.96rem', marginTop: '2px' }}>
                    {feedback.detail}
                  </div>
                </div>
              )}
            </section>
          </div>
        ) : activeTab === 'play' ? (
          <>
            {/* CONSOLE HERO DE LANÇAMENTO — IDENTIDADE PRÓPRIA */}
            <section className="pg-hero-console">
              <div className="pg-hero-top">
                <span className="pg-pill-tag">
                  ⚡ {selectedArenaMeta.tag}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.92rem', color: 'var(--pg-text-muted)' }}>
                  {t.dailySeedLabel}: #{getBrasiliaDateKey()}
                </span>
              </div>

              <div>
                <h1 className="pg-hero-title">{selectedArenaMeta.title}</h1>
                <p className="pg-hero-desc" style={{ marginTop: '6px' }}>
                  {selectedArenaMeta.subtitle}
                </p>
              </div>

              {profile.selectedMode === 'classic' && (
                <div className="pg-cat-row">
                  {(Object.keys(CATEGORY_LABELS) as CategoryId[]).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      className={`pg-cat-chip ${profile.selectedCategory === cat ? 'active' : ''}`}
                      onClick={() => setProfile(p => ({ ...p, selectedCategory: cat }))}
                    >
                      {CATEGORY_LABELS[cat]}
                    </button>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="pg-illuminated-cta"
                  onClick={() => startNewMatch(profile.selectedMode, profile.selectedCategory)}
                >
                  ▶ {t.launchSelected}
                </button>
                <button
                  type="button"
                  className="pg-secondary-btn"
                  onClick={() => setActiveTab('ranked')}
                >
                  🏆 {leagueInfo.division} ({profile.careerXP} XP)
                </button>
              </div>
            </section>

            {/* BENTO GRID 2x2 DAS ARENAS ORIGINAIS DO THE PULSE GAME */}
            <section className="pg-bento-grid" aria-label="Arenas de Jogo">
              {ARENA_MODES.map(arena => {
                const isSelected = profile.selectedMode === arena.id;
                const best = profile.bestScores[arena.id] || 0;
                return (
                  <div
                    key={arena.id}
                    className={`pg-bento-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setProfile(p => ({ ...p, selectedMode: arena.id }))}
                  >
                    <div>
                      <div className="pg-bento-header">
                        <div
                          className="pg-mode-icon-box"
                          style={{ backgroundColor: arena.bgTint, color: arena.accent }}
                        >
                          {arena.code}
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', color: 'var(--pg-text-muted)' }}>
                          {arena.tag}
                        </span>
                      </div>
                      <h2 className="pg-bento-title" style={{ marginTop: '14px' }}>
                        {arena.title}
                      </h2>
                      <p className="pg-bento-desc">{arena.subtitle}</p>
                    </div>

                    <div className="pg-bento-footer">
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--pg-gold)' }}>
                        ★ {t.bestScore}: {best} pts
                      </span>
                      <button
                        type="button"
                        className="pg-illuminated-cta"
                        style={{ minHeight: '38px', padding: '0 18px', fontSize: '0.92rem' }}
                        onClick={e => {
                          e.stopPropagation();
                          startNewMatch(arena.id, profile.selectedCategory);
                        }}
                      >
                        {t.playNow} →
                      </button>
                    </div>
                  </div>
                );
              })}
            </section>
          </>
        ) : activeTab === 'ranked' ? (
          <section className="pg-hero-console">
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
              <div style={{ width: '76px', height: '76px', borderRadius: '20px', overflow: 'hidden', border: '2px solid var(--pg-indigo-light)' }}>
                <img src={playerAvatarUrl} alt={profile.username} style={{ width: '100%', height: '100%' }} />
              </div>
              <div style={{ flex: 1 }}>
                <span className="pg-pill-tag">{leagueInfo.division}</span>
                <h2 className="pg-hero-title" style={{ marginTop: '6px' }}>
                  {profile.username} — {profile.careerXP} XP
                </h2>
                <p style={{ color: 'var(--pg-text-muted)', marginTop: '4px' }}>
                  Próximo marco em {leagueInfo.nextXp} XP • {profile.matchesPlayed} partidas disputadas • Combo máximo: {profile.highestComboEver.toFixed(1)}x
                </p>
              </div>
            </div>
          </section>
        ) : activeTab === 'Customize' ? (
          <section className="pg-hero-console">
            <h2 className="pg-hero-title">Galeria Oficial de Avatares (DiceBear Open-Source)</h2>
            <p className="pg-hero-desc">
              Selecione qualquer personagem ilustrado pela comunidade ou personalize sua própria semente no perfil:
            </p>
            <div className="avatar-picker-grid">
              {CURATED_COMMUNITY_AVATARS.map(preset => {
                const url = buildDiceBearUrl(preset.style, preset.seed, preset.bg);
                const isCurrent = profile.avatarStyle === preset.style && profile.avatarSeed === preset.seed;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    className={`avatar-choice-card ${isCurrent ? 'selected' : ''}`}
                    onClick={() =>
                      setProfile(p => ({
                        ...p,
                        avatarStyle: preset.style,
                        avatarSeed: preset.seed,
                        avatarBg: preset.bg,
                      }))
                    }
                  >
                    <img
                      src={url}
                      alt={preset.label}
                      style={{ width: '68px', height: '68px', borderRadius: '16px' }}
                    />
                    <strong style={{ fontSize: '0.96rem' }}>{preset.label}</strong>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--pg-cyan-bright)' }}>
                      {preset.style}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : activeTab === 'lexicon' ? (
          <section className="pg-hero-console">
            <h2 className="pg-hero-title">
              Verificador Léxico ({PORTUGUESE_WORD_SET.size} palavras higienizadas)
            </h2>
            <input
              type="text"
              value={wordSearchQuery}
              onChange={e => setWordSearchQuery(e.target.value)}
              placeholder="Digite uma palavra para verificar no dicionário..."
              style={{
                height: '54px',
                backgroundColor: 'var(--pg-bg)',
                border: '2px solid var(--pg-border-strong)',
                borderRadius: '14px',
                padding: '0 18px',
                fontFamily: 'var(--font-mono)',
                fontSize: '1.15rem',
                textTransform: 'uppercase',
              }}
            />
            {wordSearchQuery.trim().length >= 2 && (
              <div style={{ fontWeight: 800, fontSize: '1.08rem' }}>
                {PORTUGUESE_WORD_SET.has(
                  wordSearchQuery
                    .trim()
                    .toUpperCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                ) ? (
                  <span style={{ color: 'var(--pg-emerald)' }}>✓ Palavra aceita e validada no dicionário!</span>
                ) : (
                  <span style={{ color: 'var(--pg-coral)' }}>✕ Palavra não encontrada ou bloqueada.</span>
                )}
              </div>
            )}
          </section>
        ) : (
          <div className="pg-bento-grid">
            {WORDBOMB_SYLLABLES.map(item => (
              <div key={item.syl} className="pg-bento-card" onClick={() => startNewMatch('wordbomb')}>
                <div className="pg-bento-header">
                  <div
                    className="pg-mode-icon-box"
                    style={{ backgroundColor: 'rgba(6, 182, 212, 0.14)', color: 'var(--pg-cyan-bright)' }}
                  >
                    {item.syl}
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', color: 'var(--pg-text-muted)' }}>
                    Nível {item.difficulty}
                  </span>
                </div>
                <div className="pg-bento-desc">{item.hint}</div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* =========================================================
          3. MODAL DE CONFIGURAÇÕES COMPLETO
         ========================================================= */}
      {settingsOpen && (
        <div className="pg-modal-backdrop" onClick={() => setSettingsOpen(false)}>
          <div className="pg-modal-panel" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem' }}>{t.settingsTitle}</h2>
              <button type="button" className="pg-secondary-btn" onClick={() => setSettingsOpen(false)}>
                ✕ Fechar
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="vault-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '1.05rem' }}>Volume dos Efeitos Sonoros</strong>
                  <div style={{ color: 'var(--pg-text-muted)', fontSize: '0.92rem' }}>
                    Intensidade atual: {profile.sfxVolume}%
                  </div>
                </div>
                <input
                  type="range"
                  min={15}
                  max={100}
                  value={profile.sfxVolume}
                  onChange={e => setProfile(p => ({ ...p, sfxVolume: Number(e.target.value) }))}
                />
              </div>

              <div className="vault-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '1.05rem' }}>Partículas e Ondas de Choque (60 FPS)</strong>
                  <div style={{ color: 'var(--pg-text-muted)', fontSize: '0.92rem' }}>
                    Explosões luminosas no Canvas da Arena
                  </div>
                </div>
                <button
                  type="button"
                  className="pg-secondary-btn"
                  onClick={() => setProfile(p => ({ ...p, reducedMotion: !p.reducedMotion }))}
                >
                  {profile.reducedMotion ? 'Reduzido' : 'Máximo (60 FPS)'}
                </button>
              </div>

              <div className="vault-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '1.05rem' }}>Redefinir Dados Locais</strong>
                  <div style={{ color: 'var(--pg-text-muted)', fontSize: '0.92rem' }}>
                    Zera recordes e restaura o perfil inicial
                  </div>
                </div>
                <button
                  type="button"
                  className="pg-secondary-btn"
                  style={{ color: 'var(--pg-coral)', borderColor: 'var(--pg-coral)' }}
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
          4. MODAL DE PERFIL & ESTÚDIO DE AVATARES DICEBEAR
         ========================================================= */}
      {profileModalOpen && (
        <div className="pg-modal-backdrop" onClick={() => setProfileModalOpen(false)}>
          <div className="pg-modal-panel" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem' }}>{t.profileTitle}</h2>
              <button type="button" className="pg-illuminated-cta" style={{ minHeight: '42px', padding: '0 18px', fontSize: '0.95rem' }} onClick={() => setProfileModalOpen(false)}>
                ✓ Salvar
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <img
                src={playerAvatarUrl}
                alt={profile.username}
                style={{ width: '76px', height: '76px', borderRadius: '18px', border: '2px solid var(--pg-indigo-light)' }}
              />
              <div style={{ flex: 1 }}>
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
                    height: '44px',
                    backgroundColor: 'var(--pg-bg)',
                    border: '1px solid var(--pg-border-strong)',
                    borderRadius: '10px',
                    padding: '0 14px',
                    fontWeight: 700,
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 700, marginBottom: '8px' }}>
                Gerador Customizado DiceBear (Escolha o Estilo + Semente):
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                {DICEBEAR_STYLE_LIST.map(st => (
                  <button
                    key={st.id}
                    type="button"
                    className={`pg-cat-chip ${profile.avatarStyle === st.id ? 'active' : ''}`}
                    style={{ height: '36px', fontSize: '0.88rem' }}
                    onClick={() => setProfile(p => ({ ...p, avatarStyle: st.id }))}
                  >
                    {st.name}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={profile.avatarSeed}
                onChange={e => setProfile(p => ({ ...p, avatarSeed: e.target.value }))}
                placeholder="Digite qualquer nome/semente para gerar um avatar único..."
                style={{
                  width: '100%',
                  height: '42px',
                  backgroundColor: 'var(--pg-bg)',
                  border: '1px solid var(--pg-border-strong)',
                  borderRadius: '10px',
                  padding: '0 14px',
                }}
              />
            </div>

            <div>
              <div style={{ fontWeight: 700, marginBottom: '10px' }}>
                Ou escolha um Avatar Curado da Comunidade:
              </div>
              <div className="avatar-picker-grid">
                {CURATED_COMMUNITY_AVATARS.map(preset => {
                  const url = buildDiceBearUrl(preset.style, preset.seed, preset.bg);
                  const isSelected =
                    profile.avatarStyle === preset.style && profile.avatarSeed === preset.seed;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      className={`avatar-choice-card ${isSelected ? 'selected' : ''}`}
                      onClick={() =>
                        setProfile(p => ({
                          ...p,
                          avatarStyle: preset.style,
                          avatarSeed: preset.seed,
                          avatarBg: preset.bg,
                        }))
                      }
                    >
                      <img
                        src={url}
                        alt={preset.label}
                        style={{ width: '58px', height: '58px', borderRadius: '14px' }}
                      />
                      <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          5. MODAL PÓS-PARTIDA
         ========================================================= */}
      {postMatchModal && (
        <div className="pg-modal-backdrop" onClick={() => setPostMatchModal(null)}>
          <div className="pg-modal-panel" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--pg-cyan-bright)', fontWeight: 800 }}>
                  FIM DE PARTIDA • +{postMatchModal.coinsEarned} MOEDAS
                </span>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.9rem' }}>
                  {postMatchModal.finalScore} Pontos
                </h2>
              </div>
              <button
                type="button"
                className="pg-illuminated-cta"
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
                backgroundColor: 'var(--pg-bg)',
                padding: '16px',
                borderRadius: '12px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.94rem',
                whiteSpace: 'pre-wrap',
              }}
            >
              {postMatchModal.shareText}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}