import {
  gradeQuestionAnswer,
  skippedAnswerResult,
  timedOutAnswerResult,
  unansweredAnswerResult,
  type AnswerPayload,
  type AnswerResult
} from "../graders/registry";
import type {
  MixedQuizDefinition,
  QuizDefinition,
  QuizRoundDefinition
} from "../quiz/definition";
import type { QuestionInstance } from "../quiz/question";
import {
  getLearningProfile,
  learningProfileFromRules
} from "../quiz/learningProfiles";

export type QuizSessionStatus =
  | "preparing"
  | "asking"
  | "feedback"
  | "paused"
  | "completed"
  | "abandoned";

export interface QuestionAttempt {
  id: string;
  sessionId: string;
  ordinal: number;
  questionSnapshot: QuestionInstance;
  answerPayload?: AnswerPayload;
  result: AnswerResult;
  answeredAt: string;
  graderVersion: string;
}

export interface QuizSessionState {
  schemaVersion: 1;
  id: string;
  definitionSnapshot: QuizRoundDefinition;
  datasetVersion: string;
  seed: string;
  status: QuizSessionStatus;
  questions: QuestionInstance[];
  currentQuestionIndex: number;
  attempts: QuestionAttempt[];
  score: number;
  maxScore: number;
  startedAt: string;
  completedAt?: string;
  timing: {
    totalElapsedMs: number;
    questionElapsedMs: number;
    activeSinceMs: number | null;
  };
}

export type QuizSessionEvent =
  | {
      type: "CONTENT_READY";
      questions: QuestionInstance[];
      atMs: number;
    }
  | {
      type: "ANSWER";
      payload: AnswerPayload;
      atMs: number;
      atIso: string;
    }
  | { type: "SKIP"; atMs: number; atIso: string }
  | { type: "PASS"; atMs: number; atIso: string }
  | { type: "TIME_EXPIRED"; atMs: number; atIso: string }
  | { type: "CONTINUE"; atMs: number; atIso: string }
  | { type: "PAUSE"; atMs: number }
  | { type: "RESUME"; atMs: number }
  | { type: "ABANDON"; atMs: number; atIso: string };

export function createPreparingSession(input: {
  id: string;
  definition: QuizRoundDefinition;
  datasetVersion: string;
  seed: string;
  startedAt: string;
}): QuizSessionState {
  return {
    schemaVersion: 1,
    id: input.id,
    definitionSnapshot: structuredClone(input.definition),
    datasetVersion: input.datasetVersion,
    seed: input.seed,
    status: "preparing",
    questions: [],
    currentQuestionIndex: 0,
    attempts: [],
    score: 0,
    maxScore: 0,
    startedAt: input.startedAt,
    timing: {
      totalElapsedMs: 0,
      questionElapsedMs: 0,
      activeSinceMs: null
    }
  };
}

function accrueTime(state: QuizSessionState, atMs: number) {
  const activeSinceMs = state.timing.activeSinceMs;

  if (activeSinceMs === null) {
    return state;
  }

  const elapsed = Math.max(0, atMs - activeSinceMs);

  return {
    ...state,
    timing: {
      totalElapsedMs: state.timing.totalElapsedMs + elapsed,
      questionElapsedMs: state.timing.questionElapsedMs + elapsed,
      activeSinceMs: null
    }
  };
}

function currentQuestion(state: QuizSessionState) {
  const question = state.questions[state.currentQuestionIndex];

  if (!question) {
    throw new Error(
      `Session ${state.id} besitzt an Position ${state.currentQuestionIndex} keine Frage.`
    );
  }

  return question;
}

function timerLimitMs(state: QuizSessionState) {
  const timer = state.definitionSnapshot.rules.timer;

  if (timer.kind === "none") {
    return undefined;
  }

  return timer.seconds * 1000;
}

