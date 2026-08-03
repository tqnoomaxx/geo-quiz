import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  createReadStream,
  createWriteStream
} from "node:fs";
import {
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  parseRankedCityContentPack,
  type ContentEntity,
  type EntityFact,
  type EntityRelation,
  type LocalizedName,
  type RankedCityContentPack,
  type RankedCitySource
} from "../src/content/schema";

type GeoNamesCity = {
  geonameId: number;
  name: string;
  asciiName: string;
  latitude: number;
  longitude: number;
  featureCode: string;
  countryCode: string;
  population: number;
  modificationDate: string;
  continentId: string;
};

type GermanAlternateName = {
  id: number;
  name: string;
  preferred: boolean;
  short: boolean;
};

const projectRoot = resolve(import.meta.dirname, "..");
const fixturePath = resolve(projectRoot, "content-src/geo-core-mvp.v1.json");
const outputPath = resolve(projectRoot, "content-src/ranked-cities.v1.json");
const downloadBase = "https://download.geonames.org/export/dump";
const snapshotDate = new Date().toISOString().slice(0, 10);
const cityFileName = "cities1000.zip";
const alternateNamesFileName = "alternateNamesV2.zip";
const countryInfoFileName = "countryInfo.txt";
const supportedSetSizes = [100, 250, 500, 1000] as const;
const allowedFeatureCodes = new Set([
  "PPL",
  "PPLA",
  "PPLA2",
  "PPLA3",
  "PPLA4",
  "PPLA5",
  "PPLC"
]);
const continentIdByCode: Record<string, string> = {
  AF: "continent:africa",
  AS: "continent:asia",
  EU: "continent:europe",
  NA: "continent:north-america",
  OC: "continent:oceania",
  SA: "continent:south-america"
};
const scopeIds = ["world", ...Object.values(continentIdByCode)];

function stableJson(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function downloadToFile(url: string, path: string) {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`${url}: Download antwortet mit ${response.status}.`);
  }
  await pipeline(
    Readable.fromWeb(response.body as never),
    createWriteStream(path)
  );
}

async function fileSha256(path: string) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) {
    hash.update(chunk);
  }
  return hash.digest("hex");
}

async function sourceMetadata(
  id: string,
  filePath: string
): Promise<RankedCitySource> {
  const fileName = basename(filePath);
  const fileStats = await stat(filePath);
  return {
    id,
    sourceVersion: `${fileName}/${snapshotDate}`,
    retrievedAt: snapshotDate,
    url: `${downloadBase}/${fileName}`,
    license: "CC BY 4.0",
    file: {
      name: fileName,
      sha256: await fileSha256(filePath),
      bytes: fileStats.size
    }
  };
}

async function forEachZipLine(
  zipPath: string,
  visitor: (line: string) => void
) {
  const child = spawn("unzip", ["-p", zipPath], {
    stdio: ["ignore", "pipe", "pipe"]
  });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk: string) => {
    stderr += chunk;
  });
  const lines = createInterface({
    input: child.stdout,
    crlfDelay: Infinity
  });
  for await (const line of lines) {
    visitor(line);
  }
  const exitCode = await new Promise<number | null>((resolveExit) => {
    child.once("close", resolveExit);
  });
  if (exitCode !== 0) {
    throw new Error(`unzip ${zipPath} ist fehlgeschlagen: ${stderr.trim()}`);
  }
}

function parseCountryContinents(text: string) {
  const map = new Map<string, string>();
  for (const line of text.split(/\r?\n/u)) {
    if (!line || line.startsWith("#")) continue;
    const fields = line.split("\t");
    const continentId = continentIdByCode[fields[8]];
    if (fields[0] && continentId) {
      map.set(fields[0], continentId);
    }
  }
  return map;
}

function difficultyForRank(rankByScope: Record<string, number>) {
  const bestRank = Math.min(...Object.values(rankByScope));
  if (bestRank <= 100) return 1;
  if (bestRank <= 250) return 2;
  if (bestRank <= 500) return 3;
  return 4;
}

