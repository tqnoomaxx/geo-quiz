import type { Coordinates } from "../engine/graders/geo";
import type {
  MultiLineString,
  MultiPolygon,
  Point
} from "geojson";

export const CONTENT_SCHEMA_VERSION = 4 as const;

export type EntityTypeDefinition = {
  id: string;
  geometryKind: "none" | "point" | "line" | "polygon";
  supportedPromptIds: string[];
  supportedAnswerModeIds: string[];
};

export type RelationTypeDefinition = {
  id: string;
  sourceTypeIds: string[];
  targetTypeIds: string[];
  inverseRelationId?: string;
  cardinality: "one" | "many";
};

export type ContentEntity = {
  id: string;
  type: string;
  canonicalNameId: string;
  centroid?: Coordinates;
  rankByScope?: Record<string, number>;
  promptQualifier?: string;
  geometryRef?: {
    layer: string;
    featureId: string;
    pointFallback: boolean;
  };
  difficulty: number;
  active: boolean;
  sourceRefs: string[];
};

export type LocalizedName = {
  id: string;
  entityId: string;
  locale: string;
  name: string;
  kind: "preferred" | "alias";
  answerPolicy: "display_and_accept" | "accept_only";
};

export type EntityRelation = {
  id: string;
  sourceId: string;
  relationType: string;
  targetId: string;
  qualifiers?: Record<string, string | number | boolean>;
  sourceRefs: string[];
};

export type FactDefinition = {
  id: string;
  labelDe: string;
  descriptionDe: string;
  valueType: "number" | "string";
  unit?: string;
  comparisonPolicy: "same_source_method_and_date";
};

export type EntityFact = {
  id: string;
  entityId: string;
  factTypeId: string;
  value: number | string;
  asOf: string;
  method: string;
  sourceRefs: string[];
};

export type KnowledgeEvidence = {
  labelDe: string;
  valueDe: string;
  factId?: string;
  relationId?: string;
};

export type CompiledKnowledgeQuestion = {
  id: string;
  entityId: string;
  templateId: string;
  promptDe: string;
  answerEntityId: string;
  explanationDe: string;
  evidence: KnowledgeEvidence[];
  sourceRefs: string[];
  difficulty: number;
};

export type GeoDataset = {
  datasetId: string;
  version: string;
  schemaVersion: typeof CONTENT_SCHEMA_VERSION;
  scopePolicy: {
    id: string;
    labelDe: string;
  };
  sources: DatasetSource[];
  entityTypes: EntityTypeDefinition[];
  relationTypes: RelationTypeDefinition[];
  entities: ContentEntity[];
  names: LocalizedName[];
  relations: EntityRelation[];
  factDefinitions: FactDefinition[];
  facts: EntityFact[];
  compiledKnowledgeQuestions: CompiledKnowledgeQuestion[];
};

export type DatasetSource = {
  id: string;
  sourceVersion: string;
  retrievedAt: string;
  url: string;
  license: string;
};

export type DatasetManifest = {
  datasetId: string;
  version: string;
  schemaVersion: typeof CONTENT_SCHEMA_VERSION;
  builtAt: string;
  localeCoverage: string[];
  scopePolicy: {
    id: string;
    labelDe: string;
  };
  sources: DatasetSource[];
  artifacts: Array<{
    path: string;
    sha256: string;
    bytes: number;
    entityCount?: number;
  }>;
  attribution: string[];
  qualityReport: string;
};

export type RawCapitalFixture = {
  id: string;
  wikidataId: string;
  nameDe: string;
  aliasesDe: string[];
  centroid: Coordinates;
  difficulty: number;
  role: string;
  sourceRefs: string[];
};

export type RawCountryFixture = {
  id: string;
  iso2: string;
  iso3: string;
  numericCode: string;
  nameDe: string;
  aliasesDe: string[];
  centroid: Coordinates;
  mapFeatureId: string;
  mapMarker: boolean;
  difficulty: number;
  continentIds: string[];
  capitals: RawCapitalFixture[];
};

export type RawContentFixture = {
  datasetId: string;
  version: string;
  schemaVersion: typeof CONTENT_SCHEMA_VERSION;
  builtAt: string;
  localeCoverage: string[];
  scopePolicy: {
    id: string;
    labelDe: string;
  };
  sources: DatasetSource[];
  countries: RawCountryFixture[];
};

export type PhysicalEntityType =
  | "river"
  | "lake"
  | "sea"
  | "mountain_range"
  | "peak";

export type RawPhysicalEntity = {
  id: string;
  type: PhysicalEntityType;
  nameDe: string;
  aliasesDe: string[];
  continentIds: string[];
  difficulty: number;
  centroid: Coordinates;
  geometryRef: NonNullable<ContentEntity["geometryRef"]>;
  sourceRefs: string[];
  geometry: MultiLineString | MultiPolygon | Point;
};

export type RawPhysicalSnapshot = {
  schemaVersion: 1;
  datasetVersion: string;
  builtAt: string;
  source: DatasetSource & {
    files: Array<{
      layer: string;
      url: string;
      sha256: string;
      bytes: number;
    }>;
  };
  entities: RawPhysicalEntity[];
};

export type RankedCitySource = DatasetSource & {
  file: {
    name: string;
    sha256: string;
    bytes: number;
  };
};

