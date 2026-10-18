import { CategoryId, GameModeId, PlayerProfile } from '../types/game';

const STORAGE_KEY = 'the_pulse_game_v6_state';

export function createDefaultProfile(): PlayerProfile {
  const prefersReduced =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return {
    version: 6,
    soundEnabled: true,
    reducedMotion: Boolean(prefersReduced),
    selectedMode: 'wordbomb',
    selectedCategory: 'mixed',
    matchesPlayed: 0,
    totalQuestionsAnswered: 0,
    totalQuestionsCorrect: 0,
    highestComboEver: 1.0,
    bestScores: {
      wordbomb: 0,
      daily: 0,
      elevator: 0,
      classic: 0,
    },
    bestCategoryScores: {
      mixed: 0,
      math: 0,
      logic: 0,
      words: 0,
      general: 0,
    },
    dailyHistory: {},
  };
}

export function sanitizeProfile(raw: unknown): PlayerProfile {
  const def = createDefaultProfile();
  if (!raw || typeof raw !== 'object') return def;
  const obj = raw as Record<string, unknown>;

  const validModes: GameModeId[] = ['wordbomb', 'daily', 'elevator', 'classic'];
  const validCats: CategoryId[] = ['mixed', 'math', 'logic', 'words', 'general'];

  const safeNum = (val: unknown, fallback = 0): number =>
    typeof val === 'number' && Number.isFinite(val) && val >= 0 ? Math.floor(val) : fallback;

  const rawBest = (obj.bestScores && typeof obj.bestScores === 'object' ? obj.bestScores : {}) as Record<string, unknown>;
  const rawCatBest = (obj.bestCategoryScores && typeof obj.bestCategoryScores === 'object'
    ? obj.bestCategoryScores
    : {}) as Record<string, unknown>;

  return {
    version: 6,
    soundEnabled: typeof obj.soundEnabled === 'boolean' ? obj.soundEnabled : def.soundEnabled,
    reducedMotion: typeof obj.reducedMotion === 'boolean' ? obj.reducedMotion : def.reducedMotion,
    selectedMode: validModes.includes(obj.selectedMode as GameModeId)
      ? (obj.selectedMode as GameModeId)
      : def.selectedMode,
    selectedCategory: validCats.includes(obj.selectedCategory as CategoryId)
      ? (obj.selectedCategory as CategoryId)
      : def.selectedCategory,
    matchesPlayed: safeNum(obj.matchesPlayed, 0),
    totalQuestionsAnswered: safeNum(obj.totalQuestionsAnswered, 0),
    totalQuestionsCorrect: safeNum(obj.totalQuestionsCorrect, 0),
    highestComboEver:
      typeof obj.highestComboEver === 'number' && Number.isFinite(obj.highestComboEver) && obj.highestComboEver >= 1
        ? obj.highestComboEver
        : 1.0,
    bestScores: {
      wordbomb: safeNum(rawBest.wordbomb, 0),
      daily: safeNum(rawBest.daily, 0),
      elevator: safeNum(rawBest.elevator, 0),
      classic: safeNum(rawBest.classic, 0),
    },
    bestCategoryScores: {
      mixed: safeNum(rawCatBest.mixed, 0),
      math: safeNum(rawCatBest.math, 0),
      logic: safeNum(rawCatBest.logic, 0),
      words: safeNum(rawCatBest.words, 0),
      general: safeNum(rawCatBest.general, 0),
    },
    dailyHistory:
      obj.dailyHistory && typeof obj.dailyHistory === 'object'
        ? (obj.dailyHistory as PlayerProfile['dailyHistory'])
        : {},
  };
}

export function loadProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultProfile();
    return sanitizeProfile(JSON.parse(raw));
  } catch {
    return createDefaultProfile();
  }
}

export function saveProfile(profile: PlayerProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage quota issues
  }
}

export function clearProfileStorage(): PlayerProfile {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
  return createDefaultProfile();
}