import { geoDataset } from "../../content/dataset";
import { createContentRepository } from "../../content/repository";
import {
  rankedCityCount,
  type RankedCitySetSize
} from "../../content/rankedCities";
import { rankedPhysicalCount } from "../../content/rankedPhysical";
import {
  isMixedQuizDefinition,
  type MixedQuizDefinition,
  type QuizDefinition,
  type QuizRoundDefinition,
  type QuizRules
} from "./definition";
import type { ReviewQueueItem } from "../progress/progress";
import {
  getLearningProfile,
  learningProfileFromRules,
  type LearningProfileId
} from "./learningProfiles";

export type MvpTopic =
  | "capitals"
  | "cities"
  | "countries"
  | "flags"
  | "shapes"
  | "rivers"
  | "lakes"
  | "seas"
  | "mountain-ranges"
  | "peaks"
  | "longest-rivers"
  | "highest-mountains"
  | "knowledge"
  | "world-mix";
export type MvpDirection =
  | "locate"
  | "name"
  | "country_to_name"
  | "name_to_country"
  | "choice"
  | "reverse_choice"
  | "facts_to_name"
  | "mix";
export type MvpProfile = LearningProfileId;
export type MvpRegionId =
  | "world"
  | "continent:africa"
  | "continent:asia"
  | "continent:europe"
  | "continent:north-america"
  | "continent:oceania"
  | "continent:south-america";
export type MvpQuestionCount = 10 | 20 | "all";
export type MvpTimerSeconds = 0 | 15 | 30;

export interface MvpQuizSetup {
  topic: MvpTopic;
  direction: MvpDirection;
  profile: MvpProfile;
  regionId: MvpRegionId;
  questionCount: MvpQuestionCount;
  citySetSize: RankedCitySetSize;
  timerSeconds: MvpTimerSeconds;
  seed: string;
  includeIds?: string[];
}

export const MVP_REGIONS: Array<{ id: MvpRegionId; label: string }> = [
  { id: "world", label: "Welt" },
  { id: "continent:africa", label: "Afrika" },
  { id: "continent:asia", label: "Asien" },
  { id: "continent:europe", label: "Europa" },
  { id: "continent:north-america", label: "Nordamerika" },
  { id: "continent:oceania", label: "Ozeanien" },
  { id: "continent:south-america", label: "Südamerika" }
];

export const MVP_DIRECTIONS: Record<
  MvpTopic,
  Array<{ id: MvpDirection; label: string }>
> = {
  capitals: [
    { id: "locate", label: "Name → Karte" },
    { id: "name", label: "Punkt → Name" },
    { id: "country_to_name", label: "Land → Hauptstadt" },
    { id: "name_to_country", label: "Hauptstadt → Land" }
  ],
  cities: [
    { id: "locate", label: "Name → Karte" },
    { id: "name", label: "Punkt → Name" }
  ],
  countries: [
    { id: "locate", label: "Name → Karte" },
    { id: "name", label: "Fläche → Name" }
  ],
  flags: [
    { id: "name", label: "Flagge → Eingabe" },
    { id: "choice", label: "Flagge → Auswahl" },
    { id: "reverse_choice", label: "Land → Flagge" }
  ],
  shapes: [{ id: "name", label: "Umriss → Eingabe" }],
  rivers: [
    { id: "locate", label: "Name → Verlauf" },
    { id: "name", label: "Verlauf → Name" }
  ],
  lakes: [
    { id: "locate", label: "Name → Fläche" },
    { id: "name", label: "Fläche → Name" }
  ],
  seas: [
    { id: "locate", label: "Name → Fläche" },
    { id: "name", label: "Fläche → Name" }
  ],
  "mountain-ranges": [
    { id: "locate", label: "Name → Fläche" },
    { id: "name", label: "Fläche → Name" }
  ],
  peaks: [
    { id: "locate", label: "Name → Karte" },
    { id: "name", label: "Punkt → Name" }
  ],
  "longest-rivers": [
    { id: "facts_to_name", label: "Fakten → Flussname" }
  ],
  "highest-mountains": [
    { id: "facts_to_name", label: "Fakten → Bergname" }
  ],
  knowledge: [
    { id: "choice", label: "Wissenspuzzle → Auswahl" },
    { id: "name", label: "Wissenspuzzle → Eingabe" }
  ],
  "world-mix": [{ id: "mix", label: "Alles gemischt" }]
};

