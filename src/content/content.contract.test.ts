import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import datasetJson from "./generated/geo-core-mvp-v1.json";
import manifestJson from "./generated/manifest.json";
import qualityJson from "./generated/quality-report.json";
import visualAssetIndexJson from "./generated/visual-assets-index-v1.json";
import physicalLakeJson from "../geo/generated/physical-lake-v1.json";
import physicalMountainRangeJson from "../geo/generated/physical-mountain-range-v1.json";
import physicalPeakJson from "../geo/generated/physical-peak-v1.json";
import physicalRiverJson from "../geo/generated/physical-river-v1.json";
import physicalSeaJson from "../geo/generated/physical-sea-v1.json";
import physicalSnapshotJson from "../../content-src/physical-core.v1.json";
import astronomySnapshotJson from "../../content-src/astronomy-core.v1.json";
import landmarkSnapshotJson from "../../content-src/landmarks-core.v1.json";
import { createContentRepository } from "./repository";
import {
  validateDatasetManifest,
  validateGeoDataset,
  validateRawAstronomySnapshot,
  validateRawLandmarkSnapshot,
  validateRawPhysicalSnapshot
} from "./schema";

describe("Phase-2 content contract", () => {
  it("validates generated dataset and manifest", () => {
    expect(validateGeoDataset(datasetJson)).toMatchObject({ success: true });
    expect(validateDatasetManifest(manifestJson)).toMatchObject({
      success: true
    });
  });

  it("matches every generated checksum in the manifest", () => {
    for (const artifact of manifestJson.artifacts) {
      const url = artifact.path.startsWith("../../geo/generated/")
        ? new URL(
            `../geo/generated/${artifact.path.split("/").at(-1)}`,
            import.meta.url
          )
        : new URL(`./generated/${artifact.path}`, import.meta.url);
      const content = readFileSync(url, "utf8");
      expect(createHash("sha256").update(content).digest("hex")).toBe(
        artifact.sha256
      );
      expect(Buffer.byteLength(content)).toBe(artifact.bytes);
    }
  });

  it("contains the declared 195-state scope and every capital relation", () => {
    const parsed = validateGeoDataset(datasetJson);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const repository = createContentRepository(parsed.data);
    const countries = repository.getEntitiesByType("country");
    const capitals = repository
      .getEntitiesByType("city")
      .filter(
        (city) =>
          repository.getRelatedEntities(
            city.id,
            "is_capital_of",
            "outgoing"
          ).length > 0
      );

    expect(countries).toHaveLength(195);
    expect(capitals).toHaveLength(202);
    expect(
      countries.every(
        (country) =>
          country.centroid &&
          country.geometryRef &&
          repository.getRelatedEntities(
            country.id,
            "has_capital",
            "outgoing"
          ).length > 0
      )
    ).toBe(true);
    expect(qualityJson.checks.mapFallbackFeatureIds).toEqual(["798"]);
  });

  it("keeps continent assignments and current German aliases explicit", () => {
    const parsed = validateGeoDataset(datasetJson);
    if (!parsed.success) throw new Error(parsed.issues.join("\n"));
    const repository = createContentRepository(parsed.data);

    expect(
      repository
        .getEntitiesByType("country")
        .filter((country) =>
          repository.isWithinScope(country.id, ["continent:europe"])
        )
    ).toHaveLength(50);
    expect(
      repository
        .getAcceptedNames("country:sz", "de")
        .map((name) => name.name)
    ).toEqual(expect.arrayContaining(["Eswatini", "Swasiland"]));
    expect(
      repository
        .getAcceptedNames("city:wd-q85", "de")
        .map((name) => name.name)
    ).toEqual(expect.arrayContaining(["Kairo", "Cairo"]));
  });

  it("contains a complete relation-backed profile for every country", () => {
    const parsed = validateGeoDataset(datasetJson);
    if (!parsed.success) throw new Error(parsed.issues.join("\n"));
    const repository = createContentRepository(parsed.data);
    const countries = repository.getEntitiesByType("country");

    expect(repository.getEntitiesByType("language")).toHaveLength(139);
    expect(repository.getEntitiesByType("currency")).toHaveLength(146);
    expect(qualityJson.checks.countryProfilesComplete).toBe(true);
    expect(
      countries.every(
        (country) =>
          repository.getRelatedEntities(country.id, "has_capital", "outgoing")
            .length > 0 &&
          repository.getRelatedEntities(
            country.id,
            "has_official_language",
            "outgoing"
          ).length > 0 &&
          repository.getRelatedEntities(country.id, "uses_currency", "outgoing")
            .length > 0
      )
    ).toBe(true);
    expect(
      repository.getAcceptedNames("currency:eur", "de").map((name) => name.name)
    ).toEqual(expect.arrayContaining(["Euro", "EUR"]));
  });

  it("contains every versioned country visual, constellation chart and landmark photo", () => {
    expect(visualAssetIndexJson.datasetVersion).toBe(datasetJson.version);
    expect(visualAssetIndexJson.assets).toHaveLength(414);
    expect(
      visualAssetIndexJson.assets.filter((asset) => asset.kind === "flag")
    ).toHaveLength(195);
    expect(
      visualAssetIndexJson.assets.filter(
        (asset) => asset.kind === "country_outline"
      )
    ).toHaveLength(195);
    expect(
      visualAssetIndexJson.assets.filter(
        (asset) => asset.kind === "constellation_chart"
      )
    ).toHaveLength(12);
    expect(
      visualAssetIndexJson.assets.filter(
        (asset) => asset.kind === "landmark_photo"
      )
    ).toHaveLength(12);
    expect(
      new Set(visualAssetIndexJson.assets.map((asset) => asset.key)).size
    ).toBe(414);

    for (const asset of visualAssetIndexJson.assets) {
      const file = readFileSync(new URL(`../../public/${asset.path}`, import.meta.url));
      if (asset.mediaType === "image/svg+xml") {
        expect(file.toString("utf8")).toMatch(/^<svg[\s>]/);
      } else {
        expect(asset.mediaType).toBe("image/jpeg");
        expect(file.subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
      }
      expect(createHash("sha256").update(file).digest("hex")).toBe(asset.sha256);
      expect(file.byteLength).toBe(asset.bytes);
    }
  });

  it("ships sourced landmark facts and pinned local photographs", () => {
    expect(validateRawLandmarkSnapshot(landmarkSnapshotJson)).toMatchObject({
      success: true
    });
    const parsed = validateGeoDataset(datasetJson);
    if (!parsed.success) throw new Error(parsed.issues.join("\n"));
    const repository = createContentRepository(parsed.data);
    const landmarks = repository.getEntitiesByType("landmark");
    expect(landmarks).toHaveLength(12);
    expect(qualityJson.checks).toMatchObject({
      landmarkEntityCount: 12,
      landmarkImagesPinnedAndSourced: true
    });
    expect(
      landmarks.every((landmark) =>
        [
          "fact-type:landmark-country",
          "fact-type:landmark-place",
          "fact-type:landmark-fun-fact",
          "fact-type:landmark-distinction"
        ].every((factTypeId) => repository.getFact(landmark.id, factTypeId))
      )
    ).toBe(true);
  });

  it("ships a sourced astronomy core with stable facts and local charts", () => {
    expect(validateRawAstronomySnapshot(astronomySnapshotJson)).toMatchObject({
      success: true
    });
    const parsed = validateGeoDataset(datasetJson);
    if (!parsed.success) throw new Error(parsed.issues.join("\n"));
    const repository = createContentRepository(parsed.data);

    expect(qualityJson.checks).toMatchObject({
      astronomyEntityCounts: {
        planet: 8,
        moon: 20,
        dwarf_planet: 5,
        zodiac_constellation: 12
      },
      constellationChartCount: 12
    });
    expect(
      repository.getEntitiesByType("moon").every(
        (moon) =>
          repository.getRelatedEntities(moon.id, "orbits", "outgoing")
            .length === 1
      )
    ).toBe(true);
    expect(
      repository.getEntitiesByType("zodiac_constellation").every(
        (constellation) =>
          repository.getFact(
            constellation.id,
            "fact-type:iau-abbreviation"
          ) &&
          repository.getFact(
            constellation.id,
            "fact-type:best-visibility-month"
          ) &&
          repository.getFact(constellation.id, "fact-type:sky-position")
      )
    ).toBe(true);
  });

  it("links every curated physical entity to a versioned geometry", () => {
    expect(validateRawPhysicalSnapshot(physicalSnapshotJson)).toMatchObject({
      success: true
    });
    const parsed = validateGeoDataset(datasetJson);
    if (!parsed.success) throw new Error(parsed.issues.join("\n"));
    const repository = createContentRepository(parsed.data);
    const expectedCounts = {
      river: 18,
      lake: 18,
      sea: 18,
      mountain_range: 18,
      peak: 16
    };
    const physicalFeatures = [
      ...physicalRiverJson.features,
      ...physicalLakeJson.features,
      ...physicalSeaJson.features,
      ...physicalMountainRangeJson.features,
      ...physicalPeakJson.features
    ];

    for (const [type, count] of Object.entries(expectedCounts)) {
      const entities = repository.getEntitiesByType(type);
      expect(entities).toHaveLength(count);
      expect(
        entities.every(
          (entity) =>
            entity.geometryRef &&
            entity.sourceRefs.some((source) =>
              source.startsWith("natural-earth-5.1.2:")
            ) &&
            repository.getAcceptedNames(entity.id, "de").length > 0
        )
      ).toBe(true);
      expect(
        physicalFeatures.filter(
          (feature) => feature.properties.entityType === type
        )
      ).toHaveLength(count);
    }

    expect(new Set(physicalFeatures.map((feature) => feature.id)).size)
      .toBe(88);
    expect(
      repository
        .getEntitiesByType("river")
        .filter((entity) =>
          repository.isWithinScope(entity.id, ["continent:europe"])
        ).length
    ).toBeGreaterThanOrEqual(3);
  });

  it("ships only unique, sourced and explainable knowledge questions", () => {
    const parsed = validateGeoDataset(datasetJson);
    if (!parsed.success) throw new Error(parsed.issues.join("\n"));
    const repository = createContentRepository(parsed.data);
    const questions = repository.getEntitiesByType("knowledge_question");

    expect(parsed.data.facts).toHaveLength(546);
    expect(parsed.data.compiledKnowledgeQuestions).toHaveLength(62);
    expect(questions).toHaveLength(62);
    expect(qualityJson.checks).toMatchObject({
      knowledgeFactCount: 498,
      knowledgeTemplateCount: 62,
      compiledKnowledgeQuestionCount: 62,
      knowledgeQuestionsUniqueAndSourced: true,
      knowledgeComparisonsMethodConsistent: true
    });
    expect(
      questions.every(
        (question) =>
          repository.getRelatedEntities(
            question.id,
            "has_answer",
            "outgoing"
          ).length === 1 &&
          repository.getCompiledKnowledgeQuestion(question.id)?.evidence
            .length
      )
    ).toBe(true);
  });
});
