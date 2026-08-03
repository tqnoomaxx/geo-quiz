import type { AnswerPayload } from "../graders/registry";
import type { QuizSessionState } from "./session";

export interface AnswerRecord {
  questionId: string;
  prompt: string;
  expectedLabel: string;
  correct: boolean;
  responseLabel: string;
  detail: string;
}

export interface SessionResult {
  schemaVersion: 1;
  sessionId: string;
  quizDefinitionId: string;
  datasetVersion: string;
  seed: string;
  correct: number;
  total: number;
  score: number;
  maxScore: number;
  durationMs: number;
  answers: AnswerRecord[];
  completedAt: string;
}

function payloadLabel(payload: AnswerPayload | undefined) {
  if (!payload) {
    return undefined;
  }

  if (payload.kind === "text_input") {
    return payload.value;
  }

  if (payload.kind === "map_area" || payload.kind === "map_line") {
    return payload.label ?? (
      payload.kind === "map_area" ? "Keine Fläche" : "Keine Linie"
    );
  }

  if (payload.kind === "single_choice") {
    return undefined;
  }

  if (
    payload.kind === "country_profile_input" ||
    payload.kind === "fact_profile_input"
  ) {
    return Object.values(payload.values).join(" · ");
  }

  return `${payload.coordinates[1].toFixed(2)}, ${payload.coordinates[0].toFixed(2)}`;
}

export function sessionToResult(state: QuizSessionState): SessionResult {
  if (state.status !== "completed" || !state.completedAt) {
    throw new Error("Nur eine abgeschlossene Session besitzt ein Ergebnis.");
  }

  const answers = state.attempts.map((attempt) => ({
    questionId: attempt.questionSnapshot.id,
    prompt: attempt.questionSnapshot.promptText,
    expectedLabel: attempt.questionSnapshot.feedback.expectedLabel,
    correct: attempt.result.status === "correct",
    responseLabel:
      payloadLabel(attempt.answerPayload) ?? attempt.result.responseLabel,
    detail: attempt.result.detail
  }));

  return {
    schemaVersion: 1,
    sessionId: state.id,
    quizDefinitionId: state.definitionSnapshot.id,
    datasetVersion: state.datasetVersion,
    seed: state.seed,
    correct: answers.filter((answer) => answer.correct).length,
    total: answers.length,
    score: state.score,
    maxScore: state.maxScore,
    durationMs: Math.round(state.timing.totalElapsedMs),
    answers,
    completedAt: state.completedAt
  };
}