const PHYSICAL_TOPIC_TYPES: Partial<Record<MvpTopic, string>> = {
  rivers: "river",
  lakes: "lake",
  seas: "sea",
  "mountain-ranges": "mountain_range",
  peaks: "peak"
};
const contentRepository = createContentRepository(geoDataset);

export function candidateCountForSetup(
  topic: MvpTopic,
  regionId: MvpRegionId,
  citySetSize: RankedCitySetSize = 1000,
  direction: MvpDirection = MVP_DIRECTIONS[topic][0].id
): number {
  if (topic === "world-mix") {
    return Object.keys(MVP_DIRECTIONS)
        .filter(
          (candidate) =>
            candidate !== "world-mix" &&
            candidate !== "longest-rivers" &&
            candidate !== "highest-mountains"
        )
        .reduce(
          (sum, candidate) =>
            sum + candidateCountForSetup(candidate as MvpTopic, regionId),
          0
        );
  }
  if (topic === "cities") {
    return rankedCityCount(regionId, citySetSize);
  }
  if (topic === "longest-rivers" || topic === "highest-mountains") {
    return rankedPhysicalCount(topic, regionId);
  }
  const entityType =
    PHYSICAL_TOPIC_TYPES[topic] ??
    (topic === "capitals"
      ? direction === "country_to_name"
        ? "country"
        : "city"
      : topic === "knowledge"
        ? "knowledge_question"
        : "country");
  return contentRepository
    .getEntitiesByType(entityType)
    .filter((entity) => entity.active)
    .filter((entity) =>
      regionId === "world"
        ? true
        : contentRepository.isWithinScope(entity.id, [regionId])
    )
    .filter(
      (entity) =>
        (topic !== "capitals" ||
          contentRepository.getRelatedEntities(
            entity.id,
            direction === "country_to_name"
              ? "has_capital"
              : "is_capital_of",
            "outgoing"
          ).length > 0) &&
        (topic !== "knowledge" ||
          contentRepository.getRelatedEntities(
            entity.id,
            "has_answer",
            "outgoing"
          ).length === 1)
    ).length;
}

export const DEFAULT_MVP_SETUP: MvpQuizSetup = {
  topic: "capitals",
  direction: "locate",
  profile: "learn",
  regionId: "continent:europe",
  questionCount: 10,
  citySetSize: 100,
  timerSeconds: 0,
  seed: "phase2-default"
};

function scopeRegionIds(regionId: MvpRegionId) {
  return regionId === "world" ? [] : [regionId];
}

function rulesFromSetup(
  setup: MvpQuizSetup,
  questionCount: number | "all"
): QuizRules {
  const profile = getLearningProfile(setup.profile);
  return {
    questionCount,
    randomizer: "mulberry32-v1",
    timer:
      profile.timerPolicy === "disabled" || setup.timerSeconds === 0
        ? { kind: "none" }
        : { kind: "per_question", seconds: setup.timerSeconds },
    feedback: profile.feedback,
    retryMistakes: profile.retryMistakes,
    hints: profile.hints,
    seed: setup.seed
  };
}

