import React, { Suspense, lazy, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { CategoryId, GameModeId, PlayerProfile } from './types/game';
import { PulseBrandLogo } from './data/avatars';
import { characterById } from './data/characters';
import { acquireCharacter, equipCharacter, rewardDiscovery } from './engine/collection';
import { CharacterCollection, CharacterPortrait } from './components/CharacterCollection';
import { MISSIONS } from './data/missions';
import { getBrasiliaDateKey, validateWordSubmission } from './engine/prng';
import { loadLexicon, WordDictionary } from './engine/lexicon';
import { clearProfileStorage, loadProfile, sanitizeProfile, saveProfile } from './engine/storage';
import { comboFor, currentSyllable, Session, SessionMode, sessionReducer, totalScore } from './engine/session';
import { SoundEngine } from './engine/sound';
import { Dialog } from './components/Dialog';
import { Icon, IconName } from './components/Icon';
import { ArenaCanvasFX, ArenaCanvasFXHandle } from './components/ArenaCanvasFX';
const EchoExperience = lazy(() => import('./components/EchoExperience').then(module => ({ default: module.EchoExperience })));
const CrosswordExperience = lazy(() => import('./components/CrosswordExperience').then(module => ({ default: module.CrosswordExperience })));

type Tab = 'home' | 'progress' | 'avatars';
const TABS: { id: Tab; title: string; icon: IconName }[] = [
  { id: 'home', title: 'Explorar', icon: 'play' }, { id: 'progress', title: 'Recordes', icon: 'chart' }, { id: 'avatars', title: 'Coleção', icon: 'user' },
];
const CATEGORIES: Record<CategoryId, string> = { mixed: 'Todas', math: 'Matemática', logic: 'Lógica', words: 'Linguagem', general: 'Conhecimentos' };
const MODES: { id: GameModeId; title: string; description: string; color: string }[] = [
  { id: 'wordbomb', title: 'Bomba de palavras', description: 'Digite antes de explodir.', color: '#55d8e8' },
  { id: 'elevator', title: 'O Elevador', description: 'Acertou? Sobe mais um.', color: '#ffb39e' },
  { id: 'classic', title: 'Arena Pulse', description: 'Quanto você faz em 60s?', color: '#bca7ff' },
  { id: 'daily', title: 'Desafio do dia', description: '10 perguntas. Bora fechar?', color: '#9be3b2' },
];
const EXPERIENCES = [
  { id: 'echo' as const, title: 'Ecos', description: 'Seu último toque ainda está aqui.', color: '#f5c568' },
  { id: 'crossword' as const, title: 'Cruzadas Diretas', description: 'Uma pista abre a próxima.', color: '#9be3b2' },
  ...MODES,
];
function modeTitle(session: Session): string {
  return session.mode === 'mission' ? MISSIONS.find(m => m.id === session.missionId)?.title || 'Missão'
    : session.mode === 'review' ? 'Mais uma chance' : MODES.find(m => m.id === session.mode)?.title || 'The Pulse';
}
function recordSession(profile: PlayerProfile, session: Session): PlayerProfile {
  const score = totalScore(session), correct = session.history.filter(h => h.isCorrect).length;
  const isReplay = session.mode === 'daily' && Boolean(profile.dailyHistory[session.dateKey]);
  const xp = isReplay ? 0 : correct * 40;
  const coins = isReplay ? 0 : correct * 2;
  const mode = session.mode as GameModeId;
  const missionBest = { ...profile.missionBest };
  if (session.missionId && session.history.length === session.queue.length) {
    const transfer = session.history.filter(h => h.transfer && h.isCorrect).length;
    const previous = missionBest[session.missionId];
    if (!previous || correct > previous.correct || (correct === previous.correct && transfer > previous.transfer)) missionBest[session.missionId] = { correct, total: session.history.length, transfer };
  }
  const shareText = `The Pulse · ${session.dateKey}\n${modeTitle(session)}: ${correct}/${session.history.length} acertos · ${score} pontos\nProgresso pessoal neste dispositivo.`;
  const dailyHistory = { ...profile.dailyHistory };
  if (session.mode === 'daily' && !isReplay && session.history.length === session.queue.length) dailyHistory[session.dateKey] = { dateKey: session.dateKey, score, safeScore: session.safeScore, salvagedScore: Math.round(session.riskScore / 2), correctCount: correct, totalCount: session.history.length, peakCombo: session.peakCombo, timeline: session.history.map(h => h.isCorrect ? '✓' : '·').join(''), shareText };
  let updated = sanitizeProfile({ ...profile, version: 12, careerXP: profile.careerXP + xp, coins: profile.coins + coins, matchesPlayed: profile.matchesPlayed + 1,
    totalQuestionsAnswered: profile.totalQuestionsAnswered + session.history.length, totalQuestionsCorrect: profile.totalQuestionsCorrect + correct, highestComboEver: Math.max(profile.highestComboEver, session.peakCombo),
    bestScores: mode in profile.bestScores ? { ...profile.bestScores, [mode]: Math.max(profile.bestScores[mode], score) } : profile.bestScores,
    bestCategoryScores: { ...profile.bestCategoryScores, [session.category]: Math.max(profile.bestCategoryScores[session.category], score) },
    recentQuestionIds: [...profile.recentQuestionIds, ...session.history.flatMap(h => h.questionId ? [h.questionId] : [])].slice(-180),
    reviewHistory: [...profile.reviewHistory, ...session.history].slice(-120), dailyHistory, missionBest });
  if (correct > 0 && session.mode !== 'review') updated = rewardDiscovery(updated, `round:${session.mode}:${session.dateKey}`, 8);
  if (session.mode === 'wordbomb' && session.words.length >= 8) updated = rewardDiscovery(updated, 'words:first-eight', 8);
  return updated;
}

export default function App() {
  const [profile, setProfile] = useState(loadProfile);
  const [tab, setTab] = useState<Tab>('home');
  const [screen, setScreen] = useState<'hub' | 'game' | 'echo' | 'crossword'>('hub');
  const [session, dispatch] = useReducer(sessionReducer, null);
  const [modal, setModal] = useState<'settings' | 'profile' | 'leave' | 'help' | null>(null);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [storageOk, setStorageOk] = useState(true);
  const [dictionary, setDictionary] = useState<WordDictionary>();
  const [lexiconState, setLexiconState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [word, setWord] = useState('');
  const [query, setQuery] = useState('');
  const [pendingStart, setPendingStart] = useState<{ mode: SessionMode; missionId?: string; sequence?: string }>();
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [explanationOpen, setExplanationOpen] = useState(false);
  const [systemMotion, setSystemMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const fx = useRef<ArenaCanvasFXHandle>(null);
  const questionHeading = useRef<HTMLHeadingElement>(null);
  const recorded = useRef('');
  const restoreModal = useRef(false);
  const startRequest = useRef(0);
  const reducedMotion = systemMotion || profile.reducedMotion;
  const character = characterById(profile.equippedCharacter);
  const discover = useCallback((key: string, amount: number) => setProfile(previous => rewardDiscovery(previous, key, amount)), []);
  const active = screen === 'game' && session && session.phase !== 'finished';
  const mistakes = useMemo(() => [...new Map(profile.reviewHistory.map((item, i) => [item.questionId || `${item.prompt}_${i}`, item])).values()].filter(item => !item.isCorrect), [profile.reviewHistory]);

  useEffect(() => { setStorageOk(saveProfile(profile)); SoundEngine.volume = profile.sfxVolume / 100; }, [profile]);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setSystemMotion(media.matches);
    media.addEventListener('change', change); return () => media.removeEventListener('change', change);
  }, []);
  useEffect(() => { document.documentElement.classList.toggle('reduced-motion', reducedMotion); }, [reducedMotion]);
  useEffect(() => {
    if (screen !== 'game' || session?.phase !== 'answering' || session.relaxed) return;
    let last = performance.now();
    const id = window.setInterval(() => { const now = performance.now(); dispatch({ type: 'TICK', elapsed: now - last }); last = now; }, 100);
    return () => clearInterval(id);
  }, [screen, session?.id, session?.phase, session?.relaxed]);
  useEffect(() => {
    const hide = () => { document.documentElement.classList.toggle('page-hidden', document.hidden); if (document.hidden && screen === 'game') { dispatch({ type: 'PAUSE' }); SoundEngine.stop(); } };
    document.addEventListener('visibilitychange', hide); window.addEventListener('blur', hide);
    return () => { document.removeEventListener('visibilitychange', hide); window.removeEventListener('blur', hide); };
  }, [screen]);
  useEffect(() => {
    if (!session || screen !== 'game') return;
    if (session.phase === 'answering') {
      if (session.mode === 'wordbomb') {
        document.getElementById('arena-word')?.focus({ preventScroll: true });
      } else {
        questionHeading.current?.focus({ preventScroll: true });
      }
    }
    if (session.phase === 'feedback') {
      const last = session.history[session.history.length - 1];
      if (last?.isCorrect) { SoundEngine.hit(session.streak); if (character.effect !== 'shadow') fx.current?.spawnShockwave(character.color); } else SoundEngine.error();
    }
    if (session.phase === 'finished' && recorded.current !== session.id) {
      recorded.current = session.id;
      setProfile(previous => recordSession(previous, session));
      SoundEngine.finish(); if (character.effect !== 'shadow') fx.current?.spawnConfettiShower();
      questionHeading.current?.focus();
    }
  }, [session?.phase, session?.id, session?.index, screen]);
  useEffect(() => {
    if (screen !== 'game' || session?.phase !== 'feedback' || modal || explanationOpen || !profile.autoAdvance) return;
    const correct = session.history[session.history.length - 1]?.isCorrect;
    const id = window.setTimeout(() => { setWord(''); dispatch({ type: 'NEXT' }); }, correct ? (session.mode === 'wordbomb' ? 500 : 900) : 2200);
    return () => window.clearTimeout(id);
  }, [screen, session?.phase, session?.id, session?.index, modal, explanationOpen, profile.autoAdvance]);
  useEffect(() => { setExplanationOpen(false); }, [session?.id, session?.index]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (!active || modal || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || (event.target as HTMLElement)?.isContentEditable) return;
      if (event.key === 'Escape') { event.preventDefault(); dispatch({ type: session.phase === 'paused' ? 'RESUME' : 'PAUSE' }); }
      if (session.phase === 'answering' && session.mode !== 'wordbomb' && /^[1-4]$/.test(event.key)) dispatch({ type: 'ANSWER', option: Number(event.key) - 1 });
      if (event.key.toLowerCase() === 'b' && session.phase === 'answering') dispatch({ type: 'BANK' });
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [active, session?.phase, session?.mode, modal]);

  async function ensureDictionary(): Promise<WordDictionary | undefined> {
    if (dictionary) return dictionary;
    setLexiconState('loading');
    try { const value = await loadLexicon(); setDictionary(value); setLexiconState('ready'); return value; }
    catch { setLexiconState('error'); return undefined; }
  }
  async function start(mode: SessionMode, missionId?: string, sequence?: string) {
    SoundEngine.unlock();
    const request = ++startRequest.current;
    if (mode === 'wordbomb') {
      setPendingStart({ mode, missionId, sequence });
      const loaded = await ensureDictionary();
      if (!loaded || request !== startRequest.current) return;
    }
    setPendingStart(undefined); setWord(''); setCopied(false); setCopyError(false); setExplanationOpen(false);
    dispatch({ type: 'START', options: { id: `${Date.now()}_${request}`, mode, category: profile.selectedCategory, seed: (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0, relaxed: false, recent: profile.recentQuestionIds, missionId, forcedSyllable: sequence,
      review: mistakes.flatMap(item => item.question ? [item.question] : []) } });
    setScreen('game'); setModal(null); window.scrollTo({ top: 0 }); SoundEngine.modeSelect();
  }
  function openModal(value: 'settings' | 'profile' | 'leave' | 'help') {
    restoreModal.current = Boolean(active && session.phase !== 'paused');
    if (active) dispatch({ type: 'PAUSE' });
    setModal(value); setResetConfirm(false);
  }
  function closeModal() { setModal(null); if (restoreModal.current) dispatch({ type: 'RESUME' }); restoreModal.current = false; }
  function goHome(next: Tab = 'home') {
    startRequest.current++;
    setPendingStart(undefined); setScreen('hub'); setTab(next); setModal(null); SoundEngine.stop(); window.scrollTo({ top: 0 });
  }
  function leave() {
    if (session?.history.length) setProfile(previous => sanitizeProfile({ ...previous, recentQuestionIds: [...previous.recentQuestionIds, ...session.history.flatMap(h => h.questionId ? [h.questionId] : [])], reviewHistory: [...previous.reviewHistory, ...session.history] }));
    goHome();
  }
  function navigate(next: Tab) {
    if (active) { openModal('leave'); return; }
    goHome(next);
  }
  const current = session?.queue[session.index];
  const latest = session?.history[session.history.length - 1];
  const correctCount = session?.history.filter(h => h.isCorrect).length || 0;
  const shareText = session ? `The Pulse · ${modeTitle(session)}\n${correctCount}/${session.history.length} acertos · ${totalScore(session)} pontos\nProgresso pessoal neste dispositivo.` : '';
  const queryResult = useMemo(() => query.trim().length >= 3 && dictionary ? validateWordSubmission(query, '', new Set(), dictionary) : undefined, [query, dictionary]);

  const collection = <CharacterCollection profile={profile} onAcquire={id => { setProfile(previous => equipCharacter(acquireCharacter(previous, id), id)); SoundEngine.bank(); }} onEquip={id => { setProfile(previous => equipCharacter(previous, id)); SoundEngine.modeSelect(); }}/>;
  function openExperience(id: typeof EXPERIENCES[number]['id']) {
    if (id === 'echo' || id === 'crossword') { startRequest.current++; setPendingStart(undefined); setScreen(id); window.scrollTo({ top: 0 }); SoundEngine.modeSelect(); }
    else void start(id);
  }
  const nextRound = () => { setWord(''); dispatch({ type: 'NEXT' }); };
  const lastRound = session && (session.mode !== 'wordbomb' && session.index === session.queue.length - 1 || session.mode === 'wordbomb' && session.relaxed && session.index === 11 || !session.relaxed && ['elevator', 'wordbomb'].includes(session.mode) && session.lives === 0);
  const lookup = <details className="word-lookup" onToggle={event => { if (event.currentTarget.open) void ensureDictionary(); }}><summary>Conferir uma palavra</summary><label htmlFor="word-search">Palavra<input id="word-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="computador" maxLength={40} autoComplete="off" autoCapitalize="none" spellCheck={false}/></label><div className="lookup-result" role="status">{lexiconState === 'loading' ? 'Carregando…' : lexiconState === 'error' ? <button className="secondary" onClick={() => void ensureDictionary()}>Tentar carregar novamente</button> : queryResult ? <strong className={queryResult.valid ? 'positive' : ''}>{queryResult.valid ? `“${dictionary?.spelling(query)}” vale!` : queryResult.reason}</strong> : 'Digite pelo menos três letras.'}</div></details>;

  return <div className={`pulse-shell affinity-${character.effect} ${screen !== 'hub' ? 'playing' : ''}`} onPointerDownCapture={() => SoundEngine.unlock()} onKeyDownCapture={() => SoundEngine.unlock()} style={{ '--affinity': character.color } as React.CSSProperties}>
    <a className="skip-link" href="#main">Pular para o conteúdo</a>
    <header className="topbar">
      <button className="brand" aria-label="The Pulse, início" onClick={() => active ? openModal('leave') : goHome()}><PulseBrandLogo size={36}/><span>THE PULSE</span></button>
      <nav className="desktop-nav" aria-label="Navegação principal">{TABS.map(item => <button key={item.id} aria-current={tab === item.id && screen === 'hub' ? 'page' : undefined} onClick={() => navigate(item.id)}>{item.title}</button>)}</nav>
      <div className="topbar-actions"><button className="icon-button" aria-label={profile.sfxVolume ? 'Silenciar sons' : 'Ativar sons'} aria-pressed={profile.sfxVolume === 0} onClick={() => setProfile(p => ({ ...p, sfxVolume: p.sfxVolume ? 0 : 50 }))}><Icon name="sound"/>{profile.sfxVolume === 0 && <span className="mute-mark" aria-hidden="true">/</span>}</button><button className="icon-button" aria-label="Configurações" onClick={() => openModal('settings')}><Icon name="settings"/></button><button className="profile-button" aria-label="Seu perfil e avatar" onClick={() => openModal('profile')}><CharacterPortrait character={character} animated size="small"/></button></div>
    </header>
    {!storageOk && <div className="storage-warning" role="status">Não foi possível salvar seus recordes neste navegador. <button onClick={() => setStorageOk(saveProfile(profile))}>Tentar salvar</button></div>}
    <main id="main" className={`main ${screen !== 'hub' ? 'game-main' : ''}`}>
      {screen === 'hub' && <>
        {tab === 'home' && <>
          <h1 className="arcade-title">Qual vai ser?</h1>
          <div className="game-shelf">{EXPERIENCES.map(mode => <button className={`game-tile tile-${mode.id}`} key={mode.id} style={{ '--accent': mode.color } as React.CSSProperties} disabled={lexiconState === 'loading' && mode.id === 'wordbomb'} onClick={() => openExperience(mode.id)} onPointerEnter={event => { if (event.pointerType === 'mouse') SoundEngine.hoverTick(); }} onFocus={() => SoundEngine.hoverTick()} aria-label={`Abrir ${mode.title}`}>
            <span className="game-preview" aria-hidden="true">{mode.id === 'echo' && <span className="echo-preview"><i>1</i><i>2</i><i>0</i><span>+1</span></span>}{mode.id === 'crossword' && <span className="cross-preview">{['', 'S', '', 'S', 'O', 'L', '', 'L', ''].map((letter, index) => <i key={index} className={!letter ? 'preview-clue' : ''}>{letter || <Icon name="arrow" size={14}/>}</i>)}</span>}
              {mode.id === 'wordbomb' && <><span className="bomb-fuse"/><span className="letter-bomb">CAR</span><span className="preview-word"><span>car</span>inho</span></>}
              {mode.id === 'elevator' && <span className="elevator-preview"><span className="floor floor-3">03</span><span className="floor floor-2">02<Icon name="arrow" size={24}/></span><span className="floor floor-1">01</span></span>}
              {mode.id === 'classic' && <><span className="arena-sixty">60<span>s</span></span><span className="arena-choices"><i/><i/><i/><i/></span></>}
              {mode.id === 'daily' && <><span className="daily-number">10<span>/10</span></span><span className="daily-dots">{Array.from({ length: 10 }, (_, i) => <i key={i}/>)}</span></>}
              <span className="tile-play"><Icon name="play" size={21}/></span>
            </span>
            <span className="tile-caption"><strong>{mode.title}</strong><span>{mode.description}</span></span>
          </button>)}</div>
          {pendingStart && <div className="load-status" role="status">{lexiconState === 'error' ? <><p>As palavras não carregaram. Tente novamente.</p><button className="secondary" onClick={() => void start(pendingStart.mode, pendingStart.missionId, pendingStart.sequence)}>Tentar novamente</button></> : <p>Preparando as palavras…</p>}</div>}
        </>}
        {tab === 'progress' && <>
          <div className="page-heading"><h1>Seus recordes</h1><p>Neste dispositivo.</p></div>
          <div className="record-list">{MODES.map(mode => <button key={mode.id} onClick={() => void start(mode.id)}><span>{mode.title}</span><strong>{profile.bestScores[mode.id].toLocaleString('pt-BR')} <small>pts</small></strong><Icon name="play" size={18}/></button>)}</div>
          <p className="personal-stats">{profile.matchesPlayed} partidas · combo máximo {profile.highestComboEver.toFixed(1)}×</p>
          {Object.values(profile.dailyHistory).length > 0 && <details className="disclosure"><summary>Desafios anteriores</summary><ul className="daily-records">{Object.values(profile.dailyHistory).slice(-7).reverse().map(day => <li key={day.dateKey}><span>{day.dateKey.split('-').reverse().join('/')}</span><strong>{day.correctCount}/{day.totalCount}</strong></li>)}</ul></details>}
          {mistakes.length > 0 && <details className="disclosure"><summary>Mais uma chance</summary>{mistakes.some(item => item.question) && <button className="secondary" onClick={() => void start('review')}>Rever as que errei</button>}<div className="review-list">{mistakes.slice(-15).reverse().map((item, index) => <details key={`${item.prompt}_${index}`}><summary>{item.prompt}</summary><p><strong>{item.correctAnswer}</strong></p><p>{item.explanation}</p></details>)}</div></details>}
        </>}
        {tab === 'avatars' && collection}
      </>}
      {(screen === 'echo' || screen === 'crossword') && <><header className="game-header"><h1>{screen === 'echo' ? 'Ecos' : 'Cruzadas Diretas'}</h1><button className="secondary compact" onClick={() => goHome()}>Voltar</button></header><Suspense fallback={<p role="status">Abrindo experiência…</p>}>{screen === 'echo' ? <EchoExperience discoveries={profile.discoveries} onComplete={discover}/> : <CrosswordExperience discoveries={profile.discoveries} onComplete={discover}/>}</Suspense></>}{screen === 'game' && session && <>
        <ArenaCanvasFX ref={fx} reducedMotion={reducedMotion}/>
        {session.phase === 'finished' ? <section className="result-screen">
          <h1 ref={questionHeading} tabIndex={-1}>{correctCount === session.history.length && correctCount > 0 ? 'Gabaritou!' : 'Fim da rodada!'}</h1>
          <div className="result-score"><strong>{totalScore(session).toLocaleString('pt-BR')}</strong><span>pontos</span></div>
          <p>{correctCount}/{session.history.length} acertos · combo {session.peakCombo.toFixed(1)}×</p>
          {session.mode === 'daily' && <p className="meta">Vale nos recordes a primeira partida completa de hoje.</p>}
          <div className="result-actions"><button className="primary" onClick={() => void start(session.mode, session.missionId)}>Repetir <Icon name="play" size={18}/></button><button className="secondary" onClick={() => goHome()}>Explorar</button><button className="secondary" onClick={async () => { try { await navigator.clipboard.writeText(shareText); setCopied(true); setCopyError(false); } catch { setCopied(false); setCopyError(true); } }}>{copied ? 'Copiado!' : 'Copiar resultado'}</button></div>
          {copied && <p role="status">Resultado copiado.</p>}
          {copyError && <div className="copy-recovery" role="status"><label htmlFor="manual-result">Selecione e copie seu resultado</label><textarea id="manual-result" readOnly value={shareText} rows={4} onFocus={event => event.currentTarget.select()}/></div>}
          <details className="disclosure result-details"><summary>Ver respostas</summary><p className="meta">Cofre: {session.safeScore} + {Math.round(session.riskScore / 2)} recuperados.</p><div className="review-list">{session.history.map((item, index) => <details key={index}><summary><span className={item.isCorrect ? 'positive' : 'attention'}>{item.isCorrect ? 'Acerto' : 'Errou'}</span> {item.prompt}</summary><p>Sua resposta: {item.userAnswer}</p><p><strong>{item.correctAnswer}</strong></p><p>{item.explanation}</p></details>)}</div></details>
        </section> : <>
          <header className="game-header"><h1>{modeTitle(session)}</h1><div className="game-controls"><button className="icon-button" aria-label="Como funciona" onClick={() => openModal('help')}>?</button><button className="icon-button" aria-label="Pausar" onClick={() => dispatch({ type: 'PAUSE' })} disabled={session.phase === 'paused'}><Icon name="pause" size={18}/></button><button className="secondary compact" onClick={() => openModal('leave')}>Sair</button></div></header>
          <div className="scorebar"><div><span>Cofre</span><strong>{session.safeScore}</strong></div><button className="bank-button" onClick={() => { dispatch({ type: 'BANK' }); SoundEngine.bank(); }} disabled={session.riskScore <= 0 || session.phase !== 'answering'}><Icon name="shield" size={18}/>Guardar +{session.riskScore}</button><div><span>Combo</span><strong>{comboFor(session.streak).toFixed(1)}×</strong></div></div>
          <section className={`question-panel ${session.mode === 'wordbomb' ? 'word-panel' : ''}`} aria-label="Rodada atual" aria-busy={session.phase === 'paused'}>
            <div className="question-meta"><span>{session.mode === 'wordbomb' ? `Palavra ${session.index + 1}${session.relaxed ? '/12' : ''}` : session.mode === 'elevator' ? `Andar ${session.floor}` : `${session.index + 1}/${session.queue.length}`}</span><span>{!session.relaxed && ['elevator', 'wordbomb'].includes(session.mode) && `${session.lives} vidas · `}{session.relaxed ? 'Sem tempo' : `${Math.ceil(session.fuseMs / 1000)}s`}</span></div>
            {!session.relaxed && <progress className="fuse-progress" max={session.fuseTotalMs} value={session.fuseMs} aria-label="Tempo restante da rodada"/>}
            {session.mode === 'wordbomb' ? <>
              <h2 className="word-instruction" id="word-instruction" aria-live="polite" aria-atomic="true">Uma palavra com<span className="sr-only"> {currentSyllable(session).syl}</span></h2><div className="sequence-display" aria-hidden="true">{currentSyllable(session).syl}</div>
              <form className="word-form" onSubmit={event => { event.preventDefault(); if (dictionary && session.phase === 'answering') dispatch({ type: 'WORD', raw: word, dictionary }); }}><label className="sr-only" htmlFor="arena-word">Sua palavra</label><div><input id="arena-word" aria-describedby="word-instruction" value={word} onChange={event => setWord(event.target.value)} readOnly={session.phase !== 'answering'} autoComplete="off" autoCapitalize="none" spellCheck={false} enterKeyHint="send" maxLength={32} placeholder="Digite aqui…"/><button className="primary" disabled={session.phase !== 'answering'} type="submit" aria-label="Enviar palavra"><Icon name="arrow" size={22}/></button></div></form>
            </> : <>{session.mode === 'review' && current?.context && <p>{current.context}</p>}<h2 ref={questionHeading} tabIndex={-1}>{current?.prompt}</h2><div className="answer-options">{current?.options.map((option, index) => { const answered = session.phase === 'feedback' || session.phase === 'paused' && session.resumePhase === 'feedback'; const correct = answered && index === current.correctIndex; const chosen = answered && latest?.userAnswer === option; return <button key={index} className={`answer-option ${correct ? 'is-correct' : chosen ? 'is-wrong' : ''}`} disabled={session.phase !== 'answering'} onClick={() => dispatch({ type: 'ANSWER', option: index })}><span className="answer-letter">{index + 1}</span><span>{option}</span>{correct && <Icon name="check" size={18}/>}</button>; })}</div></>}
            <div className="round-response" aria-live="polite" aria-atomic="true">{session.notice && session.phase === 'answering' && <p className="word-notice">{session.notice}</p>}{session.phase === 'feedback' && latest && <div className={`answer-feedback ${latest.isCorrect ? 'good' : 'learn'}`}><strong>{latest.isCorrect ? `${session.mode === 'wordbomb' ? latest.correctAnswer : 'Boa!'} +${latest.pointsDelta}` : `Era: ${latest.correctAnswer}`}</strong><div className="feedback-actions">{session.mode !== 'wordbomb' && <button className="text-button" aria-expanded={explanationOpen} onClick={() => setExplanationOpen(!explanationOpen)}>Por quê?</button>}<button className="text-button" onClick={nextRound}>{lastRound ? 'Resultado' : 'Próxima'}<Icon name="arrow" size={16}/></button></div>{explanationOpen && <p>{latest.explanation}</p>}</div>}</div>
            {!session.relaxed && (session.mode === 'classic' || session.mode === 'wordbomb') && <p className="clock" aria-label="Tempo total restante">{Math.ceil(session.remainingMs / 1000)}s no total</p>}
          </section>
          {session.phase === 'paused' && !modal && <Dialog title="Pausa" onClose={() => dispatch({ type: 'RESUME' })}><button className="primary" onClick={() => dispatch({ type: 'RESUME' })}>Continuar <Icon name="play" size={18}/></button><button className="secondary" onClick={() => openModal('leave')}>Sair</button></Dialog>}
        </>}
      </>}
    </main>
    {screen === 'hub' && <nav className="bottom-nav" aria-label="Navegação no celular">{TABS.map(item => <button key={item.id} aria-current={tab === item.id ? 'page' : undefined} onClick={() => navigate(item.id)}><Icon name={item.icon}/><span>{item.title}</span></button>)}</nav>}
    {modal === 'help' && session && <Dialog title="Como funciona" onClose={closeModal}>
      <p>{session.mode === 'wordbomb' ? 'Digite uma palavra com as letras da tela, em qualquer posição. Não repita palavras.' : session.mode === 'review' ? 'Reveja as respostas anteriores e descubra as alternativas certas.' : session.mode === 'elevator' ? 'Acerte para subir. Você tem três vidas e cada vez menos tempo.' : session.mode === 'daily' ? 'São dez perguntas iguais para todos hoje. A primeira partida completa vale nos seus recordes.' : 'Acerte o máximo de perguntas em 60 segundos.'}</p>
      <p>Toque em Guardar para proteger os pontos. Errou, perde o que não guardou. No fim, recupera metade.</p>
      <p className="meta">O relógio para nas pausas. {session.mode !== 'wordbomb' && 'No teclado: 1–4 para responder.'}</p>
      {session.mode === 'wordbomb' && lookup}
      <button className="primary" onClick={closeModal}>Continuar</button>
    </Dialog>}
    {modal === 'settings' && <Dialog title="Configurações" onClose={closeModal}>
      <div className="setting-row"><label htmlFor="sfx-volume">Volume <strong>{profile.sfxVolume === 0 ? 'Silenciado' : `${profile.sfxVolume}%`}</strong></label><input id="sfx-volume" type="range" min="0" max="100" value={profile.sfxVolume} onChange={e => setProfile(p => ({ ...p, sfxVolume: Number(e.target.value) }))}/></div>

      <label className="switch-label"><input type="checkbox" checked={profile.autoAdvance} onChange={e => setProfile(p => ({ ...p, autoAdvance: e.target.checked }))}/>Avançar respostas automaticamente</label>
      <label className="switch-label"><input type="checkbox" checked={profile.reducedMotion} onChange={e => setProfile(p => ({ ...p, reducedMotion: e.target.checked }))}/>Reduzir efeitos</label>
      <details className="disclosure"><summary>Tema dos quizzes</summary><fieldset className="category-picker"><legend className="sr-only">Tema dos quizzes</legend>{(Object.keys(CATEGORIES) as CategoryId[]).map(category => <button key={category} className={profile.selectedCategory === category ? 'selected' : ''} aria-pressed={profile.selectedCategory === category} onClick={() => setProfile(p => ({ ...p, selectedCategory: category }))}>{CATEGORIES[category]}</button>)}</fieldset></details>
      {lookup}
      <details className="disclosure"><summary>Apagar progresso</summary>{resetConfirm ? <><p>Isso apaga os recordes e respostas salvos neste dispositivo. Não é possível desfazer.</p><button className="danger" onClick={() => { setProfile(clearProfileStorage()); closeModal(); goHome(); }}>Apagar meu progresso</button><button className="secondary" onClick={() => setResetConfirm(false)}>Cancelar</button></> : <button className="secondary" onClick={() => setResetConfirm(true)}>Apagar meus dados…</button>}</details>
    </Dialog>}
    {modal === 'profile' && <Dialog title="Seu perfil" onClose={() => { setProfile(p => sanitizeProfile(p)); closeModal(); }}><div className="profile-editor"><label htmlFor="player-name">Seu nome<input id="player-name" value={profile.username} maxLength={18} onChange={e => setProfile(p => ({ ...p, username: e.target.value }))}/></label></div><div className="profile-character"><CharacterPortrait character={character} animated/><span>{character.name}</span></div><button className="primary" onClick={() => { setProfile(p => sanitizeProfile(p)); closeModal(); }}>Pronto</button></Dialog>}
    {modal === 'leave' && <Dialog title="Sair da partida?" onClose={closeModal}><p>Os pontos desta partida não serão salvos.</p><button className="primary" onClick={closeModal}>Continuar</button><button className="secondary" onClick={leave}>Sair da partida</button></Dialog>}
  </div>;
}
