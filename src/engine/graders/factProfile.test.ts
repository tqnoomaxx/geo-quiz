import { describe, expect, it } from "vitest";
import { gradeFactProfile, type FactProfileFieldConfig } from "./factProfile";

const fields: FactProfileFieldConfig[] = [
  {
    id: "name",
    label: "Name",
    placeholder: "z. B. Löwe",
    expectedLabel: "Löwe",
    expectedNames: [
      { id: "preferred", value: "Löwe" },
      { id: "ascii", value: "Loewe" }
    ]
  },
  {
    id: "sky-position",
    label: "Himmelslage",
    placeholder: "z. B. Nordhimmel",
    expectedLabel: "Nordhimmel",
    expectedNames: [
      { id: "preferred-position", value: "Nordhimmel" },
      { id: "alias-position", value: "nördlich" }
    ]
  }
];

describe("Faktenprofil-Grader", () => {
  it("bewertet konfigurierte Felder mit ihren gepflegten Aliasen", () => {
    expect(
      gradeFactProfile(
        { name: "loewe", "sky-position": "NÖRDLICH" },
        fields
      )
    ).toMatchObject({ complete: true, correctCount: 2 });
  });

  it("liefert bei einer Teillösung feldgenaues Feedback", () => {
    const result = gradeFactProfile(
      { name: "Löwe", "sky-position": "Südhimmel" },
      fields
    );
    expect(result).toMatchObject({ complete: false, correctCount: 1 });
    expect(result.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "name", correct: true }),
        expect.objectContaining({ id: "sky-position", correct: false })
      ])
    );
  });
});