function createCountryOrCapitalDefinition(
  setup: MvpQuizSetup,
  datasetVersion: string
): QuizDefinition {
  const topic = setup.topic === "capitals" ? "capitals" : "countries";
  const asksCapitalFromCountry =
    topic === "capitals" && setup.direction === "country_to_name";
  const asksCountryFromCapital =
    topic === "capitals" && setup.direction === "name_to_country";
  const isRelationQuestion =
    asksCapitalFromCountry || asksCountryFromCapital;
  const kind =
    setup.direction === "name" || isRelationQuestion
      ? "text_input"
      : topic === "capitals"
        ? "map_point"
        : "map_area";
  const subjectType =
    topic === "capitals" && !asksCapitalFromCountry ? "city" : "country";
  const regionSlug = setup.regionId.replace("continent:", "");
  const count = setup.includeIds?.length ? "all" : setup.questionCount;

  return {
    id: isRelationQuestion
      ? `phase2-${topic}-${setup.direction}-${regionSlug}-v1`
      : `mvp-${topic}-${kind}-${regionSlug}-v1`,
    schemaVersion: 1,
    datasetVersion,
    content: {
      subjectType,
      requiredRelations:
        topic === "capitals"
          ? [asksCapitalFromCountry ? "has_capital" : "is_capital_of"]
          : undefined
    },
    prompt: {
      kind: setup.direction === "name" ? "map_highlight" : "name",
      entity: { from: "subject" },
      locale: "de"
    },
    answer: {
      kind,
      entity: asksCapitalFromCountry
        ? {
            from: "subject",
            relation: "has_capital",
            direction: "outgoing"
          }
        : asksCountryFromCapital
          ? {
              from: "subject",
              relation: "is_capital_of",
              direction: "outgoing"
            }
          : { from: "subject" },
      field: asksCapitalFromCountry
        ? "capital_name"
        : asksCountryFromCapital
          ? "country_name"
          : undefined,
      grader:
        kind === "text_input"
          ? "text-v1"
          : kind === "map_point"
            ? "distance-v1"
            : "area-v1",
      graderConfig:
        kind === "map_point"
          ? {
              thresholdKm: setup.regionId === "world" ? 400 : 220
            }
          : undefined
    },
    scope: {
      regionIds: scopeRegionIds(setup.regionId),
      includeIds: setup.includeIds
    },
    rules: rulesFromSetup(setup, count)
  };
}

function createRankedCityDefinition(
  setup: MvpQuizSetup,
  datasetVersion: string
): QuizDefinition {
  const answerKind =
    setup.direction === "name" ? "text_input" : "map_point";
  const regionSlug = setup.regionId.replace("continent:", "");
  const count = setup.includeIds?.length ? "all" : setup.questionCount;

  return {
    id: `phase7-cities-top${setup.citySetSize}-${setup.direction}-${regionSlug}-v1`,
    schemaVersion: 1,
    datasetVersion,
    content: {
      subjectType: "ranked_city",
      filters: setup.includeIds?.length
        ? undefined
        : [
            {
              field: "scope_rank",
              op: "lte",
              value: setup.citySetSize
            }
          ]
    },
    prompt: {
      kind: setup.direction === "name" ? "map_highlight" : "name",
      entity: { from: "subject" },
      locale: "de"
    },
    answer: {
      kind: answerKind,
      entity: { from: "subject" },
      grader: answerKind === "text_input" ? "text-v1" : "distance-v1",
      graderConfig:
        answerKind === "map_point"
          ? {
              thresholdKm: setup.regionId === "world" ? 160 : 90
            }
          : undefined
    },
    scope: {
      regionIds: scopeRegionIds(setup.regionId),
      includeIds: setup.includeIds
    },
    rules: rulesFromSetup(setup, count)
  };
}

function createRankedPhysicalDefinition(
  setup: MvpQuizSetup,
  datasetVersion: string
): QuizDefinition {
  const isRiver = setup.topic === "longest-rivers";
  const subjectType = isRiver ? "ranked_river" : "ranked_peak";
  const fields = isRiver
    ? [
        "fact-type:river-system-length-km",
        "fact-type:river-drainage-countries",
        "fact-type:river-outflow"
      ]
    : [
        "fact-type:peak-elevation-m",
        "fact-type:peak-countries",
        "fact-type:peak-range"
      ];
  const count = setup.includeIds?.length ? "all" : setup.questionCount;

  return {
    id: `phase7-${setup.topic}-top100-facts-to-name-v1`,
    schemaVersion: 1,
    datasetVersion,
    content: { subjectType },
    prompt: {
      kind: "fact",
      entity: { from: "subject" },
      fields,
      locale: "de"
    },
    answer: {
      kind: "text_input",
      entity: { from: "subject" },
      grader: "text-v1"
    },
    scope: {
      regionIds: scopeRegionIds(setup.regionId),
      includeIds: setup.includeIds
    },
    rules: rulesFromSetup(setup, count)
  };
}

