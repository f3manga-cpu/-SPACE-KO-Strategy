import { inferConceptFamily, createDefaultProfile, ensureConceptState, MAX_ATTEMPT_HISTORY, MAX_RUN_HISTORY, reconcileConceptCatalog } from "./scheduler";
import { emptyPersonalRecords } from "./scoring";
import {
  PROFILE_SCHEMA_VERSION,
  type AnswerValue,
  type Attempt,
  type Confidence,
  type ErrorDirection,
  type GameMode,
  type PersonalRecords,
  type Profile,
  type QuestionType,
  type RankId,
  type RunSummary,
  type ScaffoldLevel,
} from "./types";

export const PROFILE_STORAGE_KEY = "geometry-reflex-forge:profile";
export const PROFILE_DB_NAME = "geometry-reflex-forge";
const PROFILE_STORE_NAME = "profiles";
const PROFILE_DB_VERSION = 1;

type UnknownRecord = Record<string, unknown>;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface PersistenceOptions {
  now?: number;
  storageKey?: string;
  storage?: StorageLike | null;
  indexedDB?: IDBFactory | null;
}

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const finite = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const nonNegative = (value: unknown, fallback = 0): number =>
  Math.max(0, finite(value, fallback));

const integer = (value: unknown, fallback = 0): number =>
  Math.floor(nonNegative(value, fallback));

const bool = (value: unknown, fallback: boolean): boolean =>
  typeof value === "boolean" ? value : fallback;

const textValue = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.length > 0 ? value : fallback;

const answerValue = (value: unknown, fallback: AnswerValue): AnswerValue =>
  typeof value === "number" && Number.isFinite(value)
    ? value
    : typeof value === "string" ? value : fallback;

const VALID_QUESTION_TYPES: readonly QuestionType[] = [
  "anchor", "spr-snap", "runway", "precision", "transfer", "contrast", "ghost-line", "root-reactor",
];
const VALID_MODES: readonly GameMode[] = [
  "calibration", "adaptive", "perfect-ten", "reflex-rush", "stackoff-survival", "precision",
  "transfer-gauntlet", "contrast-duel", "memory-return", "weakness-hunt", "daily-challenge", "arena", "qualification",
];
const VALID_RANKS: readonly RankId[] = [
  "unranked", "bronze", "silver", "gold", "platinum", "diamond", "master", "grandmaster", "geometry-elite",
];

const questionType = (value: unknown): QuestionType =>
  typeof value === "string" && VALID_QUESTION_TYPES.includes(value as QuestionType)
    ? value as QuestionType : "anchor";
const gameMode = (value: unknown): GameMode =>
  typeof value === "string" && VALID_MODES.includes(value as GameMode)
    ? value as GameMode : "adaptive";
const rankId = (value: unknown): RankId =>
  typeof value === "string" && VALID_RANKS.includes(value as RankId)
    ? value as RankId : "unranked";
const scaffold = (value: unknown): ScaffoldLevel =>
  Math.min(3, integer(value, 2)) as ScaffoldLevel;
const confidence = (value: unknown): Confidence | null =>
  value === "low" || value === "medium" || value === "locked" ? value : null;
const errorDirection = (value: unknown): ErrorDirection =>
  value === "low" || value === "high" || value === "conceptual" || value === "none"
    ? value : "none";

function normaliseAttempt(raw: unknown, index: number, now: number): Attempt | null {
  if (!isRecord(raw)) return null;
  const primaryConceptId = textValue(
    raw.primaryConceptId ?? raw.concept ?? raw.conceptId,
    "anchor:3:4",
  );
  const timestamp = nonNegative(raw.timestamp ?? raw.at, now);
  const type = questionType(raw.questionType ?? raw.type);
  const expected = answerValue(raw.expectedAnswer ?? raw.expected, 0);
  const response = answerValue(raw.response ?? raw.answer, "");
  const correct = bool(raw.correct, false);
  const conceptIds = Array.isArray(raw.conceptIds)
    ? raw.conceptIds.filter((item): item is string => typeof item === "string")
    : [primaryConceptId];
  return {
    id: textValue(raw.id, `migrated-attempt-${timestamp}-${index}`),
    questionId: textValue(raw.questionId, `migrated-question-${index}`),
    questionType: type,
    primaryConceptId,
    conceptIds: conceptIds.length > 0 ? conceptIds : [primaryConceptId],
    sessionId: textValue(raw.sessionId, "migrated-session"),
    runId: typeof raw.runId === "string" ? raw.runId : null,
    mode: gameMode(raw.mode),
    timestamp,
    sequence: integer(raw.sequence, index),
    response,
    expectedAnswer: expected,
    correct,
    responseTimeMs: nonNegative(raw.responseTimeMs ?? raw.latencyMs, 0),
    confidence: confidence(raw.confidence),
    scaffoldLevel: scaffold(raw.scaffoldLevel ?? raw.scaffold),
    difficulty: Math.min(1, nonNegative(raw.difficulty, 0.3)),
    retentionGapMs: nonNegative(raw.retentionGapMs, 0),
    errorDirection: errorDirection(raw.errorDirection),
    score: finite(raw.score, 0),
  };
}