export type RankedCityContentPack = {
  schemaVersion: 1;
  datasetVersion: string;
  builtAt: string;
  ranking: {
    methodId: "geonames-population-desc-id-asc-v1";
    labelDe: string;
    snapshotDate: string;
    tieBreakDe: string;
    supportedSetSizes: [100, 250, 500, 1000];
  };
  sources: RankedCitySource[];
  entities: ContentEntity[];
  names: LocalizedName[];
  relations: EntityRelation[];
  factDefinitions: FactDefinition[];
  facts: EntityFact[];
  quality: {
    entityCount: number;
    germanPreferredNameCount: number;
    germanAliasCount: number;
    scopeCounts: Record<string, number>;
    boundaryTies: Array<{
      scopeId: string;
      setSize: number;
      population: number;
      includedId: string;
      excludedId: string;
    }>;
  };
};

export type RankedPhysicalSource = DatasetSource & {
  pageTitle: string;
  revisionId: number;
  sha256: string;
  bytes: number;
};

export type RankedPhysicalContentPack = {
  schemaVersion: 1;
  datasetVersion: string;
  builtAt: string;
  rankings: {
    rivers: {
      methodId: "wikipedia-river-system-length-km-v1";
      labelDe: string;
      definitionDe: string;
      sourceId: string;
      count: 100;
      boundary: {
        includedRank: number;
        includedValue: number;
        excludedRank: number;
        excludedValue: number;
      };
    };
    peaks: {
      methodId: "wikipedia-independent-peak-elevation-m-v1";
      labelDe: string;
      definitionDe: string;
      sourceId: string;
      count: 100;
      boundary: {
        includedRank: number;
        includedValue: number;
        excludedRank: number;
        excludedValue: number;
      };
    };
  };
  sources: RankedPhysicalSource[];
  entities: ContentEntity[];
  names: LocalizedName[];
  relations: EntityRelation[];
  factDefinitions: FactDefinition[];
  facts: EntityFact[];
  quality: {
    entityCounts: {
      ranked_river: 100;
      ranked_peak: 100;
    };
    germanPreferredNameCount: number;
    germanAliasCount: number;
  };
};

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; issues: string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isCoordinates(value: unknown): value is Coordinates {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    Number.isFinite(value[0]) &&
    value[0] >= -180 &&
    value[0] <= 180 &&
    typeof value[1] === "number" &&
    Number.isFinite(value[1]) &&
    value[1] >= -90 &&
    value[1] <= 90
  );
}

function isDifficulty(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 5;
}

function validateSource(value: unknown, path: string, issues: string[]) {
  if (!isRecord(value)) {
    issues.push(`${path} muss ein Objekt sein.`);
    return;
  }

  for (const field of [
    "id",
    "sourceVersion",
    "retrievedAt",
    "url",
    "license"
  ]) {
    if (typeof value[field] !== "string" || value[field].length === 0) {
      issues.push(`${path}.${field} muss ein nichtleerer String sein.`);
    }
  }
}

function validateScopePolicy(
  value: unknown,
  path: string,
  issues: string[]
) {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.labelDe !== "string"
  ) {
    issues.push(`${path} muss id und labelDe enthalten.`);
  }
}

function validateCapital(
  value: unknown,
  path: string,
  issues: string[]
) {
  if (!isRecord(value)) {
    issues.push(`${path} muss ein Objekt sein.`);
    return;
  }

  for (const field of ["id", "wikidataId", "nameDe", "role"]) {
    if (typeof value[field] !== "string" || value[field].length === 0) {
      issues.push(`${path}.${field} muss ein nichtleerer String sein.`);
    }
  }

  if (!isStringArray(value.aliasesDe)) {
    issues.push(`${path}.aliasesDe muss ein String-Array sein.`);
  }
  if (!isStringArray(value.sourceRefs) || value.sourceRefs.length === 0) {
    issues.push(`${path}.sourceRefs muss Quellen enthalten.`);
  }
  if (!isCoordinates(value.centroid)) {
    issues.push(`${path}.centroid enthält ungültige Koordinaten.`);
  }
  if (!isDifficulty(value.difficulty)) {
    issues.push(`${path}.difficulty muss zwischen 1 und 5 liegen.`);
  }
}