function uniqueNames(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const trimmed = value.trim();
    const key = trimmed.toLocaleLowerCase("de");
    if (!trimmed || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const temporaryDirectory = await mkdtemp(
  join(tmpdir(), "geoapp-ranked-cities-")
);

try {
  const cityZipPath = join(temporaryDirectory, cityFileName);
  const alternateNamesZipPath = join(
    temporaryDirectory,
    alternateNamesFileName
  );
  const countryInfoPath = join(temporaryDirectory, countryInfoFileName);

  await Promise.all([
    downloadToFile(`${downloadBase}/${cityFileName}`, cityZipPath),
    downloadToFile(
      `${downloadBase}/${alternateNamesFileName}`,
      alternateNamesZipPath
    ),
    downloadToFile(`${downloadBase}/${countryInfoFileName}`, countryInfoPath)
  ]);

  const countryContinents = parseCountryContinents(
    await readFile(countryInfoPath, "utf8")
  );
  const cities: GeoNamesCity[] = [];

  await forEachZipLine(cityZipPath, (line) => {
    const fields = line.split("\t");
    const featureCode = fields[7];
    const countryCode = fields[8];
    const continentId = countryContinents.get(countryCode);
    const population = Number(fields[14]);
    const latitude = Number(fields[4]);
    const longitude = Number(fields[5]);
    const geonameId = Number(fields[0]);

    if (
      fields[6] !== "P" ||
      !allowedFeatureCodes.has(featureCode) ||
      !continentId ||
      !Number.isInteger(population) ||
      population <= 0 ||
      !Number.isInteger(geonameId) ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return;
    }

    cities.push({
      geonameId,
      name: fields[1],
      asciiName: fields[2],
      latitude,
      longitude,
      featureCode,
      countryCode,
      population,
      modificationDate: fields[18],
      continentId
    });
  });

  const sorted = cities.toSorted(
    (left, right) =>
      right.population - left.population ||
      left.geonameId - right.geonameId
  );
  const ranksById = new Map<number, Record<string, number>>();
  const scopeLists = new Map<string, GeoNamesCity[]>();

  for (const scopeId of scopeIds) {
    const ranked = sorted
      .filter(
        (city) => scopeId === "world" || city.continentId === scopeId
      )
      .slice(0, 1001);
    if (ranked.length < 1001) {
      throw new Error(
        `${scopeId}: ${cityFileName} enthält nur ${ranked.length} positive Stadtwerte; 1001 werden für Top 1000 plus Grenzprüfung benötigt.`
      );
    }
    scopeLists.set(scopeId, ranked);
    ranked.slice(0, 1000).forEach((city, index) => {
      const ranks = ranksById.get(city.geonameId) ?? {};
      ranks[scopeId] = index + 1;
      ranksById.set(city.geonameId, ranks);
    });
  }

  const selectedIds = new Set(ranksById.keys());
  const alternateNamesById = new Map<number, GermanAlternateName[]>();

  await forEachZipLine(alternateNamesZipPath, (line) => {
    const fields = line.split("\t");
    const geonameId = Number(fields[1]);
    if (
      fields[2] !== "de" ||
      !selectedIds.has(geonameId) ||
      !fields[3] ||
      fields[6] === "1" ||
      fields[7] === "1" ||
      Boolean(fields[9])
    ) {
      return;
    }
    const entries = alternateNamesById.get(geonameId) ?? [];
    entries.push({
      id: Number(fields[0]),
      name: fields[3],
      preferred: fields[4] === "1",
      short: fields[5] === "1"
    });
    alternateNamesById.set(geonameId, entries);
  });

  const selectedCities = sorted.filter((city) =>
    selectedIds.has(city.geonameId)
  );
  const entities: ContentEntity[] = [];
  const names: LocalizedName[] = [];
  const relations: EntityRelation[] = [];
  const facts: EntityFact[] = [];
  let germanPreferredNameCount = 0;
  let germanAliasCount = 0;

  for (const city of selectedCities) {
    const id = `geonames:${city.geonameId}`;
    const sourceNames = (alternateNamesById.get(city.geonameId) ?? [])
      .toSorted(
        (left, right) =>
          Number(right.preferred) - Number(left.preferred) ||
          Number(right.short) - Number(left.short) ||
          left.id - right.id
      );
    const preferredGerman = sourceNames[0]?.name;
    if (preferredGerman) germanPreferredNameCount += 1;
    const preferred = preferredGerman ?? city.name;
    const aliases = uniqueNames([
      ...sourceNames.map((entry) => entry.name),
      city.name,
      city.asciiName
    ])
      .filter(
        (candidate) =>
          candidate.toLocaleLowerCase("de") !==
          preferred.toLocaleLowerCase("de")
      )
      .slice(0, 16);
    germanAliasCount += aliases.length;
    const ranks = ranksById.get(city.geonameId);
    if (!ranks) throw new Error(`${id}: Scope-Ränge fehlen.`);

    entities.push({
      id,
      type: "ranked_city",
      canonicalNameId: `name:geonames-${city.geonameId}:de:preferred`,
      centroid: [
        Number(city.longitude.toFixed(6)),
        Number(city.latitude.toFixed(6))
      ],
      rankByScope: ranks,
      promptQualifier: city.countryCode,
      difficulty: difficultyForRank(ranks),
      active: true,
      sourceRefs: ["geonames-cities1000", "geonames-alternate-names-v2"]
    });
    names.push({
      id: `name:geonames-${city.geonameId}:de:preferred`,
      entityId: id,
      locale: "de",
      name: preferred,
      kind: "preferred",
      answerPolicy: "display_and_accept"
    });
    aliases.forEach((alias, index) => {
      names.push({
        id: `name:geonames-${city.geonameId}:de:alias-${index + 1}`,
        entityId: id,
        locale: "de",
        name: alias,
        kind: "alias",
        answerPolicy: "accept_only"
      });
    });
    relations.push({
      id: `relation:geonames-${city.geonameId}:located-in:${city.continentId.replace(
        ":",
        "-"
      )}`,
      sourceId: id,
      relationType: "located_in",
      targetId: city.continentId,
      qualifiers: {
        countryCode: city.countryCode,
        featureCode: city.featureCode
      },
      sourceRefs: ["geonames-cities1000", "geonames-country-info"]
    });
    facts.push({
      id: `fact:geonames-${city.geonameId}:population`,
      entityId: id,
      factTypeId: "fact-type:geonames-population",
      value: city.population,
      asOf: snapshotDate,
      method:
        `GeoNames population-Feld im Snapshot ${snapshotDate}; ` +
        `Quelldatensatz zuletzt geändert ${city.modificationDate}`,
      sourceRefs: ["geonames-cities1000"]
    });
  }

  const sources = await Promise.all([
    sourceMetadata("geonames-cities1000", cityZipPath),
    sourceMetadata("geonames-alternate-names-v2", alternateNamesZipPath),
    sourceMetadata("geonames-country-info", countryInfoPath)
  ]);
  const boundaryTies = scopeIds.flatMap((scopeId) => {
    const list = scopeLists.get(scopeId);
    if (!list) return [];
    return supportedSetSizes.flatMap((setSize) => {
      const included = list[setSize - 1];
      const excluded = list[setSize];
      return included.population === excluded.population
        ? [
            {
              scopeId,
              setSize,
              population: included.population,
              includedId: `geonames:${included.geonameId}`,
              excludedId: `geonames:${excluded.geonameId}`
            }
          ]
        : [];
    });
  });
  const fixture = JSON.parse(await readFile(fixturePath, "utf8")) as {
    version: string;
    builtAt: string;
  };
  const pack: RankedCityContentPack = {
    schemaVersion: 1,
    datasetVersion: fixture.version,
    builtAt: fixture.builtAt,
    ranking: {
      methodId: "geonames-population-desc-id-asc-v1",
      labelDe: "GeoNames-Bevölkerungsfeld, absteigend",
      snapshotDate,
      tieBreakDe: "Bei Gleichstand: numerische GeoNames-ID, aufsteigend",
      supportedSetSizes: [...supportedSetSizes]
    },
    sources,
    entities: entities.toSorted((left, right) => left.id.localeCompare(right.id)),
    names: names.toSorted((left, right) => left.id.localeCompare(right.id)),
    relations: relations.toSorted((left, right) =>
      left.id.localeCompare(right.id)
    ),
    factDefinitions: [
      {
        id: "fact-type:geonames-population",
        labelDe: "GeoNames-Bevölkerungsfeld",
        descriptionDe:
          "Gazetteer-Wert des gepinnten GeoNames-Snapshots; keine einheitlich abgegrenzte Metropolregionsstatistik.",
        valueType: "number",
        unit: "Menschen",
        comparisonPolicy: "same_source_method_and_date"
      }
    ],
    facts: facts.toSorted((left, right) => left.id.localeCompare(right.id)),
    quality: {
      entityCount: entities.length,
      germanPreferredNameCount,
      germanAliasCount,
      scopeCounts: Object.fromEntries(scopeIds.map((scopeId) => [scopeId, 1000])),
      boundaryTies
    }
  };

  parseRankedCityContentPack(pack);
  await writeFile(outputPath, stableJson(pack), "utf8");
  process.stdout.write(
    `Ranked Cities ${snapshotDate}: ${pack.entities.length} Entitäten, ` +
      `${germanPreferredNameCount} deutsche Anzeigenamen, ` +
      `${boundaryTies.length} Grenzgleichstände\n`
  );
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
