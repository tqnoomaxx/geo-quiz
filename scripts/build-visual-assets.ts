import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { Feature, MultiPolygon, Polygon, Position } from "geojson";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import {
  parseRawAstronomySnapshot,
  parseRawContentFixture,
  parseRawLandmarkSnapshot,
  type RawCountryFixture
} from "../src/content/schema";

type CountryProperties = { name?: string };
type WorldTopology = Topology<{
  countries: GeometryCollection<CountryProperties>;
}>;

const projectRoot = resolve(import.meta.dirname, "..");
const sourcePath = resolve(projectRoot, "content-src/geo-core-mvp.v1.json");
const astronomySourcePath = resolve(
  projectRoot,
  "content-src/astronomy-core.v1.json"
);
const landmarkSourcePath = resolve(
  projectRoot,
  "content-src/landmarks-core.v1.json"
);
const landmarkImageDirectory = resolve(projectRoot, "content-src/landmark-images");
const flagDirectory = resolve(
  projectRoot,
  "node_modules/flag-icons/flags/4x3"
);
const world50mPath = resolve(
  projectRoot,
  "node_modules/world-atlas/countries-50m.json"
);
const world10mPath = resolve(
  projectRoot,
  "node_modules/world-atlas/countries-10m.json"
);
const outputDirectory = resolve(projectRoot, "src/content/generated");
const indexPath = resolve(outputDirectory, "visual-assets-index-v1.json");
const publicAssetDirectory = resolve(
  projectRoot,
  "public/assets/visual/v1"
);

