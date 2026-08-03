import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type {
  Feature,
  GeoJsonProperties,
  Geometry,
  LineString,
  MultiLineString,
  MultiPolygon,
  Point,
  Polygon,
  Position
} from "geojson";

type PhysicalType = "river" | "lake" | "sea" | "mountain_range" | "peak";

type SelectionItem = {
  id: string;
  type: PhysicalType;
  sourceNames?: string[];
  sourceIds?: string[];
  sourceBounds?: [number, number, number, number];
  nameDe?: string;
  aliasesDe?: string[];
  continentIds: string[];
  difficulty: number;
};

type Selection = {
  schemaVersion: 1;
  datasetVersion: string;
  builtAt: string;
  sourceVersion: string;
  layers: Record<string, string>;
  entities: SelectionItem[];
};

type SourceFeature = Feature<Geometry, GeoJsonProperties>;

const projectRoot = resolve(import.meta.dirname, "..");
const selectionPath = resolve(
  projectRoot,
  "content-src/physical-selection.v1.json"
);
const outputPath = resolve(projectRoot, "content-src/physical-core.v1.json");
const repositoryBase =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function property(
  feature: SourceFeature,
  lower: string,
  upper: string
) {
  return feature.properties?.[lower] ?? feature.properties?.[upper];
}

function sourceId(feature: SourceFeature) {
  const value = property(feature, "ne_id", "NE_ID");
  return value === undefined || value === null ? undefined : String(value);
}

function sourceName(feature: SourceFeature) {
  return asString(property(feature, "name", "NAME"));
}

function positions(geometry: Geometry): Position[] {
  if (geometry.type === "Point") return [geometry.coordinates];
  if (geometry.type === "MultiPoint" || geometry.type === "LineString") {
    return geometry.coordinates;
  }
  if (geometry.type === "MultiLineString" || geometry.type === "Polygon") {
    return geometry.coordinates.flat();
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.flat(2);
  }
  if (geometry.type === "GeometryCollection") {
    return geometry.geometries.flatMap(positions);
  }
  return [];
}

function ringArea(ring: Position[]) {
  return ring.reduce((sum, coordinate, index) => {
    const next = ring[(index + 1) % ring.length];
    return sum + coordinate[0] * next[1] - next[0] * coordinate[1];
  }, 0);
}