function normaliseRun(raw: unknown, index: number, now: number): RunSummary | null {
  if (!isRecord(raw)) return null;
  const startedAt = nonNegative(raw.startedAt, now);
  const endedAt = Math.max(startedAt, nonNegative(raw.endedAt, startedAt));
  const total = integer(raw.total, 0);
  const correct = Math.min(total, integer(raw.correct, 0));
  return {
    id: textValue(raw.id, `migrated-run-${startedAt}-${index}`),
    mode: gameMode(raw.mode),
    seed: integer(raw.seed, index),
    startedAt,
    endedAt,
    score: finite(raw.score, 0),
    accuracy: total > 0 ? correct / total : Math.min(1, nonNegative(raw.accuracy, 0)),
    correct,
    total,
    averageResponseMs: nonNegative(raw.averageResponseMs, 0),
    medianResponseMs: nonNegative(raw.medianResponseMs, 0),
    longestStreak: integer(raw.longestStreak, 0),
    perfect: bool(raw.perfect, total > 0 && correct === total),
    difficulty: Math.min(1, nonNegative(raw.difficulty, 0)),
    scaffoldLevel: scaffold(raw.scaffoldLevel),
    conceptIds: Array.isArray(raw.conceptIds)
      ? raw.conceptIds.filter((item): item is string => typeof item === "string")
      : [],
    rankBefore: rankId(raw.rankBefore),
    rankAfter: rankId(raw.rankAfter),
    personalBestKeys: Array.isArray(raw.personalBestKeys)
      ? raw.personalBestKeys.filter((item): item is RunSummary["personalBestKeys"][number] =>
          typeof item === "string" && [
            "longestCleanStreak", "perfectTen", "reflexArena", "tableTransfer", "fastestSprSequence",
            "accuracyTwenty", "highestDifficulty", "dailyChallenge", "fastAccurateLatency",
          ].includes(item),
        )
      : [],
    attemptIds: Array.isArray(raw.attemptIds)
      ? raw.attemptIds.filter((item): item is string => typeof item === "string")
      : [],
  };
}

const timedRecord = (raw: unknown) => {
  if (!isRecord(raw)) return null;
  const durationMs = finite(raw.durationMs, Number.NaN);
  if (!Number.isFinite(durationMs) || durationMs < 0) return null;
  return {
    durationMs,
    achievedAt: nonNegative(raw.achievedAt, 0),
    runId: textValue(raw.runId, "legacy-run"),
  };
};

const scoredRecord = (raw: unknown) => {
  if (!isRecord(raw)) return null;
  const score = finite(raw.score, Number.NaN);
  if (!Number.isFinite(score)) return null;
  return {
    score,
    achievedAt: nonNegative(raw.achievedAt, 0),
    runId: textValue(raw.runId, "legacy-run"),
  };
};

const accuracyRecord = (raw: unknown) => {
  if (!isRecord(raw)) return null;
  const accuracy = finite(raw.accuracy, Number.NaN);
  if (!Number.isFinite(accuracy)) return null;
  return {
    accuracy: Math.min(1, Math.max(0, accuracy)),
    averageResponseMs: nonNegative(raw.averageResponseMs, 0),
    achievedAt: nonNegative(raw.achievedAt, 0),
    runId: textValue(raw.runId, "legacy-run"),
  };
};

function normaliseRecords(raw: unknown): PersonalRecords {
  const base = emptyPersonalRecords();
  if (!isRecord(raw)) return base;
  return {
    longestCleanStreak: integer(raw.longestCleanStreak, 0),
    perfectTen: timedRecord(raw.perfectTen),
    reflexArena: scoredRecord(raw.reflexArena),
    tableTransfer: scoredRecord(raw.tableTransfer),
    fastestSprSequence: timedRecord(raw.fastestSprSequence),
    accuracyTwenty: accuracyRecord(raw.accuracyTwenty),
    highestDifficulty: Math.min(1, nonNegative(raw.highestDifficulty, 0)),
    dailyChallenge: scoredRecord(raw.dailyChallenge),
    fastAccurateLatency: accuracyRecord(raw.fastAccurateLatency),
  };
}

/**
 * Upgrade any historical/partially-corrupt save to the current complete shape.
 * Unknown keys are intentionally discarded; known progress is preserved.
 */