export function validateRawContentFixture(
  value: unknown
): ValidationResult<RawContentFixture> {
  const issues: string[] = [];

  if (!isRecord(value)) {
    return { success: false, issues: ["Fixture muss ein Objekt sein."] };
  }

  for (const field of ["datasetId", "version", "builtAt"]) {
    if (typeof value[field] !== "string" || value[field].length === 0) {
      issues.push(`${field} muss ein nichtleerer String sein.`);
    }
  }

  if (value.schemaVersion !== CONTENT_SCHEMA_VERSION) {
    issues.push(`schemaVersion muss ${CONTENT_SCHEMA_VERSION} sein.`);
  }
  if (!isStringArray(value.localeCoverage) || value.localeCoverage.length === 0) {
    issues.push("localeCoverage muss mindestens eine Locale enthalten.");
  }
  validateScopePolicy(value.scopePolicy, "scopePolicy", issues);

  if (!Array.isArray(value.sources) || value.sources.length === 0) {
    issues.push("sources muss mindestens eine Quelle enthalten.");
  } else {
    value.sources.forEach((source, index) =>
      validateSource(source, `sources[${index}]`, issues)
    );
  }

  if (!Array.isArray(value.countries) || value.countries.length === 0) {
    issues.push("countries muss mindestens ein Land enthalten.");
  } else {
    value.countries.forEach((country, index) => {
      const path = `countries[${index}]`;

      if (!isRecord(country)) {
        issues.push(`${path} muss ein Objekt sein.`);
        return;
      }

      for (const field of [
        "id",
        "iso2",
        "iso3",
        "numericCode",
        "nameDe",
        "mapFeatureId"
      ]) {
        if (typeof country[field] !== "string" || country[field].length === 0) {
          issues.push(`${path}.${field} muss ein nichtleerer String sein.`);
        }
      }

      if (!isStringArray(country.aliasesDe)) {
        issues.push(`${path}.aliasesDe muss ein String-Array sein.`);
      }
      if (!isStringArray(country.continentIds) || country.continentIds.length === 0) {
        issues.push(`${path}.continentIds muss mindestens einen Scope enthalten.`);
      }
      if (!isCoordinates(country.centroid)) {
        issues.push(`${path}.centroid enthält ungültige Koordinaten.`);
      }
      if (typeof country.mapMarker !== "boolean") {
        issues.push(`${path}.mapMarker muss boolesch sein.`);
      }
      if (!isDifficulty(country.difficulty)) {
        issues.push(`${path}.difficulty muss zwischen 1 und 5 liegen.`);
      }
      if (!Array.isArray(country.capitals) || country.capitals.length === 0) {
        issues.push(`${path}.capitals muss mindestens einen Eintrag enthalten.`);
      } else {
        country.capitals.forEach((capital, capitalIndex) =>
          validateCapital(capital, `${path}.capitals[${capitalIndex}]`, issues)
        );
      }
    });
  }

  return issues.length > 0
    ? { success: false, issues }
    : { success: true, data: value as RawContentFixture };
}

export function validateRawPhysicalSnapshot(
  value: unknown
): ValidationResult<RawPhysicalSnapshot> {
  const issues: string[] = [];

  if (!isRecord(value)) {
    return { success: false, issues: ["Physical Snapshot muss ein Objekt sein."] };
  }
  if (
    value.schemaVersion !== 1 ||
    typeof value.datasetVersion !== "string" ||
    typeof value.builtAt !== "string"
  ) {
    issues.push("Physical Snapshot-Kopf ist ungültig.");
  }
  validateSource(value.source, "source", issues);
  if (
    !isRecord(value.source) ||
    !Array.isArray(value.source.files) ||
    value.source.files.length !== 5
  ) {
    issues.push("Physical Snapshot benötigt fünf geprüfte Quelldateien.");
  }

  const validTypes = new Set<PhysicalEntityType>([
    "river",
    "lake",
    "sea",
    "mountain_range",
    "peak"
  ]);
  const ids = new Set<string>();
  if (!Array.isArray(value.entities) || value.entities.length === 0) {
    issues.push("Physical Snapshot benötigt Entitäten.");
  } else {
    value.entities.forEach((entity, index) => {
      const path = `entities[${index}]`;
      if (!isRecord(entity)) {
        issues.push(`${path} muss ein Objekt sein.`);
        return;
      }
      if (typeof entity.id !== "string" || entity.id.length === 0) {
        issues.push(`${path}.id fehlt.`);
      } else if (ids.has(entity.id)) {
        issues.push(`Doppelte physische Entitäts-ID: ${entity.id}`);
      } else {
        ids.add(entity.id);
      }
      if (
        typeof entity.type !== "string" ||
        !validTypes.has(entity.type as PhysicalEntityType)
      ) {
        issues.push(`${path}.type ist unbekannt.`);
      }
      if (typeof entity.nameDe !== "string" || entity.nameDe.length === 0) {
        issues.push(`${path}.nameDe fehlt.`);
      }
      if (!isStringArray(entity.aliasesDe)) {
        issues.push(`${path}.aliasesDe muss ein String-Array sein.`);
      }
      if (
        !isStringArray(entity.continentIds) ||
        entity.continentIds.length === 0
      ) {
        issues.push(`${path}.continentIds benötigt mindestens einen Scope.`);
      }
      if (!isDifficulty(entity.difficulty)) {
        issues.push(`${path}.difficulty ist ungültig.`);
      }
      if (!isCoordinates(entity.centroid)) {
        issues.push(`${path}.centroid ist ungültig.`);
      }
      if (!isStringArray(entity.sourceRefs) || entity.sourceRefs.length === 0) {
        issues.push(`${path}.sourceRefs fehlt.`);
      }
      if (!isRecord(entity.geometryRef) || !isRecord(entity.geometry)) {
        issues.push(`${path} benötigt Geometriereferenz und Geometrie.`);
        return;
      }
      const expectedGeometry =
        entity.type === "river"
          ? "MultiLineString"
          : entity.type === "peak"
            ? "Point"
            : "MultiPolygon";
      if (entity.geometry.type !== expectedGeometry) {
        issues.push(
          `${path}.geometry muss für ${String(entity.type)} ${expectedGeometry} sein.`
        );
      }
      if (
        typeof entity.geometryRef.layer !== "string" ||
        entity.geometryRef.featureId !== entity.id ||
        typeof entity.geometryRef.pointFallback !== "boolean"
      ) {
        issues.push(`${path}.geometryRef ist ungültig.`);
      }
    });
  }

  return issues.length > 0
    ? { success: false, issues }
    : { success: true, data: value as unknown as RawPhysicalSnapshot };
}