function createVisualDefinition(
  setup: MvpQuizSetup,
  datasetVersion: string
): QuizDefinition {
  const isShape = setup.topic === "shapes";
  const isReverse = setup.direction === "reverse_choice";
  const isChoice =
    setup.direction === "choice" || setup.direction === "reverse_choice";
  const assetKind = isShape ? "country_outline" : "flag";
  const regionSlug = setup.regionId.replace("continent:", "");
  const count = setup.includeIds?.length ? "all" : setup.questionCount;

  return {
    id: `phase4-${setup.topic}-${setup.direction}-${regionSlug}-v1`,
    schemaVersion: 1,
    datasetVersion,
    content: { subjectType: "country" },
    prompt: {
      kind: isReverse ? "name" : "visual_asset",
      entity: { from: "subject" },
      field: isReverse ? undefined : assetKind,
      locale: "de"
    },
    answer: {
      kind: isChoice ? "single_choice" : "text_input",
      entity: { from: "subject" },
      field: isReverse ? "flag" : isChoice ? "name" : undefined,
      grader: isChoice ? "single-choice-v1" : "text-v1",
      graderConfig: isChoice ? { choiceCount: 4 } : undefined
    },
    scope: {
      regionIds: scopeRegionIds(setup.regionId),
      includeIds: setup.includeIds
    },
    rules: rulesFromSetup(setup, count)
  };
}

function createPhysicalDefinition(
  setup: MvpQuizSetup,
  datasetVersion: string
): QuizDefinition {
  const subjectType = PHYSICAL_TOPIC_TYPES[setup.topic];
  if (!subjectType) {
    throw new Error(`${setup.topic} ist kein physisches Thema.`);
  }
  const locateKind =
    setup.topic === "rivers"
      ? "map_line"
      : setup.topic === "peaks"
        ? "map_point"
        : "map_area";
  const answerKind =
    setup.direction === "name" ? "text_input" : locateKind;
  const grader =
    answerKind === "text_input"
      ? "text-v1"
      : answerKind === "map_line"
        ? "line-v1"
        : answerKind === "map_point"
          ? "distance-v1"
          : "area-v1";
  const count = setup.includeIds?.length ? "all" : setup.questionCount;

  return {
    id: `phase5-${setup.topic}-${setup.direction}-${setup.regionId.replace("continent:", "")}-v1`,
    schemaVersion: 1,
    datasetVersion,
    content: { subjectType },
    prompt: {
      kind: setup.direction === "name" ? "map_highlight" : "name",
      entity: { from: "subject" },
      locale: "de"
    },
    answer: {
      kind: answerKind,
      entity: { from: "subject" },
      grader,
      graderConfig:
        answerKind === "map_point"
          ? { thresholdKm: setup.regionId === "world" ? 600 : 300 }
          : undefined
    },
    scope: {
      regionIds: scopeRegionIds(setup.regionId),
      includeIds: setup.includeIds
    },
    rules: rulesFromSetup(setup, count)
  };
}

