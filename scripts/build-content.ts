import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type {
  Feature,
  FeatureCollection,
  MultiLineString,
  MultiPolygon,
  Point,
  Polygon
} from "geojson";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import countries, { type Country } from "world-countries";
import {
  CONTENT_SCHEMA_VERSION,
  parseRawAstronomySnapshot,
  parseRawLandmarkSnapshot,
  parseGeoDataset,
  parseRankedCityContentPack,
  parseRankedPhysicalContentPack,
  parseRawContentFixture,
  parseRawPhysicalSnapshot,
  type ContentEntity,
  type DatasetManifest,
  type EntityFact,
  type EntityRelation,
  type GeoDataset,
  type LocalizedName
} from "../src/content/schema";
import {
  compileKnowledgeQuestions,
  parseRawKnowledgeSnapshot,
  parseRawKnowledgeTemplateSnapshot
} from "../src/content/knowledge";

type CountryProperties = { name?: string };
type WorldTopology = Topology<{
  countries: GeometryCollection<CountryProperties>;
}>;

const projectRoot = resolve(import.meta.dirname, "..");
const sourcePath = resolve(projectRoot, "content-src/geo-core-mvp.v1.json");
const physicalSourcePath = resolve(
  projectRoot,
  "content-src/physical-core.v1.json"
);
const knowledgeSourcePath = resolve(
  projectRoot,
  "content-src/knowledge-core.v1.json"
);
const knowledgeTemplatePath = resolve(
  projectRoot,
  "content-src/knowledge-templates.v1.json"
);
const astronomySourcePath = resolve(
  projectRoot,
  "content-src/astronomy-core.v1.json"
);
const landmarkSourcePath = resolve(
  projectRoot,
  "content-src/landmarks-core.v1.json"
);
const rankedCitySourcePath = resolve(
  projectRoot,
  "content-src/ranked-cities.v1.json"
);
const rankedPhysicalSourcePath = resolve(
  projectRoot,
  "content-src/ranked-physical.v1.json"
);
const outputDirectory = resolve(projectRoot, "src/content/generated");
const datasetPath = resolve(outputDirectory, "geo-core-mvp-v1.json");
const manifestPath = resolve(outputDirectory, "manifest.json");
const qualityPath = resolve(outputDirectory, "quality-report.json");
const rankedCityPath = resolve(outputDirectory, "ranked-cities-v1.json");
const rankedCityIndexPath = resolve(
  outputDirectory,
  "ranked-cities-index-v1.json"
);
const rankedPhysicalPath = resolve(
  outputDirectory,
  "ranked-physical-v1.json"
);
const rankedPhysicalIndexPath = resolve(
  outputDirectory,
  "ranked-physical-index-v1.json"
);
const visualAssetIndexPath = resolve(
  outputDirectory,
  "visual-assets-index-v1.json"
);
const mapAdditionPath = resolve(
  projectRoot,
  "src/geo/generated/mvp-map-additions-v1.json"
);
const physicalMapDirectory = resolve(projectRoot, "src/geo/generated");
const world50mPath = resolve(
  projectRoot,
  "node_modules/world-atlas/countries-50m.json"
);
const world10mPath = resolve(
  projectRoot,
  "node_modules/world-atlas/countries-10m.json"
);

const CONTINENTS = [
  ["continent:africa", "Afrika"],
  ["continent:asia", "Asien"],
  ["continent:europe", "Europa"],
  ["continent:north-america", "Nordamerika"],
  ["continent:oceania", "Ozeanien"],
  ["continent:south-america", "Südamerika"]
] as const;

const germanLanguageNames = new Intl.DisplayNames(["de"], {
  type: "language"
});
const germanCurrencyNames = new Intl.DisplayNames(["de"], {
  type: "currency"
});

function languageEntityId(code: string) {
  return code === "por" ? "language:pt" : `language:${code.toLowerCase()}`;
}

function currencyEntityId(code: string) {
  return `currency:${code.toLowerCase()}`;
}

function countryProfileSource(countryIso2: string) {
  const profile = countries.find((country) => country.cca2 === countryIso2);
  if (!profile) {
    throw new Error(`world-countries-Profil für ${countryIso2} fehlt.`);
  }
  return profile;
}

function profileCurrencies(profile: Country) {
  if (Object.keys(profile.currencies).length > 0) return profile.currencies;
  if (profile.cca2 === "FM") {
    return { USD: { name: "United States dollar", symbol: "$" } };
  }
  return profile.currencies;
}

function currencySourceRefs(countryIso2: string) {
  return countryIso2 === "FM"
    ? ["fsm-government-currency"]
    : ["world-countries"];
}

function displayName(
  displayNames: Intl.DisplayNames,
  code: string,
  fallback: string
) {
  try {
    return displayNames.of(code) ?? fallback;
  } catch {
    return fallback;
  }
}

function profileAliases(preferred: string, ...candidates: string[]) {
  return [...new Set(candidates.map((value) => value.trim()))].filter(
    (value) => value.length > 0 && value !== preferred
  );
}

