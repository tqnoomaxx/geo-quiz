import { describe, expect, it } from "vitest";
import { geoDataset } from "../../content/dataset";
import { createContentRepository } from "../../content/repository";
import {
  createMvpQuizDefinition,
  createWorldMixDefinition
} from "../quiz/presets";
import type { MixedQuizDefinition } from "../quiz/definition";
import {
  allocateMixedPools,
  generateMixedQuestions
} from "./scheduler";

const repository = createContentRepository(geoDataset);

function fixture(): MixedQuizDefinition {
  const base = {
    topic: "countries" as const,
    direction: "locate" as const,
    profile: "learn" as const,
    regionId: "world" as const,
    questionCount: 10 as const,
    citySetSize: 100 as const,
    timerSeconds: 0 as const,
    seed: "mixed-stable"
  };
  const countries = createMvpQuizDefinition(base);
  const flags = createMvpQuizDefinition({
    ...base,
    topic: "flags",
    direction: "choice"
  });

  return {
    kind: "mixed",
    id: "mixed-fixture-v1",
    schemaVersion: 1,
    datasetVersion: geoDataset.version,
    label: "Fixture",
    profile: "learn",
    scope: { regionIds: [] },
    pools: [
      { id: "countries", definition: countries, weight: 1, minimum: 4, maximum: 6 },
      { id: "flags", definition: flags, weight: 1, minimum: 4, maximum: 6 }
    ],
    schedule: { maxConsecutiveFromPool: 1 },
    rules: {
      questionCount: 10,
      randomizer: "mulberry32-v1",
      timer: { kind: "none" },
      feedback: "immediate",
      retryMistakes: false,
      hints: "off",
      seed: "mixed-stable"
    }
  };
}

describe("weighted Mixed scheduler", () => {
  it("hält Grenzen ein und ist mit Seed vollständig reproduzierbar", () => {
    const definition = fixture();
    const allocations = allocateMixedPools(definition);
    expect(allocations.reduce((sum, item) => sum + item.count, 0)).toBe(10);
    expect(allocations.every((item) => item.count >= 4 && item.count <= 6)).toBe(true);

    const first = generateMixedQuestions(definition, repository);
    const second = generateMixedQuestions(definition, repository);
    expect(first).toEqual(second);
    expect(first).toHaveLength(10);
    expect(
      first.slice(1).every(
        (question, index) =>
          question.metadata.sourcePoolId !==
          first[index].metadata.sourcePoolId
      )
    ).toBe(true);
  });

  it("hält in der kurzen Phase-7-Mischrunde zehn garantierte Pools", () => {
    const definition = createWorldMixDefinition({
      topic: "world-mix",
      direction: "mix",
      profile: "learn",
      regionId: "world",
      questionCount: 10,
      citySetSize: 100,
      timerSeconds: 0,
      seed: "phase6-ten-pools"
    });
    const first = generateMixedQuestions(definition, repository);
    const second = generateMixedQuestions(definition, repository);

    expect(first).toEqual(second);
    expect(
      new Set(first.map((question) => question.metadata.sourcePoolId))
    ).toEqual(
      new Set([
        "countries",
        "capitals",
        "flags",
        "shapes",
        "rivers",
        "lakes",
        "seas",
        "mountain-ranges",
        "peaks",
        "knowledge"
      ])
    );
  });
});
