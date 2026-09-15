import { describe, expect, it } from "vitest";
import {
  PROFILE_SCHEMA_VERSION,
  PROFILE_STORAGE_KEY,
  importProfile,
  loadProfile,
  migrateProfile,
  saveProfile,
  serialiseProfile,
} from "../index";
import { CONCEPT_CATALOG, createDefaultProfile } from "../scheduler";
import type { StorageLike } from "../persistence";

const NOW = 1_700_000_000_000;

class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

describe("profile schema and persistence fallback", () => {
  it("returns a complete current profile for corrupt input", () => {
    const profile = migrateProfile("not valid json", NOW);
    expect(profile.schemaVersion).toBe(PROFILE_SCHEMA_VERSION);
    expect(Object.keys(profile.concepts)).toHaveLength(CONCEPT_CATALOG.length);
    expect(profile.settings.haptics).toBe(true);
  });

  it("migrates legacy mastery/history and fills all newer fields", () => {
    const legacy = {
      version: 1,
      id: "legacy-pilot",
      mastery: {
        "anchor:3:4": 0.72,
        "anchor:2:4": {
          attempts: 5,
          successes: 4,
          mastery: 0.62,
          lastReviewedAt: NOW - 1_000,
        },
      },
      history: [{
        concept: "anchor:3:4",
        type: "anchor",
        answer: 54,
        expected: 54,
        correct: true,
        latencyMs: 1_800,
        at: NOW - 500,
      }],
      personalBests: { longestCleanStreak: 7, highestDifficulty: 0.8 },
      muted: true,
    };
    const migrated = migrateProfile(legacy, NOW);
    expect(migrated).toMatchObject({
      schemaVersion: PROFILE_SCHEMA_VERSION,
      id: "legacy-pilot",
      settings: { muted: true },
      records: { longestCleanStreak: 7, highestDifficulty: 0.8 },
    });
    expect(migrated.concepts["anchor:3:4"]).toMatchObject({ mastery: 0.72, family: "anchor-three" });
    expect(migrated.concepts["anchor:2:4"]).toMatchObject({ attempts: 5, successes: 4, accuracy: 0.8 });
    expect(migrated.attempts[0]).toMatchObject({ responseTimeMs: 1_800, correct: true });
    expect(Object.keys(migrated.concepts)).toHaveLength(CONCEPT_CATALOG.length);
  });

  it("sanitises out-of-range and malformed persisted values", () => {
    const migrated = migrateProfile({
      id: "broken",
      concepts: {
        "anchor:3:4": {
          attempts: -5,
          successes: 80,
          mastery: 7,
          stability: -2,
          scaffoldLevel: 19,
        },
      },
      rank: { current: "hacker", skillRating: 900 },
    }, NOW);
    const concept = migrated.concepts["anchor:3:4"]!;
    expect(concept.attempts).toBe(0);
    expect(concept.successes).toBe(0);
    expect(concept.mastery).toBe(1);
    expect(concept.stability).toBe(0);
    expect(concept.scaffoldLevel).toBe(3);
    expect(migrated.rank.current).toBe("unranked");
    expect(migrated.rank.skillRating).toBe(100);
  });

  it("round-trips through localStorage when IndexedDB is unavailable", async () => {
    const storage = new MemoryStorage();
    const profile = createDefaultProfile(NOW, "roundtrip");
    profile.onboardingComplete = true;
    await saveProfile(profile, { now: NOW + 10, storage, indexedDB: null });
    expect(storage.values.has(PROFILE_STORAGE_KEY)).toBe(true);
    const loaded = await loadProfile({ now: NOW + 20, storage, indexedDB: null });
    expect(loaded.id).toBe("roundtrip");
    expect(loaded.onboardingComplete).toBe(true);
    expect(loaded.schemaVersion).toBe(PROFILE_SCHEMA_VERSION);
  });

  it("exports portable JSON and imports it through the same migration path", () => {
    const profile = createDefaultProfile(NOW, "portable");
    profile.records.longestCleanStreak = 12;
    const encoded = serialiseProfile(profile);
    expect(importProfile(encoded, NOW + 1)).toMatchObject({
      id: "portable",
      records: { longestCleanStreak: 12 },
    });
  });
});