function stableJson(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function preferredName(
  entityId: string,
  name: string,
  idSuffix: string
): LocalizedName {
  return {
    id: `name:${idSuffix}:de:preferred`,
    entityId,
    locale: "de",
    name,
    kind: "preferred",
    answerPolicy: "display_and_accept"
  };
}

function aliasNames(
  entityId: string,
  aliases: string[],
  idSuffix: string
): LocalizedName[] {
  return aliases.map((name, index) => ({
    id: `name:${idSuffix}:de:alias-${index + 1}`,
    entityId,
    locale: "de",
    name,
    kind: "alias",
    answerPolicy: "accept_only"
  }));
}

async function writeStable(path: string, content: string) {
  let previous: string | undefined;

  try {
    previous = await readFile(path, "utf8");
  } catch {
    previous = undefined;
  }

  if (previous !== content) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, "utf8");
  }
}

async function loadTopology(path: string) {
  return JSON.parse(await readFile(path, "utf8")) as WorldTopology;
}

function geometryIds(topology: WorldTopology) {
  return new Set(
    topology.objects.countries.geometries.map((geometry) =>
      String(geometry.id).padStart(3, "0")
    )
  );
}

function extractFeature(
  topology: WorldTopology,
  numericId: string
): Feature<Polygon | MultiPolygon, CountryProperties> {
  const geometry = topology.objects.countries.geometries.find(
    (candidate) => String(candidate.id).padStart(3, "0") === numericId
  );

  if (!geometry) {
    throw new Error(`Natural-Earth-Geometrie ${numericId} fehlt.`);
  }

  const extracted = feature(
    topology,
    geometry
  ) as unknown as Feature<Polygon | MultiPolygon, CountryProperties>;
  extracted.id = numericId;
  return extracted;
}

const rawText = await readFile(sourcePath, "utf8");
const fixture = parseRawContentFixture(JSON.parse(rawText));
const physicalSnapshot = parseRawPhysicalSnapshot(
  JSON.parse(await readFile(physicalSourcePath, "utf8"))
);
const knowledgeSnapshot = parseRawKnowledgeSnapshot(
  JSON.parse(await readFile(knowledgeSourcePath, "utf8"))
);
const knowledgeTemplates = parseRawKnowledgeTemplateSnapshot(
  JSON.parse(await readFile(knowledgeTemplatePath, "utf8"))
);
const astronomySnapshot = parseRawAstronomySnapshot(
  JSON.parse(await readFile(astronomySourcePath, "utf8"))
);
const landmarkSnapshot = parseRawLandmarkSnapshot(
  JSON.parse(await readFile(landmarkSourcePath, "utf8"))
);
const rankedCities = parseRankedCityContentPack(
  JSON.parse(await readFile(rankedCitySourcePath, "utf8"))
);
const rankedPhysical = parseRankedPhysicalContentPack(
  JSON.parse(await readFile(rankedPhysicalSourcePath, "utf8"))
);

if (physicalSnapshot.datasetVersion !== fixture.version) {
  throw new Error(
    `Physical Snapshot ${physicalSnapshot.datasetVersion} passt nicht zu ${fixture.version}.`
  );
}
if (
  knowledgeSnapshot.datasetVersion !== fixture.version ||
  knowledgeTemplates.datasetVersion !== fixture.version ||
  landmarkSnapshot.datasetVersion !== fixture.version ||
  rankedCities.datasetVersion !== fixture.version ||
  rankedPhysical.datasetVersion !== fixture.version
) {
  throw new Error(
    `Themen-Snapshots passen nicht zu Dataset ${fixture.version}.`
  );
}

if (fixture.countries.length !== 195) {
  throw new Error(
    `MVP-Content benötigt 195 Staaten, enthält aber ${fixture.countries.length}.`
  );
}

const world50m = await loadTopology(world50mPath);
const world10m = await loadTopology(world10mPath);
const available50mIds = geometryIds(world50m);
const fallbackFeatureIds = fixture.countries
  .map((country) => country.mapFeatureId)
  .filter((id) => !available50mIds.has(id));
const mapAdditions: FeatureCollection<
  Polygon | MultiPolygon,
  CountryProperties
> = {
  type: "FeatureCollection",
  features: fallbackFeatureIds.map((id) => extractFeature(world10m, id))
};

const entities: ContentEntity[] = [];
const names: LocalizedName[] = [];
const relations: EntityRelation[] = [];
const profileCountries = fixture.countries.map((country) => ({
  fixture: country,
  profile: countryProfileSource(country.iso2)
}));
const languages = new Map<string, { code: string; englishName: string }>();
const currencies = new Map<
  string,
  { code: string; profile: Country["currencies"][string] }
>();
const curatedOfficialLanguagePairs = new Set(
  knowledgeSnapshot.relationClaims
    .filter((relation) => relation.relationType === "has_official_language")
    .map((relation) => `${relation.sourceId}|${relation.targetId}`)
);