export function validateRankedCityContentPack(
  value: unknown
): ValidationResult<RankedCityContentPack> {
  const issues: string[] = [];

  if (!isRecord(value)) {
    return { success: false, issues: ["Städtepaket muss ein Objekt sein."] };
  }
  if (
    value.schemaVersion !== 1 ||
    typeof value.datasetVersion !== "string" ||
    typeof value.builtAt !== "string"
  ) {
    issues.push("Städtepaket-Kopf ist ungültig.");
  }
  if (
    !isRecord(value.ranking) ||
    value.ranking.methodId !== "geonames-population-desc-id-asc-v1" ||
    typeof value.ranking.labelDe !== "string" ||
    typeof value.ranking.snapshotDate !== "string" ||
    typeof value.ranking.tieBreakDe !== "string" ||
    !Array.isArray(value.ranking.supportedSetSizes) ||
    value.ranking.supportedSetSizes.join(",") !== "100,250,500,1000"
  ) {
    issues.push("Städtepaket-Rangdefinition ist ungültig.");
  }
  if (!Array.isArray(value.sources) || value.sources.length < 2) {
    issues.push("Städtepaket benötigt GeoNames-Städte und -Namensquelle.");
  } else {
    value.sources.forEach((source, index) => {
      validateSource(source, `sources[${index}]`, issues);
      if (
        !isRecord(source) ||
        !isRecord(source.file) ||
        typeof source.file.name !== "string" ||
        typeof source.file.sha256 !== "string" ||
        typeof source.file.bytes !== "number"
      ) {
        issues.push(`sources[${index}].file ist ungültig.`);
      }
    });
  }
  for (const field of [
    "entities",
    "names",
    "relations",
    "factDefinitions",
    "facts"
  ]) {
    if (!Array.isArray(value[field])) {
      issues.push(`${field} muss ein Array sein.`);
    }
  }
  if (!isRecord(value.quality)) {
    issues.push("Städtepaket benötigt einen Qualitätsbericht.");
  }
  if (issues.length > 0) {
    return { success: false, issues };
  }

  const pack = value as unknown as RankedCityContentPack;
  const entityIds = new Set<string>();
  const nameIds = new Set<string>();
  const relationIds = new Set<string>();
  const factIds = new Set<string>();
  const validScopes = new Set([
    "world",
    "continent:africa",
    "continent:asia",
    "continent:europe",
    "continent:north-america",
    "continent:oceania",
    "continent:south-america"
  ]);

  for (const entity of pack.entities) {
    if (entityIds.has(entity.id)) {
      issues.push(`Doppelte Städte-ID: ${entity.id}`);
    }
    entityIds.add(entity.id);
    if (
      !/^geonames:\d+$/.test(entity.id) ||
      entity.type !== "ranked_city" ||
      !entity.active ||
      !isCoordinates(entity.centroid) ||
      !isDifficulty(entity.difficulty) ||
      !isRecord(entity.rankByScope) ||
      Object.keys(entity.rankByScope).length === 0 ||
      Object.entries(entity.rankByScope).some(
        ([scopeId, rank]) =>
          !validScopes.has(scopeId) ||
          !Number.isInteger(rank) ||
          rank < 1 ||
          rank > 1000
      ) ||
      typeof entity.promptQualifier !== "string" ||
      entity.promptQualifier.length !== 2
    ) {
      issues.push(`Ungültige Rangstadt: ${entity.id}`);
    }
  }
  for (const name of pack.names) {
    if (nameIds.has(name.id)) issues.push(`Doppelte Stadt-Namens-ID: ${name.id}`);
    nameIds.add(name.id);
    if (!entityIds.has(name.entityId) || name.locale !== "de" || !name.name) {
      issues.push(`Ungültiger Stadtname: ${name.id}`);
    }
  }
  for (const entity of pack.entities) {
    if (!nameIds.has(entity.canonicalNameId)) {
      issues.push(`${entity.id} besitzt keinen kanonischen Stadtnamen.`);
    }
  }
  for (const relation of pack.relations) {
    if (relationIds.has(relation.id)) {
      issues.push(`Doppelte Stadt-Relations-ID: ${relation.id}`);
    }
    relationIds.add(relation.id);
    if (
      !entityIds.has(relation.sourceId) ||
      relation.relationType !== "located_in" ||
      !validScopes.has(relation.targetId) ||
      relation.targetId === "world"
    ) {
      issues.push(`Ungültige Stadt-Scope-Relation: ${relation.id}`);
    }
  }
  for (const fact of pack.facts) {
    if (factIds.has(fact.id)) issues.push(`Doppelte Stadt-Fakten-ID: ${fact.id}`);
    factIds.add(fact.id);
    if (
      !entityIds.has(fact.entityId) ||
      fact.factTypeId !== "fact-type:geonames-population" ||
      typeof fact.value !== "number" ||
      !Number.isInteger(fact.value) ||
      fact.value < 0 ||
      !fact.asOf ||
      !fact.method ||
      !fact.sourceRefs.includes("geonames-cities1000")
    ) {
      issues.push(`Ungültiger Stadtbevölkerungsfakt: ${fact.id}`);
    }
  }
  if (
    pack.factDefinitions.length !== 1 ||
    pack.factDefinitions[0]?.id !== "fact-type:geonames-population"
  ) {
    issues.push("Städtepaket benötigt genau die GeoNames-Bevölkerungsdefinition.");
  }
  if (
    pack.quality.entityCount !== pack.entities.length ||
    Object.values(pack.quality.scopeCounts).some((count) => count !== 1000)
  ) {
    issues.push("Städtepaket-Qualitätszahlen passen nicht zum Inhalt.");
  }

  return issues.length > 0
    ? { success: false, issues }
    : { success: true, data: pack };
}

