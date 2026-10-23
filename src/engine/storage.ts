import { AnswerHistoryItem, CategoryId, DailyAttemptRecord, GameModeId, PlayerProfile, QuestionItem } from '../types/game';
import { BASE_CHARACTERS, CHARACTERS, FREE_CHARACTERS, characterById } from '../data/characters';

const STORAGE_KEY = 'the_pulse_game_v10_profile'; // Keep existing players' progress.
const MODES: GameModeId[] = ['wordbomb', 'daily', 'elevator', 'classic'];
const CATEGORIES: CategoryId[] = ['mixed', 'math', 'logic', 'words', 'general'];
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const number = (value: unknown, fallback = 0, max = 1_000_000_000): number => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.min(max, Math.floor(value)) : fallback;
const string = (value: unknown, max: number, fallback = '') => typeof value === 'string' ? value.slice(0, max) : fallback;

export function createDefaultProfile(): PlayerProfile {
  return { version: 12, username: 'Visitante', avatarStyle: 'lorelei', avatarSeed: 'Kael', avatarBg: '0f172a', language: 'pt', reducedMotion: false, sfxVolume: 50, coins: 0, keys: 0, careerXP: 0,
    selectedMode: 'wordbomb', selectedCategory: 'mixed', matchesPlayed: 0, totalQuestionsAnswered: 0, totalQuestionsCorrect: 0, highestComboEver: 1,
    bestScores: { wordbomb: 0, daily: 0, elevator: 0, classic: 0 }, bestCategoryScores: { mixed: 0, math: 0, logic: 0, words: 0, general: 0 }, dailyHistory: {}, relaxedMode: false, autoAdvance: true, fragments: 12, ownedCharacters: [...FREE_CHARACTERS], equippedCharacter: 'kael', discoveries: [], recentQuestionIds: [], reviewHistory: [], missionBest: {} };
}

function readQuestion(raw: unknown): QuestionItem | undefined {
  const q = object(raw);
  if (typeof q.id !== 'string' || typeof q.prompt !== 'string' || !Array.isArray(q.options) || q.options.length !== 4 || !q.options.every(o => typeof o === 'string') || ![0, 1, 2, 3].includes(q.correctIndex as number) || !['math', 'logic', 'words', 'general'].includes(q.category as string)) return undefined;
  return { id: q.id.slice(0, 120), prompt: q.prompt.slice(0, 800), category: q.category as QuestionItem['category'], difficulty: [1, 2, 3].includes(q.difficulty as number) ? q.difficulty as 1 | 2 | 3 : 1,
    options: q.options.map(o => string(o, 400)) as QuestionItem['options'], correctIndex: q.correctIndex as QuestionItem['correctIndex'], explanation: string(q.explanation, 1200), skill: string(q.skill, 100), context: string(q.context, 1200), transfer: q.transfer === true };
}

function readHistory(raw: unknown): AnswerHistoryItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(-120).flatMap(value => {
    const item = object(value);
    if (typeof item.prompt !== 'string' || typeof item.isCorrect !== 'boolean') return [];
    return [{ step: number(item.step), prompt: string(item.prompt, 800), userAnswer: string(item.userAnswer, 400), correctAnswer: string(item.correctAnswer, 400), isCorrect: item.isCorrect, pointsDelta: number(item.pointsDelta, 0, 10000), explanation: string(item.explanation, 1200), questionId: string(item.questionId, 120), skill: string(item.skill, 100), transfer: item.transfer === true, question: readQuestion(item.question) }];
  });
}