for (const { profile } of profileCountries) {
  for (const [code, englishName] of Object.entries(profile.languages)) {
    languages.set(code, { code, englishName });
  }
  for (const [code, currency] of Object.entries(profileCurrencies(profile))) {
    currencies.set(code, { code, profile: currency });
  }
}

for (const [continentId, label] of CONTINENTS) {
  const suffix = continentId.replace(":", "-");
  entities.push({
    id: continentId,
    type: "continent",
    canonicalNameId: `name:${suffix}:de:preferred`,
    difficulty: 1,
    active: true,
    sourceRefs: ["phase2-scope-policy"]
  });
  names.push(preferredName(continentId, label, suffix));
}

for (const { code, englishName } of [...languages.values()].toSorted((left, right) =>
  left.code.localeCompare(right.code)
)) {
  const entityId = languageEntityId(code);
  const suffix = entityId.replace(":", "-");
  const preferred = displayName(germanLanguageNames, code, englishName);
  entities.push({
    id: entityId,
    type: "language",
    canonicalNameId: `name:${suffix}:de:preferred`,
    difficulty: 2,
    active: true,
    sourceRefs:
      entityId === "language:pt"
        ? ["world-countries", "cplp-portuguese-language-states"]
        : ["world-countries"]
  });
  names.push(
    preferredName(entityId, preferred, suffix),
    ...aliasNames(
      entityId,
      profileAliases(preferred, englishName, code),
      suffix
    )
  );
}

for (const { code, profile } of [...currencies.values()].toSorted((left, right) =>
  left.code.localeCompare(right.code)
)) {
  const entityId = currencyEntityId(code);
  const suffix = entityId.replace(":", "-");
  const preferred = displayName(germanCurrencyNames, code, profile.name);
  entities.push({
    id: entityId,
    type: "currency",
    canonicalNameId: `name:${suffix}:de:preferred`,
    difficulty: 2,
    active: true,
    sourceRefs: ["world-countries"]
  });
  names.push(
    preferredName(entityId, preferred, suffix),
    ...aliasNames(
      entityId,
      profileAliases(preferred, profile.name, code, profile.symbol),
      suffix
    )
  );
}

const seenCapitalIds = new Set<string>();

for (const { fixture: country, profile } of profileCountries) {
  const countrySuffix = country.id.replace(":", "-");

  entities.push({
    id: country.id,
    type: "country",
    canonicalNameId: `name:${countrySuffix}:de:preferred`,
    centroid: country.centroid,
    geometryRef: {
      layer: "countries",
      featureId: country.mapFeatureId,
      pointFallback: country.mapMarker
    },
    difficulty: country.difficulty,
    active: true,
    sourceRefs: [
      "world-countries",
      "wikidata-capital-snapshot",
      "natural-earth"
    ]
  });
  names.push(
    preferredName(country.id, country.nameDe, countrySuffix),
    ...aliasNames(country.id, country.aliasesDe, countrySuffix)
  );

  for (const continentId of country.continentIds) {
    relations.push({
      id: `relation:${countrySuffix}:located-in:${continentId.replace(":", "-")}`,
      sourceId: country.id,
      relationType: "located_in",
      targetId: continentId,
      sourceRefs: ["phase2-scope-policy"]
    });
  }

  for (const code of Object.keys(profile.languages)) {
    const targetId = languageEntityId(code);
    if (curatedOfficialLanguagePairs.has(`${country.id}|${targetId}`)) {
      continue;
    }
    relations.push({
      id: `relation:${countrySuffix}:official-language:${code.toLowerCase()}`,
      sourceId: country.id,
      relationType: "has_official_language",
      targetId,
      sourceRefs: ["world-countries"]
    });
  }

  for (const code of Object.keys(profileCurrencies(profile))) {
    relations.push({
      id: `relation:${countrySuffix}:uses-currency:${code.toLowerCase()}`,
      sourceId: country.id,
      relationType: "uses_currency",
      targetId: currencyEntityId(code),
      sourceRefs: currencySourceRefs(country.iso2)
    });
  }

  for (const capital of country.capitals) {
    const capitalSuffix = capital.id.replace(":", "-");

    if (!seenCapitalIds.has(capital.id)) {
      seenCapitalIds.add(capital.id);
      entities.push({
        id: capital.id,
        type: "city",
        canonicalNameId: `name:${capitalSuffix}:de:preferred`,
        centroid: capital.centroid,
        difficulty: capital.difficulty,
        active: true,
        sourceRefs: capital.sourceRefs
      });
      names.push(
        preferredName(capital.id, capital.nameDe, capitalSuffix),
        ...aliasNames(capital.id, capital.aliasesDe, capitalSuffix)
      );
    }

    relations.push(
      {
        id: `relation:${countrySuffix}:has-capital:${capital.wikidataId.toLocaleLowerCase("en")}`,
        sourceId: country.id,
        relationType: "has_capital",
        targetId: capital.id,
        qualifiers: { role: capital.role },
        sourceRefs: capital.sourceRefs
      },
      {
        id: `relation:${capitalSuffix}:is-capital-of:${country.iso2.toLocaleLowerCase("en")}`,
        sourceId: capital.id,
        relationType: "is_capital_of",
        targetId: country.id,
        qualifiers: { role: capital.role },
        sourceRefs: capital.sourceRefs
      },
      {
        id: `relation:${capitalSuffix}:located-in:${country.iso2.toLocaleLowerCase("en")}`,
        sourceId: capital.id,
        relationType: "located_in",
        targetId: country.id,
        sourceRefs: capital.sourceRefs
      }
    );
  }
}

