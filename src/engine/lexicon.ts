import { normalizeWord } from './prng';

export interface WordDictionary {
  size: number;
  has: (key: string) => boolean;
  spelling: (key: string) => string | undefined;
}

export function parseLexicon(text: string): WordDictionary {
  // Sorted display words keep accent information without a second 300k-entry map.
  const words = text.trim().split(/\r?\n/);
  const find = (key: string): number => {
    let low = 0, high = words.length - 1;
    while (low <= high) {
      const mid = (low + high) >>> 1;
      const candidate = normalizeWord(words[mid]);
      if (candidate === key) return mid;
      if (candidate < key) low = mid + 1; else high = mid - 1;
    }
    return -1;
  };
  return { size: words.length, has: key => find(normalizeWord(key)) >= 0, spelling: key => words[find(normalizeWord(key))] };
}

let pending: Promise<WordDictionary> | undefined;
export function loadLexicon(): Promise<WordDictionary> {
  if (!pending) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    const compressed = typeof DecompressionStream !== 'undefined';
    pending = fetch(`${import.meta.env.BASE_URL}lexicon/pt-BR.txt${compressed ? '.gz' : ''}?v=93ba2a6f`, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('Não foi possível carregar o vocabulário.');
        if (compressed && response.body && !response.headers.get('content-encoding')) return new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).text();
        return response.text();
      })
      .then(text => { if (text.length < 100000) throw new Error('O arquivo de palavras está incompleto.'); return parseLexicon(text); })
      .catch(error => { pending = undefined; throw error; })
      .finally(() => clearTimeout(timeout));
  }
  return pending;
}
