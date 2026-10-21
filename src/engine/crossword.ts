export type CrosswordDifficulty = 'Fácil' | 'Médio' | 'Difícil';
export interface CrosswordEntry { id: string; answer: string; clue: string; row: number; col: number; direction: 'H' | 'V'; cells: string[]; clueCell: string; }
export interface CrosswordPuzzle { id: string; title: string; difficulty: CrosswordDifficulty; rows: number; cols: number; entries: CrosswordEntry[]; solution: Record<string, string>; clues: Record<string, string[]>; }
export const cellKey = (row: number, col: number) => `${row},${col}`;
export function cleanLetters(value: string): string { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z]/g, ''); }

export function importCrosswordBank(raw: unknown): CrosswordPuzzle[] {
  if (!Array.isArray(raw)) throw new Error('Acervo inválido.');
  return raw.map((value, index) => {
    if (!value || !Array.isArray(value.words) || !Array.isArray(value.grid) || !['Fácil', 'Médio', 'Difícil'].includes(value.difficulty) || !Number.isInteger(value.rows) || !Number.isInteger(value.cols) || value.rows < 1 || value.cols < 1 || value.rows > 30 || value.cols > 30) throw new Error('Grade inválida.');
    const solution: Record<string, string> = {}, clues: Record<string, string[]> = {};
    const entries = value.words.map((word: { word: string; clue: string; r: number; c: number; dir: 'H' | 'V' }, wordIndex: number): CrosswordEntry => {
      if (typeof word.word !== 'string' || !/^[A-Z]{2,30}$/.test(word.word) || typeof word.clue !== 'string' || !Number.isInteger(word.r) || !Number.isInteger(word.c) || !['H', 'V'].includes(word.dir)) throw new Error('Pista inválida.');
      const cells = [...word.word].map((letter, offset) => {
        const row = word.r + (word.dir === 'V' ? offset : 0), col = word.c + (word.dir === 'H' ? offset : 0);
        if (value.grid[row]?.[col] !== letter) throw new Error('Resposta não confere com a grade.');
        const key = cellKey(row + 1, col + 1);
        if (solution[key] && solution[key] !== letter) throw new Error('Cruzamento incompatível.');
        solution[key] = letter; return key;
      });
      const id = `w${wordIndex + 1}`;
      const clueCell = cellKey(word.r + 1 - (word.dir === 'V' ? 1 : 0), word.c + 1 - (word.dir === 'H' ? 1 : 0));
      (clues[clueCell] ||= []).push(id);
      return { id, answer: word.word, clue: word.clue, row: word.r + 1, col: word.c + 1, direction: word.dir, cells, clueCell };
    });
    if (Object.keys(clues).some(key => solution[key])) throw new Error('Uma pista ocupa uma letra.');
    return { id: `cross-${index + 1}`, title: String(value.title).replace(/^Edição \d+\s*[—–-]\s*/, ''), difficulty: value.difficulty, rows: value.rows + 1, cols: value.cols + 1, entries, solution, clues };
  });
}

export function crosswordComplete(puzzle: CrosswordPuzzle, values: Record<string, string>): boolean { return Object.entries(puzzle.solution).every(([key, letter]) => values[key] === letter); }
export function writeEntry(puzzle: CrosswordPuzzle, values: Record<string, string>, entry: CrosswordEntry, offset: number, text: string): Record<string, string> {
  const next = { ...values };
  [...cleanLetters(text)].slice(0, entry.cells.length - offset).forEach((letter, index) => { if (puzzle.solution[entry.cells[offset + index]]) next[entry.cells[offset + index]] = letter; });
  return next;
}
