import { describe, expect, it } from "vitest";
import { distanceToSegment, pickNearestLine } from "./lineHit";

describe("touchfreundliche Linienauswahl", () => {
  it("berechnet die Distanz zu einem Segment", () => {
    expect(
      distanceToSegment(
        { x: 5, y: 4 },
        { x: 0, y: 0 },
        { x: 10, y: 0 }
      )
    ).toBe(4);
  });

  it("wählt innerhalb der Hit-Zone die nächste stabile ID", () => {
    expect(
      pickNearestLine(
        { x: 5, y: 3 },
        [
          {
            id: "river:a",
            label: "A",
            lines: [[{ x: 0, y: 0 }, { x: 10, y: 0 }]]
          },
          {
            id: "river:b",
            label: "B",
            lines: [[{ x: 0, y: 12 }, { x: 10, y: 12 }]]
          }
        ],
        12
      )
    ).toMatchObject({ kind: "selected", id: "river:a", distancePx: 3 });
  });

  it("verwirft nahezu gleich nahe Kandidaten als mehrdeutig", () => {
    expect(
      pickNearestLine(
        { x: 5, y: 5 },
        [
          {
            id: "river:a",
            label: "A",
            lines: [[{ x: 0, y: 3 }, { x: 10, y: 3 }]]
          },
          {
            id: "river:b",
            label: "B",
            lines: [[{ x: 0, y: 7 }, { x: 10, y: 7 }]]
          }
        ],
        12
      )
    ).toEqual({
      kind: "ambiguous",
      candidateIds: ["river:a", "river:b"]
    });
  });

  it("liefert außerhalb der Hit-Zone keine Auswahl", () => {
    expect(
      pickNearestLine(
        { x: 50, y: 50 },
        [
          {
            id: "river:a",
            label: "A",
            lines: [[{ x: 0, y: 0 }, { x: 10, y: 0 }]]
          }
        ],
        12
      )
    ).toEqual({ kind: "none" });
  });
});
