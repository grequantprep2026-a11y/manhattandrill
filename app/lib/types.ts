// lib/types.ts

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface UserProfile {
  uid:              string;
  displayName?:     string;
  email?:           string;
  examDate?:        string;
  attempt?:         string;
  targetScore?:     string;
  studyHours?:      string;
  weakAreas?:       string[];
  onboardingDone?:  boolean;
  photoURL?:        string;
  markedQuestions?: string[];
  // ─── Paywall ───────────────────────────────────────────────────────────────
  isPro?:           boolean;           // true once Dodo webhook fires
  plan?:            'free' | 'pro';   // 'free' default, 'pro' after payment
  proActivatedAt?:  string;           // ISO timestamp of upgrade
  createdAt?:       unknown;
  updatedAt?:       unknown;
}

export interface QuestionAttempt {
  questionId:           string;
  topicId?:             string;
  isCorrect?:           boolean;
  firstAttemptCorrect?: boolean;
  attemptCount?:        number;
  selectedOption?:      number | null;
  qcSelected?:          string | null;
  textAnswer?:          string;
  selectedOptions?:     string[];
  markedForReview?:     boolean;
  difficultyVote?:      DifficultyLevel | null;
  liked?:               boolean;
  createdAt?:           unknown;
  updatedAt?:           unknown;
}

export interface QuestionStats {
  totalAttempts: number;
  correctCount:  number;
  easyVotes:     number;
  mediumVotes:   number;
  hardVotes:     number;
  likedCount:    number;
  markedCount:   number;
  updatedAt?:    unknown;
}

export interface TopicAttemptRecord {
  attemptNumber:  number;
  correctAnswers: number;
  totalQuestions: number;
  scorePct:       number;
  completedAt:    string;
}

export interface TopicProgress {
  topicId:            string;
  totalQuestions:     number;
  completedQuestions: number;
  correctAnswers:     number;
  incorrectAnswers:   number;
  attemptNumber:      number;
  bestScore:          number;
  attemptHistory:     TopicAttemptRecord[];
  lastAttempted?:     unknown;
  updatedAt?:         unknown;
}

// ─── Question Report ──────────────────────────────────────────────────────────
export type ReportReason =
  | 'wrong_answer'
  | 'unclear_question'
  | 'typo_error'
  | 'bad_explanation'
  | 'other';

export interface QuestionReport {
  id?:           string;
  uid:           string;
  questionId:    string;
  topicId:       string;
  reason:        ReportReason;
  details?:      string;
  questionNum?:  number;
  questionType?: string;
  createdAt?:    unknown;
}

// ─── Mock Test ────────────────────────────────────────────────────────────────
export type MockSection = 1 | 2;

export interface MockQuestionAttempt {
  questionId:       string;
  section:          MockSection;
  isCorrect:        boolean;
  selectedOption?:  number;
  textAnswer?:      string;
  selectedOptions?: string[];
  qcSelected?:      string;
  timeTaken?:       number;
}

export interface MockTestSession {
  id?:              string;
  uid:              string;
  startedAt:        string;
  completedAt?:     string;
  section1Score?:   number;
  section2Score?:   number;
  overallScore?:    number;
  section1Correct?: number;
  section2Correct?: number;
  totalQuestions:   number;
  attempts:         MockQuestionAttempt[];
  status:           'in_progress' | 'completed';
}