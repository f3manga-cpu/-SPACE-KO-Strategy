/**
 * Shared, serialisable domain types for Geometry Reflex Forge.
 *
 * The core deliberately contains no React or browser-rendering concepts.  Every
 * persisted value is JSON-safe so profiles can later move to a server without a
 * data-model rewrite.
 */

export const PROFILE_SCHEMA_VERSION = 4 as const;

export type StreetsRemaining = 2 | 3;

export type QuestionType =
  | "anchor"
  | "spr-snap"
  | "runway"
  | "precision"
  | "transfer"
  | "contrast"
  | "ghost-line"
  | "root-reactor";

export type GameMode =
  | "calibration"
  | "adaptive"
  | "perfect-ten"
  | "reflex-rush"
  | "stackoff-survival"
  | "precision"
  | "transfer-gauntlet"
  | "contrast-duel"
  | "memory-return"
  | "weakness-hunt"
  | "daily-challenge"
  | "arena"
  | "qualification";

export type ConceptFamily =
  | "anchor-two"
  | "anchor-three"
  | "spr-recognition"
  | "runway"
  | "precision"
  | "table-transfer"
  | "contrast"
  | "inverse-geometry"
  | "root-method";

/** 0 is completely unassisted; 3 is a worked/strongly cued item. */
export type ScaffoldLevel = 0 | 1 | 2 | 3;
export type Confidence = "low" | "medium" | "locked";
export type ErrorDirection = "low" | "high" | "conceptual" | "none";
export type MasteryBand =
  | "dormant"
  | "discovered"
  | "unstable"
  | "forged"
  | "stabilized"
  | "mastered";

export type AnswerValue = number | string;
export type ResponseMode = "numeric" | "choice" | "qualitative" | "sequence";
export type AnswerUnit = "percent" | "spr" | "bb" | "category" | "sequence" | "none";
export type LiveTableAnswerUnit = "percent" | "bb";

export interface QuestionChoice {
  id: string;
  label: string;
  value: AnswerValue;
}

export interface LinePoint {
  streetIndex: number;
  potBefore: number;
  betPercent: number;
  heroBetBb: number;
  villainCallBb: number;
  /** @deprecated Prefer heroBetBb when labelling the action in new UI. */
  bet: number;
  potAfterCall: number;
  stackRemaining: number;
}

export interface TableState {
  potBb: number;
  effectiveStackBb: number;
  streetsRemaining: StreetsRemaining;
  street: "flop" | "turn";
}

export interface ContrastState {
  label: string;
  spr: number;
  streetsRemaining: StreetsRemaining;
  targetPercent: number;
}

export interface QuestionContext {
  spr?: number;
  streetsRemaining?: StreetsRemaining;
  potBb?: number;
  effectiveStackBb?: number;
  targetPercent?: number;
  targetBetBb?: number;
  nearestAnchorSpr?: number;
  qualitativeBand?: "small" | "medium" | "large" | "pot" | "overbet";
  line?: LinePoint[];
  comparison?: [ContrastState, ContrastState];
  reactorSteps?: readonly string[];
  maskedReactorIndex?: number;
  landmark?: boolean;
}

export interface Question {
  id: string;
  seed: number;
  type: QuestionType;
  family: ConceptFamily;
  primaryConceptId: string;
  conceptIds: string[];
  difficulty: number;
  scaffoldLevel: ScaffoldLevel;
  prompt: string;
  instruction: string;
  responseMode: ResponseMode;
  expectedAnswer: AnswerValue;
  tolerance: number;
  unit: AnswerUnit;
  acceptedUnits?: readonly LiveTableAnswerUnit[];
  choices?: QuestionChoice[];
  context: QuestionContext;
  explanation: string;
  timeTargetMs: number;
}

export interface Attempt {
  id: string;
  questionId: string;
  questionType: QuestionType;
  primaryConceptId: string;
  conceptIds: string[];
  sessionId: string;
  runId: string | null;
  mode: GameMode;
  timestamp: number;
  sequence: number;
  response: AnswerValue;
  expectedAnswer: AnswerValue;
  correct: boolean;
  responseTimeMs: number;
  confidence: Confidence | null;
  scaffoldLevel: ScaffoldLevel;
  difficulty: number;
  retentionGapMs: number;
  errorDirection: ErrorDirection;
  score: number;
}

export interface ErrorCounts {
  low: number;
  high: number;
  conceptual: number;
}

