import { gradeTextAnswer } from "./text";

export type FactProfileValues = Record<string, string>;

export interface FactProfileExpectedName {
  id: string;
  value: string;
}

export interface FactProfileFieldDefinition {
  id: string;
  label: string;
  placeholder: string;
  source:
    | { kind: "entity_name" }
    | { kind: "fact"; factTypeId: string };
}

export interface FactProfileFieldConfig {
  id: string;
  label: string;
  placeholder: string;
  expectedNames: FactProfileExpectedName[];
  expectedLabel: string;
}

export interface FactProfileFieldResult {
  id: string;
  label: string;
  value: string;
  expectedLabel: string;
  correct: boolean;
  matchedAliasId?: string;
}

export function gradeFactProfile(
  values: FactProfileValues,
  fields: readonly FactProfileFieldConfig[]
) {
  const results = fields.map((field): FactProfileFieldResult => {
    const [preferred, ...aliases] = field.expectedNames;
    if (!preferred) {
      throw new Error(`${field.id}: Faktenprofil besitzt keine gültige Lösung.`);
    }
    const value = values[field.id] ?? "";
    const grade = gradeTextAnswer(value, {
      expected: preferred.value,
      aliases: aliases.map((name) => name.value),
      locale: "de"
    });
    return {
      id: field.id,
      label: field.label,
      value,
      expectedLabel: field.expectedLabel,
      correct: grade.correct,
      matchedAliasId: field.expectedNames.find(
        (name) => name.value === grade.matchedAnswer
      )?.id
    };
  });

  return {
    fields: results,
    correctCount: results.filter((field) => field.correct).length,
    complete: results.length > 0 && results.every((field) => field.correct)
  };
}
