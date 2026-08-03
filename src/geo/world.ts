import { feature } from "topojson-client";
import type {
  FeatureCollection,
  MultiPolygon,
  Point,
  Polygon,
  Position
} from "geojson";
import type {
  GeometryCollection,
  Topology
} from "topojson-specification";
import worldData from "world-atlas/countries-50m.json";
import { geoDataset } from "../content/dataset";
import mapAdditions from "./generated/mvp-map-additions-v1.json";

export type CountryProperties = {
  name?: string;
  entityId?: string;
  label?: string;
};

type WorldTopology = Topology<{
  countries: GeometryCollection<{ name?: string }>;
}>;

const topology = worldData as unknown as WorldTopology;
const countriesByFeatureId = new Map(
  geoDataset.entities
    .filter(
      (entity) => entity.type === "country" && entity.geometryRef
    )
    .map((entity) => [entity.geometryRef!.featureId, entity])
);
const preferredNameById = new Map(
  geoDataset.names.map((name) => [name.id, name.name])
);

function signedRingArea(ring: Position[]) {
  return ring.reduce((area, coordinate, index) => {
    const next = ring[(index + 1) % ring.length];
    return area + coordinate[0] * next[1] - next[0] * coordinate[1];
  }, 0);
}

function unwrapAntimeridian(ring: Position[]) {
  let previousLongitude = ring[0]?.[0] ?? 0;

  return ring.map((coordinate, index) => {
    if (index === 0) return [...coordinate];
    let longitude = coordinate[0];

    while (longitude - previousLongitude > 180) longitude -= 360;
    while (longitude - previousLongitude < -180) longitude += 360;

    previousLongitude = longitude;
    return [longitude, ...coordinate.slice(1)];
  });
}

function rewindPolygon(rings: Position[][]) {
  return rings
    .map(unwrapAntimeridian)
    .filter((ring, index) => index === 0 || Math.abs(signedRingArea(ring)) > 0)
    .map((ring, index) => {
      const shouldBeCounterClockwise = index === 0;
      const isCounterClockwise = signedRingArea(ring) > 0;
      return shouldBeCounterClockwise === isCounterClockwise
        ? ring
        : [...ring].reverse();
    });
}

function normalizeCollection(
  collection: FeatureCollection<
    Polygon | MultiPolygon,
    CountryProperties
  >
) {
  const claimedEntityIds = new Set<string>();

  return {
    ...collection,
    features: collection.features.map((country) => {
      const geometry = country.geometry;
      const coordinates =
        geometry.type === "Polygon"
          ? rewindPolygon(geometry.coordinates)
          : geometry.coordinates
              .map((polygon) => polygon.map(unwrapAntimeridian))
              .filter((polygon) => Math.abs(signedRingArea(polygon[0])) > 0)
              .map(rewindPolygon);
      const featureId = String(country.id ?? "").padStart(3, "0");
      const candidate = countriesByFeatureId.get(featureId);
      const entity =
        candidate && !claimedEntityIds.has(candidate.id)
          ? candidate
          : undefined;
      if (entity) claimedEntityIds.add(entity.id);

      return {
        ...country,
        id: featureId,
        properties: {
          ...country.properties,
          entityId: entity?.id,
          label: entity
            ? preferredNameById.get(entity.canonicalNameId)
            : country.properties.name
        },
        geometry: { ...geometry, coordinates }
      } as typeof country;
    })
  };
}

const topologyCountries = feature(
  topology,
  topology.objects.countries
) as unknown as FeatureCollection<
  Polygon | MultiPolygon,
  CountryProperties
>;
const additions =
  mapAdditions as FeatureCollection<
    Polygon | MultiPolygon,
    CountryProperties
  >;

// TopoJSON uses a different ring convention than RFC 7946 GeoJSON.
// MapLibre expects exterior rings counterclockwise for reliable fill rendering.
export const countriesGeoJson = normalizeCollection({
  type: "FeatureCollection",
  features: [...topologyCountries.features, ...additions.features]
});

export const smallCountryMarkers: FeatureCollection<
  Point,
  { entityId: string; label: string }
> = {
  type: "FeatureCollection",
  features: geoDataset.entities
    .filter(
      (entity) =>
        entity.type === "country" &&
        entity.geometryRef?.pointFallback &&
        entity.centroid
    )
    .map((entity) => ({
      type: "Feature",
      id: entity.id,
      properties: {
        entityId: entity.id,
        label: preferredNameById.get(entity.canonicalNameId) ?? entity.id
      },
      geometry: {
        type: "Point",
        coordinates: [...entity.centroid!]
      }
    }))
};
