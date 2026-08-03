import { lazy, Suspense, useState } from "react";
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

const GeoMap = lazy(() =>
  import("../../geo/GeoMap").then((module) => ({
    default: module.GeoMap
  }))
);

interface MapQuestionViewProps {
  question: QuestionInstance;
  attempt?: QuestionAttempt;
  onAnswer: (payload: AnswerPayload) => void;
  onContinue: () => void;
  onReveal: () => void;
  solutionRevealAllowed: boolean;
  continueLabel?: string;
}

export function MapQuestionView({
  question,
  attempt,
  onAnswer,
  onContinue,
  onReveal,
  solutionRevealAllowed,
  continueLabel = "Weiter"
}: MapQuestionViewProps) {
  const isPoint = question.answerSpec.kind === "map_point";
  const isArea = question.answerSpec.kind === "map_area";
  const isLine = question.answerSpec.kind === "map_line";
  const [selectionHint, setSelectionHint] = useState<string>();
  const selectedCoordinates =
    attempt?.answerPayload?.kind === "map_point"
      ? attempt.answerPayload.coordinates
      : undefined;
  const selectedAreaId =
    attempt?.answerPayload?.kind === "map_area"
      ? attempt.answerPayload.areaId
      : undefined;
  const selectedLineId =
    attempt?.answerPayload?.kind === "map_line"
      ? attempt.answerPayload.lineId
      : undefined;
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
  const isCorrect = attempt?.result.status === "correct";
  const isRevealed = attempt?.result.status === "skipped";

  return (
    <div className="quiz-surface">
      <aside className="question-rail">
        <div>
          <h1>{question.promptText}</h1>
          <p>{question.instruction}</p>
          {selectionHint && !attempt ? (
            <p className="selection-hint" role="status">
              {selectionHint}
            </p>
          ) : null}
        </div>

        {attempt ? (
          <div
            className={`feedback-panel ${
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
                {isCorrect ? "Richtig" : isRevealed ? "Lösung" : "Noch nicht"}
              </strong>
              <span>{attempt.result.detail}</span>
            </div>
            <button
              className="button button--primary"
              type="button"
              onClick={onContinue}
            >
              {continueLabel}
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
        ) : (
          <button
            className="button button--secondary question-skip"
            type="button"
            onClick={onReveal}
          >
            {solutionRevealAllowed ? (
              <Eye aria-hidden="true" />
            ) : (
              <SkipForward aria-hidden="true" />
            )}
            {solutionRevealAllowed ? "Lösung anzeigen" : "Ohne Antwort weiter"}
          </button>
        )}
      </aside>

      <div className="quiz-map">
        <Suspense fallback={<div className="map-skeleton">Karte wird vorbereitet …</div>}>
          <GeoMap
            mode={
              isPoint
                ? "point"
                : isArea
                  ? "area"
                  : isLine
                    ? "line"
                    : "highlight"
            }
            regionId={
              (question.metadata.regionId as
                | import("../../engine/quiz/presets").MvpRegionId
                | undefined) ?? "world"
            }
            physicalEntityType={physicalEntityType}
            selectedCoordinates={selectedCoordinates}
            targetCoordinates={question.feedback.targetCoordinates}
            selectedAreaId={selectedAreaId}
            targetAreaId={question.feedback.targetAreaId}
            selectedLineId={selectedLineId}
            targetLineId={question.feedback.targetLineId}
            revealAnswer={Boolean(attempt)}
            onPointSelect={
              attempt || !isPoint
                ? undefined
                : (coordinates) =>
                    onAnswer({ kind: "map_point", coordinates })
            }
            onAreaSelect={
              attempt || !isArea
                ? undefined
                : (selection) =>
                    onAnswer({ kind: "map_area", ...selection })
            }
            onLineSelect={
              attempt || !isLine
                ? undefined
                : (selection) =>
                    onAnswer({ kind: "map_line", ...selection })
            }
            onSelectionHint={setSelectionHint}
          />
        </Suspense>
      </div>
    </div>
  );
}
