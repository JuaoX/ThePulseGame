import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CrosswordDifficulty, CrosswordEntry, CrosswordPuzzle, cellKey, cleanLetters, crosswordComplete, importCrosswordBank, writeEntry } from '../engine/crossword';
import { SoundEngine } from '../engine/sound';
import { Icon } from './Icon';

type Progress = Record<string, Record<string, string>>;
const STORAGE_KEY = 'pulse_crosswords_v1';
function readProgress(): Progress {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    return Object.fromEntries(Object.entries(raw).filter(([key, value]) => /^cross-\d{1,2}$/.test(key) && value && typeof value === 'object' && !Array.isArray(value)).slice(0, 20).map(([key, value]) => [key, Object.fromEntries(Object.entries(value as object).filter(([cell, letter]) => /^\d{1,2},\d{1,2}$/.test(cell) && typeof letter === 'string' && /^[A-Z]$/.test(letter)).slice(0, 500))]));
  } catch { return {}; }
}

export function CrosswordExperience({ onComplete, discoveries }: { onComplete: (key: string, amount: number) => void; discoveries: string[] }) {
  const [bank, setBank] = useState<CrosswordPuzzle[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [difficulty, setDifficulty] = useState<CrosswordDifficulty>('Fácil');
  const [puzzleId, setPuzzleId] = useState('cross-1');
  const [selectedId, setSelectedId] = useState('w1');
  const [activeCell, setActiveCell] = useState('');
  const [progress, setProgress] = useState<Progress>(readProgress);
  const [checked, setChecked] = useState(false);
  const [notice, setNotice] = useState('');
  const [storageOk, setStorageOk] = useState(true);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [focusRequest, setFocusRequest] = useState(0);
  const pendingFocus = useRef('');
  const latest = useRef(progress), reported = useRef('');
  latest.current = progress;
  const puzzles = useMemo(() => bank.filter(puzzle => puzzle.difficulty === difficulty), [bank, difficulty]);
  const puzzle = puzzles.find(item => item.id === puzzleId) || puzzles[0];
  const selected = puzzle?.entries.find(entry => entry.id === selectedId) || puzzle?.entries[0];
  const initialLetters: Record<string, string> = puzzle?.difficulty === 'Fácil' ? Object.fromEntries(puzzle.entries.map(entry => [entry.cells[0], entry.answer[0]])) : {};
  const values = { ...initialLetters, ...(progress[puzzle?.id || ''] || {}) };
  const completed = puzzle ? crosswordComplete(puzzle, values) : false;
  const completedWords = puzzle?.entries.filter(entry => entry.cells.every((key, index) => values[key] === entry.answer[index])).length || 0;
  const filledWords = puzzle?.entries.filter(entry => entry.cells.every(key => values[key])).length || 0;
  const allFilled = puzzle ? Object.keys(puzzle.solution).every(key => values[key]) : false;

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
  useEffect(() => { setSelectedId('w1'); setActiveCell(puzzle?.entries[0]?.cells[0] || ''); setChecked(false); setNotice(''); setClearConfirm(false); reported.current = ''; }, [puzzle?.id]);
  useEffect(() => {
    if (!completed || !puzzle || reported.current === puzzle.id) return;
    reported.current = puzzle.id; onComplete(puzzle.id, puzzle.difficulty === 'Difícil' ? 16 : puzzle.difficulty === 'Médio' ? 12 : 8); SoundEngine.finish();
  }, [completed, puzzle?.id, onComplete]);
  useLayoutEffect(() => {
    const key = pendingFocus.current;
    if (!key) return;
    pendingFocus.current = '';
    const input = document.getElementById(`cross-${key}`) as HTMLInputElement | null;
    input?.focus({ preventScroll: true }); input?.select();
    input?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
  }, [focusRequest]);

  if (loadState === 'loading') return <p role="status">Abrindo o acervo…</p>;
  if (loadState === 'error' || !puzzle || !selected) return <div className="load-status" role="status"><p>Não foi possível abrir as cruzadas.</p><button className="secondary" onClick={() => setAttempt(value => value + 1)}>Tentar novamente</button></div>;

  function focusCell(key: string, entry?: CrosswordEntry) {
    if (entry) setSelectedId(entry.id);
    pendingFocus.current = key;
    setActiveCell(key);
    setFocusRequest(value => value + 1);
  }
  function chooseEntry(entry: CrosswordEntry) { focusCell(entry.cells.find(key => !values[key]) || entry.cells[0], entry); }
  function update(next: Record<string, string>) { setProgress(previous => ({ ...previous, [puzzle!.id]: next })); setChecked(false); setNotice(''); }
  function type(key: string, raw: string) {
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
        document.getElementById(index < 0 ? 'cross-level' : check?.disabled ? 'cross-clear' : 'cross-check')?.focus();
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
  return <section className="crossword-experience">
    <div className="cross-selectors"><label htmlFor="cross-level">Nível<select id="cross-level" aria-label="Nível" value={difficulty} onChange={event => setDifficulty(event.target.value as CrosswordDifficulty)}>{['Fácil', 'Médio', 'Difícil'].map(level => <option key={level}>{level}</option>)}</select></label><label htmlFor="cross-edition">Edição<select id="cross-edition" aria-label="Edição" value={puzzle.id} onChange={event => setPuzzleId(event.target.value)}>{puzzles.map(item => <option key={item.id} value={item.id}>{item.title}{discoveries.includes(item.id) ? ' · concluída' : ''}</option>)}</select></label></div>
    <p className="meta">{puzzle.difficulty === 'Fácil' ? 'Primeiras letras dadas.' : puzzle.difficulty === 'Médio' ? 'Confira letras quando precisar.' : 'Sem letras dadas. Conferência só ao preencher tudo.'}</p>
    <div className="cross-active-clue"><div><span>{selected.direction === 'H' ? 'Horizontal' : 'Vertical'} · {selected.answer.length} letras</span><strong id="cross-clue-text">{selected.clue}</strong></div><button className="icon-button direction-button" aria-label="Trocar direção no cruzamento" disabled={!puzzle.entries.some(entry => entry.id !== selected.id && entry.cells.includes(activeCell))} onClick={() => { const entry = puzzle.entries.find(item => item.id !== selected.id && item.cells.includes(activeCell)); if (entry) focusCell(activeCell, entry); }}><Icon name="arrow"/></button></div>
    <div className="cross-grid-viewport" aria-label="Grade com rolagem horizontal e vertical"><div className="cross-grid" role="grid" aria-label={`Cruzadas Diretas: ${puzzle.title}`} aria-rowcount={puzzle.rows} aria-colcount={puzzle.cols} style={{ '--cross-cols': puzzle.cols } as React.CSSProperties}>{Array.from({ length: puzzle.rows }, (_, row) => <div className="cross-row" role="row" key={row}>{Array.from({ length: puzzle.cols }, (_, col) => {
      const key = cellKey(row, col), solution = puzzle.solution[key], clueIds = puzzle.clues[key];
      if (solution) {
        const wrong = checked && puzzle.difficulty !== 'Difícil' && Boolean(values[key]) && values[key] !== solution;
        return <div role="gridcell" className={`cross-cell ${selected.cells.includes(key) ? 'in-word' : ''} ${activeCell === key ? 'active' : ''} ${wrong ? 'incorrect' : ''}`} key={col}><input id={`cross-${key}`} aria-label={`Letra, linha ${row + 1}, coluna ${col + 1}`} aria-describedby="cross-clue-text" aria-invalid={wrong || undefined} tabIndex={activeCell === key ? 0 : -1} value={values[key] || ''} maxLength={2} autoComplete="off" autoCapitalize="characters" spellCheck={false} inputMode="text" enterKeyHint="next" onFocus={event => { setActiveCell(key); event.currentTarget.select(); if (!selected.cells.includes(key)) setSelectedId(puzzle.entries.find(entry => entry.direction === selected.direction && entry.cells.includes(key))?.id || puzzle.entries.find(entry => entry.cells.includes(key))!.id); }} onChange={() => {}} onInput={event => { if (!(event.nativeEvent as InputEvent).isComposing) type(key, event.currentTarget.value.slice(-1)); }} onCompositionEnd={event => type(key, event.currentTarget.value)} onKeyDown={event => keyDown(event, key)} onPaste={event => { event.preventDefault(); type(key, event.clipboardData.getData('text')); }}/></div>;
      }
      if (clueIds) { const entries = clueIds.map(id => puzzle.entries.find(entry => entry.id === id)!); const entry = entries.find(item => item.id === selected.id) || entries[0]; return <div role="gridcell" className={`cross-clue-cell ${entry.direction === 'V' ? 'is-vertical' : ''}`} key={col}><button aria-label={`Pista: ${entries.map(item => `${item.clue}, ${item.direction === 'H' ? 'horizontal' : 'vertical'}`).join('; ')}`} onClick={() => { const next = entries.length > 1 && entry.id === selected.id ? entries[(entries.indexOf(entry) + 1) % entries.length] : entry; chooseEntry(next); }}><span>{entry.clue}</span><Icon name="arrow" size={12}/>{entries.length > 1 && <small>2 pistas</small>}</button></div>; }
      return <div role="gridcell" className="cross-block" key={col} aria-hidden="true"/>;
    })}</div>)}</div></div>
    <div className="cross-status" role="status">{completed ? 'Cruzada completa!' : `${puzzle.difficulty === 'Difícil' ? filledWords : completedWords}/${puzzle.entries.length} palavras ${puzzle.difficulty === 'Difícil' ? 'preenchidas' : 'certas'}`}{notice && <span>{notice}</span>}{!storageOk && <span>O navegador não conseguiu salvar o preenchimento.</span>}</div>
    <div className="experience-actions"><button className="secondary" id="cross-check" disabled={puzzle.difficulty === 'Difícil' && !allFilled} onClick={() => { setChecked(true); const errors = Object.keys(puzzle.solution).filter(key => values[key] && values[key] !== puzzle.solution[key]).length; setNotice(errors ? puzzle.difficulty === 'Difícil' ? 'Ainda há respostas para revisar.' : `${errors} ${errors === 1 ? 'letra precisa' : 'letras precisam'} de revisão.` : completed ? 'Tudo certo.' : 'As letras preenchidas estão certas.'); }}>{puzzle.difficulty === 'Difícil' ? 'Conferir edição' : 'Conferir letras'}</button><button className="secondary" id="cross-clear" onClick={() => setClearConfirm(true)}>Limpar</button></div>
    {clearConfirm && <div className="inline-confirm"><p>Apagar o preenchimento desta edição?</p><button className="danger" onClick={() => { update({}); setClearConfirm(false); }}>Apagar preenchimento</button><button className="secondary" onClick={() => setClearConfirm(false)}>Manter</button></div>}
    <details className="disclosure"><summary>Teclado e navegação</summary><p>Toque numa pista ou letra e digite. O cursor segue a palavra. Setas movem pela grade; espaço troca a direção no cruzamento; Tab e Enter passam à próxima palavra. Backspace apaga e recua. Você também pode colar uma resposta. A grade pode ser arrastada, e o preenchimento fica salvo neste navegador.</p></details>
    <details className="disclosure"><summary>Todas as pistas</summary><div className="cross-clue-list">{puzzle.entries.map((entry, index) => <button key={entry.id} aria-pressed={entry.id === selected.id} onClick={() => chooseEntry(entry)}><span>{index + 1}. {entry.clue}</span><small>{entry.answer.length} · {entry.direction === 'H' ? 'horizontal' : 'vertical'}</small></button>)}</div></details>
  </section>;
}




