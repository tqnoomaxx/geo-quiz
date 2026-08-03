import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import countries, { type Country } from "world-countries";

type Coordinates = readonly [longitude: number, latitude: number];

type WikidataBinding = {
  iso2: { value: string };
  countryLabel?: { value: string };
  countryCoord?: { value: string };
  capital?: { value: string };
  capitalLabel?: { value: string };
  capitalCoord?: { value: string };
};

type CapitalSnapshot = {
  id: string;
  wikidataId: string;
  nameDe: string;
  aliasesDe: string[];
  centroid: Coordinates;
  difficulty: number;
  role: string;
  sourceRefs: string[];
};

type CountrySnapshot = {
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
  capitals: CapitalSnapshot[];
};

const projectRoot = resolve(import.meta.dirname, "..");
const outputPath = resolve(projectRoot, "content-src/geo-core-mvp.v1.json");
const snapshotDate = new Date().toISOString().slice(0, 10);
const mvpCountries = countries
  .filter((country) => country.unMember || country.cca2 === "PS")
  .toSorted((left, right) => left.cca2.localeCompare(right.cca2));

const CONTINENT_OVERRIDES: Record<string, string[]> = {
  AM: ["continent:europe", "continent:asia"],
  AZ: ["continent:europe", "continent:asia"],
  CY: ["continent:europe", "continent:asia"],
  EG: ["continent:africa", "continent:asia"],
  GE: ["continent:europe", "continent:asia"],
  KZ: ["continent:europe", "continent:asia"],
  RU: ["continent:europe", "continent:asia"],
  TR: ["continent:europe", "continent:asia"]
};

const CAPITAL_ROLES: Record<string, Record<string, string>> = {
  BO: {
    Q1491: "seat_of_government",
    Q2907: "constitutional_capital"
  },
  LK: {
    Q35381: "executive_and_judicial_seat",
    Q41963: "legislative_capital"
  },
  PS: {
    Q158119: "administrative_center",
    Q212938: "claimed_capital"
  },
  SZ: {
    Q101418: "royal_and_legislative_capital",
    Q3904: "administrative_capital"
  },
  YE: {
    Q2471: "constitutional_capital",
    Q131694: "provisional_seat"
  },
  ZA: {
    Q37701: "judicial_capital",
    Q3926: "executive_capital",
    Q5465: "legislative_capital"
  }
};

const CAPITAL_ALIASES: Record<string, string[]> = {
  Q1491: ["La Paz"],
  Q2907: ["Sucre"],
  Q35381: ["Colombo"],
  Q41963: ["Sri Jayewardenepura Kotte"],
  Q101418: ["Lobamba"],
  Q3904: ["Mbabane"],
  Q158119: ["Ramallah"],
  Q212938: ["East Jerusalem"],
  Q2471: ["Sana'a", "Sanaa"],
  Q131694: ["Aden"],
  Q37701: ["Bloemfontein"],
  Q3926: ["Pretoria"],
  Q5465: ["Cape Town"]
};

function parsePoint(value: string | undefined): Coordinates | undefined {
  const match = /^Point\((-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)\)$/.exec(
    value ?? ""
  );

  return match ? [Number(match[1]), Number(match[2])] : undefined;
}

function wikidataId(value: string | undefined) {
  return value?.split("/").at(-1);
}

