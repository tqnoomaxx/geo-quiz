import { describe, expect, it } from "vitest";
import type { ProgressEvent } from "./progress";
import {
  buildReviewQueue,
  isProgressEvent,
  summarizeProgress
} from "./progress";

const events: ProgressEvent[] = [
  {
    schemaVersion: 1,
    id: "progress:1",
    profileId: "guest:1",
    sessionId: "session:1",
    questionId: "question:1",
    entityId: "country:de",
    skillKey: "name_to_map_area",
    outcome: "correct",
    score: 1,
    responseTimeMs: 1000,
    occurredAt: "2026-07-30T10:00:00.000Z",
    datasetVersion: "v1",
    quizDefinitionId: "quiz:1"
  },
  {
    schemaVersion: 1,
    id: "progress:2",
    profileId: "guest:1",
    sessionId: "session:1",
    questionId: "question:2",
    entityId: "country:fr",
    skillKey: "name_to_map_area",
    outcome: "incorrect",
    score: 0,
    responseTimeMs: 2000,
    occurredAt: "2026-07-30T10:00:02.000Z",
    datasetVersion: "v1",
    quizDefinitionId: "quiz:1"
  }
];

describe("progress summary", () => {
  it("aggregates raw events without inventing a mastery algorithm", () => {
    expect(summarizeProgress(events)).toMatchObject({
      attempts: 2,
      correct: 1,
      accuracy: 50,
      completedSessions: 1,
      skills: [
        {
          skillKey: "name_to_map_area",
          attempts: 2,
          correct: 1,
          accuracy: 50
        }
      ],
      weakEntities: [
        {
          entityId: "country:fr",
          attempts: 1,
          correct: 0,
          accuracy: 0
        }
      ]
    });
  });

  it("rejects incomplete or malformed sync events", () => {
    expect(isProgressEvent(events[0])).toBe(true);
    expect(
      isProgressEvent({ ...events[0], occurredAt: "not-a-date" })
    ).toBe(false);
    const { questionId: _questionId, ...withoutQuestion } = events[0];
    expect(isProgressEvent(withoutQuestion)).toBe(false);
  });

  it("hält nur Fehler offen, die nicht später im selben Skill gelöst wurden", () => {
    const corrected = {
      ...events[1],
      id: "progress:3",
      outcome: "correct" as const,
      occurredAt: "2026-07-30T10:00:03.000Z"
    };
    const otherSkill = {
      ...events[1],
      id: "progress:4",
      skillKey: "country:visual_asset:flag_to_text_input",
      occurredAt: "2026-07-30T10:00:04.000Z"
    };

    expect(buildReviewQueue([otherSkill, corrected, ...events])).toEqual([
      expect.objectContaining({
        entityId: "country:fr",
        skillKey: "country:visual_asset:flag_to_text_input",
        lastOutcome: "incorrect"
      })
    ]);
  });
});