const RANKED_PHYSICAL_FACT_TYPES = {
  ranked_river: [
    "fact-type:river-system-length-km",
    "fact-type:river-drainage-countries",
    "fact-type:river-outflow"
  ],
  ranked_peak: [
    "fact-type:peak-elevation-m",
    "fact-type:peak-countries",
    "fact-type:peak-range"
  ]
} as const;

export function validateRankedPhysicalContentPack(
  value: unknown
): ValidationResult<RankedPhysicalContentPack> {
  const issues: string[] = [];

  if (!isRecord(value)) {
    return {
      success: false,
      issues: ["Ranglistenpaket muss ein Objekt sein."]
    };
  }
  if (
    value.schemaVersion !== 1 ||
    typeof value.datasetVersion !== "string" ||
    typeof value.builtAt !== "string"
  ) {
    issues.push("Ranglistenpaket-Kopf ist ungültig.");
  }
  for (const field of [
    "sources",
    "entities",
    "names",
    "relations",
    "factDefinitions",
    "facts"
  ]) {
    if (!Array.isArray(value[field])) {
      issues.push(`${field} muss ein Array sein.`);
    }
  }
  if (!isRecord(value.rankings) || !isRecord(value.quality)) {
    issues.push("Rangdefinition oder Qualitätsbericht fehlt.");
  }
  if (issues.length > 0) {
    return { success: false, issues };
  }

  const pack = value as unknown as RankedPhysicalContentPack;
  const expectedRankings = [
    [
      "rivers",
      "wikipedia-river-system-length-km-v1"
    ],
    [
      "peaks",
      "wikipedia-independent-peak-elevation-m-v1"
    ]
  ] as const;
  const sourceIds = new Set(pack.sources.map((source) => source.id));

  for (const source of pack.sources) {
    validateSource(source, `sources[${source.id || "?"}]`, issues);
    if (
      !source.pageTitle ||
      !Number.isInteger(source.revisionId) ||
      source.revisionId <= 0 ||
      !/^[a-f0-9]{64}$/u.test(source.sha256) ||
      !Number.isInteger(source.bytes) ||
      source.bytes <= 0
    ) {
      issues.push(`Ungültige Wikipedia-Snapshotquelle: ${source.id}`);
    }
  }
  if (pack.sources.length !== 2 || sourceIds.size !== 2) {
    issues.push("Ranglistenpaket benötigt genau zwei eindeutige Seiten-Snapshots.");
  }

  for (const [key, methodId] of expectedRankings) {
    const ranking = pack.rankings[key];
    if (
      !ranking ||
      ranking.methodId !== methodId ||
      !ranking.labelDe ||
      !ranking.definitionDe ||
      ranking.count !== 100 ||
      !sourceIds.has(ranking.sourceId) ||
      !ranking.boundary ||
      !Number.isInteger(ranking.boundary.includedRank) ||
      !Number.isInteger(ranking.boundary.excludedRank) ||
      typeof ranking.boundary.includedValue !== "number" ||
      typeof ranking.boundary.excludedValue !== "number" ||
      ranking.boundary.includedValue <= ranking.boundary.excludedValue
    ) {
      issues.push(`Rangdefinition ${key} ist ungültig oder am Rand uneindeutig.`);
    }
  }

  const entityIds = new Set<string>();
  const entitiesById = new Map<string, ContentEntity>();
  const typeCounts = { ranked_river: 0, ranked_peak: 0 };
  for (const entity of pack.entities) {
    if (entityIds.has(entity.id)) issues.push(`Doppelte Ranglisten-ID: ${entity.id}`);
    entityIds.add(entity.id);
    entitiesById.set(entity.id, entity);
    if (entity.type !== "ranked_river" && entity.type !== "ranked_peak") {
      issues.push(`Ungültiger Ranglisten-Entitätstyp: ${entity.id}`);
      continue;
    }
    typeCounts[entity.type] += 1;
    const rank = entity.rankByScope?.world;
    if (
      !entity.active ||
      !isDifficulty(entity.difficulty) ||
      !Number.isInteger(rank) ||
      Number(rank) < 1 ||
      Number(rank) > 100 ||
      (entity.type === "ranked_peak" && !isCoordinates(entity.centroid)) ||
      (entity.type === "ranked_river" && entity.centroid !== undefined)
    ) {
      issues.push(`Ungültige Ranglisten-Entität: ${entity.id}`);
    }
  }
  if (typeCounts.ranked_river !== 100 || typeCounts.ranked_peak !== 100) {
    issues.push("Ranglistenpaket benötigt genau 100 Flüsse und 100 Berge.");
  }

  const nameIds = new Set<string>();
  for (const name of pack.names) {
    if (nameIds.has(name.id)) issues.push(`Doppelte Ranglisten-Namens-ID: ${name.id}`);
    nameIds.add(name.id);
    if (!entityIds.has(name.entityId) || name.locale !== "de" || !name.name) {
      issues.push(`Ungültiger Ranglistenname: ${name.id}`);
    }
  }
  for (const entity of pack.entities) {
    if (!nameIds.has(entity.canonicalNameId)) {
      issues.push(`${entity.id} besitzt keinen kanonischen Ranglistennamen.`);
    }
  }
  if (pack.relations.length !== 0) {
    issues.push("Das globale Ranglistenpaket darf keine Scope-Relationen vortäuschen.");
  }

  const factDefinitionIds = new Set(
    pack.factDefinitions.map((definition) => definition.id)
  );
  const factDefinitionsById = new Map(
    pack.factDefinitions.map((definition) => [definition.id, definition])
  );
  const expectedFactDefinitionIds = new Set(
    Object.values(RANKED_PHYSICAL_FACT_TYPES).flat()
  );
  if (
    factDefinitionIds.size !== expectedFactDefinitionIds.size ||
    [...expectedFactDefinitionIds].some((id) => !factDefinitionIds.has(id))
  ) {
    issues.push("Ranglistenpaket besitzt nicht die sechs erwarteten Faktdefinitionen.");
  }

  const factIds = new Set<string>();
  const factsByEntity = new Map<string, EntityFact[]>();
  for (const fact of pack.facts) {
    if (factIds.has(fact.id)) issues.push(`Doppelte Ranglisten-Fakten-ID: ${fact.id}`);
    factIds.add(fact.id);
    const entity = entitiesById.get(fact.entityId);
    const allowedTypes = entity
      ? RANKED_PHYSICAL_FACT_TYPES[
          entity.type as keyof typeof RANKED_PHYSICAL_FACT_TYPES
        ]
      : undefined;
    const definition = factDefinitionsById.get(fact.factTypeId);
    const expectedSourceId =
      entity?.type === "ranked_river"
        ? pack.rankings.rivers.sourceId
        : entity?.type === "ranked_peak"
          ? pack.rankings.peaks.sourceId
          : undefined;
    if (
      !entity ||
      !allowedTypes?.includes(fact.factTypeId as never) ||
      !definition ||
      typeof fact.value !== definition.valueType ||
      (typeof fact.value === "number" && fact.value <= 0) ||
      (typeof fact.value === "string" && fact.value.trim().length === 0) ||
      !fact.asOf ||
      !fact.method ||
      fact.sourceRefs.length !== 1 ||
      !sourceIds.has(fact.sourceRefs[0]) ||
      fact.sourceRefs[0] !== expectedSourceId
    ) {
      issues.push(`Ungültiger Ranglistenfakt: ${fact.id}`);
    }
    const current = factsByEntity.get(fact.entityId) ?? [];
    current.push(fact);
    factsByEntity.set(fact.entityId, current);
  }
  for (const entity of pack.entities) {
    if (entity.type !== "ranked_river" && entity.type !== "ranked_peak") {
      continue;
    }
    const required = RANKED_PHYSICAL_FACT_TYPES[entity.type];
    const actual = new Set(
      (factsByEntity.get(entity.id) ?? []).map((fact) => fact.factTypeId)
    );
    if (required.some((id) => !actual.has(id)) || actual.size !== required.length) {
      issues.push(`${entity.id} besitzt kein vollständiges Faktenprofil.`);
    }
  }
  for (const factTypeId of expectedFactDefinitionIds) {
    const matchingFacts = pack.facts.filter(
      (fact) => fact.factTypeId === factTypeId
    );
    if (
      matchingFacts.length !== 100 ||
      new Set(matchingFacts.map((fact) => fact.method)).size !== 1 ||
      new Set(matchingFacts.map((fact) => fact.asOf)).size !== 1 ||
      new Set(matchingFacts.flatMap((fact) => fact.sourceRefs)).size !== 1
    ) {
      issues.push(`${factTypeId} ist nicht vollständig oder methodisch einheitlich.`);
    }
  }

  if (
    pack.quality.entityCounts.ranked_river !== 100 ||
    pack.quality.entityCounts.ranked_peak !== 100 ||
    pack.quality.germanPreferredNameCount !== pack.entities.length ||
    pack.quality.germanAliasCount < 0
  ) {
    issues.push("Qualitätszahlen des Ranglistenpakets passen nicht zum Inhalt.");
  }

  return issues.length > 0
    ? { success: false, issues }
    : { success: true, data: pack };
}

