import { QUESTION_BANK } from '../data/questions';
import { MISSIONS } from '../data/missions';
import { CategoryId, QuestionItem } from '../types/game';
import { createPRNG, hashSeed, shuffleQuestionOptions } from './prng';

export function shuffled<T>(items: readonly T[], rng: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export const LEARNING_BANK: QuestionItem[] = [
  ...QUESTION_BANK,
  ...MISSIONS.flatMap(mission => mission.questions),
].map(q => ({ ...q, options: q.options.map(option => option.replace(/с/g, 'c')) as QuestionItem['options'], skill: q.skill || ({ math: 'Raciocínio matemático', logic: 'Lógica e evidências', words: 'Linguagem', general: 'Conhecimentos gerais' }[q.category]) }));

const ARCADE_BANK = LEARNING_BANK.filter(q => !q.context && !q.transfer);

function generated(seed: number, category: 'math' | 'logic'): QuestionItem[] {
  const rng = createPRNG(seed);
  const result: QuestionItem[] = [];
  for (let i = 0; i < 60; i++) {
    const a = 2 + Math.floor(rng() * 25), b = 2 + Math.floor(rng() * 12);
    const difference = 2 + Math.floor(rng() * 8);
    const kind = i % 3;
    const answer = category === 'logic' ? (kind === 0 ? a + difference * 4 : kind === 1 ? a * 8 : a * (a - 1) / 2) : (kind === 0 ? a * b : kind === 1 ? a * 5 : a * b - a);
    const prompt = category === 'logic'
      ? kind === 0 ? `Complete: ${a}, ${a + difference}, ${a + difference * 2}, ${a + difference * 3}, …`
        : kind === 1 ? `Uma sequência dobra a cada passo: ${a}, ${a * 2}, ${a * 4}, … Qual é o próximo número?`
          : `${a} pessoas se cumprimentam uma vez com um aperto de mão por par. Quantos apertos ocorrem?`
      : kind === 0 ? `${a} × ${b} = ?`
        : kind === 1 ? `Quanto é 25% de ${a * 20}?`
          : `${a * b} − ${a} = ?`;
    const explanation = category === 'logic'
      ? kind === 0 ? `A sequência soma ${difference} a cada passo. ${a + difference * 3} + ${difference} = ${answer}.`
        : kind === 1 ? `Cada termo é o dobro do anterior. ${a * 4} × 2 = ${answer}.`
          : `Cada pessoa encontra ${a - 1} outras, mas cada par foi contado duas vezes: ${a} × ${a - 1} ÷ 2 = ${answer}.`
      : kind === 0 ? `Quantidade de caixas × livros por caixa: ${a} × ${b} = ${answer}.`
        : kind === 1 ? `25% equivalem a um quarto. ${a * 20} ÷ 4 = ${answer}.`
          : `Subtraímos o que foi usado: ${a * b} − ${a} = ${answer}.`;
    const options = [String(answer), String(answer + b), String(Math.max(0, answer - 1)), String(answer + 1)] as QuestionItem['options'];
    if (new Set(options).size !== 4) continue;
    result.push({ id: `generated_${hashSeed(prompt)}`, category, difficulty: (kind + 1) as 1 | 2 | 3, prompt, options, correctIndex: 0, explanation, skill: category === 'logic' ? 'Padrões e contagem' : kind === 1 ? 'Porcentagem' : 'Raciocínio matemático' });
  }
  return result;
}

export function buildDeck(category: CategoryId, seed: number, recent: readonly string[] = [], daily = false): QuestionItem[] {
  const rng = createPRNG(seed);
  // The daily order is fixed by date, independent of scores and local history.
  const candidates = daily ? ARCADE_BANK : [
    ...ARCADE_BANK,
    ...(category === 'math' || category === 'mixed' ? generated(seed, 'math') : []),
    ...(category === 'logic' || category === 'mixed' ? generated(seed ^ 1927, 'logic') : []),
  ];
  const allowed = shuffled(candidates.filter(q => category === 'mixed' || q.category === category), rng);
  const unique = [...new Map(allowed.map(q => [q.prompt, q])).values()];
  const fresh = daily ? unique : [...unique.filter(q => !recent.includes(q.id)), ...unique.filter(q => recent.includes(q.id))];
  if (category === 'mixed' && !daily) {
    const categories = shuffled(['math', 'logic', 'words', 'general'] as const, rng);
    const groups = categories.map(value => fresh.filter(q => q.category === value));
    const balanced: QuestionItem[] = [];
    while (groups.some(group => group.length)) for (const group of groups) { const next = group.shift(); if (next) balanced.push(next); }
    return balanced.slice(0, 30).map(q => shuffleQuestionOptions(q, rng));
  }
  return fresh.slice(0, daily ? 10 : 30).map(q => shuffleQuestionOptions(q, rng));
}
