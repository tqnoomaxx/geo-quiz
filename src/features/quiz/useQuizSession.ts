import { useCallback, useEffect, useRef, useState } from "react";
import { geoDataset } from "../../content/dataset";
import { createContentRepository } from "../../content/repository";
import { loadDatasetForRankedContent } from "../../content/rankedContent";
import type { AnswerPayload } from "../../engine/graders/registry";
import {
  isMixedQuizDefinition,
  parseQuizRoundDefinition,
  validateQuizRoundDefinition,
  type QuizRoundDefinition
} from "../../engine/quiz/definition";
import { generateRoundQuestions } from "../../engine/mixed/scheduler";
import {
  createMvpQuizDefinition,
  DEFAULT_MVP_SETUP
} from "../../engine/quiz/presets";
import {
  createPreparingSession,
  reduceQuizSession,
  restorePersistedSession,
  type QuizSessionState
} from "../../engine/session/session";
import { getSessionRepository } from "../../persistence/sessionRepository";
import { preloadQuestionAssets } from "./questionAssets";
import { consumeQuizSessionRequest } from "./sessionIntent";

const contentRepository = createContentRepository(geoDataset);

function definitionNeedsRankedCities(definition: QuizRoundDefinition) {
  return isMixedQuizDefinition(definition)
    ? definition.pools.some(
        (pool) => pool.definition.content.subjectType === "ranked_city"
      )
    : definition.content.subjectType === "ranked_city";
}

function definitionNeedsRankedPhysical(definition: QuizRoundDefinition) {
  const isRankedPhysicalType = (subjectType: string) =>
    subjectType === "ranked_river" || subjectType === "ranked_peak";
  return isMixedQuizDefinition(definition)
    ? definition.pools.some((pool) =>
        isRankedPhysicalType(pool.definition.content.subjectType)
      )
    : isRankedPhysicalType(definition.content.subjectType);
}

async function datasetForDefinition(definition: QuizRoundDefinition) {
  return loadDatasetForRankedContent({
    cities: definitionNeedsRankedCities(definition),
    physical: definitionNeedsRankedPhysical(definition)
  });
}

function defaultDefinition() {
  return createMvpQuizDefinition({
    ...DEFAULT_MVP_SETUP,
    seed: crypto.randomUUID()
  });
}

async function newSession(definition: QuizRoundDefinition, atMs: number) {
  const dataset = await datasetForDefinition(definition);
  const repository =
    dataset === geoDataset
      ? contentRepository
      : createContentRepository(dataset);
  const parsed = parseQuizRoundDefinition(definition, dataset);
  const seed = parsed.rules.seed ?? crypto.randomUUID();
  const questions = generateRoundQuestions(parsed, repository, seed);
  await preloadQuestionAssets(questions);
  const preparing = createPreparingSession({
    id: crypto.randomUUID(),
    definition: parsed,
    datasetVersion: geoDataset.version,
    seed,
    startedAt: new Date().toISOString()
  });

  return reduceQuizSession(preparing, {
    type: "CONTENT_READY",
    questions,
    atMs
  });
}