export function validateGeoDataset(value: unknown): ValidationResult<GeoDataset> {
  const issues: string[] = [];

  if (!isRecord(value)) {
    return { success: false, issues: ["Dataset muss ein Objekt sein."] };
  }

  if (
    typeof value.datasetId !== "string" ||
    typeof value.version !== "string" ||
    value.schemaVersion !== CONTENT_SCHEMA_VERSION
  ) {
    issues.push("Dataset-Kopf ist ungültig.");
  }
  validateScopePolicy(value.scopePolicy, "scopePolicy", issues);

  for (const field of [
    "sources",
    "entityTypes",
    "relationTypes",
    "entities",
    "names",
    "relations",
    "factDefinitions",
    "facts",
    "compiledKnowledgeQuestions"
  ]) {
    if (!Array.isArray(value[field])) {
      issues.push(`${field} muss ein Array sein.`);
    }
  }

  if (issues.length > 0) {
    return { success: false, issues };
  }

  const dataset = value as GeoDataset;
  const entityTypeIds = new Set(dataset.entityTypes.map((item) => item.id));
  const relationTypesById = new Map(
    dataset.relationTypes.map((item) => [item.id, item])
  );
  const entityIds = new Set<string>();
  const entitiesById = new Map<string, ContentEntity>();
  const nameIds = new Set<string>();
  const relationIds = new Set<string>();
  const sourceIds = new Set<string>();
  const factDefinitionIds = new Set<string>();
  const factIds = new Set<string>();
  const compiledQuestionIds = new Set<string>();

  for (const source of dataset.sources) {
    validateSource(source, `sources[${source.id || "?"}]`, issues);
    if (sourceIds.has(source.id)) {
      issues.push(`Doppelte Quellen-ID: ${source.id}`);
    }
    sourceIds.add(source.id);
  }

  for (const entity of dataset.entities) {
    if (entityIds.has(entity.id)) issues.push(`Doppelte Entitäts-ID: ${entity.id}`);
    entityIds.add(entity.id);
    entitiesById.set(entity.id, entity);

    if (!entityTypeIds.has(entity.type)) {
      issues.push(`Unbekannter Entitätstyp ${entity.type} bei ${entity.id}.`);
    }
    if (!isDifficulty(entity.difficulty)) {
      issues.push(`Ungültige Schwierigkeit bei ${entity.id}.`);
    }
    if (entity.centroid && !isCoordinates(entity.centroid)) {
      issues.push(`Ungültiger Zentroid bei ${entity.id}.`);
    }
    if (
      entity.rankByScope &&
      Object.entries(entity.rankByScope).some(
        ([scopeId, rank]) =>
          !scopeId ||
          !Number.isInteger(rank) ||
          rank < 1
      )
    ) {
      issues.push(`Ungültige Scope-Ränge bei ${entity.id}.`);
    }
    if (
      entity.promptQualifier !== undefined &&
      (typeof entity.promptQualifier !== "string" ||
        entity.promptQualifier.length === 0)
    ) {
      issues.push(`Ungültiger Promptqualifikator bei ${entity.id}.`);
    }
    if (
      entity.geometryRef &&
      (!entity.geometryRef.layer ||
        !entity.geometryRef.featureId ||
        typeof entity.geometryRef.pointFallback !== "boolean")
    ) {
      issues.push(`Ungültige Geometriereferenz bei ${entity.id}.`);
    }
  }

  for (const name of dataset.names) {
    if (nameIds.has(name.id)) issues.push(`Doppelte Namens-ID: ${name.id}`);
    nameIds.add(name.id);
    if (!entityIds.has(name.entityId)) {
      issues.push(`Name ${name.id} verweist auf unbekannte Entität.`);
    }
  }

  for (const entity of dataset.entities) {
    if (!nameIds.has(entity.canonicalNameId)) {
      issues.push(`${entity.id} besitzt keinen gültigen kanonischen Namen.`);
    }
  }

  for (const relation of dataset.relations) {
    if (relationIds.has(relation.id)) {
      issues.push(`Doppelte Relations-ID: ${relation.id}`);
    }
    relationIds.add(relation.id);

    const definition = relationTypesById.get(relation.relationType);
    if (!definition) {
      issues.push(`Unbekannter Relationstyp bei ${relation.id}.`);
    }
    const source = entitiesById.get(relation.sourceId);
    const target = entitiesById.get(relation.targetId);
    if (!source || !target) {
      issues.push(`Relation ${relation.id} verweist auf unbekannte Entität.`);
      continue;
    }
    if (
      definition &&
      (!definition.sourceTypeIds.includes(source.type) ||
        !definition.targetTypeIds.includes(target.type))
    ) {
      issues.push(
        `Relation ${relation.id} verbindet ${source.type} mit ${target.type} entgegen ihrer Definition.`
      );
    }
  }

  for (const definition of dataset.factDefinitions) {
    if (factDefinitionIds.has(definition.id)) {
      issues.push(`Doppelte Faktdefinition: ${definition.id}`);
    }
    factDefinitionIds.add(definition.id);
    if (
      !definition.labelDe ||
      !definition.descriptionDe ||
      (definition.valueType !== "number" &&
        definition.valueType !== "string") ||
      definition.comparisonPolicy !== "same_source_method_and_date"
    ) {
      issues.push(`Ungültige Faktdefinition: ${definition.id}`);
    }
  }

  for (const fact of dataset.facts) {
    if (factIds.has(fact.id)) {
      issues.push(`Doppelte Fakten-ID: ${fact.id}`);
    }
    factIds.add(fact.id);
    const definition = dataset.factDefinitions.find(
      (candidate) => candidate.id === fact.factTypeId
    );
    if (!entityIds.has(fact.entityId)) {
      issues.push(`Fakt ${fact.id} verweist auf unbekannte Entität.`);
    }
    if (!definition) {
      issues.push(`Fakt ${fact.id} verweist auf unbekannte Faktdefinition.`);
    } else if (typeof fact.value !== definition.valueType) {
      issues.push(`Fakt ${fact.id} besitzt den falschen Werttyp.`);
    }
    if (!fact.asOf || !fact.method || fact.sourceRefs.length === 0) {
      issues.push(`Fakt ${fact.id} benötigt Datum, Methode und Quelle.`);
    }
    for (const sourceRef of fact.sourceRefs) {
      if (!sourceIds.has(sourceRef)) {
        issues.push(`Fakt ${fact.id} verweist auf unbekannte Quelle ${sourceRef}.`);
      }
    }
  }

  for (const question of dataset.compiledKnowledgeQuestions) {
    if (compiledQuestionIds.has(question.id)) {
      issues.push(`Doppelte Wissensfragen-ID: ${question.id}`);
    }
    compiledQuestionIds.add(question.id);
    if (
      !entityIds.has(question.entityId) ||
      entitiesById.get(question.entityId)?.type !== "knowledge_question"
    ) {
      issues.push(`Wissensfrage ${question.id} besitzt keine Frage-Entität.`);
    }
    if (!entityIds.has(question.answerEntityId)) {
      issues.push(`Wissensfrage ${question.id} besitzt keine gültige Antwort.`);
    }
    if (
      !question.templateId ||
      !question.promptDe ||
      !question.explanationDe ||
      !isDifficulty(question.difficulty)
    ) {
      issues.push(`Wissensfrage ${question.id} ist unvollständig.`);
    }
    if (question.evidence.length === 0 || question.sourceRefs.length === 0) {
      issues.push(`Wissensfrage ${question.id} ist nicht erklärbar oder unbelegt.`);
    }
    for (const evidence of question.evidence) {
      if (evidence.factId && !factIds.has(evidence.factId)) {
        issues.push(
          `Wissensfrage ${question.id} verweist auf unbekannten Fakt ${evidence.factId}.`
        );
      }
      if (evidence.relationId && !relationIds.has(evidence.relationId)) {
        issues.push(
          `Wissensfrage ${question.id} verweist auf unbekannte Relation ${evidence.relationId}.`
        );
      }
    }
    for (const sourceRef of question.sourceRefs) {
      if (!sourceIds.has(sourceRef)) {
        issues.push(
          `Wissensfrage ${question.id} verweist auf unbekannte Quelle ${sourceRef}.`
        );
      }
    }
  }

  for (const definition of dataset.relationTypes) {
    if (definition.cardinality !== "one") continue;
    const counts = new Map<string, number>();
    for (const relation of dataset.relations) {
      if (relation.relationType !== definition.id) continue;
      const count = (counts.get(relation.sourceId) ?? 0) + 1;
      counts.set(relation.sourceId, count);
      if (count > 1) {
        issues.push(
          `${relation.sourceId} verletzt Kardinalität one für ${definition.id}.`
        );
      }
    }
  }

  return issues.length > 0
    ? { success: false, issues }
    : { success: true, data: dataset };
}

