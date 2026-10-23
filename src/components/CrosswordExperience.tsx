import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CrosswordDifficulty, CrosswordEntry, CrosswordPuzzle, cellKey, cleanLetters, crosswordComplete, importCrosswordBank, writeEntry } from '../engine/crossword';
import { SoundEngine } from '../engine/sound';
import { Icon } from './Icon';

type Progress = Record<string, Record<string, string>>;
const STORAGE_KEY = 'pulse_crosswords_v1';
const FINISHED_KEY = 'pulse_crosswords_finished_v1';
// Editorial hints: select unfamiliar vocabulary, not the longest answers.
const BANK_HINTS: Record<string, string[]> = {
  'cross-1': ['VIOLAO'], 'cross-2': ['TAPIOCA'], 'cross-3': ['TUCANO'], 'cross-4': ['TELONA'],
  'cross-5': ['ATOMO', 'SATELITE'], 'cross-6': ['DOMINO', 'XADREZ'], 'cross-7': ['DUNAS'], 'cross-8': ['ACEROLA'],
  'cross-9': ['FREVO', 'PANDEIRO'], 'cross-10': ['GALAXIA', 'LASER'], 'cross-11': ['ARTILHEIRO', 'DRIBLE'], 'cross-12': ['TRATADO', 'IMPERIO'],
  'cross-13': ['PNEU'], 'cross-14': ['FABULA'], 'cross-15': ['ANCORA'], 'cross-16': ['EXPRESSO'],
  'cross-17': ['COLISEU'], 'cross-18': ['FIGURINO'], 'cross-19': ['PIXEL'], 'cross-20': ['LABIRINTO'],
};
function readFinished(): string[] {
  try { const raw = JSON.parse(localStorage.getItem(FINISHED_KEY) || '[]'); return Array.isArray(raw) ? raw.filter(id => typeof id === 'string' && /^cross-([1-9]|1[0-9]|20)$/.test(id)) : []; } catch { return []; }
}
function readProgress(): Progress {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    return Object.fromEntries(Object.entries(raw).filter(([key, value]) => /^cross-\d{1,2}$/.test(key) && value && typeof value === 'object' && !Array.isArray(value)).slice(0, 20).map(([key, value]) => [key, Object.fromEntries(Object.entries(value as object).filter(([cell, letter]) => /^\d{1,2},\d{1,2}$/.test(cell) && typeof letter === 'string' && /^[A-Z]$/.test(letter)).slice(0, 500))]));
  } catch { return {}; }
}