for (const physical of physicalSnapshot.entities) {
  const suffix = physical.id.replaceAll(":", "-");
  entities.push({
    id: physical.id,
    type: physical.type,
    canonicalNameId: `name:${suffix}:de:preferred`,
    centroid: physical.centroid,
    geometryRef: physical.geometryRef,
    difficulty: physical.difficulty,
    active: true,
    sourceRefs: physical.sourceRefs
  });
  names.push(
    preferredName(physical.id, physical.nameDe, suffix),
    ...aliasNames(physical.id, physical.aliasesDe, suffix)
  );
  for (const continentId of physical.continentIds) {
    relations.push({
      id: `relation:${suffix}:located-in:${continentId.replace(":", "-")}`,
      sourceId: physical.id,
      relationType: "located_in",
      targetId: continentId,
      sourceRefs: physical.sourceRefs
    });
  }
}

const astronomyFacts: EntityFact[] = [];
for (const astronomy of astronomySnapshot.entities) {
  const suffix = astronomy.id.replaceAll(":", "-");
  entities.push({
    id: astronomy.id,
    type: astronomy.type,
    canonicalNameId: `name:${suffix}:de:preferred`,
    difficulty: astronomy.difficulty,
    active: true,
    sourceRefs: astronomy.sourceRefs
  });
  names.push(
    preferredName(astronomy.id, astronomy.nameDe, suffix),
    ...aliasNames(astronomy.id, astronomy.aliasesDe, suffix)
  );
  astronomyFacts.push(
    ...astronomy.facts.map((fact) => ({
      id: `fact:${suffix}:${fact.factTypeId.replace("fact-type:", "")}`,
      entityId: astronomy.id,
      factTypeId: fact.factTypeId,
      value: fact.value,
      acceptedValues: fact.acceptedValues,
      asOf: astronomySnapshot.builtAt.slice(0, 10),
      method: fact.method,
      sourceRefs: fact.sourceRefs
    }))
  );
  if (astronomy.orbitsId) {
    relations.push({
      id: `relation:${suffix}:orbits:${astronomy.orbitsId.replaceAll(":", "-")}`,
      sourceId: astronomy.id,
      relationType: "orbits",
      targetId: astronomy.orbitsId,
      sourceRefs: astronomy.sourceRefs
    });
  }
}

const landmarkFacts: EntityFact[] = [];
for (const landmark of landmarkSnapshot.entities) {
  const suffix = landmark.id.replaceAll(":", "-");
  entities.push({
    id: landmark.id,
    type: "landmark",
    canonicalNameId: `name:${suffix}:de:preferred`,
    promptQualifier:
      landmark.kind === "natural" ? "Naturhighlight" : "Sehenswürdigkeit",
    difficulty: landmark.difficulty,
    active: true,
    sourceRefs: landmark.sourceRefs
  });
  names.push(
    preferredName(landmark.id, landmark.nameDe, suffix),
    ...aliasNames(landmark.id, landmark.aliasesDe, suffix)
  );
  for (const continentId of landmark.continentIds) {
    relations.push({
      id: `relation:${suffix}:located-in:${continentId.replace(":", "-")}`,
      sourceId: landmark.id,
      relationType: "located_in",
      targetId: continentId,
      sourceRefs: landmark.sourceRefs
    });
  }
  for (const [factTypeId, value] of [
    ["fact-type:landmark-country", landmark.countryDe],
    ["fact-type:landmark-place", landmark.placeDe],
    ["fact-type:landmark-fun-fact", landmark.funFactDe],
    ["fact-type:landmark-distinction", landmark.distinctionDe]
  ] as const) {
    landmarkFacts.push({
      id: `fact:${suffix}:${factTypeId.replace("fact-type:", "")}`,
      entityId: landmark.id,
      factTypeId,
      value,
      asOf: landmarkSnapshot.builtAt.slice(0, 10),
      method: "curated-official-location-and-distinction-v1",
      sourceRefs: landmark.sourceRefs.filter((sourceRef) => !sourceRef.startsWith("commons-"))
    });
  }
}

relations.push(...knowledgeSnapshot.relationClaims);

