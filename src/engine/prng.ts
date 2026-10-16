import { QuestionItem } from '../types/game';

/**
 * Hash FNV-1a de 32 bits determinístico
 */
export function hashSeed(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Gerador pseudoaleatório Mulberry32 determinístico
 */
export function createPRNG(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Retorna a chave de data YYYY-MM-DD estritamente no fuso horário de Brasília (America/Sao_Paulo)
 */
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
    // Fallback UTC-3 manual caso Intl falhe em ambiente restrito
  }
  const utcMs = referenceDate.getTime() + referenceDate.getTimezoneOffset() * 60000;
  const brtDate = new Date(utcMs - 3 * 3600000);
  const y = brtDate.getFullYear();
  const m = String(brtDate.getMonth() + 1).padStart(2, '0');
  const d = String(brtDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDatePtBr(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  if (!y || !m || !d) return dateKey;
  return `${d} de ${months[(m - 1) % 12]} de ${y}`;
}

/**
 * Normaliza palavra removendo acentos, espaços e símbolos para comparação justa
 */
export function normalizeWord(raw: string): string {
  return (raw || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z]/g, '');
}

const PROFANITY_ROOTS = [
  'BUCET', 'CARALH', 'PORRA', 'MERDA', 'FODER', 'FODA', 'PUTA', 'PUTO',
  'VIADO', 'BOSTA', 'CUZAO', 'CACETE', 'PUNHET', 'ARROMBAD', 'VAGABUND',
  'PIRANH', 'PIROCA', 'XOXOT', 'SIRIRIC', 'BOQUET', 'CHUPAR', 'CORNO'
];

export interface WordValidationResult {
  valid: boolean;
  normalized: string;
  reason?: string;
}

export function validateWordSubmission(
  rawInput: string,
  requiredSyllable: string,
  usedWords: Set<string>,
  dictionary: ReadonlySet<string>
): WordValidationResult {
  const word = normalizeWord(rawInput);
  const syl = normalizeWord(requiredSyllable);

  if (!word || word.length < 3) {
    return { valid: false, normalized: word, reason: 'Digite uma palavra com pelo menos 3 letras.' };
  }

  for (const root of PROFANITY_ROOTS) {
    if (word.includes(root)) {
      return { valid: false, normalized: word, reason: 'Palavra bloqueada pelo filtro do jogo.' };
    }
  }

  if (/(.)\1\1/.test(word) || /[BCDFGHJKLMNPQRSTVWXYZ]{5,}/.test(word)) {
    return { valid: false, normalized: word, reason: 'Sequência de letras inválida.' };
  }

  if (!word.includes(syl)) {
    return { valid: false, normalized: word, reason: `A palavra deve conter a sílaba "${syl}".` };
  }

  if (usedWords.has(word)) {
    return { valid: false, normalized: word, reason: `"${word}" já foi utilizada nesta partida.` };
  }

  if (!dictionary.has(word)) {
    return { valid: false, normalized: word, reason: `"${word}" não consta no dicionário do Pulso.` };
  }

  return { valid: true, normalized: word };
}

/**
 * Embaralha as 4 alternativas de forma determinística preservando a referência correta
 */
export function shuffleQuestionOptions(q: QuestionItem, rng: () => number): QuestionItem {
  const indices: [number, number, number, number] = [0, 1, 2, 3];
  for (let i = 3; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = indices[i];
    indices[i] = indices[j];
    indices[j] = temp;
  }
  const newOptions: [string, string, string, string] = [
    q.options[indices[0]],
    q.options[indices[1]],
    q.options[indices[2]],
    q.options[indices[3]],
  ];
  const newCorrect = indices.indexOf(q.correctIndex) as 0 | 1 | 2 | 3;
  return {
    ...q,
    options: newOptions,
    correctIndex: newCorrect,
  };
}

/**
 * Gerador procedural determinístico de matemática quando o banco estático da sessão foi todo respondido
 */
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
    explanation = `Multiplicamos primeiro: ${b} × 2 = ${b * 2}. Somando ${a}, temos ${answer}.`;
  } else if (difficulty === 2) {
    answer = a * b - c;
    prompt = `Calcule o resultado de ${a} × ${b} - ${c}:`;
    explanation = `${a} × ${b} = ${a * b}. Subtraindo ${c}, o resultado é ${answer}.`;
  } else {
    answer = (a + b) * c;
    prompt = `Qual é o valor de (${a} + ${b}) × ${c}?`;
    explanation = `Somamos os parênteses (${a + b}) e multiplicamos por ${c}: ${answer}.`;
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
  const rawQ: QuestionItem = {
    id: `proc_math_${serial}`,
    category: 'math',
    difficulty,
    prompt,
    options: [String(answer), arr[0], arr[1], arr[2]],
    correctIndex: 0,
    explanation,
  };
  return shuffleQuestionOptions(rawQ, rng);
}