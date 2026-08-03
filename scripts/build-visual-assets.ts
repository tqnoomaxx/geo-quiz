import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { Feature, MultiPolygon, Polygon, Position } from "geojson";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import {
  parseRawContentFixture,
  type RawCountryFixture
} from "../src/content/schema";

type CountryProperties = { name?: string };
type WorldTopology = Topology<{
  countries: GeometryCollection<CountryProperties>;
}>;

const projectRoot = resolve(import.meta.dirname, "..");
const sourcePath = resolve(projectRoot, "content-src/geo-core-mvp.v1.json");
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

const fixture = parseRawContentFixture(
  JSON.parse(await readFile(sourcePath, "utf8"))
);
const [world50m, world10m] = await Promise.all([
  loadTopology(world50mPath),
  loadTopology(world10mPath)
]);
const assets: Array<{
  key: string;
  entityId: string;
  kind: "flag" | "country_outline";
  mediaType: "image/svg+xml";
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

if (assets.length !== 390) {
  throw new Error(`Visual-Build erwartet 390 Assets, erzeugte aber ${assets.length}.`);
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
    }
  ],
  assets
});
await Promise.all([writeStable(indexPath, indexJson), ...assetWrites]);

process.stdout.write(
  `Visual Assets ${fixture.version}: ${assets.length} SVGs\n`
);