export function useQuizSession() {
  const [session, setSession] = useState<QuizSessionState>();
  const [storageWarning, setStorageWarning] = useState<string>();
  const [restored, setRestored] = useState(false);
  const [completionReady, setCompletionReady] = useState(false);
  const [lastSavedAttemptId, setLastSavedAttemptId] = useState<string>();
  const sessionRef = useRef<QuizSessionState | undefined>(undefined);
  const repository = getSessionRepository();
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const saveSession = useCallback(
    (value: QuizSessionState, atMs: number) => {
      const save = saveQueueRef.current
        .catch(() => undefined)
        .then(() => repository.save(value, atMs));
      saveQueueRef.current = save;
      return save;
    },
    [repository]
  );

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      const atMs = performance.now();
      const requestedDefinition = consumeQuizSessionRequest();

      try {
        if (requestedDefinition) {
          await repository.clearActive();
        }
        const active = requestedDefinition
          ? undefined
          : await repository.loadActive();

        if (cancelled) return;

        if (
          active &&
          active.datasetVersion === geoDataset.version &&
          active.status !== "completed" &&
          active.status !== "abandoned"
        ) {
          const activeDataset = await datasetForDefinition(
            active.definitionSnapshot
          );
          if (
            validateQuizRoundDefinition(
              active.definitionSnapshot,
              activeDataset
            ).success
          ) {
            const resumed = restorePersistedSession(active, atMs);
            setRestored(true);
            sessionRef.current = resumed;
            setSession(resumed);
            await saveSession(resumed, atMs);
            return;
          }
        }

        if (active) {
          await repository.clearActive();
          setStorageWarning(
            "Eine ältere, nicht kompatible Runde wurde sicher verworfen."
          );
        }
      } catch {
        if (!cancelled) {
          setStorageWarning(
            "Lokales Speichern ist in diesem Browser gerade nicht verfügbar."
          );
        }
      }

      if (cancelled) return;

      let created: QuizSessionState;
      try {
        created = await newSession(
          requestedDefinition ?? defaultDefinition(),
          atMs
        );
      } catch (error) {
        setStorageWarning(
          error instanceof Error
            ? error.message
            : "Die Quizdefinition konnte nicht vorbereitet werden."
        );
        return;
      }

      sessionRef.current = created;
      setSession(created);

      try {
        await saveSession(created, atMs);
      } catch {
        if (!cancelled) {
          setStorageWarning(
            "Die Runde läuft, kann aber momentan nicht lokal gespeichert werden."
          );
        }
      }
    }

    void initialize();
    return () => {
      cancelled = true;
    };
  }, [repository, saveSession]);

  useEffect(() => {
    if (session?.status !== "completed") return;

    let cancelled = false;
    const atMs = performance.now();

    void saveSession(session, atMs)
      .catch(() => {
        setStorageWarning(
          "Das Ergebnis konnte nicht dauerhaft gespeichert werden."
        );
      })
      .finally(() => {
        if (!cancelled) setCompletionReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [saveSession, session]);

  const applyEvent = useCallback(
    (
      eventFactory: (
        state: QuizSessionState,
        atMs: number,
        atIso: string
      ) => Parameters<typeof reduceQuizSession>[1]
    ) => {
      const atMs = performance.now();
      const atIso = new Date().toISOString();

      const current = sessionRef.current;
      if (!current) return;
      const next = reduceQuizSession(
        current,
        eventFactory(current, atMs, atIso)
      );
      const newAttempt =
        next.attempts.length > current.attempts.length
          ? next.attempts.at(-1)
          : undefined;

      sessionRef.current = next;
      setSession(next);
      setLastSavedAttemptId(undefined);
      void saveSession(next, atMs)
        .then(() => {
          if (newAttempt) setLastSavedAttemptId(newAttempt.id);
        })
        .catch(() => {
          setStorageWarning(
            "Der aktuelle Stand konnte nicht lokal gespeichert werden."
          );
        });
    },
    [saveSession]
  );

  const answer = useCallback(
    (payload: AnswerPayload) => {
      applyEvent((_state, atMs, atIso) => ({
        type: "ANSWER",
        payload,
        atMs,
        atIso
      }));
    },
    [applyEvent]
  );
  const reveal = useCallback(() => {
    applyEvent((_state, atMs, atIso) => ({ type: "SKIP", atMs, atIso }));
  }, [applyEvent]);
  const pass = useCallback(() => {
    applyEvent((_state, atMs, atIso) => ({ type: "PASS", atMs, atIso }));
  }, [applyEvent]);
  const timeout = useCallback(() => {
    applyEvent((_state, atMs, atIso) => ({
      type: "TIME_EXPIRED",
      atMs,
      atIso
    }));
  }, [applyEvent]);
  const continueQuiz = useCallback(() => {
    applyEvent((_state, atMs, atIso) => ({
      type: "CONTINUE",
      atMs,
      atIso
    }));
  }, [applyEvent]);
  const pause = useCallback(() => {
    const atMs = performance.now();

    const current = sessionRef.current;
    if (!current || current.status !== "asking") {
      return Promise.resolve();
    }
    const next = reduceQuizSession(current, { type: "PAUSE", atMs });
    sessionRef.current = next;
    setSession(next);
    return saveSession(next, atMs).catch(() => {
      setStorageWarning(
        "Der aktuelle Stand konnte nicht lokal gespeichert werden."
      );
    });
  }, [saveSession]);

  return {
    session,
    answer,
    reveal,
    pass,
    timeout,
    continueQuiz,
    pause,
    restored,
    storageWarning,
    completionReady,
    lastSavedAttemptId
  };
}
