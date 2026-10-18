import { AvatarId, CategoryId, GameModeId, LanguageCode, PlayerProfile } from '../types/game';

const STORAGE_KEY = 'the_pulse_game_v7_profile';

export function createDefaultProfile(): PlayerProfile {
  return {
    version: 7,
    username: 'PulsePlayer',
    titleBadge: 'Challenger',
    avatarId: 'cybercat',
    language: 'pt',
    reducedMotion: false,
    highContrastGlow: true,
    sfxVolume: 85,
    coins: 250,
    keys: 3,
    careerXP: 420,
    unlockedAvatars: ['cybercat', 'shiba', 'kitsune', 'astro'],
    unlockedRings: ['indigo', 'cyan'],
    equippedRing: 'indigo',
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
  const validLangs: LanguageCode[] = ['pt', 'en', 'es'];
  const validAvatars: AvatarId[] = ['cybercat', 'shiba', 'kitsune', 'astro', 'ghosty', 'owl', 'dragon', 'witch'];

  const safeNum = (val: unknown, fallback = 0): number =>
    typeof val === 'number' && Number.isFinite(val) && val >= 0 ? Math.floor(val) : fallback;

  const rawBest = (obj.bestScores && typeof obj.bestScores === 'object' ? obj.bestScores : {}) as Record<string, unknown>;
  const rawCatBest = (obj.bestCategoryScores && typeof obj.bestCategoryScores === 'object'
    ? obj.bestCategoryScores
    : {}) as Record<string, unknown>;

  return {
    version: 7,
    username: typeof obj.username === 'string' && obj.username.trim().length > 0 ? obj.username.slice(0, 18) : def.username,
    titleBadge: typeof obj.titleBadge === 'string' ? obj.titleBadge : def.titleBadge,
    avatarId: validAvatars.includes(obj.avatarId as AvatarId) ? (obj.avatarId as AvatarId) : def.avatarId,
    language: validLangs.includes(obj.language as LanguageCode) ? (obj.language as LanguageCode) : def.language,
    reducedMotion: typeof obj.reducedMotion === 'boolean' ? obj.reducedMotion : def.reducedMotion,
    highContrastGlow: typeof obj.highContrastGlow === 'boolean' ? obj.highContrastGlow : def.highContrastGlow,
    sfxVolume: safeNum(obj.sfxVolume, 85),
    coins: safeNum(obj.coins, 250),
    keys: safeNum(obj.keys, 3),
    careerXP: safeNum(obj.careerXP, 420),
    unlockedAvatars: Array.isArray(obj.unlockedAvatars) ? (obj.unlockedAvatars as AvatarId[]) : def.unlockedAvatars,
    unlockedRings: Array.isArray(obj.unlockedRings) ? (obj.unlockedRings as string[]) : def.unlockedRings,
    equippedRing: typeof obj.equippedRing === 'string' ? obj.equippedRing : def.equippedRing,
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
    // Ignore quota issues
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

export function getSeasonRankInfo(xp: number): { season: string; division: string; code: string; nextXp: number } {
  if (xp >= 10000) return { season: 'SEASON 12', division: 'GRANDMASTER', code: 'GM', nextXp: 25000 };
  if (xp >= 5000) return { season: 'SEASON 12', division: 'DIAMOND I', code: 'D1', nextXp: 10000 };
  if (xp >= 2200) return { season: 'SEASON 12', division: 'GOLD I', code: 'G1', nextXp: 5000 };
  if (xp >= 900) return { season: 'SEASON 12', division: 'SILVER I', code: 'S1', nextXp: 2200 };
  return { season: 'SEASON 12', division: 'BRONZE I', code: 'B1', nextXp: 900 };
}