const sources = [
  ...fixture.sources,
  {
    id: "natural-earth",
    sourceVersion: "world-atlas@2.0.2 / 50m+10m",
    retrievedAt: fixture.builtAt.slice(0, 10),
    url: "https://www.naturalearthdata.com/",
    license: "Public Domain"
  },
  {
    id: "flag-icons",
    sourceVersion: "7.5.0",
    retrievedAt: fixture.builtAt.slice(0, 10),
    url: "https://github.com/lipis/flag-icons/tree/v7.5.0",
    license: "MIT"
  },
  {
    id: "fsm-government-currency",
    sourceVersion: "retrieved-2026-08-04",
    retrievedAt: "2026-08-04",
    url: "https://bankingboard.gov.fm/overview.htm",
    license: "Government factual statement; page content not redistributed"
  },
  {
    id: physicalSnapshot.source.id,
    sourceVersion: physicalSnapshot.source.sourceVersion,
    retrievedAt: physicalSnapshot.source.retrievedAt,
    url: physicalSnapshot.source.url,
    license: physicalSnapshot.source.license
  },
  ...knowledgeSnapshot.sources,
  ...astronomySnapshot.sources,
  ...landmarkSnapshot.sources
].toSorted((left, right) => left.id.localeCompare(right.id));

const knowledge = compileKnowledgeQuestions(knowledgeTemplates.templates, {
  entities,
  names,
  relations,
  factDefinitions: knowledgeSnapshot.factDefinitions,
  facts: knowledgeSnapshot.facts,
  sources
});
entities.push(...knowledge.entities);
names.push(...knowledge.names);
relations.push(...knowledge.answerRelations);
relations.push(...knowledge.scopeRelations);

const dataset: GeoDataset = {
  datasetId: fixture.datasetId,
  version: fixture.version,
  schemaVersion: CONTENT_SCHEMA_VERSION,
  scopePolicy: fixture.scopePolicy,
  sources,
  entityTypes: [
    {
      id: "city",
      geometryKind: "point",
      supportedPromptIds: ["name", "map_highlight"],
      supportedAnswerModeIds: ["text_input", "map_point"]
    },
    {
      id: "ranked_city",
      geometryKind: "point",
      supportedPromptIds: ["name", "map_highlight"],
      supportedAnswerModeIds: ["text_input", "map_point"]
    },
    {
      id: "ranked_river",
      geometryKind: "none",
      supportedPromptIds: ["fact"],
      supportedAnswerModeIds: ["text_input"]
    },
    {
      id: "ranked_peak",
      geometryKind: "point",
      supportedPromptIds: ["fact"],
      supportedAnswerModeIds: ["text_input"]
    },
    {
      id: "continent",
      geometryKind: "none",
      supportedPromptIds: ["name"],
      supportedAnswerModeIds: []
    },
    {
      id: "country",
      geometryKind: "polygon",
      supportedPromptIds: ["name", "visual_asset", "map_highlight"],
      supportedAnswerModeIds: [
        "text_input",
        "single_choice",
        "map_area",
        "country_profile_input"
      ]
    },
    {
      id: "river",
      geometryKind: "line",
      supportedPromptIds: ["name", "map_highlight"],
      supportedAnswerModeIds: ["text_input", "map_line"]
    },
    {
      id: "lake",
      geometryKind: "polygon",
      supportedPromptIds: ["name", "map_highlight"],
      supportedAnswerModeIds: ["text_input", "map_area"]
    },
    {
      id: "sea",
      geometryKind: "polygon",
      supportedPromptIds: ["name", "map_highlight"],
      supportedAnswerModeIds: ["text_input", "map_area"]
    },
    {
      id: "mountain_range",
      geometryKind: "polygon",
      supportedPromptIds: ["name", "map_highlight"],
      supportedAnswerModeIds: ["text_input", "map_area"]
    },
    {
      id: "peak",
      geometryKind: "point",
      supportedPromptIds: ["name", "map_highlight"],
      supportedAnswerModeIds: ["text_input", "map_point"]
    },
    {
      id: "language",
      geometryKind: "none",
      supportedPromptIds: ["name"],
      supportedAnswerModeIds: []
    },
    {
      id: "currency",
      geometryKind: "none",
      supportedPromptIds: ["name"],
      supportedAnswerModeIds: []
    },
    {
      id: "knowledge_question",
      geometryKind: "none",
      supportedPromptIds: ["description"],
      supportedAnswerModeIds: ["text_input", "single_choice"]
    },
    {
      id: "planet",
      geometryKind: "none",
      supportedPromptIds: ["fact"],
      supportedAnswerModeIds: ["text_input"]
    },
    {
      id: "moon",
      geometryKind: "none",
      supportedPromptIds: ["fact"],
      supportedAnswerModeIds: ["text_input"]
    },
    {
      id: "dwarf_planet",
      geometryKind: "none",
      supportedPromptIds: ["fact"],
      supportedAnswerModeIds: ["text_input"]
    },
    {
      id: "zodiac_constellation",
      geometryKind: "none",
      supportedPromptIds: ["visual_asset"],
      supportedAnswerModeIds: ["fact_profile_input"]
    },
    {
      id: "landmark",
      geometryKind: "none",
      supportedPromptIds: ["visual_asset"],
      supportedAnswerModeIds: ["text_input"]
    }
  ],
  relationTypes: [
    {
      id: "has_capital",
      sourceTypeIds: ["country"],
      targetTypeIds: ["city"],
      inverseRelationId: "is_capital_of",
      cardinality: "many"
    },
    {
      id: "is_capital_of",
      sourceTypeIds: ["city"],
      targetTypeIds: ["country"],
      inverseRelationId: "has_capital",
      cardinality: "many"
    },
    {
      id: "located_in",
      sourceTypeIds: [
        "city",
        "ranked_city",
        "country",
        "river",
        "lake",
        "sea",
        "mountain_range",
        "peak",
        "landmark",
        "knowledge_question"
      ],
      targetTypeIds: ["country", "continent"],
      cardinality: "many"
    },
    {
      id: "has_official_language",
      sourceTypeIds: ["country"],
      targetTypeIds: ["language"],
      cardinality: "many"
    },
    {
      id: "uses_currency",
      sourceTypeIds: ["country"],
      targetTypeIds: ["currency"],
      cardinality: "many"
    },
    {
      id: "has_answer",
      sourceTypeIds: ["knowledge_question"],
      targetTypeIds: ["country", "city"],
      cardinality: "one"
    },
    {
      id: "orbits",
      sourceTypeIds: ["moon"],
      targetTypeIds: ["planet"],
      cardinality: "one"
    }
  ],
  entities: entities.toSorted((left, right) => left.id.localeCompare(right.id)),
  names: names.toSorted((left, right) => left.id.localeCompare(right.id)),
  relations: relations.toSorted((left, right) =>
    left.id.localeCompare(right.id)
  ),
  factDefinitions: [
    ...knowledgeSnapshot.factDefinitions,
    ...astronomySnapshot.factDefinitions,
    ...landmarkSnapshot.factDefinitions
  ].toSorted((left, right) => left.id.localeCompare(right.id)),
  facts: [...knowledgeSnapshot.facts, ...astronomyFacts, ...landmarkFacts].toSorted(
    (left, right) => left.id.localeCompare(right.id)
  ),
  compiledKnowledgeQuestions: knowledge.questions
};

