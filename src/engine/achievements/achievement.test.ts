import { describe, expect, it } from "vitest";
import type { ProgressEvent } from "../progress/progress";
import {
  achievementDefinitions,
  deriveAchievementUnlocks,
  evaluateAchievement,
  generateCorrectAnswerFamily,
  validateAchievementDefinitions,
  type AchievementDefinition
} from "./achievement";

function event(
  id: string,
  sessionId: string,
  outcome: ProgressEvent["outcome"] = "correct",
  skillKey = "country:name_to_map_area",
  entityId = `country:${id}`
): ProgressEvent {
  return {
    schemaVersion: 1,
    id,
    profileId: "guest:one",
    sessionId,
    questionId: `question:${id}`,
    entityId,
    skillKey,
    outcome,
    score: outcome === "correct" ? 1 : 0,
    responseTimeMs: 500,
    occurredAt: `2026-07-30T12:00:${id.padStart(2, "0")}Z`,
    datasetVersion: "fixture-v1",
    quizDefinitionId: "countries-v1"
  };
}

describe("Achievement Engine", () => {
  it("wertet Definitionen unabhängig von Reihenfolge und Duplikaten aus", () => {
    const definition = achievementDefinitions.find(
      (candidate) => candidate.id === "countries:correct-10"
    )!;
    const events = Array.from({ length: 10 }, (_, index) =>
      event(String(index), "session:1")
    );

    expect(evaluateAchievement(definition, events).value).toBe(10);
    expect(
      evaluateAchievement(definition, [
        events[9],
        ...events,
        events[0]
      ]).value
    ).toBe(10);
  });

  it("verwendet dieselbe Engine für neue konfigurierbare Familien", () => {
    const definition: AchievementDefinition = {
      id: "fixture:unique-three",
      version: 1,
      familyId: "fixture",
      title: "Drei Ziele",
      description: "Drei verschiedene Ziele",
      badgeAssetKey: "target",
      rule: {
        aggregate: "distinct_entity_count",
        outcome: "correct",
        target: 3
      }
    };
    const events = [
      event("1", "session:1", "correct", "country:test", "country:de"),
      event("2", "session:1", "correct", "country:test", "country:de"),
      event("3", "session:1", "correct", "country:test", "country:fr"),
      event("4", "session:1", "incorrect", "country:test", "country:es"),
      event("5", "session:1", "correct", "country:test", "country:it")
    ];

    expect(evaluateAchievement(definition, events).value).toBe(3);
    expect(
      deriveAchievementUnlocks(
        events,
        [],
        "guest:one",
        "2026-07-30T13:00:00Z",
        [definition]
      )
    ).toHaveLength(1);
  });

  it("erzeugt eine vollständige Schwellenfamilie nur aus Konfiguration", () => {
    const generated = generateCorrectAnswerFamily({
      idPrefix: "rivers",
      familyId: "rivers-correct",
      skillPrefix: "river:",
      badgeAssetKey: "river",
      tiers: [
        {
          id: "correct-5",
          tier: "bronze",
          title: "Flüsse · Bronze",
          description: "Fünf richtige Flussantworten.",
          target: 5
        },
        {
          id: "correct-20",
          tier: "silver",
          title: "Flüsse · Silber",
          description: "Zwanzig richtige Flussantworten.",
          target: 20
        }
      ]
    });

    expect(generated.map((definition) => definition.id)).toEqual([
      "rivers:correct-5",
      "rivers:correct-20"
    ]);
    expect(validateAchievementDefinitions(generated)).toEqual([]);
    expect(
      validateAchievementDefinitions([generated[0], generated[0]])
    ).toContain("Doppelte Achievement-ID: rivers:correct-5");
  });

  it("erkennt nur ausreichend lange fehlerfreie Sessions", () => {
    const definition = achievementDefinitions.find(
      (candidate) => candidate.id === "precision:perfect-10"
    )!;
    const shortPerfect = Array.from({ length: 9 }, (_, index) =>
      event(`0${index}`, "session:short")
    );
    const longImperfect = Array.from({ length: 10 }, (_, index) =>
      event(
        `1${index}`,
        "session:imperfect",
        index === 9 ? "incorrect" : "correct"
      )
    );
    const longPerfect = Array.from({ length: 10 }, (_, index) =>
      event(`2${index}`, "session:perfect")
    );

    expect(evaluateAchievement(definition, shortPerfect).value).toBe(0);
    expect(
      evaluateAchievement(definition, [...shortPerfect, ...longImperfect])
        .value
    ).toBe(0);
    expect(
      evaluateAchievement(definition, [
        ...shortPerfect,
        ...longImperfect,
        ...longPerfect
      ]).value
    ).toBe(1);
  });

  it("schaltet vorhandene Abzeichen nicht erneut frei", () => {
    const definition = achievementDefinitions[0];
    const events = [event("1", "session:1")];
    const unlock = deriveAchievementUnlocks(
      events,
      [],
      "guest:one",
      "2026-07-30T13:00:00Z",
      [definition]
    )[0];

    expect(
      deriveAchievementUnlocks(
        events,
        [unlock],
        "guest:one",
        "2026-07-30T14:00:00Z",
        [definition]
      )
    ).toEqual([]);
  });
});
