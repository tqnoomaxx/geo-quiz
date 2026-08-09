import { gradeMapArea } from "./area";
import { gradeSingleChoice } from "./choice";
import {
  gradeMapPoint,
  type Coordinates
} from "./geo";
import { gradeMapLine } from "./line";
import { gradeTextAnswer } from "./text";
import {
  COUNTRY_PROFILE_FIELD_IDS,
  gradeCountryProfile,
  type CountryProfileFieldConfig,
  type CountryProfileFieldResult,
  type CountryProfileValues
} from "./countryProfile";
import type { QuestionInstance } from "../quiz/question";
import {
  gradeFactProfile,
  type FactProfileFieldConfig,
  type FactProfileFieldResult,
  type FactProfileValues
} from "./factProfile";

export type AnswerPayload =
  | { kind: "text_input"; value: string }
  | { kind: "single_choice"; entityId: string }
  | { kind: "map_point"; coordinates: Coordinates }
  | { kind: "map_area"; areaId?: string; label?: string }
  | { kind: "map_line"; lineId?: string; label?: string }
  | { kind: "country_profile_input"; values: CountryProfileValues }
  | { kind: "fact_profile_input"; values: FactProfileValues };

export type AnswerStatus =
  | "correct"
  | "incorrect"
  | "partial"
  | "timed_out"
  | "skipped";

export interface AnswerResult {
  status: AnswerStatus;
  score: number;
  responseTimeMs: number;
  distanceKm?: number;
  normalizedInput?: string;
  matchedAliasId?: string;
  feedbackEntityIds: string[];
  responseLabel: string;
  detail: string;
  profileFields?: CountryProfileFieldResult[];
  factProfileFields?: FactProfileFieldResult[];
}

type NamedAnswer = { id: string; value: string };

function isCoordinates(value: unknown): value is Coordinates {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((coordinate) => typeof coordinate === "number")
  );
}

function namedAnswers(value: unknown): NamedAnswer[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is NamedAnswer =>
      typeof item === "object" &&
      item !== null &&
      "id" in item &&
      typeof item.id === "string" &&
      "value" in item &&
      typeof item.value === "string"
  );
}

export function isCorrectTextQuestionAnswer(
  question: QuestionInstance,
  value: string
): boolean {
  if (
    question.answerSpec.kind !== "text_input" ||
    question.answerSpec.graderId !== "text-v1"
  ) {
    return false;
  }

  const acceptedNames = namedAnswers(
    question.answerSpec.graderConfig.expectedNames
  );
  if (acceptedNames.length === 0) {
    throw new Error(`${question.id}: ungültige text-v1-Konfiguration.`);
  }

  const [preferred, ...aliases] = acceptedNames;
  return gradeTextAnswer(value, {
    expected: preferred.value,
    aliases: aliases.map((name) => name.value),
    locale: "de"
  }).correct;
}

function countryProfileFields(value: unknown): CountryProfileFieldConfig[] {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (field): field is CountryProfileFieldConfig =>
      typeof field === "object" &&
      field !== null &&
      "id" in field &&
      COUNTRY_PROFILE_FIELD_IDS.includes(
        field.id as (typeof COUNTRY_PROFILE_FIELD_IDS)[number]
      ) &&
      "label" in field &&
      typeof field.label === "string" &&
      "expectedLabel" in field &&
      typeof field.expectedLabel === "string" &&
      "expectedEntityIds" in field &&
      Array.isArray(field.expectedEntityIds) &&
      field.expectedEntityIds.every((id: unknown) => typeof id === "string") &&
      "expectedNames" in field &&
      namedAnswers(field.expectedNames).length > 0
  );
}

function factProfileFields(value: unknown): FactProfileFieldConfig[] {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  return value.filter((field): field is FactProfileFieldConfig => {
    if (
      typeof field !== "object" ||
      field === null ||
      !("id" in field) ||
      typeof field.id !== "string" ||
      field.id.length === 0 ||
      ids.has(field.id) ||
      !("label" in field) ||
      typeof field.label !== "string" ||
      !("placeholder" in field) ||
      typeof field.placeholder !== "string" ||
      !("expectedLabel" in field) ||
      typeof field.expectedLabel !== "string" ||
      !("expectedNames" in field) ||
      namedAnswers(field.expectedNames).length === 0
    ) {
      return false;
    }
    ids.add(field.id);
    return true;
  });
}

