import { describe, expect, it } from "vitest";
import { questionCountOptions } from "./HomePage";

describe("Rundenlängen im Challenge-Setup", () => {
  it("bietet normalen Challenges dynamisch 6, 10, 20 oder alle an", () => {
    expect(questionCountOptions("countries", 195)).toEqual([
      6,
      10,
      20,
      "all"
    ]);
    expect(questionCountOptions("rivers", 18)).toEqual([6, 10, "all"]);
    expect(questionCountOptions("landmarks", 40)).toEqual([6, 10, 20, "all"]);
    expect(questionCountOptions("peaks", 5)).toEqual(["all"]);
  });

  it("hält die festen Weltraum- und Weltmixgrößen ein", () => {
    expect(questionCountOptions("planets", 8)).toEqual([6, "all"]);
    expect(questionCountOptions("moons", 20)).toEqual([10, "all"]);
    expect(questionCountOptions("dwarf-planets", 5)).toEqual(["all"]);
    expect(questionCountOptions("zodiac", 12)).toEqual([6, "all"]);
    expect(questionCountOptions("world-mix", 2_090)).toEqual([10, 20]);
  });
});