export function getRemainingTimeMs(
  state: QuizSessionState,
  atMs: number
): number | undefined {
  const limit = timerLimitMs(state);

  if (limit === undefined) {
    return undefined;
  }

  const activeDelta =
    state.status === "asking" && state.timing.activeSinceMs !== null
      ? Math.max(0, atMs - state.timing.activeSinceMs)
      : 0;
  const elapsed =
    state.definitionSnapshot.rules.timer.kind === "total"
      ? state.timing.totalElapsedMs + activeDelta
      : state.timing.questionElapsedMs + activeDelta;

  return Math.max(0, limit - elapsed);
}

function hasExpired(state: QuizSessionState) {
  const limit = timerLimitMs(state);

  if (limit === undefined) {
    return false;
  }

  return state.definitionSnapshot.rules.timer.kind === "total"
    ? state.timing.totalElapsedMs >= limit
    : state.timing.questionElapsedMs >= limit;
}

function recordAttempt(
  state: QuizSessionState,
  result: AnswerResult,
  answerPayload: AnswerPayload | undefined,
  atMs: number,
  atIso: string
): QuizSessionState {
  const question = currentQuestion(state);
  const attempt: QuestionAttempt = {
    id: `${state.id}:${question.ordinal}`,
    sessionId: state.id,
    ordinal: question.ordinal,
    questionSnapshot: question,
    answerPayload,
    result,
    answeredAt: atIso,
    graderVersion: question.answerSpec.graderId
  };
  const attempts = [...state.attempts, attempt];
  const reachedCurrentEnd =
    state.currentQuestionIndex >= state.questions.length - 1;
  const alreadyHasRetries = state.questions.some(
    (candidate) => candidate.metadata.retryOfQuestionId !== undefined
  );
  const retryQuestions =
    reachedCurrentEnd &&
    state.definitionSnapshot.rules.retryMistakes &&
    !alreadyHasRetries
      ? attempts
          .filter(
            (candidate) =>
              candidate.result.status !== "correct" &&
              candidate.questionSnapshot.metadata.retryOfQuestionId ===
                undefined
          )
          .map((candidate, index) => {
            const original = candidate.questionSnapshot;
            const ordinal = state.questions.length + index;
            return {
              ...structuredClone(original),
              id: `${original.id}:retry:${index + 1}`,
              ordinal,
              metadata: {
                ...original.metadata,
                retryOfQuestionId: original.id
              }
            } satisfies QuestionInstance;
          })
      : [];
  const questions =
    retryQuestions.length > 0
      ? [...state.questions, ...retryQuestions]
      : state.questions;
  const score = state.score + result.score;
  const isLastQuestion =
    state.currentQuestionIndex >= questions.length - 1;
  const immediateFeedback =
    state.definitionSnapshot.rules.feedback === "immediate";

  if (immediateFeedback) {
    return {
      ...state,
      status: "feedback",
      questions,
      attempts,
      score,
      maxScore: questions.length,
      timing: {
        ...state.timing,
        activeSinceMs: null
      }
    };
  }

  if (isLastQuestion) {
    return {
      ...state,
      status: "completed",
      questions,
      attempts,
      score,
      maxScore: questions.length,
      completedAt: atIso,
      timing: {
        ...state.timing,
        activeSinceMs: null
      }
    };
  }

  return {
    ...state,
    status: "asking",
    questions,
    currentQuestionIndex: state.currentQuestionIndex + 1,
    attempts,
    score,
    maxScore: questions.length,
    timing: {
      ...state.timing,
      questionElapsedMs: 0,
      activeSinceMs: atMs
    }
  };
}

function assertStatus(
  state: QuizSessionState,
  allowed: QuizSessionStatus[],
  event: QuizSessionEvent["type"]
) {
  if (!allowed.includes(state.status)) {
    throw new Error(
      `Event ${event} ist im Sessionstatus ${state.status} nicht erlaubt.`
    );
  }
}

