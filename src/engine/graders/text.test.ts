import { describe, expect, it } from "vitest";
import { gradeTextAnswer, normalizeTextAnswer } from "./text";

describe("normalizeTextAnswer", () => {
  it("normalisiert Leerraum, Großschreibung und typographische Zeichen", () => {
    expect(normalizeTextAnswer("  Neu–Delhi  ")).toBe("neu-delhi");
  });

  it("entfernt Akzente nicht pauschal", () => {
    expect(normalizeTextAnswer("Chișinău")).not.toBe(
      normalizeTextAnswer("Chisinau")
    );
  });
});

describe("gradeTextAnswer", () => {
  it("akzeptiert die erwartete Antwort", () => {
    expect(
      gradeTextAnswer(" berlin ", { expected: "Berlin" }).correct
    ).toBe(true);
  });

  it("akzeptiert ausschließlich gepflegte Aliasse", () => {
    const accepted = gradeTextAnswer("Chisinau", {
      expected: "Chișinău",
      aliases: ["Chisinau", "Kischinau"]
    });
    const rejected = gradeTextAnswer("Chisnau", {
      expected: "Chișinău",
      aliases: ["Chisinau", "Kischinau"]
    });

    expect(accepted.correct).toBe(true);
    expect(rejected.correct).toBe(false);
  });
});