function createKnowledgeDefinition(
  setup: MvpQuizSetup,
  datasetVersion: string
): QuizDefinition {
  const answerKind =
    setup.direction === "choice" ? "single_choice" : "text_input";
  const count = setup.includeIds?.length ? "all" : setup.questionCount;

  return {
    id: `phase6-knowledge-${setup.direction}-${setup.regionId.replace(
      "continent:",
      ""
    )}-v1`,
    schemaVersion: 1,
    datasetVersion,
    content: {
      subjectType: "knowledge_question",
      requiredRelations: ["has_answer"]
    },
    prompt: {
      kind: "description",
      entity: { from: "subject" },
      locale: "de"
    },
    answer: {
      kind: answerKind,
      entity: {
        from: "subject",
        relation: "has_answer",
        direction: "outgoing"
      },
      field: answerKind === "single_choice" ? "name" : undefined,
      grader:
        answerKind === "single_choice" ? "single-choice-v1" : "text-v1",
      graderConfig:
        answerKind === "single_choice" ? { choiceCount: 4 } : undefined
    },
    scope: {
      regionIds: scopeRegionIds(setup.regionId),
      includeIds: setup.includeIds
    },
    rules: rulesFromSetup(setup, count)
  };
}

export function createMvpQuizDefinition(
  setup: MvpQuizSetup,
  datasetVersion = geoDataset.version
): QuizDefinition {
  if (setup.topic === "world-mix") {
    throw new Error("Weltmix benötigt createQuizRoundDefinition().");
  }

  if (PHYSICAL_TOPIC_TYPES[setup.topic]) {
    return createPhysicalDefinition(setup, datasetVersion);
  }
  if (setup.topic === "cities") {
    return createRankedCityDefinition(setup, datasetVersion);
  }
  if (
    setup.topic === "longest-rivers" ||
    setup.topic === "highest-mountains"
  ) {
    return createRankedPhysicalDefinition(setup, datasetVersion);
  }
  if (setup.topic === "knowledge") {
    return createKnowledgeDefinition(setup, datasetVersion);
  }
  return setup.topic === "flags" || setup.topic === "shapes"
    ? createVisualDefinition(setup, datasetVersion)
    : createCountryOrCapitalDefinition(setup, datasetVersion);
}

export function createWorldMixDefinition(
  setup: MvpQuizSetup,
  datasetVersion = geoDataset.version
): MixedQuizDefinition {
  const questionCount = setup.questionCount;
  if (questionCount === "all") {
    throw new Error("Weltmix unterstützt 10 oder 20 Fragen.");
  }

  const sourceSetup = {
    ...setup,
    profile: "learn" as const,
    timerSeconds: 0 as const,
    includeIds: undefined
  };
  const minimum = 1;
  const pool = (
    id: string,
    patch: Pick<MvpQuizSetup, "topic" | "direction">
  ) => {
    const citySetSize = patch.topic === "cities" ? 100 : setup.citySetSize;
    const capacity = candidateCountForSetup(
      patch.topic,
      setup.regionId,
      citySetSize
    );
    if (capacity < minimum) {
      throw new Error(`${patch.topic}: Scope ${setup.regionId} ist leer.`);
    }
    return {
      id,
      definition: createMvpQuizDefinition(
        { ...sourceSetup, ...patch, citySetSize },
        datasetVersion
      ),
      weight: 1,
      minimum,
      maximum: Math.min(
        capacity,
        Math.max(minimum, Math.ceil(questionCount * 0.3))
      )
    };
  };

  return {
    kind: "mixed",
    id: `phase7-world-mix-${setup.regionId.replace("continent:", "")}-${setup.profile}-v1`,
    schemaVersion: 1,
    datasetVersion,
    label: "Weltmix",
    profile: setup.profile,
    scope: { regionIds: scopeRegionIds(setup.regionId) },
    pools: [
      pool("countries", { topic: "countries", direction: "locate" }),
      pool("capitals", { topic: "capitals", direction: "name" }),
      {
        ...pool("cities", { topic: "cities", direction: "locate" }),
        minimum: questionCount === 20 ? 1 : 0
      },
      pool("flags", { topic: "flags", direction: "choice" }),
      pool("shapes", { topic: "shapes", direction: "name" }),
      pool("rivers", { topic: "rivers", direction: "locate" }),
      pool("lakes", { topic: "lakes", direction: "name" }),
      pool("seas", { topic: "seas", direction: "locate" }),
      pool("mountain-ranges", {
        topic: "mountain-ranges",
        direction: "name"
      }),
      pool("peaks", { topic: "peaks", direction: "locate" }),
      ...(candidateCountForSetup("knowledge", setup.regionId) > 0
        ? [pool("knowledge", { topic: "knowledge", direction: "choice" })]
        : [])
    ],
    schedule: { maxConsecutiveFromPool: 1 },
    rules: rulesFromSetup(setup, questionCount)
  };
}

