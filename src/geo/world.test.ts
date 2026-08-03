import { describe, expect, it } from "vitest";
import type { Position } from "geojson";
import { countriesGeoJson, smallCountryMarkers } from "./world";

function signedRingArea(ring: Position[]) {
  return ring.reduce((area, coordinate, index) => {
    const next = ring[(index + 1) % ring.length];
    return area + coordinate[0] * next[1] - next[0] * coordinate[1];
  }, 0);
}

describe("Phase-2 world map adapter", () => {
  it("links all 195 MVP countries, including the 10m Tuvalu addition", () => {
    const entityIds = countriesGeoJson.features
      .map((country) => country.properties?.entityId)
      .filter((id): id is string => typeof id === "string");

    expect(entityIds).toHaveLength(195);
    expect(new Set(entityIds).size).toBe(195);
    expect(entityIds).toContain("country:tv");
    expect(
      countriesGeoJson.features.find(
        (country) => country.properties?.entityId === "country:au"
      )?.properties?.name
    ).toBe("Australia");
    expect(
      smallCountryMarkers.features.some(
        (marker) => marker.properties?.entityId === "country:va"
      )
    ).toBe(true);
  });

  it("retains source labels while adding German display labels", () => {
    const germany = countriesGeoJson.features.find(
      (country) => country.properties?.entityId === "country:de"
    );

    expect(germany?.properties).toMatchObject({
      name: "Germany",
      label: "Deutschland"
    });
  });

  it("uses RFC 7946 winding for exterior rings", () => {
    for (const country of countriesGeoJson.features) {
      const polygons =
        country.geometry.type === "Polygon"
          ? [country.geometry.coordinates]
          : country.geometry.coordinates;

      for (const polygon of polygons) {
        expect(signedRingArea(polygon[0])).toBeGreaterThan(0);
      }
    }
  });

  it("unwraps rings that cross the antimeridian", () => {
    for (const country of countriesGeoJson.features) {
      const polygons =
        country.geometry.type === "Polygon"
          ? [country.geometry.coordinates]
          : country.geometry.coordinates;

      for (const polygon of polygons) {
        for (const ring of polygon) {
          for (let index = 1; index < ring.length; index += 1) {
            expect(Math.abs(ring[index][0] - ring[index - 1][0])).toBeLessThanOrEqual(180);
          }
        }
      }
    }
  });
});
