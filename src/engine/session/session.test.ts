import { describe, expect, it } from "vitest";
import { geoDataset } from "../../content/dataset";
import { createContentRepository } from "../../content/repository";
import { generateQuestions } from "../quiz/generator";
import {
  CAPITALS_EUROPE_MAP_POINT_V1,
  createMvpQuizDefinition,
  DEFAULT_MVP_SETUP
} from "../quiz/presets";
import {
  createPersistedSessionSnapshot,
  createPreparingSession,
  getRemainingTimeMs,
  reduceQuizSession,
  restorePersistedSession,
  validateQuizSessionState
} from "./session";
import { sessionToResult } from "./result";

const questions = generateQuestions(
  CAPITALS_EUROPE_MAP_POINT_V1,
  createContentRepository(geoDataset),
  "session-test"
);

function askingSession() {
  const preparing = createPreparingSession({
    id: "session:test",
    definition: CAPITALS_EUROPE_MAP_POINT_V1,
    datasetVersion: geoDataset.version,
    seed: "session-test",
    startedAt: "2026-07-30T10:00:00.000Z"
  });

  return reduceQuizSession(preparing, {
    type: "CONTENT_READY",
    questions,
    atMs: 100
  });
}

describe("Quiz session engine", () => {
  it("moves from asking through feedback to the next question", () => {
    const asking = askingSession();
    const target = questions[0].feedback.targetCoordinates;
    expect(target).toBeDefined();

    const feedback = reduceQuizSession(asking, {
      type: "ANSWER",
      payload: { kind: "map_point", coordinates: target! },
      atMs: 1_100,
      atIso: "2026-07-30T10:00:01.000Z"
    });

    expect(feedback.status).toBe("feedback");
    expect(feedback.score).toBe(1);
    expect(feedback.attempts[0].result).toMatchObject({
      status: "correct",
      responseTimeMs: 1_000
    });

    const next = reduceQuizSession(feedback, {
      type: "CONTINUE",
      atMs: 1_300,
      atIso: "2026-07-30T10:00:01.200Z"
    });

    expect(next.status).toBe("asking");
    expect(next.currentQuestionIndex).toBe(1);
    expect(next.timing.questionElapsedMs).toBe(0);
  });

  it("reveals the solution while retaining the compatible skipped outcome", () => {
    const feedback = reduceQuizSession(askingSession(), {
      type: "SKIP",
      atMs: 1_100,
      atIso: "2026-07-30T10:00:01.000Z"
    });

    expect(feedback.status).toBe("feedback");
    expect(feedback.attempts[0].result).toMatchObject({
      status: "skipped",
      responseLabel: "Lösung angezeigt",
      detail: questions[0].feedback.expectedLabel
    });
  });

  it("keeps the original question set even for legacy retry rules", () => {
    const initial = askingSession();
    const practice = {
      ...initial,
      questions: initial.questions.slice(0, 2),
      maxScore: 2,
      definitionSnapshot: {
        ...CAPITALS_EUROPE_MAP_POINT_V1,
        rules: {
          ...CAPITALS_EUROPE_MAP_POINT_V1.rules,
          retryMistakes: true,
          hints: "one" as const
        }
      }
    };
    const firstFeedback = reduceQuizSession(practice, {
      type: "SKIP",
      atMs: 1_100,
      atIso: "2026-07-30T10:00:01.000Z"
    });
    const secondQuestion = reduceQuizSession(firstFeedback, {
      type: "CONTINUE",
      atMs: 1_200,
      atIso: "2026-07-30T10:00:01.100Z"
    });
    const secondFeedback = reduceQuizSession(secondQuestion, {
      type: "ANSWER",
      payload: {
        kind: "map_point",
        coordinates: secondQuestion.questions[1].feedback.targetCoordinates!
      },
      atMs: 2_000,
      atIso: "2026-07-30T10:00:02.000Z"
    });

    expect(secondFeedback.questions).toHaveLength(2);
    expect(secondFeedback.maxScore).toBe(2);

    const completed = reduceQuizSession(secondFeedback, {
      type: "CONTINUE",
      atMs: 2_100,
      atIso: "2026-07-30T10:00:02.100Z"
    });

    expect(completed.status).toBe("completed");
    expect(completed.questions).toHaveLength(2);
    expect(completed.attempts).toHaveLength(2);
  });

  it("continues an exam without revealing an unanswered solution", () => {
    const initial = askingSession();
    const exam = {
      ...initial,
      questions: initial.questions.slice(0, 2),
      maxScore: 2,
      definitionSnapshot: {
        ...CAPITALS_EUROPE_MAP_POINT_V1,
        rules: {
          ...CAPITALS_EUROPE_MAP_POINT_V1.rules,
          feedback: "end" as const,
          hints: "off" as const
        }
      }
    };
    const next = reduceQuizSession(exam, {
      type: "PASS",
      atMs: 1_100,
      atIso: "2026-07-30T10:00:01.000Z"
    });

    expect(next.status).toBe("asking");
    expect(next.currentQuestionIndex).toBe(1);
    expect(next.attempts[0].result).toMatchObject({
      status: "skipped",
      responseLabel: "Keine Antwort"
    });
  });

  it("grades and persists an exact river line selection", () => {
    const definition = createMvpQuizDefinition({
      ...DEFAULT_MVP_SETUP,
      topic: "rivers",
      direction: "locate",
      regionId: "world",
      seed: "session-river"
    });
    const riverQuestions = generateQuestions(
      definition,
      createContentRepository(geoDataset),
      "session-river"
    );
    const preparing = createPreparingSession({
      id: "session:river",
      definition,
      datasetVersion: geoDataset.version,
      seed: "session-river",
      startedAt: "2026-07-30T10:00:00.000Z"
    });
    const asking = reduceQuizSession(preparing, {
      type: "CONTENT_READY",
      questions: riverQuestions,
      atMs: 100
    });
    const expectedLineId = riverQuestions[0].feedback.targetLineId;
    expect(expectedLineId).toBeDefined();

    const feedback = reduceQuizSession(asking, {
      type: "ANSWER",
      payload: { kind: "map_line", lineId: expectedLineId },
      atMs: 1_100,
      atIso: "2026-07-30T10:00:01.000Z"
    });
    const restored = restorePersistedSession(
      createPersistedSessionSnapshot(feedback, 1_200),
      2_000
    );

    expect(feedback.attempts[0].result.status).toBe("correct");
    expect(restored.attempts[0].answerPayload).toEqual({
      kind: "map_line",
      lineId: expectedLineId
    });
  });

  it("validates persisted knowledge prompts with evidence and sources", () => {
    const definition = createMvpQuizDefinition({
      ...DEFAULT_MVP_SETUP,
      topic: "knowledge",
      direction: "choice",
      regionId: "world",
      seed: "session-knowledge"
    });
    const knowledgeQuestions = generateQuestions(
      definition,
      createContentRepository(geoDataset),
      "session-knowledge"
    );
    const preparing = createPreparingSession({
      id: "session:knowledge",
      definition,
      datasetVersion: geoDataset.version,
      seed: "session-knowledge",
      startedAt: "2026-07-30T10:00:00.000Z"
    });
    const asking = reduceQuizSession(preparing, {
      type: "CONTENT_READY",
      questions: knowledgeQuestions,
      atMs: 100
    });

    expect(asking.questions[0]).toMatchObject({
      promptPayload: { kind: "description" },
      feedback: { explanation: { text: expect.any(String) } }
    });
    expect(validateQuizSessionState(JSON.parse(JSON.stringify(asking)))).toEqual({
      success: true,
      issues: []
    });
  });

  it("stores active sessions as paused snapshots with folded time", () => {
    const asking = askingSession();
    const persisted = createPersistedSessionSnapshot(asking, 600);

    expect(persisted.status).toBe("paused");
    expect(persisted.timing).toEqual({
      totalElapsedMs: 500,
      questionElapsedMs: 500,
      activeSinceMs: null
    });

    const restored = restorePersistedSession(persisted, 2_000);
    expect(restored.status).toBe("asking");
    expect(restored.timing.activeSinceMs).toBe(2_000);
  });

  it("is JSON serializable", () => {
    const state = askingSession();
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });

  it("marks a late answer as timed out without time bonus or score", () => {
    const timedDefinition = {
      ...CAPITALS_EUROPE_MAP_POINT_V1,
      rules: {
        ...CAPITALS_EUROPE_MAP_POINT_V1.rules,
        timer: { kind: "per_question" as const, seconds: 1 }
      }
    };
    const preparing = createPreparingSession({
      id: "session:timer",
      definition: timedDefinition,
      datasetVersion: geoDataset.version,
      seed: "timer",
      startedAt: "2026-07-30T10:00:00.000Z"
    });
    const asking = reduceQuizSession(preparing, {
      type: "CONTENT_READY",
      questions,
      atMs: 100
    });
    const target = questions[0].feedback.targetCoordinates;
    const timedOut = reduceQuizSession(asking, {
      type: "ANSWER",
      payload: { kind: "map_point", coordinates: target! },
      atMs: 1_200,
      atIso: "2026-07-30T10:00:01.100Z"
    });

    expect(timedOut.attempts[0].result).toMatchObject({
      status: "timed_out",
      score: 0,
      responseTimeMs: 1_100
    });
    expect(timedOut.score).toBe(0);
  });

  it("reports the remaining per-question time from live and folded timing", () => {
    const timedDefinition = {
      ...CAPITALS_EUROPE_MAP_POINT_V1,
      rules: {
        ...CAPITALS_EUROPE_MAP_POINT_V1.rules,
        timer: { kind: "per_question" as const, seconds: 15 }
      }
    };
    const preparing = createPreparingSession({
      id: "session:remaining-time",
      definition: timedDefinition,
      datasetVersion: geoDataset.version,
      seed: "remaining-time",
      startedAt: "2026-07-30T10:00:00.000Z"
    });
    const asking = reduceQuizSession(preparing, {
      type: "CONTENT_READY",
      questions,
      atMs: 1_000
    });

    expect(getRemainingTimeMs(asking, 4_500)).toBe(11_500);

    const persisted = createPersistedSessionSnapshot(asking, 6_000);
    expect(getRemainingTimeMs(persisted, 20_000)).toBe(10_000);
  });

  it("deeply rejects corrupted question and attempt snapshots", () => {
    const asking = askingSession();
    const answered = reduceQuizSession(asking, {
      type: "ANSWER",
      payload: {
        kind: "map_point",
        coordinates: questions[0].feedback.targetCoordinates!
      },
      atMs: 1_100,
      atIso: "2026-07-30T10:00:01.000Z"
    });

    expect(validateQuizSessionState(answered)).toEqual({
      success: true,
      issues: []
    });

    const corruptedQuestion = structuredClone(answered) as unknown as {
      questions: Array<{ answerSpec: { expectedEntityIds: unknown } }>;
    };
    corruptedQuestion.questions[0].answerSpec.expectedEntityIds = [42];
    expect(validateQuizSessionState(corruptedQuestion)).toMatchObject({
      success: false,
      issues: expect.arrayContaining([
        "questions enthält ungültige Snapshots."
      ])
    });

    const corruptedAttempt = structuredClone(answered) as unknown as {
      attempts: Array<{ answerPayload: { coordinates: unknown } }>;
    };
    corruptedAttempt.attempts[0].answerPayload.coordinates = ["Berlin", 52];
    expect(validateQuizSessionState(corruptedAttempt)).toMatchObject({
      success: false,
      issues: expect.arrayContaining([
        "attempts enthält ungültige Versuche."
      ])
    });
  });

  it("creates a stable result after the final feedback", () => {
    let state = askingSession();

    for (const question of questions) {
      state = reduceQuizSession(state, {
        type: "SKIP",
        atMs: (question.ordinal + 1) * 1_000,
        atIso: `2026-07-30T10:00:${String(question.ordinal + 1).padStart(2, "0")}.000Z`
      });
      state = reduceQuizSession(state, {
        type: "CONTINUE",
        atMs: (question.ordinal + 1) * 1_000 + 10,
        atIso: `2026-07-30T10:00:${String(question.ordinal + 1).padStart(2, "0")}.010Z`
      });
    }

    expect(state.status).toBe("completed");
    expect(sessionToResult(state)).toMatchObject({
      correct: 0,
      total: 10,
      score: 0,
      maxScore: 10
    });
  });
});
