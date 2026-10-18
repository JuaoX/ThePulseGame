export type GameModeId = 'wordbomb' | 'daily' | 'elevator' | 'classic';
export type CategoryId = 'mixed' | 'math' | 'logic' | 'words' | 'general';
export type NavTabId = 'rooms' | 'ranked' | 'shop' | 'inventory' | 'words' | 'syllables';
export type LanguageCode = 'pt' | 'en' | 'es';
export type AvatarId = 'cybercat' | 'shiba' | 'kitsune' | 'astro' | 'ghosty' | 'owl' | 'dragon' | 'witch';

export interface QuestionItem {
  id: string;
  category: Exclude<CategoryId, 'mixed'>;
  difficulty: 1 | 2 | 3;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
}

export interface SyllableChallenge {
  syl: string;
  difficulty: 1 | 2 | 3;
  hint: string;
  samples: string[];
}

export interface AnswerHistoryItem {
  step: number;
  prompt: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  pointsDelta: number;
  explanation: string;
}

export interface DailyAttemptRecord {
  dateKey: string;
  score: number;
  safeScore: number;
  salvagedScore: number;
  correctCount: number;
  totalCount: number;
  peakCombo: number;
  timeline: string;
  shareText: string;
}

export interface PlayerProfile {
  version: number;
  username: string;
  titleBadge: string;
  avatarId: AvatarId;
  language: LanguageCode;
  reducedMotion: boolean;
  highContrastGlow: boolean;
  sfxVolume: number;
  coins: number;
  keys: number;
  careerXP: number;
  unlockedAvatars: AvatarId[];
  unlockedRings: string[];
  equippedRing: string;
  selectedMode: GameModeId;
  selectedCategory: CategoryId;
  matchesPlayed: number;
  totalQuestionsAnswered: number;
  totalQuestionsCorrect: number;
  highestComboEver: number;
  bestScores: Record<GameModeId, number>;
  bestCategoryScores: Record<CategoryId, number>;
  dailyHistory: Record<string, DailyAttemptRecord>;
}