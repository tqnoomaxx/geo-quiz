import { describe, expect, it } from "vitest";
import { gradeMapLine } from "./line";

describe("line-v1", () => {
  it("bewertet nur die stabile Linien-ID", () => {
    expect(
      gradeMapLine("naturalearth:river:danube", [
        "naturalearth:river:danube"
      ])
    ).toMatchObject({ correct: true });
    expect(
      gradeMapLine("naturalearth:river:rhine", [
        "naturalearth:river:danube"
      ])
    ).toMatchObject({ correct: false });
  });

  it("bewertet eine leere Auswahl als falsch", () => {
    expect(gradeMapLine(undefined, ["naturalearth:river:danube"])).toEqual({
      correct: false
    });
  });
});
