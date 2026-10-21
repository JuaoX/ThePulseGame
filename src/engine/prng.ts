import { QuestionItem } from '../types/game';

export function hashSeed(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function createPRNG(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getBrasiliaDateKey(referenceDate: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(referenceDate);
    const y = parts.find(p => p.type === 'year')?.value;
    const m = parts.find(p => p.type === 'month')?.value;
    const d = parts.find(p => p.type === 'day')?.value;
    if (y && m && d) return `${y}-${m}-${d}`;
  } catch {
    // Fallback UTC-3
  }
  return new Date(referenceDate.getTime() - 3 * 3600000).toISOString().slice(0, 10);
}

export function normalizeWord(raw: string): string {
  return (raw || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z]/g, '');
}

const BLOCKED_WORDS = new Set([
  'BUCETA', 'CARALHO', 'PORRA', 'MERDA', 'FODER', 'FODA', 'PUTA', 'PUTO',
  'VIADO', 'BOSTA', 'CUZAO', 'CACETE', 'PUNHETA', 'ARROMBADO', 'ARROMBADA',
  'VAGABUNDO', 'VAGABUNDA', 'PIROCA', 'XOXOTA', 'BOQUETE'
]);

export interface WordValidationResult {
  valid: boolean;
  normalized: string;
  reason?: string;
}

export function validateWordSubmission(
  rawInput: string,
  requiredSyllable: string,
  usedWords: Set<string>,
  dictionary: Pick<ReadonlySet<string>, 'has'>
): WordValidationResult {
  const word = normalizeWord(rawInput);
  const syl = normalizeWord(requiredSyllable);

  if (!/^[a-zà-ü]+$/iu.test(rawInput.trim()) || /[×÷]/u.test(rawInput)) {
    return { valid: false, normalized: word, reason: 'Use uma palavra, só com letras. Acentos são bem-vindos.' };
  }

  if (!word || word.length < 3) {
    return { valid: false, normalized: word, reason: 'Digite pelo menos 3 letras!' };
  }

  if (BLOCKED_WORDS.has(word)) {
    return { valid: false, normalized: word, reason: 'Essa palavra não faz parte do vocabulário desta atividade.' };
  }

  if (/(.)\1\1/.test(word) || /[BCDFGHJKLMNPQRSTVWXYZ]{5,}/.test(word)) {
    return { valid: false, normalized: word, reason: 'Combinação inválida!' };
  }

  if (!word.includes(syl)) {
    return { valid: false, normalized: word, reason: `Precisa ter "${syl}"!` };
  }

  if (usedWords.has(word)) {
    return { valid: false, normalized: word, reason: `"${word}" já foi usada!` };
  }

  if (!dictionary.has(word)) {
    return { valid: false, normalized: word, reason: `Ainda não encontramos "${word}" no vocabulário do jogo. Tente outra palavra.` };
  }

  return { valid: true, normalized: word };
}

export function shuffleQuestionOptions(q: QuestionItem, rng: () => number): QuestionItem {
  const indices: [number, number, number, number] = [0, 1, 2, 3];
  for (let i = 3; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = indices[i];
    indices[i] = indices[j];
    indices[j] = temp;
  }
  return {
    ...q,
    options: [
      q.options[indices[0]],
      q.options[indices[1]],
      q.options[indices[2]],
      q.options[indices[3]],
    ],
    correctIndex: indices.indexOf(q.correctIndex) as 0 | 1 | 2 | 3,
  };
}

export function generateProceduralMathQuestion(
  rng: () => number,
  difficulty: 1 | 2 | 3,
  serial: number
): QuestionItem {
  const a = Math.floor(rng() * (difficulty === 1 ? 14 : difficulty === 2 ? 24 : 36)) + 5;
  const b = Math.floor(rng() * (difficulty === 1 ? 9 : 14)) + 3;
  const c = Math.floor(rng() * 15) + 4;

  let prompt = '';
  let answer = 0;
  let explanation = '';

  if (difficulty === 1) {
    answer = a + b * 2;
    prompt = `Quanto é ${a} + (${b} × 2)?`;
    explanation = `${b} × 2 = ${b * 2}. Somando ${a} = ${answer}.`;
  } else if (difficulty === 2) {
    answer = a * b - c;
    prompt = `Calcule rápido: ${a} × ${b} - ${c}`;
    explanation = `${a} × ${b} = ${a * b}. Subtraindo ${c} = ${answer}.`;
  } else {
    answer = (a + b) * c;
    prompt = `Qual é o valor de (${a} + ${b}) × ${c}?`;
    explanation = `(${a + b}) × ${c} = ${answer}.`;
  }

  const deltas = [-12, -6, -4, -2, 2, 4, 6, 8, 12];
  const wrongs = new Set<string>();
  let guard = 0;
  while (wrongs.size < 3 && guard < 40) {
    guard++;
    const d = deltas[Math.floor(rng() * deltas.length)];
    const cand = answer + d;
    if (cand !== answer && cand > 0) wrongs.add(String(cand));
  }
  while (wrongs.size < 3) {
    wrongs.add(String(answer + wrongs.size + 1));
  }
  const arr = Array.from(wrongs);
  return shuffleQuestionOptions(
    {
      id: `proc_math_${serial}`,
      category: 'math',
      difficulty,
      prompt,
      options: [String(answer), arr[0], arr[1], arr[2]],
      correctIndex: 0,
      explanation,
    },
    rng
  );
}
