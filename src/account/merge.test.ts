import { describe, expect, it } from "vitest";
import type { AchievementUnlock } from "../engine/achievements/achievement";
import type { ProgressEvent } from "../engine/progress/progress";
import { mergeAchievementUnlocks, mergeProgressEvents } from "./merge";

const baseEvent: ProgressEvent = {
  schemaVersion: 1,
  id: "progress:one",
  profileId: "guest:old",
  sessionId: "session:one",
  questionId: "question:one",
  entityId: "country:de",
  skillKey: "country:name_to_map_area",
  outcome: "correct",
  score: 1,
  responseTimeMs: 200,
  occurredAt: "2026-07-30T12:00:00Z",
  datasetVersion: "fixture-v1",
  quizDefinitionId: "fixture"
};

describe("Sync merge", () => {
  it("vereinigt Ereignisse idempotent nach stabiler ID", () => {
    const merged = mergeProgressEvents(
      [baseEvent],
      [{ ...baseEvent, profileId: "account:remote" }],
      "guest:current"
    );

    expect(merged).toHaveLength(1);
    expect(merged[0].profileId).toBe("guest:current");
  });

  it("behält den frühesten Unlock und eine Serverbestätigung", () => {
    const local: AchievementUnlock = {
      schemaVersion: 1,
      achievementId: "discovery:first-round",
      definitionVersion: 1,
      profileId: "guest:one",
      unlockedAt: "2026-07-30T13:00:00Z",
      sourceEventIds: ["progress:one"],
      verification: "local"
    };
    const remote: AchievementUnlock = {
      ...local,
      profileId: "account:one",
      unlockedAt: "2026-07-30T12:00:00Z",
      sourceEventIds: ["progress:two"],
      verification: "server"
    };

    expect(mergeAchievementUnlocks([local], [remote], "guest:one")).toEqual([
      {
        ...local,
        unlockedAt: "2026-07-30T12:00:00Z",
        sourceEventIds: ["progress:one", "progress:two"],
        verification: "server"
      }
    ]);
  });
});
