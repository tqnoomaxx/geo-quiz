import type {
  FeatureCollection,
  MultiLineString,
  MultiPolygon,
  Point
} from "geojson";

export type PhysicalEntityType =
  | "river"
  | "lake"
  | "sea"
  | "mountain_range"
  | "peak";

export type PhysicalProperties = {
  entityId: string;
  label: string;
  entityType: PhysicalEntityType;
  difficulty: number;
};

export type PhysicalFeatureCollection = FeatureCollection<
  MultiLineString | MultiPolygon | Point,
  PhysicalProperties
>;

export const emptyPhysicalGeoJson: PhysicalFeatureCollection = {
  type: "FeatureCollection",
  features: []
};

export async function loadPhysicalGeoJson(
  type: PhysicalEntityType
): Promise<PhysicalFeatureCollection> {
  const module =
    type === "river"
      ? await import("./generated/physical-river-v1.json")
      : type === "lake"
        ? await import("./generated/physical-lake-v1.json")
        : type === "sea"
          ? await import("./generated/physical-sea-v1.json")
          : type === "mountain_range"
            ? await import("./generated/physical-mountain-range-v1.json")
            : await import("./generated/physical-peak-v1.json");
  return module.default as PhysicalFeatureCollection;
}