export function reduceQuizSession(
  state: QuizSessionState,
  event: QuizSessionEvent
): QuizSessionState {
  if (event.type === "CONTENT_READY") {
    assertStatus(state, ["preparing"], event.type);

    if (event.questions.length === 0) {
      throw new Error("Eine Session benötigt mindestens eine Frage.");
    }

    return {
      ...state,
      status: "asking",
      questions: structuredClone(event.questions),
      maxScore: event.questions.length,
      timing: {
        totalElapsedMs: 0,
        questionElapsedMs: 0,
        activeSinceMs: event.atMs
      }
    };
  }

  if (event.type === "ANSWER") {
    assertStatus(state, ["asking"], event.type);
    const stopped = accrueTime(state, event.atMs);
    const question = currentQuestion(stopped);
    const result = hasExpired(stopped)
      ? timedOutAnswerResult(question, stopped.timing.questionElapsedMs)
      : gradeQuestionAnswer(
          question,
          event.payload,
          stopped.timing.questionElapsedMs
        );

    return recordAttempt(
      stopped,
      result,
      hasExpired(stopped) ? undefined : event.payload,
      event.atMs,
      event.atIso
    );
  }

  if (
    event.type === "SKIP" ||
    event.type === "PASS" ||
    event.type === "TIME_EXPIRED"
  ) {
    assertStatus(state, ["asking"], event.type);
    const stopped = accrueTime(state, event.atMs);
    const question = currentQuestion(stopped);
    const result =
      event.type === "SKIP"
        ? skippedAnswerResult(question, stopped.timing.questionElapsedMs)
        : event.type === "PASS"
          ? unansweredAnswerResult(question, stopped.timing.questionElapsedMs)
          : timedOutAnswerResult(question, stopped.timing.questionElapsedMs);

    return recordAttempt(stopped, result, undefined, event.atMs, event.atIso);
  }

  if (event.type === "CONTINUE") {
    assertStatus(state, ["feedback"], event.type);
    const isLastQuestion =
      state.currentQuestionIndex >= state.questions.length - 1;

    if (isLastQuestion) {
      return {
        ...state,
        status: "completed",
        completedAt: event.atIso,
        timing: {
          ...state.timing,
          activeSinceMs: null
        }
      };
    }

    return {
      ...state,
      status: "asking",
      currentQuestionIndex: state.currentQuestionIndex + 1,
      timing: {
        ...state.timing,
        questionElapsedMs: 0,
        activeSinceMs: event.atMs
      }
    };
  }

  if (event.type === "PAUSE") {
    assertStatus(state, ["asking"], event.type);
    const stopped = accrueTime(state, event.atMs);
    return { ...stopped, status: "paused" };
  }

  if (event.type === "RESUME") {
    assertStatus(state, ["paused"], event.type);
    return {
      ...state,
      status: "asking",
      timing: {
        ...state.timing,
        activeSinceMs: event.atMs
      }
    };
  }

  assertStatus(
    state,
    ["preparing", "asking", "feedback", "paused"],
    event.type
  );
  const stopped =
    state.status === "asking" ? accrueTime(state, event.atMs) : state;

  return {
    ...stopped,
    status: "abandoned",
    completedAt: event.atIso,
    timing: {
      ...stopped.timing,
      activeSinceMs: null
    }
  };
}

export function createPersistedSessionSnapshot(
  state: QuizSessionState,
  atMs: number
): QuizSessionState {
  if (state.status !== "asking") {
    return structuredClone(state);
  }

  const stopped = accrueTime(state, atMs);
  return {
    ...stopped,
    status: "paused",
    timing: {
      ...stopped.timing,
      activeSinceMs: null
    }
  };
}

export function restorePersistedSession(
  state: QuizSessionState,
  atMs: number
): QuizSessionState {
  return state.status === "paused"
    ? reduceQuizSession(state, { type: "RESUME", atMs })
    : state;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isCoordinates(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every(isFiniteNumber)
  );
}