export function CrosswordExperience({ onComplete, discoveries }: { onComplete: (key: string, amount: number) => void; discoveries: string[] }) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [boardSize, setBoardSize] = useState({ cell: 46, height: 500 });
  const [finished, setFinished] = useState<string[]>(() => Array.from(new Set([...readFinished(), ...discoveries.filter(id => /^cross-/.test(id))])));
  const [started, setStarted] = useState(false);
  const [bank, setBank] = useState<CrosswordPuzzle[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [difficulty, setDifficulty] = useState<CrosswordDifficulty>('Fácil');
  const [puzzleId, setPuzzleId] = useState('cross-1');
  const [selectedId, setSelectedId] = useState('w1');
  const [activeCell, setActiveCell] = useState('');
  const [progress, setProgress] = useState<Progress>(readProgress);
  const [checked, setChecked] = useState(false);
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [storageOk, setStorageOk] = useState(true);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [focusRequest, setFocusRequest] = useState(0);
  const pendingFocus = useRef('');
  const latest = useRef(progress), reported = useRef('');
  latest.current = progress;
  const puzzles = useMemo(() => bank, [bank, difficulty]);
  const puzzle = puzzles.find(item => item.id === puzzleId) || puzzles[0];
  const selected = puzzle?.entries.find(entry => entry.id === selectedId) || puzzle?.entries[0];
  const initialLetters: Record<string, string> = puzzle && difficulty === 'Fácil' ? Object.fromEntries(puzzle.entries.map(entry => [entry.cells[0], entry.answer[0]])) : {};
  const values = { ...initialLetters, ...(progress[puzzle?.id || ''] || {}) };
  const completed = puzzle ? crosswordComplete(puzzle, values) : false;

  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    setLoadState('loading');
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    fetch(`${import.meta.env.BASE_URL}crosswords/upstream.json`, { signal: controller.signal }).then(response => { if (!response.ok) throw new Error('Acervo indisponível'); return response.json(); }).then(raw => { if (!disposed) { setBank(importCrosswordBank(raw)); setLoadState('ready'); } }).catch(() => { if (!disposed) setLoadState('error'); }).finally(() => clearTimeout(timeout));
    return () => { disposed = true; clearTimeout(timeout); controller.abort(); };
  }, [attempt]);
  useEffect(() => {
    const timer = window.setTimeout(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); setStorageOk(true); } catch { setStorageOk(false); } }, 180);
    return () => clearTimeout(timer);
  }, [progress]);
  useEffect(() => {
    const flush = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(latest.current)); } catch { /* The live save status handles storage failure. */ } };
    window.addEventListener('pagehide', flush); document.addEventListener('visibilitychange', flush);
    return () => { flush(); window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', flush); };
  }, []);
  useEffect(() => { setSelectedId('w1'); setActiveCell(puzzle?.entries[0]?.cells[0] || ''); setChecked(false); setClearConfirm(false); setTip(null); reported.current = ''; }, [puzzle?.id]);
  useEffect(() => {
    if (!checked || !completed || !puzzle || reported.current === puzzle.id) return;
    reported.current = puzzle.id; onComplete(puzzle.id, puzzle.difficulty === 'Difícil' ? 16 : puzzle.difficulty === 'Médio' ? 12 : 8); SoundEngine.finish();
  }, [checked, completed, puzzle?.id, onComplete]);
  useLayoutEffect(() => {
    const key = pendingFocus.current;
    if (!key) return;
    pendingFocus.current = '';
    const input = document.getElementById(`cross-${key}`) as HTMLInputElement | null;
    input?.focus({ preventScroll: true }); input?.select();
    input?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
  }, [focusRequest]);

  useLayoutEffect(() => {
    if (!started || !puzzle) return;
    const fit = () => {
      const board = boardRef.current;
      if (!board) return;
      const viewport = window.visualViewport;
      const available = Math.max(120, (viewport?.height || innerHeight) + (viewport?.offsetTop || 0) - board.getBoundingClientRect().top - 64);
      const minimum = innerWidth <= 760 ? 44 : 32;
      setBoardSize({ cell: Math.max(minimum, Math.min(innerWidth <= 760 ? 46 : 64, Math.floor((available - 8) / puzzle.rows) - 1)), height: available });
    };
    fit(); window.addEventListener('resize', fit); window.visualViewport?.addEventListener('resize', fit);
    return () => { window.removeEventListener('resize', fit); window.visualViewport?.removeEventListener('resize', fit); };
  }, [started, puzzle?.id, clearConfirm, checked]);
  useEffect(() => {
    const viewport = window.visualViewport;
    const adjust = () => {
      document.documentElement.style.setProperty('--keyboard-viewport', (viewport?.height || window.innerHeight) + 'px');
      const input = document.activeElement as HTMLElement | null;
      if (input?.id.startsWith('cross-') && input.tagName === 'INPUT') requestAnimationFrame(() => input.scrollIntoView({ block: 'nearest', inline: 'nearest' }));
    };
    viewport?.addEventListener('resize', adjust); adjust();
    return () => { viewport?.removeEventListener('resize', adjust); document.documentElement.style.removeProperty('--keyboard-viewport'); };
  }, []);
  useEffect(() => {
    const dismiss = (event: PointerEvent) => { if (!(event.target as Element).closest('.cross-clue-cell')) setTip(null); };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, []);

  if (loadState === 'loading') return <p role="status">Abrindo o acervo…</p>;
  if (loadState === 'error' || !puzzle || !selected) return <div className="load-status" role="status"><p>Não foi possível abrir as cruzadas.</p><button className="secondary" onClick={() => setAttempt(value => value + 1)}>Tentar novamente</button></div>;

  function focusCell(key: string, entry?: CrosswordEntry) {
    if (entry) setSelectedId(entry.id);
    pendingFocus.current = key;
    setActiveCell(key);
    setFocusRequest(value => value + 1);
  }
  function chooseEntry(entry: CrosswordEntry) { focusCell(entry.cells.find(key => !values[key]) || entry.cells[0], entry); }
  function update(next: Record<string, string>) { setProgress(previous => ({ ...previous, [puzzle!.id]: next })); setChecked(false); }
  function type(key: string, raw: string) {
    if (checked) return;
    setTip(null);
    const letters = cleanLetters(raw);
    if (!letters) { update({ ...values, [key]: '' }); return; }
    const offset = selected!.cells.indexOf(key);
    const entry = offset >= 0 ? selected! : puzzle!.entries.find(item => item.cells.includes(key))!;
    const position = entry.cells.indexOf(key);
    const next = writeEntry(puzzle!, values, entry, position, letters);
    update(next);
    const target = entry.cells[position + letters.length];
    if (target) focusCell(target, entry);
    else {
      const start = puzzle!.entries.indexOf(entry);
      const following = [...puzzle!.entries.slice(start + 1), ...puzzle!.entries.slice(0, start)].find(item => item.cells.some(cell => !next[cell]));
      if (following) focusCell(following.cells.find(cell => !next[cell])!, following);
    }
  }
  function keyDown(event: React.KeyboardEvent<HTMLInputElement>, key: string) {
    if (checked) return;
    if (event.nativeEvent.isComposing) return;
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey && cleanLetters(event.key)) { event.preventDefault(); type(key, event.key); return; }
    if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault(); const alternative = puzzle!.entries.find(entry => entry.id !== selected!.id && entry.cells.includes(key)); if (alternative) focusCell(key, alternative); return;
    }
    if (event.key === 'Tab' || event.key === 'Enter') {
      event.preventDefault(); const index = puzzle!.entries.indexOf(selected!) + (event.shiftKey ? -1 : 1);
      if (index >= 0 && index < puzzle!.entries.length) chooseEntry(puzzle!.entries[index]);
      else {
        const check = document.getElementById('cross-check') as HTMLButtonElement | null;
        document.getElementById(index < 0 ? 'cross-check' : check?.disabled ? 'cross-clear' : 'cross-check')?.focus();
      }
      return;
    }
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault(); const previous = selected!.cells[selected!.cells.indexOf(key) - 1];
      const target = event.key === 'Backspace' && !values[key] && previous ? previous : key;
      update({ ...values, [target]: '' }); focusCell(target, selected); return;
    }
    if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); focusCell(selected!.cells[event.key === 'Home' ? 0 : selected!.cells.length - 1], selected); return; }
    const deltas: Record<string, [number, number]> = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
    const delta = deltas[event.key];
    if (delta) {
      event.preventDefault(); let [row, col] = key.split(',').map(Number);
      while ((row += delta[0]) >= 0 && row < puzzle!.rows && (col += delta[1]) >= 0 && col < puzzle!.cols) {
        const next = cellKey(row, col); if (!puzzle!.solution[next]) continue;
        const direction = delta[0] ? 'V' : 'H';
        focusCell(next, puzzle!.entries.find(entry => entry.direction === direction && entry.cells.includes(next)) || puzzle!.entries.find(entry => entry.cells.includes(next))); break;
      }
    }
  }
  function showTip(element: HTMLElement, text: string) {
    const rect = element.getBoundingClientRect();
    setTip({ text, x: Math.max(12, Math.min(rect.left, window.innerWidth - 332)), y: Math.max(12, rect.top > 145 ? rect.top - 130 : rect.bottom + 8) });
  }
  const wordBank = (BANK_HINTS[puzzle.id] || []).filter(answer => puzzle.entries.some(entry => entry.answer === answer));
  if (!started) return <section className="crossword-picker"><h2>Escolha sua cruzada</h2><div className="edition-grid">{bank.map(item => <button className={`edition ${item.id === puzzle.id ? 'selected' : ''} ${finished.includes(item.id) ? 'edition-finished' : ''}`} key={item.id} aria-pressed={item.id === puzzle.id} onClick={() => { setPuzzleId(item.id); setDifficulty(item.difficulty); }}><span className="edition-mini" aria-hidden="true">{Array.from({ length: 25 }, (_, i) => <i key={i} className={i % 4 === 0 || i % 7 === 0 ? 'ink' : ''}/>)}</span><strong>{item.title}</strong>{finished.includes(item.id) && <span className="edition-finished-label"><Icon name="check" size={16}/>Concluída</span>}</button>)}</div><div className="cross-launch"><label htmlFor="cross-level">Nível<select id="cross-level" aria-label="Nível" value={difficulty} onChange={event => setDifficulty(event.target.value as CrosswordDifficulty)}>{['Fácil','Médio','Difícil'].map(level => <option key={level}>{level}</option>)}</select></label><button className="primary" onClick={() => { if (finished.includes(puzzle.id)) setProgress(previous => ({ ...previous, [puzzle.id]: {} })); setChecked(false); setClearConfirm(false); setStarted(true); }}>Abrir cruzada</button></div></section>;
  return <section style={{ '--cell-size': `${boardSize.cell}px`, '--board-height': `${boardSize.height}px` } as React.CSSProperties} className="crossword-experience" onKeyDown={event => { if (event.key === 'Escape') setTip(null); }}>
    <span className="sr-only" id="cross-clue-text">{selected.clue}</span>
    <div className="experience-actions cross-actions"><button className="primary" id="cross-check" onClick={() => { setTip(null); if (checked) { const next = bank[(bank.indexOf(puzzle) + 1) % bank.length]; setPuzzleId(next.id); setDifficulty(next.difficulty); setChecked(false); setStarted(false); } else { const next = Array.from(new Set([...finished, puzzle.id])); setFinished(next); try { localStorage.setItem(FINISHED_KEY, JSON.stringify(next)); } catch { setStorageOk(false); } setChecked(true); } }}>{checked ? 'Próxima' : 'Concluir'}</button><button className="secondary" id="cross-clear" onClick={() => { setClearConfirm(true); setTip(null); }}>Limpar</button>{checked && <span className="sr-only" role="status">{completed ? 'Cruzada completa!' : 'Respostas reveladas'}</span>}</div>
    {clearConfirm && <div className="inline-confirm"><p>Apagar o preenchimento desta edição?</p><button className="danger" onClick={() => { update({}); setClearConfirm(false); }}>Apagar preenchimento</button><button className="secondary" onClick={() => setClearConfirm(false)}>Manter</button></div>}
    <div ref={boardRef} className="cross-grid-viewport" aria-label="Grade com rolagem horizontal e vertical" onWheel={() => setTip(null)} onTouchMove={() => setTip(null)} onPointerLeave={event => { if (event.pointerType === 'mouse') setTip(null); }}><div className="cross-grid" role="grid" aria-label={`Cruzadas Diretas: ${puzzle.title}`} aria-rowcount={puzzle.rows} aria-colcount={puzzle.cols} style={{ '--cross-cols': puzzle.cols } as React.CSSProperties}>{Array.from({ length: puzzle.rows }, (_, row) => <div className="cross-row" role="row" key={row}>{Array.from({ length: puzzle.cols }, (_, col) => {
      const key = cellKey(row, col), solution = puzzle.solution[key], clueIds = puzzle.clues[key];
      if (solution) {
        const wrong = checked && values[key] !== solution;
        return <div role="gridcell" className={`cross-cell ${selected.cells.includes(key) ? 'in-word' : ''} ${activeCell === key ? 'active' : ''} ${wrong ? 'incorrect' : checked ? 'correct' : ''}`} key={col}><input id={`cross-${key}`} aria-label={`Letra, linha ${row + 1}, coluna ${col + 1}`} aria-describedby="cross-clue-text" aria-invalid={wrong || undefined} tabIndex={activeCell === key ? 0 : -1} value={checked ? solution : values[key] || ''} readOnly={checked} maxLength={2} autoComplete="off" autoCapitalize="characters" spellCheck={false} inputMode="text" enterKeyHint="next" onFocus={event => { setActiveCell(key); event.currentTarget.select(); if (!selected.cells.includes(key)) setSelectedId(puzzle.entries.find(entry => entry.direction === selected.direction && entry.cells.includes(key))?.id || puzzle.entries.find(entry => entry.cells.includes(key))!.id); }} onChange={() => {}} onInput={event => { if (!(event.nativeEvent as InputEvent).isComposing) type(key, event.currentTarget.value.slice(-1)); }} onCompositionEnd={event => type(key, event.currentTarget.value)} onKeyDown={event => keyDown(event, key)} onPaste={event => { event.preventDefault(); type(key, event.clipboardData.getData('text')); }}/>{wrong && values[key] && <small className="cross-original-letter" aria-label={`Você digitou ${values[key]}`}>{values[key]}</small>}</div>;
      }
      if (clueIds) { const entries = clueIds.map(id => puzzle.entries.find(entry => entry.id === id)!); const entry = entries.find(item => item.id === selected.id) || entries[0]; return <div role="gridcell" className={`cross-clue-cell ${entry.direction === 'V' ? 'is-vertical' : ''}`} key={col}><button onPointerEnter={event => { if (event.pointerType === 'mouse') showTip(event.currentTarget, entries.map(item => item.clue).join(' / ')); }} onFocus={event => showTip(event.currentTarget, entries.map(item => item.clue).join(' / '))} aria-label={`Pista: ${entries.map(item => `${item.clue}, ${item.direction === 'H' ? 'horizontal' : 'vertical'}`).join('; ')}`} onClick={event => { const next = entries.length > 1 && entry.id === selected.id ? entries[(entries.indexOf(entry) + 1) % entries.length] : entry; chooseEntry(next); showTip(event.currentTarget, next.clue); }}><span>{entry.clue}</span><Icon name="arrow" size={12}/>{entries.length > 1 && <small>2 pistas</small>}</button></div>; }
      return <div role="gridcell" className="cross-block" key={col} aria-hidden="true"/>;
    })}</div>)}</div></div>
    {tip && <div className="cross-tooltip" role="tooltip" style={{ left: tip.x, top: tip.y }}>{tip.text}</div>}
    {wordBank.length > 0 && <p className="cross-word-bank">Banco: {wordBank.join(' · ')}</p>}
    {!storageOk && <p role="status">O navegador não conseguiu salvar o preenchimento.</p>}
  </section>;
}