function pointInRing(point: Position, ring: Position[]) {
  let inside = false;
  for (let current = 0, previous = ring.length - 1; current < ring.length; previous = current++) {
    const [currentX, currentY] = ring[current];
    const [previousX, previousY] = ring[previous];
    if (
      (currentY > point[1]) !== (previousY > point[1]) &&
      point[0] <
        ((previousX - currentX) * (point[1] - currentY)) /
          (previousY - currentY) +
          currentX
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function pointInPolygon(point: Position, polygon: Position[][]) {
  return (
    pointInRing(point, polygon[0]) &&
    polygon.slice(1).every((hole) => !pointInRing(point, hole))
  );
}

function ringCentroid(ring: Position[]): Position {
  let crossSum = 0;
  let longitudeSum = 0;
  let latitudeSum = 0;
  for (let index = 0; index < ring.length; index += 1) {
    const current = ring[index];
    const next = ring[(index + 1) % ring.length];
    const cross = current[0] * next[1] - next[0] * current[1];
    crossSum += cross;
    longitudeSum += (current[0] + next[0]) * cross;
    latitudeSum += (current[1] + next[1]) * cross;
  }
  if (Math.abs(crossSum) < 1e-12) return ring[0];
  return [
    longitudeSum / (3 * crossSum),
    latitudeSum / (3 * crossSum)
  ];
}

function interiorPoint(geometry: MultiPolygon): [number, number] {
  const polygon = geometry.coordinates.toSorted(
    (left, right) =>
      Math.abs(ringArea(right[0])) - Math.abs(ringArea(left[0]))
  )[0];
  const candidate = ringCentroid(polygon[0]);
  if (pointInPolygon(candidate, polygon)) {
    return [
      Number(candidate[0].toFixed(6)),
      Number(candidate[1].toFixed(6))
    ];
  }
  const outer = polygon[0];
  const longitudes = outer.map((coordinate) => coordinate[0]);
  const latitudes = outer.map((coordinate) => coordinate[1]);
  const minX = Math.min(...longitudes);
  const maxX = Math.max(...longitudes);
  const minY = Math.min(...latitudes);
  const maxY = Math.max(...latitudes);
  for (let row = 1; row < 20; row += 1) {
    for (let column = 1; column < 20; column += 1) {
      const point: Position = [
        minX + ((maxX - minX) * column) / 20,
        minY + ((maxY - minY) * row) / 20
      ];
      if (pointInPolygon(point, polygon)) {
        return [
          Number(point[0].toFixed(6)),
          Number(point[1].toFixed(6))
        ];
      }
    }
  }
  return [outer[0][0], outer[0][1]];
}

function centroid(geometry: Geometry): [number, number] {
  if (geometry.type === "Point") {
    return [geometry.coordinates[0], geometry.coordinates[1]];
  }
  if (geometry.type === "MultiPolygon") return interiorPoint(geometry);
  if (geometry.type === "MultiLineString") {
    const longestLine = geometry.coordinates.toSorted(
      (left, right) => right.length - left.length
    )[0];
    const point = longestLine[Math.floor(longestLine.length / 2)];
    return [point[0], point[1]];
  }
  const all = positions(geometry);
  if (all.length === 0) throw new Error("Leere Geometrie besitzt keinen Zentroid.");
  const longitudes = all.map((coordinate) => coordinate[0]);
  const latitudes = all.map((coordinate) => coordinate[1]);
  return [
    Number(((Math.min(...longitudes) + Math.max(...longitudes)) / 2).toFixed(6)),
    Number(((Math.min(...latitudes) + Math.max(...latitudes)) / 2).toFixed(6))
  ];
}

function mergeLines(
  features: SourceFeature[],
  bounds?: [number, number, number, number]
): MultiLineString {
  const allLines = features.flatMap((feature) => {
    if (feature.geometry.type === "LineString") {
      return [feature.geometry.coordinates];
    }
    if (feature.geometry.type === "MultiLineString") {
      return feature.geometry.coordinates;
    }
    throw new Error(`${sourceName(feature)} ist keine Liniengeometrie.`);
  });
  const coordinates = bounds
    ? allLines.filter((line) => {
        const point = line[Math.floor(line.length / 2)];
        return (
          point[0] >= bounds[0] &&
          point[1] >= bounds[1] &&
          point[0] <= bounds[2] &&
          point[1] <= bounds[3]
        );
      })
    : allLines;
  if (coordinates.length === 0) {
    throw new Error("Die kuratierte Linienbegrenzung enthält keine Geometrie.");
  }
  return { type: "MultiLineString", coordinates };
}

function mergePolygons(features: SourceFeature[]): MultiPolygon {
  const coordinates = features.flatMap((feature) => {
    if (feature.geometry.type === "Polygon") {
      return [feature.geometry.coordinates];
    }
    if (feature.geometry.type === "MultiPolygon") {
      return feature.geometry.coordinates;
    }
    throw new Error(`${sourceName(feature)} ist keine Flächengeometrie.`);
  });
  return { type: "MultiPolygon", coordinates };
}

function mergePoint(features: SourceFeature[]): Point {
  if (features.length !== 1 || features[0].geometry.type !== "Point") {
    throw new Error("Ein Gipfel benötigt genau eine Punktgeometrie.");
  }
  return features[0].geometry;
}

function unique(values: Array<string | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function namesFor(
  selection: SelectionItem,
  features: SourceFeature[]
) {
  const preferred =
    selection.nameDe ??
    asString(property(features[0], "name_de", "NAME_DE")) ??
    asString(property(features[0], "name_en", "NAME_EN")) ??
    sourceName(features[0]) ??
    selection.id;
  const sourceAliases = features.flatMap((feature) => {
    const alternate = asString(property(feature, "name_alt", "NAMEALT"));
    return [
      sourceName(feature),
      asString(property(feature, "name_en", "NAME_EN")),
      ...(alternate?.split("|").map((value) => value.trim()) ?? [])
    ];
  });

  return {
    nameDe: preferred,
    aliasesDe: unique([...(selection.aliasesDe ?? []), ...sourceAliases]).filter(
      (name) => name !== preferred
    )
  };
}

function selectedFeatures(
  selection: SelectionItem,
  source: SourceFeature[]
) {
  const sourceNames = new Set(selection.sourceNames ?? []);
  const sourceIds = new Set(selection.sourceIds ?? []);
  const selected = source.filter(
    (feature) =>
      (sourceNames.size > 0 && sourceNames.has(sourceName(feature) ?? "")) ||
      (sourceIds.size > 0 && sourceIds.has(sourceId(feature) ?? ""))
  );

  if (selected.length === 0) {
    throw new Error(`${selection.id}: keine Natural-Earth-Geometrie gefunden.`);
  }
  if (sourceIds.size > 0) {
    const foundIds = new Set(selected.map(sourceId));
    for (const id of sourceIds) {
      if (!foundIds.has(id)) {
        throw new Error(`${selection.id}: Natural-Earth-ID ${id} fehlt.`);
      }
    }
  }
  if (sourceNames.size > 0) {
    const foundNames = new Set(selected.map(sourceName));
    for (const name of sourceNames) {
      if (!foundNames.has(name)) {
        throw new Error(`${selection.id}: Natural-Earth-Name ${name} fehlt.`);
      }
    }
  }
  return selected;
}

const selection = JSON.parse(
  await readFile(selectionPath, "utf8")
) as Selection;
if (selection.schemaVersion !== 1 || !selection.entities.length) {
  throw new Error("Physische Auswahlkonfiguration ist ungültig.");
}

const layerByType: Record<PhysicalType, string> = {
  river: selection.layers.rivers,
  lake: selection.layers.lakes,
  sea: selection.layers.seas,
  mountain_range: selection.layers.mountain_ranges,
  peak: selection.layers.peaks
};
const layerNames = [...new Set(Object.values(layerByType))];
const downloaded = await Promise.all(
  layerNames.map(async (layer) => {
    const url = `${repositoryBase}/v${selection.sourceVersion}/geojson/${layer}.geojson`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`${layer}: Download fehlgeschlagen (${response.status}).`);
    }
    const text = await response.text();
    const collection = JSON.parse(text) as {
      type: "FeatureCollection";
      features: SourceFeature[];
    };
    return {
      layer,
      url,
      text,
      features: collection.features
    };
  })
);
const sourceByLayer = new Map(
  downloaded.map((source) => [source.layer, source.features])
);

const entities = selection.entities
  .map((item) => {
    const layer = layerByType[item.type];
    const source = sourceByLayer.get(layer);
    if (!source) throw new Error(`${item.id}: Quelllayer ${layer} fehlt.`);
    const features = selectedFeatures(item, source);
    const geometry: LineString | MultiLineString | Polygon | MultiPolygon | Point =
      item.type === "river"
        ? mergeLines(features, item.sourceBounds)
        : item.type === "peak"
          ? mergePoint(features)
          : mergePolygons(features);
    const labels = namesFor(item, features);
    const featureKeys = unique([
      ...(item.sourceIds ?? []),
      ...(item.sourceNames ?? [])
    ]);

    return {
      id: item.id,
      type: item.type,
      ...labels,
      continentIds: item.continentIds,
      difficulty: item.difficulty,
      centroid: centroid(geometry),
      geometryRef: {
        layer:
          item.type === "river"
            ? "physical-lines"
            : item.type === "peak"
              ? "physical-points"
              : "physical-areas",
        featureId: item.id,
        pointFallback: false
      },
      sourceRefs: [
        `natural-earth-${selection.sourceVersion}:${layer}:${featureKeys.join("+")}`
      ],
      geometry
    };
  })
  .toSorted((left, right) => left.id.localeCompare(right.id));

const snapshot = {
  schemaVersion: 1,
  datasetVersion: selection.datasetVersion,
  builtAt: selection.builtAt,
  source: {
    id: "natural-earth-physical",
    sourceVersion: selection.sourceVersion,
    retrievedAt: selection.builtAt.slice(0, 10),
    url: "https://github.com/nvkelso/natural-earth-vector/tree/v5.1.2",
    license: "Public Domain",
    files: downloaded
      .map(({ layer, url, text }) => ({
        layer,
        url,
        sha256: sha256(text),
        bytes: Buffer.byteLength(text)
      }))
      .toSorted((left, right) => left.layer.localeCompare(right.layer))
  },
  entities
};

await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
process.stdout.write(
  `Physical ${selection.datasetVersion}: ${entities.length} Entitäten aus ${downloaded.length} Layern\n`
);