export function createQuizRoundDefinition(
  setup: MvpQuizSetup,
  datasetVersion = geoDataset.version
): QuizRoundDefinition {
  return setup.topic === "world-mix"
    ? createWorldMixDefinition(setup, datasetVersion)
    : createMvpQuizDefinition(setup, datasetVersion);
}

function setupForSkill(skillKey: string): Pick<
  MvpQuizSetup,
  "topic" | "direction"
> {
  const mapping: Record<
    string,
    Pick<MvpQuizSetup, "topic" | "direction">
  > = {
    "city:name_to_map_point": {
      topic: "capitals",
      direction: "locate"
    },
    "city:map_highlight_to_text_input": {
      topic: "capitals",
      direction: "name"
    },
    "country:name_to_text_input:capital_name": {
      topic: "capitals",
      direction: "country_to_name"
    },
    "city:name_to_text_input:country_name": {
      topic: "capitals",
      direction: "name_to_country"
    },
    "ranked_city:name_to_map_point": {
      topic: "cities",
      direction: "locate"
    },
    "ranked_city:map_highlight_to_text_input": {
      topic: "cities",
      direction: "name"
    },
    "country:name_to_map_area": {
      topic: "countries",
      direction: "locate"
    },
    "country:map_highlight_to_text_input": {
      topic: "countries",
      direction: "name"
    },
    "country:visual_asset:flag_to_text_input": {
      topic: "flags",
      direction: "name"
    },
    "country:visual_asset:flag_to_single_choice:name": {
      topic: "flags",
      direction: "choice"
    },
    "country:name_to_single_choice:flag": {
      topic: "flags",
      direction: "reverse_choice"
    },
    "country:visual_asset:country_outline_to_text_input": {
      topic: "shapes",
      direction: "name"
    },
    "river:name_to_map_line": {
      topic: "rivers",
      direction: "locate"
    },
    "river:map_highlight_to_text_input": {
      topic: "rivers",
      direction: "name"
    },
    "lake:name_to_map_area": {
      topic: "lakes",
      direction: "locate"
    },
    "lake:map_highlight_to_text_input": {
      topic: "lakes",
      direction: "name"
    },
    "sea:name_to_map_area": {
      topic: "seas",
      direction: "locate"
    },
    "sea:map_highlight_to_text_input": {
      topic: "seas",
      direction: "name"
    },
    "mountain_range:name_to_map_area": {
      topic: "mountain-ranges",
      direction: "locate"
    },
    "mountain_range:map_highlight_to_text_input": {
      topic: "mountain-ranges",
      direction: "name"
    },
    "peak:name_to_map_point": {
      topic: "peaks",
      direction: "locate"
    },
    "peak:map_highlight_to_text_input": {
      topic: "peaks",
      direction: "name"
    },
    "ranked_river:fact_to_text_input": {
      topic: "longest-rivers",
      direction: "facts_to_name"
    },
    "ranked_peak:fact_to_text_input": {
      topic: "highest-mountains",
      direction: "facts_to_name"
    },
    "knowledge_question:description_to_single_choice:name": {
      topic: "knowledge",
      direction: "choice"
    },
    "knowledge_question:description_to_text_input": {
      topic: "knowledge",
      direction: "name"
    }
  };
  const setup = mapping[skillKey];
  if (!setup) {
    throw new Error(`Für ${skillKey} ist noch kein Wiederholungspreset registriert.`);
  }
  return setup;
}

