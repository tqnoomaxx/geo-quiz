import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  parseRankedPhysicalContentPack,
  type ContentEntity,
  type EntityFact,
  type LocalizedName,
  type RankedPhysicalContentPack,
  type RankedPhysicalSource
} from "../src/content/schema";

type PageSnapshot = {
  title: string;
  revisionId: number;
  html: string;
};

type WikiPageInfo = {
  wikidataId?: string;
  germanTitle?: string;
};

type ParsedRow = {
  cells: string[];
  rank: number;
};

const projectRoot = resolve(import.meta.dirname, "..");
const fixturePath = resolve(projectRoot, "content-src/geo-core-mvp.v1.json");
const outputPath = resolve(
  projectRoot,
  "content-src/ranked-physical.v1.json"
);
const mediaWikiApi = "https://en.wikipedia.org/w/api.php";
const snapshotDate = new Date().toISOString().slice(0, 10);

const pages = {
  rivers: "List of river systems by length",
  peaks: "List of highest mountains on Earth"
} as const;

async function fetchWikipedia(url: URL) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        "Api-User-Agent": "GeoApp educational content refresh/1.0"
      }
    });
    if (response.status !== 429 && response.status !== 503) return response;
    const retryAfter = Number(response.headers.get("retry-after"));
    const waitMs = Number.isFinite(retryAfter)
      ? Math.min(retryAfter * 1000, 10_000)
      : Math.min(1000 * 2 ** attempt, 10_000);
    await new Promise((resolveWait) => setTimeout(resolveWait, waitMs));
  }
  throw new Error("Wikipedia-Abfrage bleibt nach fünf Versuchen gedrosselt.");
}

const stableIdOverrides: Record<string, string> = {
  "Ob – Irtysh": "ranked-river:ob-irtysh",
  "Upper Ob – Katun": "ranked-river:upper-ob-katun",
  "Murray – Darling – Culgoa – Balonne – Condamine":
    "ranked-river:murray-darling-system",
  "Upper Murray": "ranked-river:upper-murray",
  "Jubba – Shebelle": "ranked-river:jubba-shebelle",
  "Upper Jubba - Ganale Dorya": "ranked-river:upper-jubba-ganale-dorya",
  "Dhaulagiri I": "ranked-peak:dhaulagiri-i",
  "Dhaulagiri II": "ranked-peak:dhaulagiri-ii",
  "Saser Kangri I K22": "ranked-peak:saser-kangri-i",
  "Saser Kangri II E": "ranked-peak:saser-kangri-ii-east",
  "Saser Kangri III": "ranked-peak:saser-kangri-iii",
  "Teram Kangri I": "ranked-peak:teram-kangri-i",
  "Teram Kangri III": "ranked-peak:teram-kangri-iii",
  "Rimo I": "ranked-peak:rimo-i",
  "Rimo III": "ranked-peak:rimo-iii"
};

const standaloneValueOverrides: Record<string, string> = {
  Amazon: "Amazonas",
  "Amazon (Begriffsklärung)": "Amazonas",
  "Atlantic Ocean (Marajó Bay), Amazon Delta":
    "Atlantischer Ozean (Marajó-Bucht), Amazonasdelta",
  "Lower Murray River": "Unterer Murray River",
  "Mississippi River": "Mississippi",
  "Missouri River": "Missouri"
};

function stableJson(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function decodeHtml(value: string) {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
    ndash: "–",
    mdash: "—",
    minus: "−",
    deg: "°",
    prime: "′",
    Prime: "″"
  };
  return value
    .replace(/&#x([0-9a-f]+);/giu, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16))
    )
    .replace(/&#(\d+);/gu, (_, code: string) =>
      String.fromCodePoint(Number(code))
    )
    .replace(/&([a-zA-Z]+);/gu, (match, name: string) =>
      namedEntities[name] ?? match
    );
}

