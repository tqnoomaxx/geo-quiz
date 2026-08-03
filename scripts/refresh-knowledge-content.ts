import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type {
  DatasetSource,
  EntityFact,
  EntityRelation,
  FactDefinition,
  RawContentFixture
} from "../src/content/schema";
import type { RawKnowledgeSnapshot } from "../src/content/knowledge";

type WorldBankRow = {
  countryiso3code: string;
  date: string;
  value: number | null;
};

const projectRoot = resolve(import.meta.dirname, "..");
const fixturePath = resolve(projectRoot, "content-src/geo-core-mvp.v1.json");
const outputPath = resolve(projectRoot, "content-src/knowledge-core.v1.json");
const comparisonYear = "2023";
const snapshotDate = new Date().toISOString().slice(0, 10);

const INDICATORS = [
  {
    code: "AG.LND.TOTL.K2",
    factTypeId: "fact-type:land-area-km2",
    sourceId: "world-bank-land-area-2023",
    method: "World Bank WDI AG.LND.TOTL.K2; FAOSTAT-Landfläche; Kalenderjahr 2023"
  },
  {
    code: "SP.POP.TOTL",
    factTypeId: "fact-type:population-total",
    sourceId: "world-bank-population-2023",
    method: "World Bank WDI SP.POP.TOTL; Gesamtbevölkerung; Kalenderjahr 2023"
  }
] as const;

const PORTUGUESE_OFFICIAL_ISO2 = [
  "AO",
  "BR",
  "CV",
  "GQ",
  "GW",
  "MZ",
  "PT",
  "ST",
  "TL"
] as const;

function stableJson(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function fetchIndicator(code: string) {
  const url =
    `https://api.worldbank.org/v2/country/all/indicator/${code}` +
    `?date=${comparisonYear}&format=json&per_page=20000`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${code}: World-Bank-API antwortet mit ${response.status}.`);
  }
  const payload = (await response.json()) as [unknown, WorldBankRow[]];
  if (!Array.isArray(payload) || !Array.isArray(payload[1])) {
    throw new Error(`${code}: World-Bank-Antwort ist ungültig.`);
  }
  return new Map(
    payload[1]
      .filter(
        (row) =>
          row.date === comparisonYear &&
          row.value !== null &&
          Number.isFinite(row.value)
      )
      .map((row) => [row.countryiso3code, row.value as number])
  );
}

const fixture = JSON.parse(
  await readFile(fixturePath, "utf8")
) as RawContentFixture;
const sources: DatasetSource[] = [
  {
    id: "world-bank-land-area-2023",
    sourceVersion: `AG.LND.TOTL.K2/${comparisonYear}`,
    retrievedAt: snapshotDate,
    url: "https://data.worldbank.org/indicator/AG.LND.TOTL.K2",
    license: "CC BY-4.0"
  },
  {
    id: "world-bank-population-2023",
    sourceVersion: `SP.POP.TOTL/${comparisonYear}`,
    retrievedAt: snapshotDate,
    url: "https://data.worldbank.org/indicator/SP.POP.TOTL",
    license: "CC BY-4.0"
  },
  {
    id: "cplp-portuguese-language-states",
    sourceVersion: "2026-07-30",
    retrievedAt: snapshotDate,
    url: "https://www.cplp.org/estados-membros/",
    license: "Quellenverweis; Fakten redaktionell extrahiert"
  },
  {
    id: "phase2-scope-policy",
    sourceVersion: "un-193-plus-observers-v1",
    retrievedAt: snapshotDate,
    url: "docs/DATA_MODEL.md",
    license: "Projektinterne redaktionelle Scope-Policy"
  }
];
const factDefinitions: FactDefinition[] = [
  {
    id: "fact-type:land-area-km2",
    labelDe: "Landfläche",
    descriptionDe:
      "Landfläche ohne Binnengewässer gemäß World-Bank-Indikator AG.LND.TOTL.K2.",
    valueType: "number",
    unit: "km²",
    comparisonPolicy: "same_source_method_and_date"
  },
  {
    id: "fact-type:population-total",
    labelDe: "Bevölkerung",
    descriptionDe:
      "Gesamtbevölkerung gemäß World-Bank-Indikator SP.POP.TOTL.",
    valueType: "number",
    unit: "Menschen",
    comparisonPolicy: "same_source_method_and_date"
  }
];
const countriesByIso2 = new Map(
  fixture.countries.map((country) => [country.iso2, country])
);
const facts: EntityFact[] = [];

for (const indicator of INDICATORS) {
  const values = await fetchIndicator(indicator.code);
  for (const country of fixture.countries) {
    const value = values.get(country.iso3);
    if (value === undefined) continue;
    facts.push({
      id: `fact:${country.id.replace(":", "-")}:${indicator.factTypeId.replace(
        "fact-type:",
        ""
      )}:${comparisonYear}`,
      entityId: country.id,
      factTypeId: indicator.factTypeId,
      value,
      asOf: comparisonYear,
      method: indicator.method,
      sourceRefs: [indicator.sourceId]
    });
  }
}

const relationClaims: EntityRelation[] = PORTUGUESE_OFFICIAL_ISO2.map(
  (iso2) => {
    const country = countriesByIso2.get(iso2);
    if (!country) {
      throw new Error(`Amtssprachen-Snapshot: ${iso2} fehlt im Länder-Scope.`);
    }
    return {
      id: `relation:${country.id.replace(":",
        "-")}:has-official-language:language-pt`,
      sourceId: country.id,
      relationType: "has_official_language",
      targetId: "language:pt",
      qualifiers: {
        status: "official",
        reviewedAt: snapshotDate
      },
      sourceRefs: ["cplp-portuguese-language-states"]
    };
  }
);

const snapshot: RawKnowledgeSnapshot = {
  schemaVersion: 1,
  datasetVersion: fixture.version,
  builtAt: new Date().toISOString(),
  sources,
  factDefinitions,
  facts: facts.toSorted((left, right) => left.id.localeCompare(right.id)),
  relationClaims: relationClaims.toSorted((left, right) =>
    left.id.localeCompare(right.id)
  )
};

await writeFile(outputPath, stableJson(snapshot), "utf8");
process.stdout.write(
  `Knowledge ${snapshot.datasetVersion}: ${snapshot.facts.length} Fakten, ${snapshot.relationClaims.length} Amtssprachen-Relationen\n`
);
