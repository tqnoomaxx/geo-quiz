import { describe, expect, it } from "vitest";
import { createContentRepository } from "./repository";
import {
  loadDatasetWithRankedPhysical,
  loadRankedPhysicalPack,
  rankedPhysicalCount
} from "./rankedPhysical";
import { validateRankedPhysicalContentPack } from "./schema";
import {
  createMvpQuizDefinition,
  DEFAULT_MVP_SETUP
} from "../engine/quiz/presets";
import { generateQuestions } from "../engine/quiz/generator";

describe("physische Top-100-Ranglisten", () => {
  it("liefert zwei vollständige, eindeutig abgegrenzte Top-100-Listen", async () => {
    const pack = await loadRankedPhysicalPack();

    expect(pack.entities.filter((entity) => entity.type === "ranked_river"))
      .toHaveLength(100);
    expect(pack.entities.filter((entity) => entity.type === "ranked_peak"))
      .toHaveLength(100);
    expect(pack.rankings.rivers.boundary.includedValue).toBeGreaterThan(
      pack.rankings.rivers.boundary.excludedValue
    );
    expect(pack.rankings.peaks.boundary.includedValue).toBeGreaterThan(
      pack.rankings.peaks.boundary.excludedValue
    );
    expect(pack.sources).toHaveLength(2);
    expect(
      pack.sources.every(
        (source) =>
          source.license === "CC BY-SA 4.0" &&
          source.url.includes(`oldid=${source.revisionId}`)
      )
    ).toBe(true);
    expect(rankedPhysicalCount("longest-rivers", "world")).toBe(100);
    expect(rankedPhysicalCount("highest-mountains", "continent:asia")).toBe(0);
  });

  it("liefert pro Entität ein vollständiges, methodisch einheitliches Faktenprofil", async () => {
    const pack = await loadRankedPhysicalPack();
    const factsByEntity = new Map<string, typeof pack.facts>();

    for (const fact of pack.facts) {
      const current = factsByEntity.get(fact.entityId) ?? [];
      current.push(fact);
      factsByEntity.set(fact.entityId, current);
    }

    expect(
      pack.entities.every((entity) =>
        entity.type === "ranked_river"
          ? factsByEntity.get(entity.id)?.length === 3
          : entity.type === "ranked_peak" &&
            factsByEntity.get(entity.id)?.length === 3
      )
    ).toBe(true);
    for (const factType of pack.factDefinitions) {
      const matchingFacts = pack.facts.filter(
        (fact) => fact.factTypeId === factType.id
      );
      expect(new Set(matchingFacts.map((fact) => fact.method)).size).toBe(1);
      expect(new Set(matchingFacts.map((fact) => fact.asOf)).size).toBe(1);
      expect(new Set(matchingFacts.flatMap((fact) => fact.sourceRefs)).size).toBe(1);
    }
  });

  it("kompiliert Fakten zu einer Namensfrage und zeigt alle Angaben in der Lösung", async () => {
    const dataset = await loadDatasetWithRankedPhysical();
    const repository = createContentRepository(dataset);
    const nile = repository
      .getEntitiesByType("ranked_river")
      .find((entity) =>
        repository
          .getAcceptedNames(entity.id, "de")
          .some((name) => name.name === "Nil")
      );
    expect(nile).toBeDefined();

    const definition = createMvpQuizDefinition({
      ...DEFAULT_MVP_SETUP,
      topic: "longest-rivers",
      direction: "facts_to_name",
      regionId: "world",
      questionCount: "all",
      includeIds: [nile?.id ?? "missing"],
      seed: "ranked-river-test"
    });
    const [question] = generateQuestions(definition, repository);

    expect(question.promptPayload.kind).toBe("fact");
    if (question.promptPayload.kind !== "fact") return;
    expect(question.promptPayload.label).toBe("Rang 1");
    expect(question.promptPayload.facts.map((fact) => fact.label)).toEqual([
      "Länge",
      "Länder im Einzugsgebiet",
      "Mündung"
    ]);
    expect(question.promptText).toBe(
      "Welches Flusssystem passt zu diesen Angaben?"
    );
    expect(question.feedback.expectedLabel).toContain("Nil");
    expect(question.feedback.expectedLabel).toContain("6.650 km");
    expect(question.feedback.expectedLabel).toContain("Mündung: Mittelmeer");
  });

  it("weist eine manipulierte, uneindeutige Ranggrenze zurück", async () => {
    const pack = await loadRankedPhysicalPack();
    const invalid = structuredClone(pack);
    invalid.rankings.rivers.boundary.excludedValue =
      invalid.rankings.rivers.boundary.includedValue;

    const result = validateRankedPhysicalContentPack(invalid);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.issues).toContain(
      "Rangdefinition rivers ist ungültig oder am Rand uneindeutig."
    );
  });
});
