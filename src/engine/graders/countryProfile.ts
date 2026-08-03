import { gradeTextAnswer } from "./text";

export const COUNTRY_PROFILE_FIELD_IDS = [
  "capital",
  "language",
  "currency"
] as const;

export type CountryProfileFieldId =
  (typeof COUNTRY_PROFILE_FIELD_IDS)[number];

export type CountryProfileValues = Record<CountryProfileFieldId, string>;

export interface CountryProfileExpectedName {
  id: string;
  value: string;
}

export interface CountryProfileFieldConfig {
  id: CountryProfileFieldId;
  label: string;
  expectedEntityIds: string[];
  expectedNames: CountryProfileExpectedName[];
  expectedLabel: string;
}

export interface CountryProfileFieldResult {
  id: CountryProfileFieldId;
  label: string;
  value: string;
  expectedLabel: string;
  correct: boolean;
  matchedAliasId?: string;
}

export function gradeCountryProfile(
  values: CountryProfileValues,
  fields: readonly CountryProfileFieldConfig[]
) {
  const results = fields.map((field): CountryProfileFieldResult => {
    const [preferred, ...aliases] = field.expectedNames;
    if (!preferred) {
      throw new Error(`${field.id}: Länderprofil besitzt keine gültige Lösung.`);
    }
    const grade = gradeTextAnswer(values[field.id], {
      expected: preferred.value,
      aliases: aliases.map((name) => name.value),
      locale: "de"
    });
    return {
      id: field.id,
      label: field.label,
      value: values[field.id],
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
    complete: results.every((field) => field.correct)
  };
}
