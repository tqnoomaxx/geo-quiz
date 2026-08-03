import { describe, expect, it } from "vitest";
import rankedCitiesJson from "./generated/ranked-cities-v1.json";
import {
  loadDatasetWithRankedCities,
  rankedCityIndex,
  type RankedCitySetSize
} from "./rankedCities";
import { createContentRepository } from "./repository";
import {
  validateRankedCityContentPack,
  type RankedCityContentPack
} from "./schema";
import {
  createMvpQuizDefinition,
  createWorldMixDefinition,
  DEFAULT_MVP_SETUP,
  MVP_REGIONS
} from "../engine/quiz/presets";
import {
  generateRoundQuestions
} from "../engine/mixed/scheduler";
import { selectQuizCandidates } from "../engine/quiz/generator";
import {
  createPersistedSessionSnapshot,
  createPreparingSession,
  reduceQuizSession,
  restorePersistedSession,
  validateQuizSessionState
} from "../engine/session/session";

const repositoryPromise = loadDatasetWithRankedCities().then(
  createContentRepository
);

describe("Phase-7 ranked city content", () => {
  it("validiert Snapshot, Quellen, Ränge und sprachcodierte Namen", () => {
    const parsed = validateRankedCityContentPack(rankedCitiesJson);
    expect(parsed).toMatchObject({ success: true });
    if (!parsed.success) return;

    expect(parsed.data.entities).toHaveLength(6000);
    expect(parsed.data.facts).toHaveLength(6000);
    expect(parsed.data.quality.germanPreferredNameCount).toBe(3100);
    expect(parsed.data.quality.boundaryTies).toEqual([
      expect.objectContaining({
        scopeId: "continent:oceania",
        setSize: 1000,
        population: 2190
      })
    ]);
    expect(
      parsed.data.names.find(
        (name) =>
          name.entityId === "geonames:524901" &&
          name.kind === "preferred"
      )?.name
    ).toBe("Moskau");
    expect(
      parsed.data.names.find(
        (name) =>
          name.entityId === "geonames:1816670" &&
          name.name === "Peking"
      )?.answerPolicy
    ).toBe("accept_only");
    expect(
      parsed.data.sources.every(
        (source) =>
          source.license === "CC BY 4.0" &&
          source.file.sha256.length === 64 &&
          source.file.bytes > 0
      )
    ).toBe(true);
  });

  it("blockiert eine vom Snapshotvertrag abweichende Faktenquelle", () => {
    const broken = structuredClone(
      rankedCitiesJson
    ) as unknown as RankedCityContentPack;
    broken.facts[0].sourceRefs = ["anderer-dump"];
    const parsed = validateRankedCityContentPack(broken);
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.issues).toContain(
      `Ungültiger Stadtbevölkerungsfakt: ${broken.facts[0].id}`
    );
  });

  it.each(
    MVP_REGIONS.flatMap((region) =>
      ([100, 250, 500, 1000] as RankedCitySetSize[]).map(
        (setSize) => [region.id, setSize] as const
      )
    )
  )("liefert in %s exakt Top %s", async (regionId, setSize) => {
    const repository = await repositoryPromise;
    const definition = createMvpQuizDefinition({
      ...DEFAULT_MVP_SETUP,
      topic: "cities",
      direction: "name",
      regionId,
      citySetSize: setSize,
      questionCount: 10,
      seed: "city-count-contract"
    });
    const candidates = selectQuizCandidates(definition, repository);
    expect(candidates).toHaveLength(setSize);
    expect(
      candidates.every(
        (candidate) =>
          (candidate.rankByScope?.[regionId] ?? Infinity) <= setSize
      )
    ).toBe(true);
  });

  it("erzeugt einen reproduzierbaren, pausierbaren 1000er-Fragensnapshot", async () => {
    const repository = await repositoryPromise;
    const definition = createMvpQuizDefinition({
      ...DEFAULT_MVP_SETUP,
      topic: "cities",
      direction: "locate",
      regionId: "world",
      citySetSize: 1000,
      questionCount: "all",
      seed: "city-marathon-contract"
    });
    const first = generateRoundQuestions(
      definition,
      repository,
      "city-marathon-contract"
    );
    const second = generateRoundQuestions(
      definition,
      repository,
      "city-marathon-contract"
    );

    expect(first).toHaveLength(1000);
    expect(second.map((question) => question.subjectId)).toEqual(
      first.map((question) => question.subjectId)
    );
    expect(
      first.every(
        (question) =>
          question.metadata.entityType === "ranked_city" &&
          question.promptText.includes("(")
      )
    ).toBe(true);

    const preparing = createPreparingSession({
      id: "session:city-marathon-contract",
      definition,
      datasetVersion: repository.dataset.version,
      seed: "city-marathon-contract",
      startedAt: "2026-07-30T06:00:00.000Z"
    });
    const asking = reduceQuizSession(preparing, {
      type: "CONTENT_READY",
      questions: first,
      atMs: 100
    });
    const persisted = createPersistedSessionSnapshot(asking, 250);
    expect(persisted.status).toBe("paused");
    expect(persisted.questions).toHaveLength(1000);
    expect(validateQuizSessionState(persisted)).toMatchObject({
      success: true
    });
    const resumed = restorePersistedSession(persisted, 500);
    expect(resumed.status).toBe("asking");
    expect(resumed.currentQuestionIndex).toBe(0);
  });

  it("mischt Städte in eine 20er-Weltmixrunde", async () => {
    const repository = await repositoryPromise;
    const definition = createWorldMixDefinition({
      ...DEFAULT_MVP_SETUP,
      topic: "world-mix",
      direction: "mix",
      regionId: "world",
      questionCount: 20,
      citySetSize: 100,
      seed: "phase7-city-mix"
    });
    const questions = generateRoundQuestions(
      definition,
      repository,
      "phase7-city-mix"
    );
    expect(questions).toHaveLength(20);
    expect(
      questions.some(
        (question) => question.metadata.sourcePoolId === "cities"
      )
    ).toBe(true);
    expect(rankedCityIndex.quality.scopeCounts.world).toBe(1000);
  });
});