parseGeoDataset(dataset);

parseGeoDataset({
  ...dataset,
  sources: [...dataset.sources, ...rankedCities.sources],
  entities: [...dataset.entities, ...rankedCities.entities],
  names: [...dataset.names, ...rankedCities.names],
  relations: [...dataset.relations, ...rankedCities.relations],
  factDefinitions: [
    ...dataset.factDefinitions,
    ...rankedCities.factDefinitions
  ],
  facts: [...dataset.facts, ...rankedCities.facts]
});

parseGeoDataset({
  ...dataset,
  sources: [...dataset.sources, ...rankedPhysical.sources],
  entities: [...dataset.entities, ...rankedPhysical.entities],
  names: [...dataset.names, ...rankedPhysical.names],
  relations: [...dataset.relations, ...rankedPhysical.relations],
  factDefinitions: [
    ...dataset.factDefinitions,
    ...rankedPhysical.factDefinitions
  ],
  facts: [...dataset.facts, ...rankedPhysical.facts]
});

const datasetJson = stableJson(dataset);
const rankedCityJson = stableJson(rankedCities);
const rankedPhysicalJson = stableJson(rankedPhysical);
const rankedCityIndexJson = stableJson({
  schemaVersion: 1,
  datasetVersion: rankedCities.datasetVersion,
  builtAt: rankedCities.builtAt,
  ranking: rankedCities.ranking,
  quality: rankedCities.quality,
  sources: rankedCities.sources
});
const rankedPhysicalIndexJson = stableJson({
  schemaVersion: 1,
  datasetVersion: rankedPhysical.datasetVersion,
  builtAt: rankedPhysical.builtAt,
  rankings: rankedPhysical.rankings,
  quality: rankedPhysical.quality,
  sources: rankedPhysical.sources
});
const mapAdditionsJson = stableJson(mapAdditions);
const physicalTypes = [
  "river",
  "lake",
  "sea",
  "mountain_range",
  "peak"
] as const;
const physicalMaps = Object.fromEntries(
  physicalTypes.map((type) => {
    const map: FeatureCollection<
      MultiLineString | MultiPolygon | Point,
      {
        entityId: string;
        label: string;
        entityType: string;
        difficulty: number;
      }
    > = {
      type: "FeatureCollection",
      features: physicalSnapshot.entities
        .filter((entity) => entity.type === type)
        .map((entity) => ({
          type: "Feature",
          id: entity.id,
          properties: {
            entityId: entity.id,
            label: entity.nameDe,
            entityType: entity.type,
            difficulty: entity.difficulty
          },
          geometry: entity.geometry
        }))
    };
    const slug = type.replace("_", "-");
    return [
      type,
      {
        path: `../../geo/generated/physical-${slug}-v1.json`,
        outputPath: resolve(
          physicalMapDirectory,
          `physical-${slug}-v1.json`
        ),
        json: stableJson(map),
        count: map.features.length
      }
    ];
  })
) as Record<
  (typeof physicalTypes)[number],
  { path: string; outputPath: string; json: string; count: number }
