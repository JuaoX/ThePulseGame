export type GameModeId = 'wordbomb' | 'daily' | 'elevator' | 'classic';
export type CategoryId = 'mixed' | 'math' | 'logic' | 'words' | 'general';
export type NavTabId = 'play' | 'ranked' | 'customize' | 'lexicon' | 'syllables';
export type LanguageCode = 'pt' | 'en' | 'es';
export type AvatarStyleId = 'adventurer' | 'bottts' | 'lorelei' | 'avataaars' | 'pixel-art' | 'fun-emoji';

export interface QuestionItem {
  id: string;
  category: Exclude<CategoryId, 'mixed'>;
  difficulty: 1 | 2 | 3;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
  skill?: string;
  context?: string;
  transfer?: boolean;
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
  questionId?: string;
  skill?: string;
  transfer?: boolean;
  question?: QuestionItem;
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
  avatarStyle: AvatarStyleId;
  avatarSeed: string;
  avatarBg: string;
  language: LanguageCode;
  reducedMotion: boolean;
  sfxVolume: number;
  coins: number;
  keys: number;
  careerXP: number;
  selectedMode: GameModeId;
  selectedCategory: CategoryId;
  matchesPlayed: number;
  totalQuestionsAnswered: number;
  totalQuestionsCorrect: number;
  highestComboEver: number;
  bestScores: Record<GameModeId, number>;
  bestCategoryScores: Record<CategoryId, number>;
  dailyHistory: Record<string, DailyAttemptRecord>;
  relaxedMode: boolean;
  autoAdvance: boolean;
  fragments: number;
  ownedCharacters: string[];
  equippedCharacter: string;
  discoveries: string[];
  recentQuestionIds: string[];
  reviewHistory: AnswerHistoryItem[];
  missionBest: Record<string, { correct: number; total: number; transfer: number }>;
}
