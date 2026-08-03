import { describe, expect, it } from "vitest";
import { gradeSingleChoice } from "./choice";

describe("single-choice-v1", () => {
  it("bewertet ausschließlich die stabile Entitäts-ID", () => {
    expect(
      gradeSingleChoice("country:de", ["country:de"])
    ).toEqual({
      correct: true,
      selectedEntityId: "country:de"
    });
    expect(
      gradeSingleChoice("country:at", ["country:de"])
    ).toMatchObject({ correct: false });
  });
});