export function migrateProfile(raw: unknown, now = Date.now()): Profile {
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      return createDefaultProfile(now);
    }
  }
  if (!isRecord(parsed)) return createDefaultProfile(now);
  const migratedId = textValue(parsed.id, `pilot-${Math.floor(now).toString(36)}`);
  const base = createDefaultProfile(now, migratedId);

  const rawConcepts = isRecord(parsed.concepts)
    ? parsed.concepts
    : isRecord(parsed.mastery) ? parsed.mastery : {};
  const concepts = { ...base.concepts };
  for (const [id, value] of Object.entries(rawConcepts)) {
    const partial = typeof value === "number" ? { mastery: value, attempts: value > 0 ? 1 : 0 } : isRecord(value) ? value : undefined;
    concepts[id] = ensureConceptState(
      partial as Partial<Profile["concepts"][string]> | undefined,
      id,
      inferConceptFamily(id),
      now,
    );
  }

  const attemptsSource = Array.isArray(parsed.attempts)
    ? parsed.attempts
    : Array.isArray(parsed.history) ? parsed.history : [];
  const attempts = attemptsSource
    .map((attempt, index) => normaliseAttempt(attempt, index, now))
    .filter((attempt): attempt is Attempt => attempt !== null)
    .slice(-MAX_ATTEMPT_HISTORY);
  const runs = (Array.isArray(parsed.runs) ? parsed.runs : [])
    .map((run, index) => normaliseRun(run, index, now))
    .filter((run): run is RunSummary => run !== null)
    .slice(-MAX_RUN_HISTORY);
  const rawSettings = isRecord(parsed.settings) ? parsed.settings : {};
  const rawStats = isRecord(parsed.stats) ? parsed.stats : {};
  const rawRank = isRecord(parsed.rank) ? parsed.rank : {};
  const qualifications = Array.isArray(rawRank.qualifications)
    ? rawRank.qualifications.filter(isRecord).map((item) => ({
        rank: rankId(item.rank),
        passedAt: nonNegative(item.passedAt, now),
        runId: textValue(item.runId, "legacy-run"),
        score: finite(item.score, 0),
      })).filter((item) => item.rank !== "unranked")
    : [];
  const currentRank = rankId(rawRank.current ?? parsed.currentRank);
  const highestRank = rankId(rawRank.highest ?? parsed.highestRank ?? currentRank);
  const totalCorrectInHistory = attempts.filter((attempt) => attempt.correct).length;

  const migrated: Profile = {
    ...base,
    schemaVersion: PROFILE_SCHEMA_VERSION,
    id: textValue(parsed.id, base.id),
    createdAt: nonNegative(parsed.createdAt, now),
    updatedAt: nonNegative(parsed.updatedAt, now),
    activeSessionId: typeof parsed.activeSessionId === "string" ? parsed.activeSessionId : null,
    sequence: Math.max(integer(parsed.sequence, attempts.length), attempts.length),
    onboardingComplete: bool(parsed.onboardingComplete, false),
    unlockedSectors: Array.isArray(parsed.unlockedSectors)
      ? parsed.unlockedSectors.filter((item): item is string => typeof item === "string")
      : base.unlockedSectors,
    concepts,
    attempts,
    runs,
    records: normaliseRecords(parsed.records ?? parsed.personalBests),
    rank: {
      current: currentRank,
      highest: highestRank,
      skillRating: Math.min(100, nonNegative(rawRank.skillRating, 0)),
      eligibleFor:
        rawRank.eligibleFor === null ? null : rankId(rawRank.eligibleFor) === "unranked" ? null : rankId(rawRank.eligibleFor),
      qualifications,
      lastEvaluatedAt: nonNegative(rawRank.lastEvaluatedAt, now),
    },
    settings: {
      muted: bool(rawSettings.muted ?? parsed.muted, false),
      reducedMotion: bool(rawSettings.reducedMotion, false),
      haptics: bool(rawSettings.haptics, true),
      highContrast: bool(rawSettings.highContrast, false),
    },
    stats: {
      totalAttempts: Math.max(integer(rawStats.totalAttempts, attempts.length), attempts.length),
      totalCorrect: Math.max(integer(rawStats.totalCorrect, totalCorrectInHistory), totalCorrectInHistory),
      totalScore: finite(rawStats.totalScore, attempts.reduce((sum, item) => sum + item.score, 0)),
      longestStreak: integer(rawStats.longestStreak, 0),
      currentStreak: integer(rawStats.currentStreak, 0),
      sessions: integer(rawStats.sessions, 0),
      lastPlayedAt:
        rawStats.lastPlayedAt === null || rawStats.lastPlayedAt === undefined
          ? attempts.at(-1)?.timestamp ?? null
          : nonNegative(rawStats.lastPlayedAt, now),
    },
  };
  return reconcileConceptCatalog(migrated, now);
}