export function validateDatasetManifest(
  value: unknown
): ValidationResult<DatasetManifest> {
  const issues: string[] = [];

  if (!isRecord(value)) {
    return { success: false, issues: ["Manifest muss ein Objekt sein."] };
  }
  if (
    typeof value.datasetId !== "string" ||
    typeof value.version !== "string" ||
    typeof value.builtAt !== "string" ||
    value.schemaVersion !== CONTENT_SCHEMA_VERSION
  ) {
    issues.push("Manifest-Kopf ist ungültig.");
  }
  validateScopePolicy(value.scopePolicy, "scopePolicy", issues);
  if (!isStringArray(value.localeCoverage)) {
    issues.push("Manifest localeCoverage muss ein String-Array sein.");
  }
  if (!Array.isArray(value.sources) || value.sources.length === 0) {
    issues.push("Manifest benötigt mindestens eine Quelle.");
  } else {
    value.sources.forEach((source, index) =>
      validateSource(source, `sources[${index}]`, issues)
    );
  }
  if (!Array.isArray(value.artifacts) || value.artifacts.length === 0) {
    issues.push("Manifest benötigt mindestens ein Artefakt.");
  }
  if (!isStringArray(value.attribution)) {
    issues.push("Manifest attribution muss ein String-Array sein.");
  }
  if (typeof value.qualityReport !== "string") {
    issues.push("Manifest qualityReport muss ein String sein.");
  }

  return issues.length > 0
    ? { success: false, issues }
    : { success: true, data: value as DatasetManifest };
}