function stripHtml(value: string) {
  return decodeHtml(
    value
      .replace(/<sup[\s\S]*?<\/sup>/giu, "")
      .replace(/<style[\s\S]*?<\/style>/giu, "")
      .replace(/<br\s*\/?>/giu, " · ")
      .replace(/<[^>]+>/gu, " ")
  )
    .replace(/\s+/gu, " ")
    .replace(/\s+([,.;])/gu, "$1")
    .trim();
}

function cleanGermanTitle(value: string) {
  return value.replace(/ \((?:Fluss|Berg|Gebirge|See)\)$/u, "").trim();
}

function articleLinks(cell: string) {
  return [...cell.matchAll(
    /<a\s[^>]*href="\/wiki\/([^"#?]+)"[^>]*>([\s\S]*?)<\/a>/giu
  )]
    .map((match) => ({
      title: decodeURIComponent(match[1]).replaceAll("_", " "),
      label: stripHtml(match[2])
    }))
    .filter(
      ({ title }) =>
        !title.includes(":") &&
        title !== "Geographic coordinate system"
    );
}

function translateCell(
  cell: string,
  infoByTitle: ReadonlyMap<string, WikiPageInfo>
) {
  const withoutReferences = cell.replace(/<sup[\s\S]*?<\/sup>/giu, "");
  const translated = withoutReferences.replace(
    /<a\s[^>]*href="\/wiki\/([^"#?]+)"[^>]*>([\s\S]*?)<\/a>/giu,
    (full, encodedTitle: string, labelHtml: string) => {
      const title = decodeURIComponent(encodedTitle).replaceAll("_", " ");
      if (title.includes(":")) return "";
      const fallback = stripHtml(labelHtml);
      const german = infoByTitle.get(title)?.germanTitle;
      return german ? cleanGermanTitle(german) : fallback;
    }
  );
  return stripHtml(translated)
    .replace(/\s*·\s*/gu, " · ")
    .replace(/\s*–\s*/gu, "–")
    .trim();
}

function translateCountryCell(
  cell: string,
  infoByTitle: ReadonlyMap<string, WikiPageInfo>,
  countryNameByAlias: ReadonlyMap<string, string>
) {
  const links = articleLinks(cell);
  if (links.length > 0) {
    const names = links.map(({ title, label }) => {
      const germanTitle = infoByTitle.get(title)?.germanTitle;
      const candidate = germanTitle ? cleanGermanTitle(germanTitle) : label;
      return (
        countryNameByAlias.get(candidate.toLocaleLowerCase("de")) ?? candidate
      );
    });
    return [...new Set(names)].join(", ");
  }

  let translated = stripHtml(cell).replace(/\s+and\s+/giu, ", ");
  const replacements = [...countryNameByAlias.entries()]
    .filter(([alias]) => alias.length >= 4)
    .toSorted(([left], [right]) => right.length - left.length);
  for (const [alias, germanName] of replacements) {
    const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    translated = translated.replace(
      new RegExp(`(?<!\\p{L})${escapedAlias}(?!\\p{L})`, "giu"),
      germanName
    );
  }
  return translated;
}

function translateStandaloneValue(
  cell: string,
  infoByTitle: ReadonlyMap<string, WikiPageInfo>
) {
  const rawValue = stripHtml(cell);
  const override = standaloneValueOverrides[rawValue];
  if (override) return override;
  const translated = translateCell(cell, infoByTitle);
  const translatedOverride = standaloneValueOverrides[translated];
  if (translatedOverride) return translatedOverride;
  if (articleLinks(cell).length > 0) return translated;
  const germanTitle = infoByTitle.get(rawValue)?.germanTitle;
  return germanTitle ? cleanGermanTitle(germanTitle) : translated;
}

