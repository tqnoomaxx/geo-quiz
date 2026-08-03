import { gradeMapArea } from "./area";
import { gradeSingleChoice } from "./choice";
import {
  gradeMapPoint,
  type Coordinates
} from "./geo";
import { gradeMapLine } from "./line";
import { gradeTextAnswer } from "./text";
import type { QuestionInstance } from "../quiz/question";

export type AnswerPayload =
  | { kind: "text_input"; value: string }
  | { kind: "single_choice"; entityId: string }
  | { kind: "map_point"; coordinates: Coordinates }
  | { kind: "map_area"; areaId?: string; label?: string }
  | { kind: "map_line"; lineId?: string; label?: string };

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
