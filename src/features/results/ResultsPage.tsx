import { lazy, Suspense, useEffect, useState } from "react";
import {
  Clock3,
  Database,
  Globe2,
  Award,
  MapPin,
  MapPinned,
  RefreshCcw,
  RotateCcw,
  Target,
  XCircle
} from "lucide-react";
import { AppHeader } from "../../app/AppHeader";
import { navigate } from "../../app/navigation";
import {
  achievementDefinitions,
  type AchievementUnlock
} from "../../engine/achievements/achievement";
import {
  createReviewRoundDefinition,
  describeQuizDefinition,
  setupFromDefinition,
  type MvpRegionId
} from "../../engine/quiz/presets";
import {
  sessionToResult,
  type SessionResult
} from "../../engine/session/result";
import type { QuizSessionState } from "../../engine/session/session";
import { getSessionRepository } from "../../persistence/sessionRepository";
import { requestQuizSession } from "../quiz/sessionIntent";

const PHYSICAL_TYPE_BY_TOPIC = {
  rivers: "river",
  lakes: "lake",
  seas: "sea",
  "mountain-ranges": "mountain_range",
  peaks: "peak"
} as const;

const MapPreview = lazy(() =>
  import("../../geo/GeoMap").then((module) => ({
    default: module.MapPreview
  }))
);

function formatDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

type LoadedResult = {
  session: QuizSessionState;
  result: SessionResult;
  unlocks: AchievementUnlock[];
};