export function gradeQuestionAnswer(
  question: QuestionInstance,
  payload: AnswerPayload,
  responseTimeMs: number
): AnswerResult {
  const expectedEntityIds = question.answerSpec.expectedEntityIds;
  const config = question.answerSpec.graderConfig;

  if (
    question.answerSpec.graderId === "single-choice-v1" &&
    payload.kind === "single_choice"
  ) {
    const grade = gradeSingleChoice(payload.entityId, expectedEntityIds);
    const selected = question.answerSpec.options?.find(
      (option) => option.entityId === payload.entityId
    );

    return {
      status: grade.correct ? "correct" : "incorrect",
      score: grade.correct ? 1 : 0,
      responseTimeMs,
      feedbackEntityIds: expectedEntityIds,
      responseLabel: selected?.label ?? payload.entityId,
      detail: grade.correct
        ? question.feedback.expectedLabel
        : `Richtig ist ${question.feedback.expectedLabel}.`
    };
  }

  if (
    question.answerSpec.graderId === "distance-v1" &&
    payload.kind === "map_point"
  ) {
    const targetCoordinates = config.targetCoordinates;
    const thresholdKm = config.thresholdKm;

    if (!isCoordinates(targetCoordinates) || typeof thresholdKm !== "number") {
      throw new Error(`${question.id}: ungültige distance-v1-Konfiguration.`);
    }

    const grade = gradeMapPoint(
      payload.coordinates,
      targetCoordinates,
      thresholdKm
    );
    const distance = Math.round(grade.distanceKm);

    return {
      status: grade.correct ? "correct" : "incorrect",
      score: grade.correct ? 1 : 0,
      responseTimeMs,
      distanceKm: grade.distanceKm,
      feedbackEntityIds: expectedEntityIds,
      responseLabel: `${payload.coordinates[1].toFixed(2)}, ${payload.coordinates[0].toFixed(2)}`,
      detail: grade.correct
        ? `${distance} km entfernt – das zählt.`
        : `${distance} km entfernt. Grün zeigt die Lösung.`
    };
  }

  if (
    question.answerSpec.graderId === "area-v1" &&
    payload.kind === "map_area"
  ) {
    const acceptedAreas = config.acceptedAreaIds;

    if (
      !Array.isArray(acceptedAreas) ||
      !acceptedAreas.every((area) => typeof area === "string")
    ) {
      throw new Error(`${question.id}: ungültige area-v1-Konfiguration.`);
    }

    const grade = gradeMapArea(payload.areaId, acceptedAreas);

    return {
      status: grade.correct ? "correct" : "incorrect",
      score: grade.correct ? 1 : 0,
      responseTimeMs,
      feedbackEntityIds: expectedEntityIds,
      responseLabel: payload.label ?? "Keine Fläche",
      detail: grade.correct
        ? "Die gewählte Fläche ist richtig."
        : `Richtig ist ${question.feedback.expectedLabel}.`
    };
  }

  if (
    question.answerSpec.graderId === "line-v1" &&
    payload.kind === "map_line"
  ) {
    const acceptedLines = config.acceptedLineIds;
    if (
      !Array.isArray(acceptedLines) ||
      !acceptedLines.every((line) => typeof line === "string")
    ) {
      throw new Error(`${question.id}: ungültige line-v1-Konfiguration.`);
    }
    const grade = gradeMapLine(payload.lineId, acceptedLines);

    return {
      status: grade.correct ? "correct" : "incorrect",
      score: grade.correct ? 1 : 0,
      responseTimeMs,
      feedbackEntityIds: expectedEntityIds,
      responseLabel: payload.label ?? "Keine Linie",
      detail: grade.correct
        ? "Der gewählte Verlauf ist richtig."
        : `Richtig ist ${question.feedback.expectedLabel}.`
    };
  }

  if (
    question.answerSpec.graderId === "text-v1" &&
    payload.kind === "text_input"
  ) {
    const acceptedNames = namedAnswers(config.expectedNames);

    if (acceptedNames.length === 0) {
      throw new Error(`${question.id}: ungültige text-v1-Konfiguration.`);
    }

    const [preferred, ...aliases] = acceptedNames;
    const grade = gradeTextAnswer(payload.value, {
      expected: preferred.value,
      aliases: aliases.map((name) => name.value),
      locale: "de"
    });
    const matchedName = acceptedNames.find(
      (name) => name.value === grade.matchedAnswer
    );

    return {
      status: grade.correct ? "correct" : "incorrect",
      score: grade.correct ? 1 : 0,
      responseTimeMs,
      normalizedInput: grade.normalizedInput,
      matchedAliasId: matchedName?.id,
      feedbackEntityIds: expectedEntityIds,
      responseLabel: payload.value,
      detail: grade.correct
        ? question.feedback.expectedLabel
        : `Richtig ist ${question.feedback.expectedLabel}.`
    };
  }

  if (
    question.answerSpec.graderId === "country-profile-v1" &&
    payload.kind === "country_profile_input"
  ) {
    const fields = countryProfileFields(config.profileFields);
    if (fields.length !== COUNTRY_PROFILE_FIELD_IDS.length) {
      throw new Error(
        `${question.id}: ungültige country-profile-v1-Konfiguration.`
      );
    }
    const grade = gradeCountryProfile(payload.values, fields);
    const fieldCount = COUNTRY_PROFILE_FIELD_IDS.length;
    return {
      status: grade.complete
        ? "correct"
        : grade.correctCount > 0
          ? "partial"
          : "incorrect",
      score: grade.complete ? 1 : 0,
      responseTimeMs,
      feedbackEntityIds: expectedEntityIds,
      responseLabel: fields
        .map((field) => `${field.label}: ${payload.values[field.id]}`)
        .join(" · "),
      detail: grade.complete
        ? "Alle drei Angaben stimmen."
        : `${grade.correctCount} von ${fieldCount} Angaben stimmen.`,
      profileFields: grade.fields
    };
  }

  if (
    question.answerSpec.graderId === "fact-profile-v1" &&
    payload.kind === "fact_profile_input"
  ) {
    const fields = factProfileFields(config.profileFields);
    if (fields.length === 0) {
      throw new Error(`${question.id}: ungültige fact-profile-v1-Konfiguration.`);
    }
    const grade = gradeFactProfile(payload.values, fields);
    return {
      status: grade.complete
        ? "correct"
        : grade.correctCount > 0
          ? "partial"
          : "incorrect",
      score: grade.complete ? 1 : 0,
      responseTimeMs,
      feedbackEntityIds: expectedEntityIds,
      responseLabel: fields
        .map((field) => `${field.label}: ${payload.values[field.id] ?? ""}`)
        .join(" · "),
      detail: grade.complete
        ? `Alle ${fields.length} Angaben stimmen.`
        : `${grade.correctCount} von ${fields.length} Angaben stimmen.`,
      factProfileFields: grade.fields
    };
  }

  throw new Error(
    `${question.id}: Payload ${payload.kind} passt nicht zu ${question.answerSpec.graderId}.`
  );
}

export function skippedAnswerResult(
  question: QuestionInstance,
  responseTimeMs: number
): AnswerResult {
  return {
    status: "skipped",
    score: 0,
    responseTimeMs,
    feedbackEntityIds: question.answerSpec.expectedEntityIds,
    responseLabel: "Lösung angezeigt",
    detail: question.feedback.expectedLabel
  };
}

export function unansweredAnswerResult(
  question: QuestionInstance,
  responseTimeMs: number
): AnswerResult {
  return {
    status: "skipped",
    score: 0,
    responseTimeMs,
    feedbackEntityIds: question.answerSpec.expectedEntityIds,
    responseLabel: "Keine Antwort",
    detail: question.feedback.expectedLabel
  };
}

export function timedOutAnswerResult(
  question: QuestionInstance,
  responseTimeMs: number
): AnswerResult {
  return {
    status: "timed_out",
    score: 0,
    responseTimeMs,
    feedbackEntityIds: question.answerSpec.expectedEntityIds,
    responseLabel: "Zeit abgelaufen",
    detail: `Richtig ist ${question.feedback.expectedLabel}.`
  };
}
