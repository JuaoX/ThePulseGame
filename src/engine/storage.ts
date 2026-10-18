import { AvatarStyleId, CategoryId, GameModeId, LanguageCode, PlayerProfile } from '../types/game';

const STORAGE_KEY = 'the_pulse_game_v9_profile';

export function createDefaultProfile(): PlayerProfile {
  return {
    version: 9,
    username: 'PulsePlayer',
    avatarStyle: 'adventurer',
    avatarSeed: 'Felix',
    avatarBg: '1e293b',
    language: 'pt',
    reducedMotion: false,
    sfxVolume: 85,
    coins: 350,
    keys: 3,
    careerXP: 520,
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
  const validStyles: AvatarStyleId[] = ['adventurer', 'bottts', 'lorelei', 'avataaars', 'pixel-art', 'fun-emoji'];

  const safeNum = (val: unknown, fallback = 0): number =>
    typeof val === 'number' && Number.isFinite(val) && val >= 0 ? Math.floor(val) : fallback;

  const rawBest = (obj.bestScores && typeof obj.bestScores === 'object' ? obj.bestScores : {}) as Record<string, unknown>;
  const rawCatBest = (obj.bestCategoryScores && typeof obj.bestCategoryScores === 'object'
    ? obj.bestCategoryScores
    : {}) as Record<string, unknown>;

  return {
    version: 9,
    username: typeof obj.username === 'string' && obj.username.trim().length > 0 ? obj.username.slice(0, 18) : def.username,
    avatarStyle: validStyles.includes(obj.avatarStyle as AvatarStyleId) ? (obj.avatarStyle as AvatarStyleId) : def.avatarStyle,
    avatarSeed: typeof obj.avatarSeed === 'string' && obj.avatarSeed.trim().length > 0 ? obj.avatarSeed.slice(0, 24) : def.avatarSeed,
    avatarBg: typeof obj.avatarBg === 'string' && obj.avatarBg.length === 6 ? obj.avatarBg : def.avatarBg,
    language: validLangs.includes(obj.language as LanguageCode) ? (obj.language as LanguageCode) : def.language,
    reducedMotion: typeof obj.reducedMotion === 'boolean' ? obj.reducedMotion : def.reducedMotion,
    sfxVolume: safeNum(obj.sfxVolume, 85),
    coins: safeNum(obj.coins, 350),
    keys: safeNum(obj.keys, 3),
    careerXP: safeNum(obj.careerXP, 520),
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

export function getPlayerLeague(xp: number): { division: string; tierCode: string; nextXp: number; progressPct: number } {
  if (xp >= 10000) return { division: 'Mestre Pulse', tierCode: 'MP', nextXp: 25000, progressPct: 100 };
  if (xp >= 5000) return { division: 'Diamante I', tierCode: 'DM', nextXp: 10000, progressPct: Math.round(((xp - 5000) / 5000) * 100) };
  if (xp >= 2200) return { division: 'Ouro I', tierCode: 'AU', nextXp: 5000, progressPct: Math.round(((xp - 2200) / 2800) * 100) };
  if (xp >= 900) return { division: 'Prata I', tierCode: 'AG', nextXp: 2200, progressPct: Math.round(((xp - 900) / 1300) * 100) };
  return { division: 'Bronze I', tierCode: 'BR', nextXp: 900, progressPct: Math.round((xp / 900) * 100) };
}