export function createReviewRoundDefinition(
  queue: readonly ReviewQueueItem[],
  seed: string,
  datasetVersion = geoDataset.version
): QuizRoundDefinition {
  if (queue.length === 0) {
    throw new Error("Eine Wiederholungsrunde benötigt mindestens einen Fehler.");
  }

  const bySkill = new Map<string, ReviewQueueItem[]>();
  for (const item of queue) {
    const current = bySkill.get(item.skillKey) ?? [];
    current.push(item);
    bySkill.set(item.skillKey, current);
  }
  const definitions = [...bySkill.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([skillKey, items]) => {
      const skillSetup = setupForSkill(skillKey);
      const includeIds = [...new Set(items.map((item) => item.entityId))].sort();
      return {
        skillKey,
        includeIds,
        definition: createMvpQuizDefinition(
          {
            ...DEFAULT_MVP_SETUP,
            ...skillSetup,
            profile: "practice",
            regionId: "world",
            questionCount: "all",
            citySetSize: 1000,
            timerSeconds: 0,
            seed: `${seed}:${skillKey}`,
            includeIds
          },
          datasetVersion
        )
      };
    });

  if (definitions.length === 1) {
    return definitions[0].definition;
  }

  const total = definitions.reduce(
    (sum, entry) => sum + entry.includeIds.length,
    0
  );
  const largestPool = Math.max(
    ...definitions.map((entry) => entry.includeIds.length)
  );
  const maxConsecutiveFromPool = Math.max(
    1,
    Math.ceil(largestPool / (total - largestPool + 1))
  );

  return {
    kind: "mixed",
    id: "phase5-review-queue-v1",
    schemaVersion: 1,
    datasetVersion,
    label: "Wiederholungsqueue",
    profile: "practice",
    scope: { regionIds: [] },
    pools: definitions.map((entry, index) => ({
      id: `review-${index + 1}`,
      definition: entry.definition,
      weight: 1,
      minimum: entry.includeIds.length,
      maximum: entry.includeIds.length
    })),
    schedule: { maxConsecutiveFromPool },
    rules: {
      questionCount: total,
      randomizer: "mulberry32-v1",
      timer: { kind: "none" },
      feedback: "immediate",
      retryMistakes: true,
      hints: "one",
      seed
    }
  };
}

