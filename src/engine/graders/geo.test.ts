import { describe, expect, it } from "vitest";
import { gradeMapPoint, haversineDistanceKm } from "./geo";

describe("haversineDistanceKm", () => {
  it("liefert für denselben Punkt null", () => {
    expect(haversineDistanceKm([13.405, 52.52], [13.405, 52.52])).toBe(0);
  });

  it("liefert eine plausible Distanz zwischen Berlin und München", () => {
    const distance = haversineDistanceKm(
      [13.405, 52.52],
      [11.582, 48.1351]
    );

    expect(distance).toBeGreaterThan(500);
    expect(distance).toBeLessThan(510);
  });
});

describe("gradeMapPoint", () => {
  it("bewertet innerhalb des Radius korrekt", () => {
    expect(
      gradeMapPoint([14.6, 46.1], [14.5058, 46.0569], 20).correct
    ).toBe(true);
  });

  it("gibt die Distanz für Feedback zurück", () => {
    const result = gradeMapPoint([13.405, 52.52], [14.5058, 46.0569], 150);

    expect(result.correct).toBe(false);
    expect(result.distanceKm).toBeGreaterThan(700);
  });
});
