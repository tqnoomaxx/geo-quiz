import type { QuizSessionState } from "../session/session";

export type ProgressOutcome =
  | "correct"
  | "incorrect"
  | "timed_out"
  | "skipped";

export interface ProgressEvent {
  schemaVersion: 1;
  id: string;
  profileId: string;
  sessionId: string;
  questionId: string;
  entityId: string;
  skillKey: string;
  outcome: ProgressOutcome;
  score: number;
  responseTimeMs: number;
  occurredAt: string;
  datasetVersion: string;
  quizDefinitionId: string;
}

export interface SkillProgress {
  skillKey: string;
  attempts: number;
  correct: number;
  accuracy: number;
}

export interface EntityProgress {
  entityId: string;
  attempts: number;
  correct: number;
  accuracy: number;
  lastOccurredAt: string;
}

export interface ProgressSummary {
  attempts: number;
  correct: number;
  accuracy: number;
  completedSessions: number;
  skills: SkillProgress[];
  weakEntities: EntityProgress[];
}

export interface ReviewQueueItem {
  key: string;
  entityId: string;
  skillKey: string;
  lastOutcome: Exclude<ProgressOutcome, "correct">;
  occurredAt: string;
  sourceEventId: string;
}

export function progressEventsFromSession(
  state: QuizSessionState,
  profileId: string
): ProgressEvent[] {
  if (state.status !== "completed") {
    throw new Error("Fortschritt entsteht nur aus abgeschlossenen Sessions.");
  }

  return state.attempts.map((attempt) => {
    const question = attempt.questionSnapshot;
    const status = attempt.result.status;
    const outcome: ProgressOutcome =
      status === "correct"
        ? "correct"
        : status === "timed_out"
          ? "timed_out"
          : status === "skipped"
            ? "skipped"
            : "incorrect";

    return {
      schemaVersion: 1,
      id: `progress:${attempt.id}`,
      profileId,
      sessionId: state.id,
      questionId: question.id,
      entityId: question.subjectId,
      skillKey: question.metadata.skillKey,
      outcome,
      score: attempt.result.score,
      responseTimeMs: attempt.result.responseTimeMs,
      occurredAt: attempt.answeredAt,
      datasetVersion: state.datasetVersion,
      quizDefinitionId: state.definitionSnapshot.id
    };
  });
}

export function isProgressEvent(value: unknown): value is ProgressEvent {
  return (
    typeof value === "object" &&
    value !== null &&
    "schemaVersion" in value &&
    value.schemaVersion === 1 &&
    "id" in value &&
    typeof value.id === "string" &&
    "profileId" in value &&
    typeof value.profileId === "string" &&
    "sessionId" in value &&
    typeof value.sessionId === "string" &&
    "questionId" in value &&
    typeof value.questionId === "string" &&
    "entityId" in value &&
    typeof value.entityId === "string" &&
    "skillKey" in value &&
    typeof value.skillKey === "string" &&
    "outcome" in value &&
    ["correct", "incorrect", "timed_out", "skipped"].includes(
      String(value.outcome)
    ) &&
    "score" in value &&
    typeof value.score === "number" &&
    Number.isFinite(value.score) &&
    value.score >= 0 &&
    "responseTimeMs" in value &&
    typeof value.responseTimeMs === "number" &&
    Number.isFinite(value.responseTimeMs) &&
    value.responseTimeMs >= 0 &&
    "occurredAt" in value &&
    typeof value.occurredAt === "string" &&
    !Number.isNaN(Date.parse(value.occurredAt)) &&
    "datasetVersion" in value &&
    typeof value.datasetVersion === "string" &&
    "quizDefinitionId" in value &&
    typeof value.quizDefinitionId === "string"
  );
}

export function summarizeProgress(
  events: readonly ProgressEvent[]
): ProgressSummary {
  const skillBuckets = new Map<
    string,
    { attempts: number; correct: number }
  >();
  const entityBuckets = new Map<
    string,
    {
      attempts: number;
      correct: number;
      lastOccurredAt: string;
    }
  >();
  const sessions = new Set<string>();
  let correct = 0;

  for (const event of events) {
    sessions.add(event.sessionId);
    if (event.outcome === "correct") correct += 1;

    const skill = skillBuckets.get(event.skillKey) ?? {
      attempts: 0,
      correct: 0
    };
    skill.attempts += 1;
    if (event.outcome === "correct") skill.correct += 1;
    skillBuckets.set(event.skillKey, skill);

    const entity = entityBuckets.get(event.entityId) ?? {
      attempts: 0,
      correct: 0,
      lastOccurredAt: event.occurredAt
    };
    entity.attempts += 1;
    if (event.outcome === "correct") entity.correct += 1;
    if (event.occurredAt > entity.lastOccurredAt) {
      entity.lastOccurredAt = event.occurredAt;
    }
    entityBuckets.set(event.entityId, entity);
  }

  const accuracy = (hits: number, attempts: number) =>
    attempts === 0 ? 0 : Math.round((hits / attempts) * 100);
  const skills = [...skillBuckets.entries()]
    .map(([skillKey, value]) => ({
      skillKey,
      ...value,
      accuracy: accuracy(value.correct, value.attempts)
    }))
    .sort((left, right) => left.skillKey.localeCompare(right.skillKey));
  const weakEntities = [...entityBuckets.entries()]
    .map(([entityId, value]) => ({
      entityId,
      ...value,
      accuracy: accuracy(value.correct, value.attempts)
    }))
    .filter((entity) => entity.correct < entity.attempts)
    .sort(
      (left, right) =>
        left.accuracy - right.accuracy ||
        right.attempts - left.attempts ||
        left.entityId.localeCompare(right.entityId)
    )
    .slice(0, 12);

  return {
    attempts: events.length,
    correct,
    accuracy: accuracy(correct, events.length),
    completedSessions: sessions.size,
    skills,
    weakEntities
  };
}

export function buildReviewQueue(
  inputEvents: readonly ProgressEvent[],
  limit = 20
): ReviewQueueItem[] {
  const events = [...inputEvents].sort(
    (left, right) =>
      left.occurredAt.localeCompare(right.occurredAt) ||
      left.id.localeCompare(right.id)
  );
  const open = new Map<string, ReviewQueueItem>();

  for (const event of events) {
    const key = `${event.entityId}|${event.skillKey}`;
    if (event.outcome === "correct") {
      open.delete(key);
      continue;
    }

    open.set(key, {
      key,
      entityId: event.entityId,
      skillKey: event.skillKey,
      lastOutcome: event.outcome,
      occurredAt: event.occurredAt,
      sourceEventId: event.id
    });
  }

  return [...open.values()]
    .sort(
      (left, right) =>
        left.occurredAt.localeCompare(right.occurredAt) ||
        left.key.localeCompare(right.key)
    )
    .slice(0, Math.max(0, limit));
}