async function fetchPage(title: string): Promise<PageSnapshot> {
  const url = new URL(mediaWikiApi);
  url.search = new URLSearchParams({
    action: "parse",
    page: title,
    prop: "text|revid",
    format: "json",
    origin: "*"
  }).toString();
  const response = await fetchWikipedia(url);
  if (!response.ok) {
    throw new Error(`${title}: Wikipedia antwortet mit ${response.status}.`);
  }
  const payload = (await response.json()) as {
    parse?: { title?: string; revid?: number; text?: { "*"?: string } };
  };
  const revisionId = payload.parse?.revid;
  const html = payload.parse?.text?.["*"];
  if (!Number.isInteger(revisionId) || !html) {
    throw new Error(`${title}: Revision oder HTML fehlt.`);
  }
  return {
    title: payload.parse?.title ?? title,
    revisionId: Number(revisionId),
    html
  };
}

function wikitableHtml(snapshot: PageSnapshot, index: number) {
  const tables = [...snapshot.html.matchAll(
    /<table[^>]*class="[^"]*wikitable[^"]*"[^>]*>[\s\S]*?<\/table>/giu
  )].map((match) => match[0]);
  const table = tables[index];
  if (!table) {
    throw new Error(
      `${snapshot.title}: erwartete Wikitable ${index + 1} fehlt.`
    );
  }
  return table;
}

function parseRows(table: string) {
  return [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/giu)]
    .slice(1)
    .map((row) =>
      [...row[1].matchAll(
        /<(?:th|td)[^>]*>([\s\S]*?)<\/(?:th|td)>/giu
      )].map((cell) => cell[1])
    )
    .filter((cells) => cells.length >= 8)
    .flatMap((cells): ParsedRow[] => {
      const rankText = stripHtml(cells[0]);
      if (!/^\d+\.?$/u.test(rankText)) return [];
      return [{ cells, rank: Number.parseInt(rankText, 10) }];
    });
}