>;
const continentCounts = Object.fromEntries(
  CONTINENTS.map(([id]) => [
    id,
    fixture.countries.filter((country) => country.continentIds.includes(id))
      .length
  ])
);
const multipleCapitalCountries = fixture.countries
  .filter((country) => country.capitals.length > 1)
  .map((country) => ({
    countryId: country.id,
    capitals: country.capitals.map((capital) => ({
      id: capital.id,
      nameDe: capital.nameDe,
      role: capital.role
    }))
  }));
const qualityReport = {
  datasetId: dataset.datasetId,
  version: dataset.version,
  checks: {
    schemaValid: true,
    uniqueEntityIds: true,
    referencesResolved: true,
    coordinateRangesValid: true,
    countryCount: fixture.countries.length,
    capitalSeatCount: seenCapitalIds.size,
    languageCount: languages.size,
    currencyCount: currencies.size,
    countryProfilesComplete: profileCountries.every(
      ({ fixture: country, profile }) =>
        country.capitals.length > 0 &&
        Object.keys(profile.languages).length > 0 &&
        Object.keys(profileCurrencies(profile)).length > 0
    ),
    physicalEntityCounts: Object.fromEntries(
      physicalTypes.map((type) => [
        type,
        physicalSnapshot.entities.filter((entity) => entity.type === type)
          .length
      ])
    ),
    physicalScopeCounts: Object.fromEntries(
      CONTINENTS.map(([continentId]) => [
        continentId,
        Object.fromEntries(
          physicalTypes.map((type) => [
            type,
            physicalSnapshot.entities.filter(
              (entity) =>
                entity.type === type &&
                entity.continentIds.includes(continentId)
            ).length
          ])
        )
      ])
    ),
    continentCounts,
    mapFallbackFeatureIds: fallbackFeatureIds,
    knowledgeFactCount: dataset.facts.length - landmarkFacts.length,
    landmarkFactCount: landmarkFacts.length,
    knowledgeTemplateCount: knowledgeTemplates.templates.length,
    compiledKnowledgeQuestionCount: dataset.compiledKnowledgeQuestions.length,
    landmarkEntityCount: landmarkSnapshot.entities.length,
    landmarkImagesPinnedAndSourced: landmarkSnapshot.entities.every(
      (entity) => entity.image.sha256.length === 64 && entity.sourceRefs.length >= 2
    ),
    knowledgeQuestionsUniqueAndSourced: true,
    knowledgeComparisonsMethodConsistent: true,
    rankedCityEntityCount: rankedCities.entities.length,
    rankedCityScopeCounts: rankedCities.quality.scopeCounts,
    rankedCityGermanPreferredNameCount:
      rankedCities.quality.germanPreferredNameCount,
    rankedCityGermanAliasCount: rankedCities.quality.germanAliasCount,
    rankedCityBoundaryTies: rankedCities.quality.boundaryTies.length,
    rankedCityPackBytes: Buffer.byteLength(rankedCityJson),
    rankedPhysicalEntityCounts: rankedPhysical.quality.entityCounts,
    rankedPhysicalGermanAliasCount:
      rankedPhysical.quality.germanAliasCount,
    rankedPhysicalPackBytes: Buffer.byteLength(rankedPhysicalJson),
    astronomyEntityCounts: Object.fromEntries(
      ["planet", "moon", "dwarf_planet", "zodiac_constellation"].map(
        (type) => [
          type,
          astronomySnapshot.entities.filter((entity) => entity.type === type)
            .length
        ]
      )
    ),
    constellationChartCount: astronomySnapshot.entities.filter(
      (entity) => entity.type === "zodiac_constellation" && entity.chart
    ).length
  },
  review: {
    multipleCapitalCountries,
    politicallySensitiveCountryIds: [
      "country:cy",
      "country:gq",
      "country:il",
      "country:ps",
      "country:ye"
    ],
    knownNameUpdates: [
      {
        countryId: "country:sz",
        preferred: "Eswatini",
        retainedAlias: "Swasiland"
      }
    ]
  },
  warnings: [
    "Kontinentscopes überlappen bei transkontinentalen Staaten.",
    "Hauptstadtrollen und politisch sensible Fälle benötigen redaktionelle Einzelprüfung.",
    "Kleinstaaten verwenden zusätzlich kartographische Treffermarker.",
    "Physische Kontinentscopes sind kuratiert und dürfen überlappen.",
    "Meeres- und Gebirgspolygone sind kartographische Lernflächen.",
    "Wissensrankings verwenden den gemeinsamen Bezugsstand 2023; Vatikanstadt fehlt in den World-Bank-Indikatoren und wird von keiner Phase-6-Vorlage gerankt.",
    "Städteränge verwenden das GeoNames-population-Feld; es ist keine einheitliche Stadtgebiets- oder Metropolregionsstatistik.",
    "Exakte Top-N-Mengen lösen gleiche Bevölkerungswerte deterministisch nach numerischer GeoNames-ID auf.",
    "Flusslängen hängen von der gewählten Quelle-Mündung-Definition ab; das Rangquiz nutzt ausschließlich den ersten Kilometerwert der fest versionierten Systemtabelle.",
    "Das Bergranking nutzt eigenständige Gipfel nach gerundeter Höhe über Meeresspiegel und schließt als S markierte Untergipfel aus."
  ]
};
const qualityJson = stableJson(qualityReport);
const visualAssetIndexJson = await readFile(visualAssetIndexPath, "utf8");
const manifest: DatasetManifest = {
  datasetId: fixture.datasetId,
  version: fixture.version,
  schemaVersion: CONTENT_SCHEMA_VERSION,
  builtAt: fixture.builtAt,
  localeCoverage: fixture.localeCoverage,
  scopePolicy: fixture.scopePolicy,
  sources: [
    ...sources,
    ...rankedCities.sources,
    ...rankedPhysical.sources
  ].toSorted((left, right) => left.id.localeCompare(right.id)),
  artifacts: [
    {
      path: "geo-core-mvp-v1.json",
      sha256: sha256(datasetJson),
      bytes: Buffer.byteLength(datasetJson),
      entityCount: dataset.entities.length
    },
    {
      path: "quality-report.json",
      sha256: sha256(qualityJson),
      bytes: Buffer.byteLength(qualityJson)
    },
    {
      path: "ranked-cities-v1.json",
      sha256: sha256(rankedCityJson),
      bytes: Buffer.byteLength(rankedCityJson),
      entityCount: rankedCities.entities.length
    },
    {
      path: "ranked-cities-index-v1.json",
      sha256: sha256(rankedCityIndexJson),
      bytes: Buffer.byteLength(rankedCityIndexJson)
    },
    {
      path: "ranked-physical-v1.json",
      sha256: sha256(rankedPhysicalJson),
      bytes: Buffer.byteLength(rankedPhysicalJson),
      entityCount: rankedPhysical.entities.length
    },
    {
      path: "ranked-physical-index-v1.json",
      sha256: sha256(rankedPhysicalIndexJson),
      bytes: Buffer.byteLength(rankedPhysicalIndexJson)
    },
    {
      path: "../../geo/generated/mvp-map-additions-v1.json",
      sha256: sha256(mapAdditionsJson),
      bytes: Buffer.byteLength(mapAdditionsJson)
    },
    ...physicalTypes.map((type) => ({
      path: physicalMaps[type].path,
      sha256: sha256(physicalMaps[type].json),
      bytes: Buffer.byteLength(physicalMaps[type].json),
      entityCount: physicalMaps[type].count
    })),
    {
      path: "visual-assets-index-v1.json",
      sha256: sha256(visualAssetIndexJson),
      bytes: Buffer.byteLength(visualAssetIndexJson),
      entityCount:
        fixture.countries.length +
        astronomySnapshot.entities.filter(
          (entity) => entity.type === "zodiac_constellation"
        ).length
    }
  ],
  attribution: [
    "Länderbasis: world-countries 5.1.0 (ODbL 1.0)",
    "Hauptstadtbeziehungen und Labels: Wikidata (CC0 1.0)",
    "Kartengeometrie und Länderumrisse: Natural Earth (Public Domain)",
    "Physische Geometrien: Natural Earth 5.1.2, 1:50m (Public Domain)",
    "Flaggen: flag-icons 7.5.0 (MIT)",
    "Landfläche 2023: World Bank WDI / FAOSTAT (CC BY 4.0)",
    "Bevölkerung 2023: World Bank WDI (CC BY 4.0)",
    "Portugiesische Amtssprachen: CPLP-Mitgliedstaaten und Länderprofile",
    "Währung Mikronesiens: Banking Board der Föderierten Staaten von Mikronesien",
    "Städte, Koordinaten, Namen und Bevölkerungsfeld: GeoNames (CC BY 4.0)",
    "Top-100-Flusssysteme und -Gipfel: fest versionierte Wikipedia-Listen (CC BY-SA 4.0)",
    "Planeten, Monde und Zwergplaneten: NASA Solar System Exploration",
    "Sternbildnamen, IAU-Kürzel und Kartengrundlage: IAU (Karten CC BY 4.0)"
  ],
  qualityReport: "quality-report.json"
};

await Promise.all([
  writeStable(datasetPath, datasetJson),
  writeStable(qualityPath, qualityJson),
  writeStable(rankedCityPath, rankedCityJson),
  writeStable(rankedCityIndexPath, rankedCityIndexJson),
  writeStable(rankedPhysicalPath, rankedPhysicalJson),
  writeStable(rankedPhysicalIndexPath, rankedPhysicalIndexJson),
  writeStable(manifestPath, stableJson(manifest)),
  writeStable(mapAdditionPath, mapAdditionsJson),
  ...physicalTypes.map((type) =>
    writeStable(physicalMaps[type].outputPath, physicalMaps[type].json)
  )
]);

process.stdout.write(
  `Content ${dataset.datasetId}@${dataset.version}: ${dataset.entities.length} Entitäten, ${dataset.relations.length} Relationen\n`
);