function isKnowledgeExplanation(value: unknown) {
  return (
    isRecord(value) &&
    typeof value.text === "string" &&
    Array.isArray(value.evidence) &&
    value.evidence.every(
      (evidence) =>
        isRecord(evidence) &&
        typeof evidence.labelDe === "string" &&
        typeof evidence.valueDe === "string" &&
        (evidence.factId === undefined ||
          typeof evidence.factId === "string") &&
        (evidence.relationId === undefined ||
          typeof evidence.relationId === "string")
    ) &&
    Array.isArray(value.sources) &&
    value.sources.every(
      (source) =>
        isRecord(source) &&
        typeof source.id === "string" &&
        typeof source.sourceVersion === "string" &&
        typeof source.retrievedAt === "string" &&
        typeof source.url === "string" &&
        typeof source.license === "string"
    )
  );
}

function isEntityRef(value: unknown) {
  return (
    isRecord(value) &&
    value.from === "subject" &&
    (value.relation === undefined ||
      (typeof value.relation === "string" &&
        (value.direction === "outgoing" || value.direction === "incoming")))
  );
}

function isQuizDefinitionSnapshot(value: unknown): value is QuizDefinition {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    typeof value.id !== "string" ||
    typeof value.datasetVersion !== "string"
  ) {
    return false;
  }
  if (
    !isRecord(value.content) ||
    typeof value.content.subjectType !== "string" ||
    (value.content.requiredRelations !== undefined &&
      !isStringArray(value.content.requiredRelations))
  ) {
    return false;
  }
  if (
    !isRecord(value.prompt) ||
    !["name", "visual_asset", "map_highlight", "fact", "description"].includes(
      String(value.prompt.kind)
    ) ||
    typeof value.prompt.locale !== "string" ||
    !isEntityRef(value.prompt.entity)
  ) {
    return false;
  }
  if (
    !isRecord(value.answer) ||
    ![
      "text_input",
      "single_choice",
      "multi_choice",
      "map_point",
      "map_area",
      "map_line",
      "drag_match",
      "sort_order"
    ].includes(String(value.answer.kind)) ||
    typeof value.answer.grader !== "string" ||
    !isEntityRef(value.answer.entity)
  ) {
    return false;
  }
  if (
    !isRecord(value.scope) ||
    !isStringArray(value.scope.regionIds) ||
    (value.scope.includeIds !== undefined &&
      !isStringArray(value.scope.includeIds)) ||
    (value.scope.excludeIds !== undefined &&
      !isStringArray(value.scope.excludeIds))
  ) {
    return false;
  }
  if (!isRecord(value.rules) || !isRecord(value.rules.timer)) {
    return false;
  }

  const questionCount = value.rules.questionCount;
  const timer = value.rules.timer;
  const validTimer =
    timer.kind === "none" ||
    ((timer.kind === "per_question" || timer.kind === "total") &&
      isFiniteNumber(timer.seconds) &&
      Number(timer.seconds) > 0);

  return (
    (questionCount === "all" ||
      (Number.isInteger(questionCount) && Number(questionCount) > 0)) &&
    value.rules.randomizer === "mulberry32-v1" &&
    validTimer &&
    (value.rules.feedback === "immediate" ||
      value.rules.feedback === "end") &&
    typeof value.rules.retryMistakes === "boolean" &&
    ["off", "one", "unlimited"].includes(String(value.rules.hints)) &&
    (value.rules.seed === undefined || typeof value.rules.seed === "string")
  );
}

function isMixedDefinitionSnapshot(
  value: unknown
): value is MixedQuizDefinition {
  if (
    !isRecord(value) ||
    value.kind !== "mixed" ||
    value.schemaVersion !== 1 ||
    typeof value.id !== "string" ||
    typeof value.datasetVersion !== "string" ||
    typeof value.label !== "string" ||
    (value.profile !== "learn" &&
      value.profile !== "practice" &&
      value.profile !== "exam") ||
    !isRecord(value.scope) ||
    !isStringArray(value.scope.regionIds) ||
    !Array.isArray(value.pools) ||
    value.pools.length < 2 ||
    !isRecord(value.schedule) ||
    !Number.isInteger(value.schedule.maxConsecutiveFromPool) ||
    Number(value.schedule.maxConsecutiveFromPool) < 1
  ) {
    return false;
  }

  if (
    !value.pools.every(
      (pool) =>
        isRecord(pool) &&
        typeof pool.id === "string" &&
        isFiniteNumber(pool.weight) &&
        Number(pool.weight) > 0 &&
        Number.isInteger(pool.minimum) &&
        Number(pool.minimum) >= 0 &&
        Number.isInteger(pool.maximum) &&
        Number(pool.maximum) >= Number(pool.minimum) &&
        isQuizDefinitionSnapshot(pool.definition)
    )
  ) {
    return false;
  }

  if (!isRulesSnapshot(value.rules, false)) return false;
  return (
    learningProfileFromRules(value.rules) === value.profile &&
    (getLearningProfile(value.profile).timerPolicy !== "disabled" ||
      value.rules.timer.kind === "none")
  );
}