function firstInteger(value: string, field: string) {
  const match = stripHtml(value).match(/\d[\d,.]*/u);
  if (!match) throw new Error(`${field}: numerischer Wert fehlt.`);
  const parsed = Number(match[0].replaceAll(",", ""));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${field}: ${match[0]} ist ungültig.`);
  }
  return Math.round(parsed);
}

function peakCoordinates(cell: string): [number, number] {
  const text = stripHtml(cell);
  const match = text.match(
    /(\d+(?:\.\d+)?)°([NS])\s+(\d+(?:\.\d+)?)°([EW])/u
  );
  if (!match) throw new Error(`Bergkoordinaten fehlen: ${text}`);
  const latitude = Number(match[1]) * (match[2] === "S" ? -1 : 1);
  const longitude = Number(match[3]) * (match[4] === "W" ? -1 : 1);
  return [
    Number(longitude.toFixed(6)),
    Number(latitude.toFixed(6))
  ];
}

async function fetchPageInfo(titles: readonly string[]) {
  const infoByTitle = new Map<string, WikiPageInfo>();
  const uniqueTitles = [...new Set(titles)].toSorted((a, b) =>
    a.localeCompare(b, "en")
  );

  for (let start = 0; start < uniqueTitles.length; start += 50) {
    const requestedTitles = uniqueTitles.slice(start, start + 50);
    const url = new URL(mediaWikiApi);
    url.search = new URLSearchParams({
      action: "query",
      prop: "pageprops|langlinks",
      ppprop: "wikibase_item",
      lllang: "de",
      lllimit: "max",
      redirects: "1",
      titles: requestedTitles.join("|"),
      format: "json",
      origin: "*"
    }).toString();
    const response = await fetchWikipedia(url);
    if (!response.ok) {
      throw new Error(`Wikipedia-Namensabfrage antwortet mit ${response.status}.`);
    }
    const payload = (await response.json()) as {
      query?: {
        normalized?: Array<{ from: string; to: string }>;
        redirects?: Array<{ from: string; to: string }>;
        pages?: Record<
          string,
          {
            title?: string;
            pageprops?: { wikibase_item?: string };
            langlinks?: Array<{ "*"?: string }>;
          }
        >;
      };
    };
    const aliases = new Map<string, string>();
    for (const entry of [
      ...(payload.query?.normalized ?? []),
      ...(payload.query?.redirects ?? [])
    ]) {
      aliases.set(entry.from, entry.to);
    }
    const pagesByTitle = new Map(
      Object.values(payload.query?.pages ?? {}).flatMap((page) =>
        page.title ? [[page.title, page] as const] : []
      )
    );
    const resolveTitle = (title: string) => {
      const seen = new Set<string>();
      let resolved = title;
      while (aliases.has(resolved) && !seen.has(resolved)) {
        seen.add(resolved);
        resolved = aliases.get(resolved) ?? resolved;
      }
      return resolved;
    };
    for (const requestedTitle of requestedTitles) {
      const page = pagesByTitle.get(resolveTitle(requestedTitle));
      infoByTitle.set(requestedTitle, {
        wikidataId: page?.pageprops?.wikibase_item,
        germanTitle: page?.langlinks?.[0]?.["*"]
      });
    }
  }

  return infoByTitle;
}

function preferredName(
  entityId: string,
  value: string,
  suffix: string
): LocalizedName {
  return {
    id: `name:${suffix}:de:preferred`,
    entityId,
    locale: "de",
    name: value,
    kind: "preferred",
    answerPolicy: "display_and_accept"
  };
}

function uniqueAliases(preferred: string, values: string[]) {
  const preferredKey = preferred.toLocaleLowerCase("de");
  const seen = new Set<string>([preferredKey]);
  return values.flatMap((value) => {
    const trimmed = value.trim();
    const key = trimmed.toLocaleLowerCase("de");
    if (!trimmed || seen.has(key)) return [];
    seen.add(key);
    return [trimmed];
  });
}

function entityIdForRow(
  kind: "river" | "peak",
  englishName: string,
  primaryTitle: string,
  pageInfo: WikiPageInfo,
  primaryUseCount: ReadonlyMap<string, number>
) {
  if ((primaryUseCount.get(primaryTitle) ?? 0) > 1) {
    const override = stableIdOverrides[englishName];
    if (!override) {
      throw new Error(
        `${kind} ${englishName}: mehrdeutiger Wikipedia-Artikel benötigt eine redaktionelle stabile ID.`
      );
    }
    return override;
  }
  if (!pageInfo.wikidataId) {
    const override = stableIdOverrides[englishName];
    if (override) return override;
    throw new Error(`${kind} ${englishName}: Wikidata-ID fehlt.`);
  }
  return `ranked-${kind}:wd-${pageInfo.wikidataId.toLocaleLowerCase("en")}`;
}

function difficultyForRank(rank: number) {
  if (rank <= 25) return 1;
  if (rank <= 50) return 2;
  if (rank <= 75) return 3;
  return 4;
}

function sourceFromSnapshot(
  id: string,
  snapshot: PageSnapshot
): RankedPhysicalSource {
  return {
    id,
    sourceVersion: `revision-${snapshot.revisionId}`,
    retrievedAt: snapshotDate,
    url: `https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(
      snapshot.title.replaceAll(" ", "_")
    )}&oldid=${snapshot.revisionId}`,
    license: "CC BY-SA 4.0",
    pageTitle: snapshot.title,
    revisionId: snapshot.revisionId,
    sha256: sha256(snapshot.html),
    bytes: Buffer.byteLength(snapshot.html)
  };
}

function createFacts(
  entityId: string,
  sourceId: string,
  method: string,
  values: Array<[string, number | string]>
): EntityFact[] {
  const suffix = entityId.replaceAll(":", "-");
  return values.map(([factTypeId, value]) => ({
    id: `fact:${suffix}:${factTypeId.replace("fact-type:", "")}`,
    entityId,
    factTypeId,
    value,
    asOf: snapshotDate,
    method,
    sourceRefs: [sourceId]
  }));
}

const fixture = JSON.parse(await readFile(fixturePath, "utf8")) as {
  version: string;
  countries: Array<{
    iso2: string;
    iso3: string;
    nameDe: string;
    aliasesDe: string[];
  }>;
};
const [riverSnapshot, peakSnapshot] = await Promise.all([
  fetchPage(pages.rivers),
  fetchPage(pages.peaks)
]);
const allRiverRows = parseRows(wikitableHtml(riverSnapshot, 1));
const allPeakRows = parseRows(wikitableHtml(peakSnapshot, 0));
const riverRows = allRiverRows.filter((row) => row.rank <= 100);
const peakRows = allPeakRows.filter((row) => row.rank <= 100);
const excludedRiver = allRiverRows.find((row) => row.rank > 100);
const excludedPeak = allPeakRows.find((row) => row.rank > 100);
if (
  riverRows.length !== 100 ||
  peakRows.length !== 100 ||
  !excludedRiver ||
  !excludedPeak
) {
  throw new Error(
    `Top-100-Grenze ungültig: Flüsse ${riverRows.length}, Berge ${peakRows.length}.`
  );
}

const linkedTitles = [
  ...riverRows.flatMap((row) =>
    [
      articleLinks(row.cells[1])[0]?.title,
      ...articleLinks(row.cells[6]).map((link) => link.title),
      ...articleLinks(row.cells[7]).map((link) => link.title)
    ].filter((title): title is string => Boolean(title))
  ),
  ...peakRows.flatMap((row) =>
    [
      articleLinks(row.cells[1])[0]?.title,
      ...articleLinks(row.cells[8]).map((link) => link.title)
    ].filter((title): title is string => Boolean(title))
  ),
  ...riverRows.map((row) => stripHtml(row.cells[6]))
];
const infoByTitle = await fetchPageInfo(linkedTitles);
const countryNameByAlias = new Map<string, string>();
for (const country of fixture.countries) {
  for (const alias of [
    country.nameDe,
    country.iso2,
    country.iso3,
    ...country.aliasesDe
  ]) {
    countryNameByAlias.set(alias.toLocaleLowerCase("de"), country.nameDe);
  }
}
const primaryTitles = [
  ...riverRows.map((row) => articleLinks(row.cells[1])[0]?.title),
  ...peakRows.map((row) => articleLinks(row.cells[1])[0]?.title)
].filter((title): title is string => Boolean(title));
const primaryUseCount = new Map<string, number>();
for (const title of primaryTitles) {
  primaryUseCount.set(title, (primaryUseCount.get(title) ?? 0) + 1);
}

const entities: ContentEntity[] = [];
const names: LocalizedName[] = [];
const facts: EntityFact[] = [];
let aliasCount = 0;

for (const row of riverRows) {
  const nameLinks = articleLinks(row.cells[1]);
  const primary = nameLinks[0];
  if (!primary) throw new Error(`Fluss Rang ${row.rank}: Artikel fehlt.`);
  const englishName = stripHtml(row.cells[1]);
  const primaryInfo = infoByTitle.get(primary.title) ?? {};
  const translatedSystemName = englishName;
  const primaryGerman = primaryInfo.germanTitle
    ? cleanGermanTitle(primaryInfo.germanTitle)
    : primary.label;
  const preferred =
    (primaryUseCount.get(primary.title) ?? 0) > 1
      ? translatedSystemName
      : primaryGerman;
  const entityId = entityIdForRow(
    "river",
    englishName,
    primary.title,
    primaryInfo,
    primaryUseCount
  );
  const suffix = entityId.replaceAll(":", "-");
  const aliases = uniqueAliases(preferred, [
    translatedSystemName,
    primaryGerman,
    primary.label,
    englishName
  ]);
  aliasCount += aliases.length;
  const lengthKm = firstInteger(row.cells[2], `${englishName} Länge`);
  const outflow = translateStandaloneValue(row.cells[6], infoByTitle);
  const countries = translateCountryCell(
    row.cells[7],
    infoByTitle,
    countryNameByAlias
  );
  if (!preferred || !outflow || !countries) {
    throw new Error(`${englishName}: deutsches Faktenprofil unvollständig.`);
  }

  entities.push({
    id: entityId,
    type: "ranked_river",
    canonicalNameId: `name:${suffix}:de:preferred`,
    rankByScope: { world: row.rank },
    promptQualifier: `Rang ${row.rank}`,
    difficulty: difficultyForRank(row.rank),
    active: true,
    sourceRefs: ["wikipedia-river-systems"]
  });
  names.push(preferredName(entityId, preferred, suffix));
  aliases.forEach((alias, index) => {
    names.push({
      id: `name:${suffix}:de:alias-${index + 1}`,
      entityId,
      locale: "de",
      name: alias,
      kind: "alias",
      answerPolicy: "accept_only"
    });
  });
  facts.push(
    ...createFacts(
      entityId,
      "wikipedia-river-systems",
      `Wikipedia-Flusssystemtabelle, Revision ${riverSnapshot.revisionId}; erster Kilometerwert der Tabellenzeile`,
      [
        ["fact-type:river-system-length-km", lengthKm],
        ["fact-type:river-drainage-countries", countries],
        ["fact-type:river-outflow", outflow]
      ]
    )
  );
}

for (const row of peakRows) {
  const nameLinks = articleLinks(row.cells[1]);
  const primary = nameLinks[0];
  if (!primary) throw new Error(`Berg Rang ${row.rank}: Artikel fehlt.`);
  const englishName = stripHtml(row.cells[1]);
  const primaryInfo = infoByTitle.get(primary.title) ?? {};
  const germanTitle = primaryInfo.germanTitle
    ? cleanGermanTitle(primaryInfo.germanTitle)
    : primary.label;
  const preferred =
    (primaryUseCount.get(primary.title) ?? 0) > 1
      ? primary.label
      : germanTitle;
  const entityId = entityIdForRow(
    "peak",
    englishName,
    primary.title,
    primaryInfo,
    primaryUseCount
  );
  const suffix = entityId.replaceAll(":", "-");
  const aliases = uniqueAliases(preferred, [germanTitle, englishName]);
  aliasCount += aliases.length;
  const elevationM = firstInteger(row.cells[2], `${englishName} Höhe`);
  const range = stripHtml(row.cells[4]);
  const countries = translateCountryCell(
    row.cells[8],
    infoByTitle,
    countryNameByAlias
  );
  if (!preferred || !range || !countries) {
    throw new Error(`${englishName}: deutsches Faktenprofil unvollständig.`);
  }

  entities.push({
    id: entityId,
    type: "ranked_peak",
    canonicalNameId: `name:${suffix}:de:preferred`,
    centroid: peakCoordinates(row.cells[5]),
    rankByScope: { world: row.rank },
    promptQualifier: `Rang ${row.rank}`,
    difficulty: difficultyForRank(row.rank),
    active: true,
    sourceRefs: ["wikipedia-highest-mountains"]
  });
  names.push(preferredName(entityId, preferred, suffix));
  aliases.forEach((alias, index) => {
    names.push({
      id: `name:${suffix}:de:alias-${index + 1}`,
      entityId,
      locale: "de",
      name: alias,
      kind: "alias",
      answerPolicy: "accept_only"
    });
  });
  facts.push(
    ...createFacts(
      entityId,
      "wikipedia-highest-mountains",
      `Wikipedia-Liste eigenständiger Gipfel, Revision ${peakSnapshot.revisionId}; gerundete Höhe über Meeresspiegel, Nebenzeilen S ausgeschlossen`,
      [
        ["fact-type:peak-elevation-m", elevationM],
        ["fact-type:peak-countries", countries],
        ["fact-type:peak-range", range]
      ]
    )
  );
}

const includedRiverValue = Math.min(
  ...riverRows.map((row) => firstInteger(row.cells[2], "Flussgrenze"))
);
const includedPeakValue = Math.min(
  ...peakRows.map((row) => firstInteger(row.cells[2], "Berggrenze"))
);
const pack: RankedPhysicalContentPack = {
  schemaVersion: 1,
  datasetVersion: fixture.version,
  builtAt: new Date().toISOString(),
  rankings: {
    rivers: {
      methodId: "wikipedia-river-system-length-km-v1",
      labelDe: "Flusssystemlänge in Kilometern, absteigend",
      definitionDe:
        "Top 100 der vollständigen Flusssysteme nach dem ersten Kilometerwert der fest versionierten Tabelle; Längen hängen von der gewählten Quelle-Mündung-Definition ab.",
      sourceId: "wikipedia-river-systems",
      count: 100,
      boundary: {
        includedRank: 100,
        includedValue: includedRiverValue,
        excludedRank: excludedRiver.rank,
        excludedValue: firstInteger(excludedRiver.cells[2], "Fluss Rang 101")
      }
    },
    peaks: {
      methodId: "wikipedia-independent-peak-elevation-m-v1",
      labelDe: "Gipfelhöhe über Meeresspiegel, absteigend",
      definitionDe:
        "Top 100 eigenständiger Gipfel der fest versionierten Liste nach gerundeter Höhe über Meeresspiegel; als Nebenzeile S markierte Untergipfel sind ausgeschlossen.",
      sourceId: "wikipedia-highest-mountains",
      count: 100,
      boundary: {
        includedRank: 100,
        includedValue: includedPeakValue,
        excludedRank: excludedPeak.rank,
        excludedValue: firstInteger(excludedPeak.cells[2], "Berg Rang 101")
      }
    }
  },
  sources: [
    sourceFromSnapshot("wikipedia-river-systems", riverSnapshot),
    sourceFromSnapshot("wikipedia-highest-mountains", peakSnapshot)
  ],
  entities: entities.toSorted((left, right) => left.id.localeCompare(right.id)),
  names: names.toSorted((left, right) => left.id.localeCompare(right.id)),
  relations: [],
  factDefinitions: [
    {
      id: "fact-type:river-system-length-km",
      labelDe: "Länge",
      descriptionDe:
        "Erster in der Ranglistentabelle genannter Kilometerwert für das vollständige Flusssystem.",
      valueType: "number",
      unit: "km",
      comparisonPolicy: "same_source_method_and_date"
    },
    {
      id: "fact-type:river-drainage-countries",
      labelDe: "Länder im Einzugsgebiet",
      descriptionDe:
        "In der Ranglistentabelle genannte Staaten des Einzugsgebiets.",
      valueType: "string",
      comparisonPolicy: "same_source_method_and_date"
    },
    {
      id: "fact-type:river-outflow",
      labelDe: "Mündung",
      descriptionDe: "In der Ranglistentabelle genanntes Abflussziel.",
      valueType: "string",
      comparisonPolicy: "same_source_method_and_date"
    },
    {
      id: "fact-type:peak-elevation-m",
      labelDe: "Höhe",
      descriptionDe: "Gerundete Gipfelhöhe über Meeresspiegel.",
      valueType: "number",
      unit: "m",
      comparisonPolicy: "same_source_method_and_date"
    },
    {
      id: "fact-type:peak-countries",
      labelDe: "Land/Region",
      descriptionDe:
        "In der Ranglistentabelle genannte staatliche Verwaltung oder Region.",
      valueType: "string",
      comparisonPolicy: "same_source_method_and_date"
    },
    {
      id: "fact-type:peak-range",
      labelDe: "Gebirge",
      descriptionDe: "In der Ranglistentabelle genanntes Gebirge.",
      valueType: "string",
      comparisonPolicy: "same_source_method_and_date"
    }
  ],
  facts: facts.toSorted((left, right) => left.id.localeCompare(right.id)),
  quality: {
    entityCounts: { ranked_river: 100, ranked_peak: 100 },
    germanPreferredNameCount: entities.length,
    germanAliasCount: aliasCount
  }
};

parseRankedPhysicalContentPack(pack);
await writeFile(outputPath, stableJson(pack), "utf8");
process.stdout.write(
  `Ranglisten ${pack.datasetVersion}: 100 Flusssysteme, 100 Berge, ${aliasCount} Aliasse\n`
);