export function parseRawContentFixture(value: unknown): RawContentFixture {
  const result = validateRawContentFixture(value);
  if (!result.success) {
    throw new Error(`Ungültige Content-Fixture:\n${result.issues.join("\n")}`);
  }
  return result.data;
}

export function parseRawPhysicalSnapshot(value: unknown): RawPhysicalSnapshot {
  const result = validateRawPhysicalSnapshot(value);
  if (!result.success) {
    throw new Error(
      `Ungültiger Physical Snapshot:\n${result.issues.join("\n")}`
    );
  }
  return result.data;
}

export function parseRankedCityContentPack(
  value: unknown
): RankedCityContentPack {
  const result = validateRankedCityContentPack(value);
  if (!result.success) {
    throw new Error(
      `Ungültiges Städtepaket:\n${result.issues.join("\n")}`
    );
  }
  return result.data;
}

export function parseRankedPhysicalContentPack(
  value: unknown
): RankedPhysicalContentPack {
  const result = validateRankedPhysicalContentPack(value);
  if (!result.success) {
    throw new Error(
      `Ungültiges physisches Ranglistenpaket:\n${result.issues.join("\n")}`
    );
  }
  return result.data;
}

export function parseGeoDataset(value: unknown): GeoDataset {
  const result = validateGeoDataset(value);
  if (!result.success) {
    throw new Error(`Ungültiges Content-Dataset:\n${result.issues.join("\n")}`);
  }
  return result.data;
}

export function parseDatasetManifest(value: unknown): DatasetManifest {
  const result = validateDatasetManifest(value);
  if (!result.success) {
    throw new Error(`Ungültiges Dataset-Manifest:\n${result.issues.join("\n")}`);
  }
  return result.data;
}