export function ResultsPage() {
  const [loaded, setLoaded] = useState<LoadedResult | null>();
  const [loadError, setLoadError] = useState<string>();

  useEffect(() => {
    let cancelled = false;

    const repository = getSessionRepository();
    void Promise.all([
      repository.loadLatestCompleted(),
      repository.loadAchievementUnlocks()
    ])
      .then(([session, unlocks]) => {
        if (!cancelled) {
          setLoaded(
            session?.status === "completed"
              ? { session, result: sessionToResult(session), unlocks }
              : null
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError("Das letzte Ergebnis konnte nicht geladen werden.");
          setLoaded(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loaded === undefined) {
    return (
      <div className="app-page">
        <AppHeader activeRoute="/results" />
        <main className="results-empty" aria-live="polite">
          <span className="loading-dot" aria-hidden="true" />
          <h1>Ergebnis wird geladen</h1>
        </main>
      </div>
    );
  }

  if (loaded === null) {
    return (
      <div className="app-page">
        <AppHeader activeRoute="/results" />
        <main className="results-empty">
          <Target aria-hidden="true" />
          <h1>Noch keine Runde abgeschlossen</h1>
          <p>
            {loadError ??
              "Starte eine Länder- oder Hauptstadtrunde, um hier dein Ergebnis zu sehen."}
          </p>
          <button
            className="button button--primary"
            type="button"
            onClick={() => navigate("/")}
          >
            Zur Startseite
          </button>
        </main>
      </div>
    );
  }

  const { session, result } = loaded;
  const latestAttemptBySkill = new Map(
    session.attempts.map((attempt) => {
      const question = attempt.questionSnapshot;
      return [
        `${question.subjectId}|${question.metadata.skillKey}`,
        attempt
      ] as const;
    })
  );
  const mistakeAttempts = [...latestAttemptBySkill.values()].filter(
    (attempt) => attempt.result.status !== "correct"
  );
  const answerByQuestionId = new Map(
    result.answers.map((answer) => [answer.questionId, answer])
  );
  const mistakes = mistakeAttempts.flatMap((attempt) => {
    const answer = answerByQuestionId.get(attempt.questionSnapshot.id);
    return answer ? [answer] : [];
  });
  const accuracy =
    result.total === 0 ? 0 : Math.round((result.correct / result.total) * 100);
  const description = describeQuizDefinition(session.definitionSnapshot);
  const setup = setupFromDefinition(session.definitionSnapshot);
  const definitionById = new Map(
    achievementDefinitions.map((definition) => [definition.id, definition])
  );
  const roundUnlocks = loaded.unlocks.filter((unlock) =>
    unlock.sourceEventIds.some((eventId) =>
      eventId.startsWith(`progress:${session.id}:`)
    )
  );

  const practiceMistakes = () => {
    const queue = [
      ...new Map(
        mistakeAttempts.map((attempt) => {
          const question = attempt.questionSnapshot;
          const key = `${question.subjectId}|${question.metadata.skillKey}`;
          return [
            key,
            {
              key,
              entityId: question.subjectId,
              skillKey: question.metadata.skillKey,
              lastOutcome:
                attempt.result.status === "timed_out"
                  ? ("timed_out" as const)
                  : attempt.result.status === "skipped"
                    ? ("skipped" as const)
                    : ("incorrect" as const),
              occurredAt: attempt.answeredAt,
              sourceEventId: `progress:${attempt.id}`
            }
          ] as const;
        })
      ).values()
    ];
    const definition = createReviewRoundDefinition(
      queue,
      `mistakes:${crypto.randomUUID()}`,
      session.datasetVersion
    );
    requestQuizSession(definition);
    navigate("/quiz");
  };

  return (
    <div className="app-page">
      <AppHeader activeRoute="/results" />
      <main className="results-layout">
        <section className="result-summary">
          <h1>Runde abgeschlossen</h1>
          <p className="result-score">
            {result.correct} von {result.total} richtig
          </p>

          <dl className="result-stats">
            <div>
              <dt>Genauigkeit</dt>
              <dd>{accuracy} %</dd>
            </div>
            <div>
              <dt>Zeit</dt>
              <dd>{formatDuration(result.durationMs)}</dd>
            </div>
            <div>
              <dt>Offen</dt>
              <dd>{mistakes.length}</dd>
            </div>
          </dl>

          <div className="result-actions">
            {mistakes.length ? (
              <button
                className="button button--primary"
                type="button"
                onClick={practiceMistakes}
              >
                Fehler gezielt üben
                <RotateCcw aria-hidden="true" />
              </button>
            ) : null}
            <button
              className={
                mistakes.length
                  ? "button button--secondary"
                  : "button button--primary"
              }
              type="button"
              onClick={() => navigate("/")}
            >
              Neue Runde
              <RefreshCcw aria-hidden="true" />
            </button>
          </div>
        </section>

        <section className="error-review" aria-labelledby="error-review-heading">
          <div>
            <h2 id="error-review-heading">Offene Fehler</h2>
            <p>Korrekt wiederholte Fragen gelten hier bereits als erledigt.</p>
          </div>

          <div className="error-list">
            {mistakes.length ? (
              mistakes.map((answer) => (
                <div className="error-row" key={answer.questionId}>
                  <XCircle aria-hidden="true" />
                  <span>
                    <strong>{answer.expectedLabel}</strong>
                    <small>{answer.prompt}</small>
                  </span>
                  <span className="error-row__hint">
                    <MapPin aria-hidden="true" />
                    {answer.responseLabel}
                  </span>
                </div>
              ))
            ) : (
              <div className="error-empty">
                <Target aria-hidden="true" />
                Keine offenen Fehler in dieser Runde.
              </div>
            )}
          </div>

          <div className="achievement-row">
            <span className="achievement-row__icon">
              <Database aria-hidden="true" />
            </span>
            <span>
              <strong>Lernstand lokal gespeichert</strong>
              <small>Pro Entität und Fähigkeit · progress-event-v1</small>
            </span>
            <span>{result.total}</span>
          </div>

          {roundUnlocks.map((unlock) => {
            const definition = definitionById.get(unlock.achievementId);
            if (!definition) return null;

            return (
              <div
                className="achievement-row achievement-row--unlocked"
                key={unlock.achievementId}
              >
                <span className="achievement-row__icon">
                  <Award aria-hidden="true" />
                </span>
                <span>
                  <strong>Neu: {definition.title}</strong>
                  <small>
                    {definition.description} ·{" "}
                    {unlock.verification === "server"
                      ? "serverbestätigt"
                      : "lokal geprüft"}
                  </small>
                </span>
                <span>✓</span>
              </div>
            );
          })}
        </section>
      </main>

      <footer className="results-map-strip">
        <Suspense
          fallback={<div className="results-map-fallback" aria-hidden="true" />}
        >
          <MapPreview
            regionId={setup.regionId as MvpRegionId}
            physicalEntityType={
              PHYSICAL_TYPE_BY_TOPIC[
                setup.topic as keyof typeof PHYSICAL_TYPE_BY_TOPIC
              ]
            }
          />
        </Suspense>
        <div className="quiz-meta">
          <span><MapPinned aria-hidden="true" />{description.mode}</span>
          <i aria-hidden="true">·</i>
          <span><Globe2 aria-hidden="true" />{description.region}</span>
          <i aria-hidden="true">·</i>
          <span><Clock3 aria-hidden="true" />{description.timer}</span>
        </div>
      </footer>
    </div>
  );
}
