import { describe, expect, it } from "vitest";
import { gradeMapArea } from "./area";

describe("gradeMapArea", () => {
  it("akzeptiert einen gepflegten Flächennamen", () => {
    expect(gradeMapArea("Slovenia", ["Slovenia"]).correct).toBe(true);
  });

  it("lehnt fehlende und andere Flächen ab", () => {
    expect(gradeMapArea(undefined, ["Slovenia"]).correct).toBe(false);
    expect(gradeMapArea("Slovakia", ["Slovenia"]).correct).toBe(false);
  });
});