function isRulesSnapshot(
  value: unknown,
  allowAll = true
): value is QuizDefinition["rules"] {
  if (!isRecord(value) || !isRecord(value.timer)) return false;
  const questionCount = value.questionCount;
  const timer = value.timer;
  const validTimer =
    timer.kind === "none" ||
    ((timer.kind === "per_question" || timer.kind === "total") &&
      isFiniteNumber(timer.seconds) &&
      Number(timer.seconds) > 0);

  return (
    ((allowAll && questionCount === "all") ||
      (Number.isInteger(questionCount) && Number(questionCount) > 0)) &&
    value.randomizer === "mulberry32-v1" &&
    validTimer &&
    (value.feedback === "immediate" || value.feedback === "end") &&
    typeof value.retryMistakes === "boolean" &&
    ["off", "one", "unlimited"].includes(String(value.hints)) &&
    (value.seed === undefined || typeof value.seed === "string")
  );
}

function isDefinitionSnapshot(
  value: unknown
): value is QuizRoundDefinition {
  return isRecord(value) && value.kind === "mixed"
    ? isMixedDefinitionSnapshot(value)
    : isQuizDefinitionSnapshot(value);
}

function isQuestionSnapshot(value: unknown): value is QuestionInstance {
  if (!isRecord(value) || value.schemaVersion !== 1) return false;
  if (
    typeof value.id !== "string" ||
    !Number.isInteger(value.ordinal) ||
    typeof value.subjectId !== "string" ||
    typeof value.promptText !== "string" ||
    typeof value.instruction !== "string"
  ) {
    return false;
  }
  if (
    !isRecord(value.promptPayload) ||
    !["name", "map_highlight", "visual_asset", "description", "fact"].includes(
      String(value.promptPayload.kind)
    ) ||
    typeof value.promptPayload.entityId !== "string" ||
    typeof value.promptPayload.label !== "string" ||
    ((value.promptPayload.kind === "name" ||
      value.promptPayload.kind === "description" ||
      value.promptPayload.kind === "fact") &&
      typeof value.promptPayload.locale !== "string") ||
    (value.promptPayload.kind === "fact" &&
      (!Array.isArray(value.promptPayload.facts) ||
        value.promptPayload.facts.length === 0 ||
        !value.promptPayload.facts.every(
          (fact) =>
            isRecord(fact) &&
            typeof fact.factTypeId === "string" &&
            typeof fact.label === "string" &&
            typeof fact.value === "string"
        ))) ||
    (value.promptPayload.kind === "map_highlight" &&
      value.promptPayload.coordinates !== undefined &&
      !isCoordinates(value.promptPayload.coordinates)) ||
    (value.promptPayload.kind === "map_highlight" &&
      value.promptPayload.areaId !== undefined &&
      typeof value.promptPayload.areaId !== "string") ||
    (value.promptPayload.kind === "map_highlight" &&
      value.promptPayload.lineId !== undefined &&
      typeof value.promptPayload.lineId !== "string") ||
    (value.promptPayload.kind === "visual_asset" &&
      (!isRecord(value.promptPayload.asset) ||
        !["flag", "country_outline"].includes(
          String(value.promptPayload.asset.kind)
        ) ||
        typeof value.promptPayload.asset.key !== "string" ||
        typeof value.promptPayload.asset.entityId !== "string"))
  ) {
    return false;
  }
  if (
    !isRecord(value.answerSpec) ||
    !["text_input", "single_choice", "map_point", "map_area", "map_line"].includes(
      String(value.answerSpec.kind)
    ) ||
    !Array.isArray(value.answerSpec.expectedEntityIds) ||
    !value.answerSpec.expectedEntityIds.every(
      (id) => typeof id === "string"
    ) ||
    typeof value.answerSpec.graderId !== "string" ||
    !isRecord(value.answerSpec.graderConfig) ||
    (value.answerSpec.options !== undefined &&
      (!Array.isArray(value.answerSpec.options) ||
        !value.answerSpec.options.every(
          (option) =>
            isRecord(option) &&
            typeof option.id === "string" &&
            typeof option.entityId === "string" &&
            typeof option.label === "string" &&
            (option.visualAsset === undefined ||
              (isRecord(option.visualAsset) &&
                ["flag", "country_outline"].includes(
                  String(option.visualAsset.kind)
                ) &&
                typeof option.visualAsset.key === "string" &&
                typeof option.visualAsset.entityId === "string"))
        )))
  ) {
    return false;
  }
  if (
    !isRecord(value.feedback) ||
    typeof value.feedback.expectedLabel !== "string" ||
    (value.feedback.targetCoordinates !== undefined &&
      !isCoordinates(value.feedback.targetCoordinates)) ||
    (value.feedback.targetAreaId !== undefined &&
      typeof value.feedback.targetAreaId !== "string") ||
    (value.feedback.targetLineId !== undefined &&
      typeof value.feedback.targetLineId !== "string") ||
    (value.feedback.explanation !== undefined &&
      !isKnowledgeExplanation(value.feedback.explanation)) ||
    !isRecord(value.metadata) ||
    typeof value.metadata.promptKind !== "string" ||
    typeof value.metadata.skillKey !== "string" ||
    typeof value.metadata.regionId !== "string" ||
    (value.metadata.entityType !== undefined &&
      typeof value.metadata.entityType !== "string") ||
    (value.metadata.answerEntityType !== undefined &&
      typeof value.metadata.answerEntityType !== "string") ||
    (value.metadata.sourceDefinitionId !== undefined &&
      typeof value.metadata.sourceDefinitionId !== "string") ||
    (value.metadata.sourcePoolId !== undefined &&
      typeof value.metadata.sourcePoolId !== "string") ||
    (value.metadata.retryOfQuestionId !== undefined &&
      typeof value.metadata.retryOfQuestionId !== "string")
  ) {
    return false;
  }
  return true;
}

