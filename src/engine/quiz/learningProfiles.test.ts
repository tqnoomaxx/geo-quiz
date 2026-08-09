import { describe, expect, it } from "vitest";
import { loadDatasetForRankedContent } from "../../content/rankedContent";
import { createContentRepository } from "../../content/repository";
import { generateRoundQuestions } from "../mixed/scheduler";
import {
  createMvpQuizDefinition,
  createQuizRoundDefinition,
  DEFAULT_MVP_SETUP,
  MVP_DIRECTIONS,
  type MvpTopic
} from "./presets";
import { isMixedQuizDefinition, validateQuizRoundDefinition } from "./definition";
import {
  canRevealSolution,
  getLearningProfile,
  LEARNING_PROFILES,
  learningProfileFromRules
} from "./learningProfiles";

describe("Lernmodus-Regeln", () => {
  it("deaktiviert Zeitdruck und erlaubt Lösungen beim Lernen", () => {
    const definition = createMvpQuizDefinition({
      ...DEFAULT_MVP_SETUP,
      profile: "learn",
      timerSeconds: 15
    });

    expect(definition.rules).toMatchObject({
      timer: { kind: "none" },
      feedback: "immediate",
      retryMistakes: false,
      hints: "unlimited"
    });
    expect(canRevealSolution(definition.rules)).toBe(true);
    expect(learningProfileFromRules(definition.rules)).toBe("learn");
  });

  it("zeigt beim Üben sofort Feedback, ohne Fragen zu wiederholen", () => {
    const definition = createMvpQuizDefinition({
      ...DEFAULT_MVP_SETUP,
      profile: "practice",
      timerSeconds: 30
    });

    expect(definition.rules).toMatchObject({
      timer: { kind: "none" },
      feedback: "immediate",
      retryMistakes: false,
      hints: "one"
    });
    expect(canRevealSolution(definition.rules)).toBe(true);
    expect(learningProfileFromRules(definition.rules)).toBe("practice");
  });

  it("hält Lösungen in der Prüfung zurück und übernimmt ein optionales Zeitlimit", () => {
    const definition = createMvpQuizDefinition({
      ...DEFAULT_MVP_SETUP,
      profile: "exam",
      timerSeconds: 15
    });

    expect(definition.rules).toMatchObject({
      timer: { kind: "per_question", seconds: 15 },
      feedback: "end",
      retryMistakes: false,
      hints: "off"
    });
    expect(canRevealSolution(definition.rules)).toBe(false);
    expect(learningProfileFromRules(definition.rules)).toBe("exam");
  });

  it("wendet jeden Lernmodus auf alle registrierten Fragerichtungen an", async () => {
    const completeDataset = await loadDatasetForRankedContent({
      cities: true,
      physical: true
    });
    const repository = createContentRepository(completeDataset);
    const topics = Object.keys(MVP_DIRECTIONS) as MvpTopic[];
    const combinations = topics.flatMap((topic) =>
      MVP_DIRECTIONS[topic].map((direction) => ({
        topic,
        direction: direction.id
      }))
    );

    expect(combinations).toHaveLength(33);

    for (const combination of combinations) {
      for (const profile of LEARNING_PROFILES) {
        const shortTopicCount =
          combination.topic === "planets"
            ? 8
            : combination.topic === "dwarf-planets"
              ? 5
              : undefined;
        const definition = createQuizRoundDefinition({
          ...DEFAULT_MVP_SETUP,
          ...combination,
          profile: profile.id,
          regionId: "world",
          questionCount: shortTopicCount ? "all" : 10,
          timerSeconds: 15,
          seed: `profile-contract:${combination.topic}:${combination.direction}:${profile.id}`
        });
        const expected = getLearningProfile(profile.id);

        expect(
          validateQuizRoundDefinition(definition, completeDataset),
          `${combination.topic}/${combination.direction}/${profile.id}`
        ).toMatchObject({ success: true });
        expect(learningProfileFromRules(definition.rules)).toBe(profile.id);
        expect(definition.rules).toMatchObject({
          feedback: expected.feedback,
          retryMistakes: expected.retryMistakes,
          hints: expected.hints,
          timer:
            expected.timerPolicy === "disabled"
              ? { kind: "none" }
              : { kind: "per_question", seconds: 15 }
        });
        expect(canRevealSolution(definition.rules)).toBe(
          profile.id !== "exam"
        );
        expect(
          generateRoundQuestions(
            definition,
            repository,
            definition.rules.seed
          )
        ).toHaveLength(shortTopicCount ?? 10);
        if (isMixedQuizDefinition(definition)) {
          expect(definition.profile).toBe(profile.id);
        }
      }
    }
  });
});
