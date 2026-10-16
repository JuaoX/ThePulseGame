export type GameModeId = 'daily' | 'classic' | 'wordbomb' | 'elevator';
export type CategoryId = 'mixed' | 'math' | 'logic' | 'words' | 'general';
export type AppViewId = 'home' | 'rules' | 'stats' | 'library';

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
  soundEnabled: boolean;
  reducedMotion: boolean;
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