function isAnswerPayload(value: unknown): value is AnswerPayload {
  if (!isRecord(value) || typeof value.kind !== "string") return false;
  if (value.kind === "text_input") return typeof value.value === "string";
  if (value.kind === "single_choice") {
    return typeof value.entityId === "string";
  }
  if (value.kind === "map_point") {
    return (
      Array.isArray(value.coordinates) &&
      value.coordinates.length === 2 &&
      value.coordinates.every(isFiniteNumber)
    );
  }
  if (value.kind === "map_area") {
    return (
      (value.areaId === undefined || typeof value.areaId === "string") &&
      (value.label === undefined || typeof value.label === "string")
    );
  }
  if (value.kind === "map_line") {
    return (
      (value.lineId === undefined || typeof value.lineId === "string") &&
      (value.label === undefined || typeof value.label === "string")
    );
  }
  return false;
}

function isAttempt(value: unknown): value is QuestionAttempt {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.sessionId === "string" &&
    Number.isInteger(value.ordinal) &&
    isQuestionSnapshot(value.questionSnapshot) &&
    (value.answerPayload === undefined || isAnswerPayload(value.answerPayload)) &&
    isRecord(value.result) &&
    ["correct", "incorrect", "partial", "timed_out", "skipped"].includes(
      String(value.result.status)
    ) &&
    isFiniteNumber(value.result.score) &&
    isFiniteNumber(value.result.responseTimeMs) &&
    Array.isArray(value.result.feedbackEntityIds) &&
    value.result.feedbackEntityIds.every((id) => typeof id === "string") &&
    typeof value.result.responseLabel === "string" &&
    typeof value.result.detail === "string" &&
    typeof value.answeredAt === "string" &&
    typeof value.graderVersion === "string"
  );
}

