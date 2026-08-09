import { lazy, Suspense } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Eye,
  SkipForward,
  XCircle
} from "lucide-react";
import type { AnswerPayload } from "../../engine/graders/registry";
import type { QuestionInstance } from "../../engine/quiz/question";
import type { QuestionAttempt } from "../../engine/session/session";
import { useTextAnswerInput } from "./useTextAnswerInput";

const GeoMap = lazy(() =>
  import("../../geo/GeoMap").then((module) => ({
    default: module.GeoMap
  }))
);

interface TextQuestionViewProps {
  question: QuestionInstance;
  attempt?: QuestionAttempt;
  onAnswer: (payload: AnswerPayload) => void;
  onContinue: () => void;
  onReveal: () => void;
  solutionRevealAllowed: boolean;
  continueLabel?: string;
}

export function TextQuestionView({
  question,
  attempt,
  onAnswer,
  onContinue,
  onReveal,
  solutionRevealAllowed,
  continueLabel = "Weiter"
}: TextQuestionViewProps) {
  const { value, handleChange, handleCompositionEnd, handleSubmit } =
    useTextAnswerInput({ question, attempt, onAnswer });
  const isCorrect = attempt?.result.status === "correct";
  const isRevealed = attempt?.result.status === "skipped";
  const physicalEntityType = [
    "river",
    "lake",
    "sea",
    "mountain_range",
    "peak"
  ].includes(question.metadata.entityType ?? "")
    ? (question.metadata.entityType as
        | "river"
        | "lake"
        | "sea"
        | "mountain_range"
        | "peak")
    : undefined;
  const placeholder: Record<string, string> = {
    country: "Land eingeben",
    city: "Hauptstadt eingeben",
    river: "Fluss eingeben",
    lake: "See eingeben",
    sea: "Meer eingeben",
    mountain_range: "Gebirge eingeben",
    peak: "Gipfel eingeben",
    ranked_river: "Flussname eingeben",
    ranked_peak: "Bergname eingeben"
  };

  return (
    <div className="text-question-layout">
      <section className="text-question-panel">
        <h1>{question.promptText}</h1>
        <form onSubmit={handleSubmit}>
          <label htmlFor="answer-input">Deine Antwort</label>
          <input
            id="answer-input"
            value={value}
            onChange={handleChange}
            onCompositionEnd={handleCompositionEnd}
            placeholder={
              placeholder[
                question.metadata.answerEntityType ??
                  question.metadata.entityType ??
                  (question.metadata.skillKey.startsWith("country:")
                    ? "country"
                    : "city")
              ]
            }
            autoComplete="off"
            autoFocus={!attempt}
            disabled={Boolean(attempt)}
            aria-describedby={!attempt ? "text-answer-hint" : undefined}
          />
          {!attempt ? (
            <p className="text-answer-hint" id="text-answer-hint">
              Richtige Antworten werden automatisch erkannt. Enter prüft deine
              Eingabe sofort.
            </p>
          ) : null}
          {attempt ? (
            <div
              className={`feedback-panel feedback-panel--inline ${
                isCorrect
                  ? "is-correct"
                  : isRevealed
                    ? "is-revealed"
                    : "is-incorrect"
              }`}
              role="status"
            >
              {isCorrect ? (
                <CheckCircle2 aria-hidden="true" />
              ) : isRevealed ? (
                <Eye aria-hidden="true" />
              ) : (
                <XCircle aria-hidden="true" />
              )}
              <div>
                <strong>
                  {isCorrect ? "Richtig" : isRevealed ? "Lösung" : "Nicht ganz"}
                </strong>
                <span>{attempt.result.detail}</span>
              </div>
            </div>
          ) : null}
          {attempt ? (
            <button
              className="button button--primary"
              type="button"
              onClick={onContinue}
            >
              {continueLabel}
              <ChevronRight aria-hidden="true" />
            </button>
          ) : null}
          {!attempt ? (
            <button className="button button--text" type="button" onClick={onReveal}>
              {solutionRevealAllowed ? (
                <Eye aria-hidden="true" />
              ) : (
                <SkipForward aria-hidden="true" />
              )}
              {solutionRevealAllowed
                ? "Lösung anzeigen"
                : "Ohne Antwort weiter"}
            </button>
          ) : null}
        </form>
      </section>

      {question.promptPayload.kind === "fact" ? (
        <aside
          className="text-question-map fact-question-card"
          aria-label="Fakten zur Frage"
        >
          <span className="fact-question-rank">
            {question.promptPayload.label}
          </span>
          <h2>Faktenprofil</h2>
          <dl>
            {question.promptPayload.facts.map((fact) => (
              <div key={fact.factTypeId}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
          <small>
            Die Lösung zeigt den Namen anschließend zusammen mit allen Angaben.
          </small>
        </aside>
      ) : (
        <aside className="text-question-map" aria-label="Kartenhinweis zur Frage">
          <Suspense fallback={<div className="map-skeleton">Karte wird vorbereitet …</div>}>
            <GeoMap
              mode="highlight"
              regionId={
                (question.metadata.regionId as
                  | import("../../engine/quiz/presets").MvpRegionId
                  | undefined) ?? "world"
              }
              physicalEntityType={physicalEntityType}
              selectedCoordinates={
                question.promptPayload.kind === "map_highlight"
                  ? question.promptPayload.coordinates
                  : undefined
              }
              selectedAreaId={
                question.promptPayload.kind === "map_highlight"
                  ? question.promptPayload.areaId
                  : undefined
              }
              selectedLineId={
                question.promptPayload.kind === "map_highlight"
                  ? question.promptPayload.lineId
                  : undefined
              }
            />
          </Suspense>
        </aside>
      )}
    </div>
  );
}