export function setupFromDefinition(
  definition: QuizRoundDefinition
): MvpQuizSetup {
  if (isMixedQuizDefinition(definition)) {
    const timer = definition.rules.timer;
    return {
      topic: "world-mix",
      direction: "mix",
      profile: definition.profile,
      regionId:
        (definition.scope.regionIds[0] as MvpRegionId | undefined) ?? "world",
      questionCount:
        definition.rules.questionCount === 10 ||
        definition.rules.questionCount === 20
          ? definition.rules.questionCount
          : 10,
      citySetSize: 100,
      timerSeconds:
        timer.kind === "per_question" &&
        (timer.seconds === 15 || timer.seconds === 30)
          ? timer.seconds
          : 0,
      seed: definition.rules.seed ?? "restored"
    };
  }

  let topic: MvpTopic;
  let direction: MvpDirection;
  if (definition.prompt.kind === "visual_asset") {
    topic = definition.prompt.field === "country_outline" ? "shapes" : "flags";
    direction =
      definition.answer.kind === "single_choice" ? "choice" : "name";
  } else if (
    definition.answer.kind === "single_choice" &&
    definition.answer.field === "flag"
  ) {
    topic = "flags";
    direction = "reverse_choice";
  } else {
    const physicalTopic = Object.entries(PHYSICAL_TOPIC_TYPES).find(
      ([, entityType]) => entityType === definition.content.subjectType
    )?.[0] as MvpTopic | undefined;
    const answerRelation =
      "relation" in definition.answer.entity
        ? definition.answer.entity.relation
        : undefined;
    topic =
      answerRelation === "has_capital" || answerRelation === "is_capital_of"
        ? "capitals"
        : definition.content.subjectType === "knowledge_question"
          ? "knowledge"
          : definition.content.subjectType === "ranked_city"
            ? "cities"
            : definition.content.subjectType === "ranked_river"
              ? "longest-rivers"
              : definition.content.subjectType === "ranked_peak"
                ? "highest-mountains"
                : physicalTopic ??
                  (definition.content.subjectType === "country"
                    ? "countries"
                    : "capitals");
    direction =
      answerRelation === "has_capital"
        ? "country_to_name"
        : answerRelation === "is_capital_of"
          ? "name_to_country"
          : definition.content.subjectType === "knowledge_question"
            ? definition.answer.kind === "single_choice"
              ? "choice"
              : "name"
            : definition.prompt.kind === "fact"
              ? "facts_to_name"
              : definition.answer.kind === "text_input"
                ? "name"
                : "locate";
  }

  const regionId =
    (definition.scope.regionIds[0] as MvpRegionId | undefined) ?? "world";
  const timer = definition.rules.timer;
  const configuredCount = definition.rules.questionCount;
  const questionCount: MvpQuestionCount =
    configuredCount === 10 ||
    configuredCount === 20 ||
    configuredCount === "all"
      ? configuredCount
      : "all";
  const configuredCitySetSize = definition.content.filters?.find(
    (filter) => filter.field === "scope_rank" && filter.op === "lte"
  )?.value;
  const citySetSize: RankedCitySetSize =
    configuredCitySetSize === 100 ||
    configuredCitySetSize === 250 ||
    configuredCitySetSize === 500 ||
    configuredCitySetSize === 1000
      ? configuredCitySetSize
      : 100;

  return {
    topic,
    direction,
    profile: learningProfileFromRules(definition.rules),
    regionId,
    questionCount,
    citySetSize,
    timerSeconds:
      timer.kind === "per_question" &&
      (timer.seconds === 15 || timer.seconds === 30)
        ? timer.seconds
        : 0,
    seed: definition.rules.seed ?? "restored",
    includeIds: definition.scope.includeIds
  };
}

export function describeQuizDefinition(definition: QuizRoundDefinition) {
  const setup = setupFromDefinition(definition);
  const learningProfile = getLearningProfile(setup.profile);
  const region =
    MVP_REGIONS.find((candidate) => candidate.id === setup.regionId)?.label ??
    "Welt";
  const directionLabel =
    MVP_DIRECTIONS[setup.topic].find(
      (direction) => direction.id === setup.direction
    )?.label ?? setup.direction;
  const topicLabel: Record<MvpTopic, string> = {
    capitals: "Hauptstädte",
    cities: "Große Städte",
    countries: "Länder",
    flags: "Flaggen",
    shapes: "Länderformen",
    rivers: "Flüsse",
    lakes: "Seen",
    seas: "Meere",
    "mountain-ranges": "Gebirge",
    peaks: "Gipfel",
    "longest-rivers": "Längste Flüsse",
    "highest-mountains": "Höchste Berge",
    knowledge: "Wissenspuzzle",
    "world-mix": "Weltmix"
  };

  return {
    mode:
      setup.topic === "world-mix"
        ? `Weltmix · ${learningProfile.label}`
        : `${topicLabel[setup.topic]}${
            setup.topic === "cities"
              ? ` Top ${setup.citySetSize}`
              : setup.topic === "longest-rivers" ||
                  setup.topic === "highest-mountains"
                ? " Top 100"
                : ""
          } · ${directionLabel} · ${learningProfile.label}`,
    region,
    learningMode: learningProfile.label,
    timer:
      setup.timerSeconds === 0
        ? "Ohne Zeitlimit"
        : `${setup.timerSeconds} Sekunden`,
    setup
  };
}

export const CAPITALS_EUROPE_MAP_POINT_V1 = createMvpQuizDefinition(
  DEFAULT_MVP_SETUP
);