export interface ConceptState {
  id: string;
  family: ConceptFamily;
  attempts: number;
  successes: number;
  failures: number;
  streak: number;
  lapses: number;
  accuracy: number;
  mastery: number;
  stability: number;
  masteryBand: MasteryBand;
  scaffoldLevel: ScaffoldLevel;
  independentSuccesses: number;
  spacedSuccesses: number;
  contextualAttempts: number;
  contextualSuccesses: number;
  contextualTransferAccuracy: number;
  latencyEmaMs: number | null;
  latencyTrendMs: number;
  confidenceCalibration: number;
  highConfidenceErrors: number;
  errors: ErrorCounts;
  spacingStage: number;
  spacingIntervalMs: number;
  nextReviewAt: number;
  lastReviewedAt: number | null;
  lastSuccessfulRetrievalAt: number | null;
  lastSeenSequence: number;
  recentOutcomes: boolean[];
  recentQuestionTypes: QuestionType[];
}

export interface RunSummary {
  id: string;
  mode: GameMode;
  seed: number;
  startedAt: number;
  endedAt: number;
  score: number;
  accuracy: number;
  correct: number;
  total: number;
  averageResponseMs: number;
  medianResponseMs: number;
  longestStreak: number;
  perfect: boolean;
  difficulty: number;
  scaffoldLevel: ScaffoldLevel;
  conceptIds: string[];
  rankBefore: RankId;
  rankAfter: RankId;
  personalBestKeys: PersonalBestKey[];
  attemptIds: string[];
}

export interface TimedRecord {
  durationMs: number;
  achievedAt: number;
  runId: string;
}

export interface ScoredRecord {
  score: number;
  achievedAt: number;
  runId: string;
}

export interface AccuracyRecord {
  accuracy: number;
  averageResponseMs: number;
  achievedAt: number;
  runId: string;
}

export type PersonalBestKey =
  | "longestCleanStreak"
  | "perfectTen"
  | "reflexArena"
  | "tableTransfer"
  | "fastestSprSequence"
  | "accuracyTwenty"
  | "highestDifficulty"
  | "dailyChallenge"
  | "fastAccurateLatency";

export interface PersonalRecords {
  longestCleanStreak: number;
  perfectTen: TimedRecord | null;
  reflexArena: ScoredRecord | null;
  tableTransfer: ScoredRecord | null;
  fastestSprSequence: TimedRecord | null;
  accuracyTwenty: AccuracyRecord | null;
  highestDifficulty: number;
  dailyChallenge: ScoredRecord | null;
  fastAccurateLatency: AccuracyRecord | null;
}

export type RankId =
  | "unranked"
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond"
  | "master"
  | "grandmaster"
  | "geometry-elite";

export interface QualificationRecord {
  rank: RankId;
  passedAt: number;
  runId: string;
  score: number;
}

export interface RankProgress {
  current: RankId;
  highest: RankId;
  skillRating: number;
  eligibleFor: RankId | null;
  qualifications: QualificationRecord[];
  lastEvaluatedAt: number;
}

export interface ProfileSettings {
  muted: boolean;
  reducedMotion: boolean;
  haptics: boolean;
  highContrast: boolean;
}

export interface ProfileStats {
  totalAttempts: number;
  totalCorrect: number;
  totalScore: number;
  longestStreak: number;
  currentStreak: number;
  sessions: number;
  lastPlayedAt: number | null;
}

export interface Profile {
  schemaVersion: typeof PROFILE_SCHEMA_VERSION;
  id: string;
  createdAt: number;
  updatedAt: number;
  activeSessionId: string | null;
  sequence: number;
  onboardingComplete: boolean;
  unlockedSectors: string[];
  concepts: Record<string, ConceptState>;
  attempts: Attempt[];
  runs: RunSummary[];
  records: PersonalRecords;
  rank: RankProgress;
  settings: ProfileSettings;
  stats: ProfileStats;
}

export interface PerformanceSnapshot {
  attempts: number;
  independentAttempts: number;
  accuracy: number;
  independentAccuracy: number;
  anchorAccuracy: number;
  transferAccuracy: number;
  contrastAccuracy: number;
  pressureAccuracy: number;
  spacedRetention: number;
  medianResponseMs: number;
  masteredConcepts: number;
  stableAnchors: number;
  skillRating: number;
}

export interface ScoreBreakdown {
  base: number;
  correctness: number;
  difficulty: number;
  independence: number;
  speed: number;
  retention: number;
  calibration: number;
  streak: number;
  antiGuess: number;
  total: number;
}