function asciiAlias(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function uniqueAliases(preferred: string, aliases: readonly string[]) {
  const unique = new Map<string, string>();

  for (const alias of aliases) {
    const trimmed = alias.trim();

    if (!trimmed || trimmed.toLocaleLowerCase("de") === preferred.toLocaleLowerCase("de")) {
      continue;
    }

    unique.set(trimmed.toLocaleLowerCase("de"), trimmed);
    const ascii = asciiAlias(trimmed);

    if (
      ascii !== trimmed &&
      ascii.toLocaleLowerCase("de") !== preferred.toLocaleLowerCase("de")
    ) {
      unique.set(ascii.toLocaleLowerCase("de"), ascii);
    }
  }

  const preferredAscii = asciiAlias(preferred);
  if (preferredAscii !== preferred) {
    unique.set(preferredAscii.toLocaleLowerCase("de"), preferredAscii);
  }

  return [...unique.values()].toSorted((left, right) =>
    left.localeCompare(right, "de")
  );
}

function difficultyForArea(area: number) {
  if (area >= 1_000_000) return 1;
  if (area >= 250_000) return 2;
  if (area >= 50_000) return 3;
  if (area >= 5_000) return 4;
  return 5;
}

function continentIds(country: Country) {
  const overridden = CONTINENT_OVERRIDES[country.cca2];

  if (overridden) {
    return overridden;
  }

  if (country.region === "Africa") return ["continent:africa"];
  if (country.region === "Asia") return ["continent:asia"];
  if (country.region === "Europe") return ["continent:europe"];
  if (country.region === "Oceania") return ["continent:oceania"];
  if (country.subregion === "South America") {
    return ["continent:south-america"];
  }
  if (country.region === "Americas") {
    return ["continent:north-america"];
  }

  throw new Error(`${country.cca2}: Region ${country.region} ist nicht zugeordnet.`);
}

function sparqlQuery() {
  const values = mvpCountries
    .map((country) => `"${country.cca2}"`)
    .join(" ");

  return `
SELECT ?iso2 ?countryLabel ?countryCoord ?capital ?capitalLabel ?capitalCoord WHERE {
  VALUES ?iso2 { ${values} }
  ?country wdt:P297 ?iso2.
  OPTIONAL { ?country wdt:P625 ?countryCoord. }
  OPTIONAL {
    ?country wdt:P36 ?capital.
    OPTIONAL { ?capital wdt:P625 ?capitalCoord. }
  }
  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "de,en".
  }
}
ORDER BY ?iso2 ?capitalLabel ?capitalCoord
`;
}

async function loadWikidataBindings() {
  const response = await fetch("https://query.wikidata.org/sparql", {
    method: "POST",
    headers: {
      accept: "application/sparql-results+json",
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
      "user-agent": "GeoApp content snapshot builder"
    },
    body: new URLSearchParams({ query: sparqlQuery() })
  });

  if (!response.ok) {
    throw new Error(
      `Wikidata-Abfrage fehlgeschlagen: ${response.status} ${response.statusText}`
    );
  }

  const payload = (await response.json()) as {
    results?: { bindings?: WikidataBinding[] };
  };
  const bindings = payload.results?.bindings;

  if (!bindings) {
    throw new Error("Wikidata-Antwort enthält keine Bindings.");
  }

  return bindings;
}

function groupBindings(bindings: WikidataBinding[]) {
  const byCountry = new Map<string, WikidataBinding[]>();

  for (const binding of bindings) {
    const current = byCountry.get(binding.iso2.value) ?? [];
    current.push(binding);
    byCountry.set(binding.iso2.value, current);
  }

  return byCountry;
}

function capitalsForCountry(country: Country, bindings: WikidataBinding[]) {
  const byEntity = new Map<string, WikidataBinding>();

  for (const binding of bindings) {
    const id = wikidataId(binding.capital?.value);
    const coordinates = parsePoint(binding.capitalCoord?.value);

    if (id && coordinates && !byEntity.has(id)) {
      byEntity.set(id, binding);
    }
  }

  if (byEntity.size === 0) {
    throw new Error(`${country.cca2}: keine Hauptstadt mit Koordinaten.`);
  }

  return [...byEntity.entries()]
    .map(([id, binding]) => {
      const fallbackName =
        byEntity.size === 1 && country.capital.length === 1
          ? country.capital[0]
          : id;
      const rawLabel = binding.capitalLabel?.value;
      const nameDe =
        rawLabel && rawLabel !== id && !/^Q\d+$/.test(rawLabel)
          ? rawLabel
          : fallbackName;
      const packageAliases =
        byEntity.size === 1 ? country.capital : (CAPITAL_ALIASES[id] ?? []);
      const role = CAPITAL_ROLES[country.cca2]?.[id] ?? "official_capital";

      return {
        id: `city:wd-${id.toLocaleLowerCase("en")}`,
        wikidataId: id,
        nameDe,
        aliasesDe: uniqueAliases(nameDe, [
          ...packageAliases,
          ...(CAPITAL_ALIASES[id] ?? [])
        ]),
        centroid: parsePoint(binding.capitalCoord?.value)!,
        difficulty: difficultyForArea(country.area),
        role,
        sourceRefs: ["wikidata-capital-snapshot"]
      } satisfies CapitalSnapshot;
    })
    .toSorted((left, right) => left.id.localeCompare(right.id));
}

const bindingsByCountry = groupBindings(await loadWikidataBindings());
const countrySnapshots: CountrySnapshot[] = mvpCountries.map((country) => {
  const bindings = bindingsByCountry.get(country.cca2);

  if (!bindings) {
    throw new Error(`${country.cca2}: kein Wikidata-Länderdatensatz.`);
  }

  const german = country.translations.deu;
  const wikidataLabel = bindings.find(
    (binding) =>
      binding.countryLabel?.value &&
      !/^Q\d+$/.test(binding.countryLabel.value)
  )?.countryLabel?.value;
  const preferredName =
    wikidataLabel ?? german?.common ?? country.name.common;
  const difficulty = difficultyForArea(country.area);

  return {
    id: `country:${country.cca2.toLocaleLowerCase("en")}`,
    iso2: country.cca2,
    iso3: country.cca3,
    numericCode: country.ccn3,
    nameDe: preferredName,
    aliasesDe: uniqueAliases(preferredName, [
      german?.official ?? "",
      german?.common ?? "",
      country.name.common,
      country.name.official,
      ...country.altSpellings
    ]),
    centroid: [country.latlng[1], country.latlng[0]],
    mapFeatureId: country.ccn3,
    mapMarker: country.area < 5_000,
    difficulty,
    continentIds: continentIds(country),
    capitals: capitalsForCountry(country, bindings)
  };
});

if (countrySnapshots.length !== 195) {
  throw new Error(
    `MVP-Set muss 195 Länder enthalten, enthält aber ${countrySnapshots.length}.`
  );
}

const snapshot = {
  datasetId: "geo-core-mvp",
  version: `${snapshotDate}.phase7-ranked-physical1`,
  schemaVersion: 4,
  builtAt: new Date().toISOString(),
  localeCoverage: ["de"],
  scopePolicy: {
    id: "un-193-plus-observers-v1",
    labelDe: "195 Staaten: 193 UN-Mitglieder plus Palästina und Vatikanstadt"
  },
  sources: [
    {
      id: "world-countries",
      sourceVersion: "5.1.0",
      retrievedAt: snapshotDate,
      url: "https://github.com/mledoze/countries",
      license: "ODbL-1.0"
    },
    {
      id: "wikidata-capital-snapshot",
      sourceVersion: snapshotDate,
      retrievedAt: snapshotDate,
      url: "https://query.wikidata.org/",
      license: "CC0-1.0"
    }
  ],
  countries: countrySnapshots
};

await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
process.stdout.write(
  `Snapshot ${snapshot.version}: ${countrySnapshots.length} Länder, ${countrySnapshots.reduce(
    (sum, country) => sum + country.capitals.length,
    0
  )} Hauptstadtsitze\n`
);