function stableJson(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function sha256Bytes(value: Uint8Array) {
  return createHash("sha256").update(value).digest("hex");
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

async function writeStableBytes(path: string, content: Uint8Array) {
  let previous: Buffer | undefined;
  try {
    previous = await readFile(path);
  } catch {
    previous = undefined;
  }
  if (!previous || !previous.equals(content)) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
  }
}

async function loadTopology(path: string) {
  return JSON.parse(await readFile(path, "utf8")) as WorldTopology;
}

function extractCountryFeature(
  country: RawCountryFixture,
  world50m: WorldTopology,
  world10m: WorldTopology
) {
  const find = (topology: WorldTopology) =>
    topology.objects.countries.geometries.find(
      (geometry) =>
        String(geometry.id).padStart(3, "0") === country.mapFeatureId
    );
  const source = find(world50m)
    ? { topology: world50m, geometry: find(world50m)! }
    : { topology: world10m, geometry: find(world10m) };

  if (!source.geometry) {
    throw new Error(
      `${country.id}: Natural-Earth-Geometrie ${country.mapFeatureId} fehlt.`
    );
  }

  return feature(
    source.topology,
    source.geometry
  ) as unknown as Feature<Polygon | MultiPolygon, CountryProperties>;
}

function unwrapRing(ring: readonly Position[], centerLongitude: number) {
  let previousLongitude = ring[0]?.[0] ?? centerLongitude;
  const unwrapped = ring.map((coordinate, index) => {
    if (index === 0) return [...coordinate];
    let longitude = coordinate[0];
    while (longitude - previousLongitude > 180) longitude -= 360;
    while (longitude - previousLongitude < -180) longitude += 360;
    previousLongitude = longitude;
    return [longitude, coordinate[1]];
  });
  const averageLongitude =
    unwrapped.reduce((sum, coordinate) => sum + coordinate[0], 0) /
    Math.max(1, unwrapped.length);
  const shift =
    Math.round((centerLongitude - averageLongitude) / 360) * 360;

  return unwrapped.map(([longitude, latitude]) => [
    longitude + shift,
    latitude
  ]);
}

function polygonsFromFeature(
  country: RawCountryFixture,
  featureValue: Feature<Polygon | MultiPolygon>
) {
  const polygons =
    featureValue.geometry.type === "Polygon"
      ? [featureValue.geometry.coordinates]
      : featureValue.geometry.coordinates;

  return polygons.map((polygon) =>
    polygon.map((ring) => unwrapRing(ring, country.centroid[0]))
  );
}

function rounded(value: number) {
  return Number(value.toFixed(1));
}

function outlineSvg(
  country: RawCountryFixture,
  featureValue: Feature<Polygon | MultiPolygon>
) {
  const width = 240;
  const height = 160;
  const padding = 8;
  const polygons = polygonsFromFeature(country, featureValue);
  const positions = polygons.flat(2);
  if (positions.length === 0) {
    throw new Error(`${country.id}: Länderumriss ist leer.`);
  }

  const longitudes = positions.map((position) => position[0]);
  const latitudes = positions.map((position) => position[1]);
  const minX = Math.min(...longitudes);
  const maxX = Math.max(...longitudes);
  const minY = Math.min(...latitudes);
  const maxY = Math.max(...latitudes);
  const extentX = Math.max(0.0001, maxX - minX);
  const extentY = Math.max(0.0001, maxY - minY);
  const scale = Math.min(
    (width - padding * 2) / extentX,
    (height - padding * 2) / extentY
  );
  const offsetX = (width - extentX * scale) / 2;
  const offsetY = (height - extentY * scale) / 2;
  const path = polygons
    .flatMap((polygon) =>
      polygon.map((ring) =>
        ring
          .map(([longitude, latitude], index) => {
            const x = rounded(offsetX + (longitude - minX) * scale);
            const y = rounded(offsetY + (maxY - latitude) * scale);
            return `${index === 0 ? "M" : "L"}${x} ${y}`;
          })
          .join("") + "Z"
      )
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><path fill="#000" fill-rule="evenodd" d="${path}"/></svg>`;
}

function constellationSvg(chart: {
  stars: Array<{ x: number; y: number; size: number }>;
  lines: Array<[number, number]>;
}) {
  const width = 640;
  const height = 420;
  const plot = { left: 54, top: 38, width: 532, height: 328 };
  const point = (index: number) => {
    const star = chart.stars[index];
    if (!star) throw new Error(`Sternindex ${index} ist ungültig.`);
    return {
      x: rounded(plot.left + (star.x / 100) * plot.width),
      y: rounded(plot.top + (star.y / 100) * plot.height),
      size: star.size
    };
  };
  const grid = [0.2, 0.4, 0.6, 0.8]
    .flatMap((ratio) => [
      `<line x1="${rounded(plot.left + plot.width * ratio)}" y1="${plot.top}" x2="${rounded(plot.left + plot.width * ratio)}" y2="${plot.top + plot.height}"/>`,
      `<line x1="${plot.left}" y1="${rounded(plot.top + plot.height * ratio)}" x2="${plot.left + plot.width}" y2="${rounded(plot.top + plot.height * ratio)}"/>`
    ])
    .join("");
  const lines = chart.lines
    .map(([from, to]) => {
      const start = point(from);
      const end = point(to);
      return `<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}"/>`;
    })
    .join("");
  const stars = chart.stars
    .map((_, index) => {
      const star = point(index);
      const radius = rounded(2.6 + star.size * 1.25);
      return `<g transform="translate(${star.x} ${star.y})"><circle r="${radius}" fill="#fff"/><path d="M0-${rounded(radius + 4)}V${rounded(radius + 4)}M-${rounded(radius + 4)} 0H${rounded(radius + 4)}" stroke="#fff" stroke-width="1"/></g>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" rx="18" fill="#071f49"/><g stroke="#7188ac" stroke-width="1" stroke-dasharray="3 7" opacity=".62">${grid}</g><rect x="${plot.left}" y="${plot.top}" width="${plot.width}" height="${plot.height}" fill="none" stroke="#8aa0c0" stroke-width="1"/><g stroke="#e8f0ff" stroke-width="2.4" stroke-linecap="round" opacity=".92">${lines}</g><g>${stars}</g><g fill="#b9c8df" font-family="system-ui,sans-serif" font-size="12"><text x="${plot.left}" y="${height - 22}">vereinfachte Lernkarte</text><text x="${width - 74}" y="${height - 22}">N ↑</text></g></svg>`;
}

const fixture = parseRawContentFixture(
  JSON.parse(await readFile(sourcePath, "utf8"))
);
const astronomy = parseRawAstronomySnapshot(
  JSON.parse(await readFile(astronomySourcePath, "utf8"))
);
const landmarks = parseRawLandmarkSnapshot(
  JSON.parse(await readFile(landmarkSourcePath, "utf8"))
);
const [world50m, world10m] = await Promise.all([
  loadTopology(world50mPath),
  loadTopology(world10mPath)
]);
const assets: Array<{
  key: string;
  entityId: string;
  kind: "flag" | "country_outline" | "constellation_chart" | "landmark_photo";
  mediaType: "image/svg+xml" | "image/jpeg";
  sha256: string;
  bytes: number;
  sourceRef: string;
  path: string;
}> = [];
const assetWrites: Array<Promise<void>> = [];

for (const country of fixture.countries.toSorted((left, right) =>
  left.id.localeCompare(right.id)
)) {
  const flag = await readFile(
    resolve(flagDirectory, `${country.iso2.toLowerCase()}.svg`),
    "utf8"
  );
  const outline = outlineSvg(
    country,
    extractCountryFeature(country, world50m, world10m)
  );

  for (const [kind, svg, sourceRef] of [
    ["flag", flag, "flag-icons@7.5.0"],
    ["country_outline", outline, "natural-earth@world-atlas-2.0.2"]
  ] as const) {
    const key = `visual:${kind}:${country.id}`;
    const directory = kind === "flag" ? "flags" : "outlines";
    const filename = `${country.iso2.toLowerCase()}.svg`;
    const publicPath = `assets/visual/v1/${directory}/${filename}`;
    assets.push({
      key,
      entityId: country.id,
      kind,
      mediaType: "image/svg+xml",
      sha256: sha256(svg),
      bytes: Buffer.byteLength(svg),
      sourceRef,
      path: publicPath
    });
    assetWrites.push(
      writeStable(resolve(publicAssetDirectory, directory, filename), svg)
    );
  }
}

for (const constellation of astronomy.entities
  .filter((entity) => entity.type === "zodiac_constellation")
  .toSorted((left, right) => left.id.localeCompare(right.id))) {
  if (!constellation.chart) {
    throw new Error(`${constellation.id}: Sternbildkarte fehlt.`);
  }
  const svg = constellationSvg(constellation.chart);
  const filename = `${constellation.id.replace("constellation:", "")}.svg`;
  const publicPath = `assets/visual/v1/constellations/${filename}`;
  assets.push({
    key: `visual:constellation_chart:${constellation.id}`,
    entityId: constellation.id,
    kind: "constellation_chart",
    mediaType: "image/svg+xml",
    sha256: sha256(svg),
    bytes: Buffer.byteLength(svg),
    sourceRef: "iau-constellations",
    path: publicPath
  });
  assetWrites.push(
    writeStable(resolve(publicAssetDirectory, "constellations", filename), svg)
  );
}

for (const landmark of landmarks.entities.toSorted((left, right) =>
  left.id.localeCompare(right.id)
)) {
  const photo = await readFile(
    resolve(landmarkImageDirectory, landmark.image.filename)
  );
  const digest = sha256Bytes(photo);
  if (photo.length !== landmark.image.bytes || digest !== landmark.image.sha256) {
    throw new Error(`${landmark.id}: lokales Foto entspricht nicht dem Snapshot.`);
  }
  const publicPath = `assets/visual/v1/landmarks/${landmark.image.filename}`;
  assets.push({
    key: `visual:landmark_photo:${landmark.id}`,
    entityId: landmark.id,
    kind: "landmark_photo",
    mediaType: "image/jpeg",
    sha256: digest,
    bytes: photo.length,
    sourceRef: landmark.sourceRefs.find((sourceRef) => sourceRef.startsWith("commons-")) ?? "",
    path: publicPath
  });
  assetWrites.push(
    writeStableBytes(
      resolve(publicAssetDirectory, "landmarks", landmark.image.filename),
      photo
    )
  );
}

if (assets.length !== 442) {
  throw new Error(`Visual-Build erwartet 442 Assets, erzeugte aber ${assets.length}.`);
}

const indexJson = stableJson({
  schemaVersion: 1,
  datasetVersion: fixture.version,
  builtAt: fixture.builtAt,
  sources: [
    {
      id: "flag-icons",
      sourceVersion: "7.5.0",
      url: "https://github.com/lipis/flag-icons/tree/v7.5.0",
      license: "MIT"
    },
    {
      id: "natural-earth",
      sourceVersion: "world-atlas@2.0.2 / 50m+10m",
      url: "https://www.naturalearthdata.com/",
      license: "Public Domain"
    },
    {
      id: "iau-constellations",
      sourceVersion: "retrieved-2026-08-04",
      url: "https://www.iau.org/Iau/Science/What-we-do/The-Constellations.aspx",
      license: "Constellation charts CC BY 4.0"
    },
    ...landmarks.sources
      .filter((source) => source.id.startsWith("commons-"))
      .map(({ retrievedAt: _retrievedAt, ...source }) => source)
  ],
  assets
});
await Promise.all([writeStable(indexPath, indexJson), ...assetWrites]);

process.stdout.write(
  `Visual Assets ${fixture.version}: ${assets.length} lokale Assets\n`
);