export function validateQuizSessionState(value: unknown): {
  success: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (!isRecord(value)) {
    return { success: false, issues: ["Session ist kein Objekt."] };
  }

  if (value.schemaVersion !== 1) issues.push("schemaVersion wird nicht unterstützt.");
  if (typeof value.id !== "string") issues.push("id fehlt.");
  if (
    !["preparing", "asking", "feedback", "paused", "completed", "abandoned"].includes(
      String(value.status)
    )
  ) {
    issues.push("status ist ungültig.");
  }
  if (
    !isDefinitionSnapshot(value.definitionSnapshot)
  ) {
    issues.push("definitionSnapshot ist ungültig.");
  }
  if (typeof value.datasetVersion !== "string") issues.push("datasetVersion fehlt.");
  if (typeof value.seed !== "string") issues.push("seed fehlt.");
  if (!Array.isArray(value.questions) || !value.questions.every(isQuestionSnapshot)) {
    issues.push("questions enthält ungültige Snapshots.");
  }
  if (!Array.isArray(value.attempts) || !value.attempts.every(isAttempt)) {
    issues.push("attempts enthält ungültige Versuche.");
  }
  if (
    !Number.isInteger(value.currentQuestionIndex) ||
    Number(value.currentQuestionIndex) < 0 ||
    (Array.isArray(value.questions) &&
      value.questions.length > 0 &&
      Number(value.currentQuestionIndex) >= value.questions.length)
  ) {
    issues.push("currentQuestionIndex ist ungültig.");
  }
  if (!isFiniteNumber(value.score) || !isFiniteNumber(value.maxScore)) {
    issues.push("Scoring ist ungültig.");
  }
  if (typeof value.startedAt !== "string") issues.push("startedAt fehlt.");
  if (
    !isRecord(value.timing) ||
    !isFiniteNumber(value.timing.totalElapsedMs) ||
    !isFiniteNumber(value.timing.questionElapsedMs) ||
    (value.timing.activeSinceMs !== null &&
      !isFiniteNumber(value.timing.activeSinceMs))
  ) {
    issues.push("timing ist ungültig.");
  }
  if (value.status === "completed" && typeof value.completedAt !== "string") {
    issues.push("completedAt fehlt bei abgeschlossener Session.");
  }

  if (Array.isArray(value.attempts)) {
    const validAttempts = value.attempts.filter(isAttempt);
    const ordinals = validAttempts.map((attempt) => attempt.ordinal);
    if (new Set(ordinals).size !== ordinals.length) {
      issues.push("Versuchsordinal ist doppelt.");
    }
    if (
      typeof value.id === "string" &&
      validAttempts.some((attempt) => attempt.sessionId !== value.id)
    ) {
      issues.push("Versuch verweist auf eine andere Session.");
    }
    if (Array.isArray(value.questions) && value.questions.every(isQuestionSnapshot)) {
      const questionsByOrdinal = new Map(
        value.questions.map((question) => [question.ordinal, question])
      );
      if (
        validAttempts.some(
          (attempt) =>
            questionsByOrdinal.get(attempt.ordinal)?.id !==
            attempt.questionSnapshot.id
        )
      ) {
        issues.push("Versuch passt nicht zum Fragensnapshot.");
      }
      if (
        new Set(value.questions.map((question) => question.id)).size !==
        value.questions.length
      ) {
        issues.push("Fragen-ID ist doppelt.");
      }
    }
  }

  return { success: issues.length === 0, issues };
}

export function isQuizSessionState(value: unknown): value is QuizSessionState {
  return validateQuizSessionState(value).success;
}