function resolveStorage(option: StorageLike | null | undefined): StorageLike | null {
  if (option === null) return null;
  if (option) return option;
  try {
    return typeof globalThis.localStorage === "undefined" ? null : globalThis.localStorage;
  } catch {
    return null;
  }
}

function resolveIndexedDb(option: IDBFactory | null | undefined): IDBFactory | null {
  if (option === null) return null;
  if (option) return option;
  try {
    return typeof globalThis.indexedDB === "undefined" ? null : globalThis.indexedDB;
  } catch {
    return null;
  }
}

function openDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(PROFILE_DB_NAME, PROFILE_DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(PROFILE_STORE_NAME)) {
        database.createObjectStore(PROFILE_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open profile database"));
    request.onblocked = () => reject(new Error("Profile database upgrade was blocked"));
  });
}

async function idbRead(factory: IDBFactory, key: string): Promise<unknown> {
  const database = await openDatabase(factory);
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(PROFILE_STORE_NAME, "readonly");
      const request = transaction.objectStore(PROFILE_STORE_NAME).get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Unable to read profile"));
    });
  } finally {
    database.close();
  }
}

async function idbWrite(factory: IDBFactory, key: string, value: Profile): Promise<void> {
  const database = await openDatabase(factory);
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(PROFILE_STORE_NAME, "readwrite");
      transaction.objectStore(PROFILE_STORE_NAME).put(value, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Unable to save profile"));
      transaction.onabort = () => reject(transaction.error ?? new Error("Profile save was aborted"));
    });
  } finally {
    database.close();
  }
}

async function idbRemove(factory: IDBFactory, key: string): Promise<void> {
  const database = await openDatabase(factory);
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(PROFILE_STORE_NAME, "readwrite");
      transaction.objectStore(PROFILE_STORE_NAME).delete(key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Unable to clear profile"));
    });
  } finally {
    database.close();
  }
}

export async function loadProfile(options: PersistenceOptions = {}): Promise<Profile> {
  const now = options.now ?? Date.now();
  const key = options.storageKey ?? PROFILE_STORAGE_KEY;
  const indexedDb = resolveIndexedDb(options.indexedDB);
  if (indexedDb) {
    try {
      const saved = await idbRead(indexedDb, key);
      if (saved !== undefined) return migrateProfile(saved, now);
    } catch {
      // Private browsing and quota/security policies can reject IndexedDB.
    }
  }
  const storage = resolveStorage(options.storage);
  if (storage) {
    try {
      const saved = storage.getItem(key);
      if (saved !== null) return migrateProfile(saved, now);
    } catch {
      // Treat inaccessible localStorage as a first launch.
    }
  }
  return createDefaultProfile(now);
}

export async function saveProfile(
  rawProfile: Profile,
  options: PersistenceOptions = {},
): Promise<Profile> {
  const now = options.now ?? Date.now();
  const key = options.storageKey ?? PROFILE_STORAGE_KEY;
  const profile = migrateProfile({ ...rawProfile, updatedAt: now }, now);
  const indexedDb = resolveIndexedDb(options.indexedDB);
  let indexedDbSaved = false;
  if (indexedDb) {
    try {
      await idbWrite(indexedDb, key, profile);
      indexedDbSaved = true;
    } catch {
      indexedDbSaved = false;
    }
  }
  const storage = resolveStorage(options.storage);
  if (storage) {
    try {
      // A small mirror makes the fallback durable if IndexedDB later becomes
      // unavailable (browser privacy mode changes, embedded webview, etc.).
      storage.setItem(key, JSON.stringify(profile));
    } catch (error) {
      if (!indexedDbSaved) throw error;
    }
  } else if (!indexedDbSaved && indexedDb) {
    throw new Error("Unable to persist profile");
  }
  return profile;
}

export async function clearProfile(options: PersistenceOptions = {}): Promise<void> {
  const key = options.storageKey ?? PROFILE_STORAGE_KEY;
  const indexedDb = resolveIndexedDb(options.indexedDB);
  if (indexedDb) {
    try {
      await idbRemove(indexedDb, key);
    } catch {
      // Still clear the fallback below.
    }
  }
  const storage = resolveStorage(options.storage);
  if (storage) {
    try {
      storage.removeItem(key);
    } catch {
      // Clearing an inaccessible fallback is already effectively successful.
    }
  }
}

export function serialiseProfile(profile: Profile): string {
  return JSON.stringify(migrateProfile(profile, profile.updatedAt));
}

export function importProfile(serialised: string, now = Date.now()): Profile {
  return migrateProfile(serialised, now);
}