export function sanitizeProfile(raw: unknown): PlayerProfile {
  const def = createDefaultProfile(), obj = object(raw);
  const best = object(obj.bestScores), catBest = object(obj.bestCategoryScores);
  const dailyHistory: Record<string, DailyAttemptRecord> = {};
  for (const [key, value] of Object.entries(object(obj.dailyHistory)).slice(-90)) {
    const day = object(value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || typeof day.score !== 'number' || !Number.isFinite(day.score)) continue;
    dailyHistory[key] = { dateKey: key, score: number(day.score), safeScore: number(day.safeScore), salvagedScore: number(day.salvagedScore), correctCount: number(day.correctCount, 0, 10), totalCount: number(day.totalCount, 0, 10), peakCombo: Math.max(1, Math.min(3, Number(day.peakCombo) || 1)), timeline: string(day.timeline, 80), shareText: string(day.shareText, 1200) };
  }
  const missionBest: PlayerProfile['missionBest'] = {};
  for (const id of ['water', 'market', 'signal']) {
    const entry = object(object(obj.missionBest)[id]);
    if (typeof entry.correct === 'number') missionBest[id] = { correct: number(entry.correct, 0, 8), total: number(entry.total, 8, 8), transfer: number(entry.transfer, 0, 2) };
  }
  const totalQuestionsAnswered = number(obj.totalQuestionsAnswered);
  const legacy = obj.version === 11 && !Array.isArray(obj.ownedCharacters);
  const ownedCharacters = [...new Set([...FREE_CHARACTERS, ...(legacy ? BASE_CHARACTERS : Array.isArray(obj.ownedCharacters) ? obj.ownedCharacters.filter((id): id is string => typeof id === 'string' && CHARACTERS.some(character => character.id === id)) : [])])];
  const previousCharacter = CHARACTERS.find(character => character.style === obj.avatarStyle && character.seed === obj.avatarSeed);
  const equippedId = typeof obj.equippedCharacter === 'string' && ownedCharacters.includes(obj.equippedCharacter) ? obj.equippedCharacter : previousCharacter && ownedCharacters.includes(previousCharacter.id) ? previousCharacter.id : 'kael';
  const equipped = characterById(equippedId);
  return { ...def, version: 12,
    username: string(obj.username, 18).trim() || def.username,
    avatarStyle: equipped.style, avatarSeed: equipped.seed, avatarBg: equipped.bg,
    reducedMotion: obj.reducedMotion === true, sfxVolume: obj.version === 11 && obj.sfxVolume === 25 ? 50 : number(obj.sfxVolume, 50, 100), coins: number(obj.coins), keys: number(obj.keys),
    careerXP: number(obj.version) < 11 && number(obj.matchesPlayed) === 0 ? 0 : number(obj.careerXP),
    selectedMode: MODES.includes(obj.selectedMode as GameModeId) ? obj.selectedMode as GameModeId : def.selectedMode,
    selectedCategory: CATEGORIES.includes(obj.selectedCategory as CategoryId) ? obj.selectedCategory as CategoryId : def.selectedCategory,
    matchesPlayed: number(obj.matchesPlayed), totalQuestionsAnswered, totalQuestionsCorrect: Math.min(totalQuestionsAnswered, number(obj.totalQuestionsCorrect)),
    highestComboEver: typeof obj.highestComboEver === 'number' && Number.isFinite(obj.highestComboEver) ? Math.min(3, Math.max(1, obj.highestComboEver)) : 1,
    bestScores: Object.fromEntries(MODES.map(id => [id, number(best[id])])) as PlayerProfile['bestScores'],
    bestCategoryScores: Object.fromEntries(CATEGORIES.map(id => [id, number(catBest[id])])) as PlayerProfile['bestCategoryScores'],
    dailyHistory, missionBest, reviewHistory: readHistory(obj.reviewHistory), relaxedMode: typeof obj.relaxedMode === 'boolean' ? obj.relaxedMode : false, autoAdvance: obj.autoAdvance !== false,
    fragments: number(obj.fragments, 12, 1_000_000), ownedCharacters, equippedCharacter: equippedId,
    discoveries: Array.isArray(obj.discoveries) ? [...new Set(obj.discoveries.filter((key): key is string => typeof key === 'string' && key.length < 120))].slice(-2000) : [],
    recentQuestionIds: Array.isArray(obj.recentQuestionIds) ? obj.recentQuestionIds.filter((id): id is string => typeof id === 'string' && id.length <= 120).slice(-180) : [],
  };
}

export function loadProfile(): PlayerProfile {
  try { return sanitizeProfile(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')); }
  catch { return createDefaultProfile(); }
}
export function saveProfile(profile: PlayerProfile): boolean {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); return true; }
  catch { return false; }
}
export function clearProfileStorage(): PlayerProfile {
  try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem('pulse_crosswords_v1'); localStorage.removeItem('pulse_crosswords_finished_v1'); } catch { /* The UI reports unavailable persistence on its next save. */ }
  return createDefaultProfile();
}
export function getPlayerLeague(xp: number): { division: string; tierCode: string; nextXp: number; progressPct: number } {
  const levels = [{ min: 0, name: 'Explorador', code: 'I', next: 1000 }, { min: 1000, name: 'Investigador', code: 'II', next: 3000 }, { min: 3000, name: 'Construtor', code: 'III', next: 6000 }, { min: 6000, name: 'Guardião do Pulso', code: 'IV', next: 10000 }];
  const level = [...levels].reverse().find(item => xp >= item.min) || levels[0];
  return { division: level.name, tierCode: level.code, nextXp: level.next, progressPct: Math.min(100, Math.round((xp - level.min) / (level.next - level.min) * 100)) };
}
