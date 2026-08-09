import {
  CheckCircle2,
  ChevronRight,
  Eye,
  SkipForward,
  XCircle
} from "lucide-react";
import type { AnswerPayload } from "../../engine/graders/registry";
import type {
  QuestionChoice,
  QuestionInstance
} from "../../engine/quiz/question";
import type { QuestionAttempt } from "../../engine/session/session";
import { VisualAssetGraphic } from "./VisualAssetGraphic";
import { useTextAnswerInput } from "./useTextAnswerInput";

interface VisualQuestionViewProps {
  question: QuestionInstance;
  attempt?: QuestionAttempt;
  onAnswer: (payload: AnswerPayload) => void;
  onContinue: () => void;
  onReveal: () => void;
  solutionRevealAllowed: boolean;
  continueLabel?: string;
}

function Feedback({
  attempt,
  onContinue,
  continueLabel
}: {
  attempt: QuestionAttempt;
  onContinue: () => void;
  continueLabel: string;
}) {
  const isCorrect = attempt.result.status === "correct";
  const isRevealed = attempt.result.status === "skipped";
  return (
    <div
      className={`feedback-panel visual-feedback ${
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
      <button
        className="button button--primary"
        type="button"
        onClick={onContinue}
      >
        {continueLabel}
        <ChevronRight aria-hidden="true" />
      </button>
    </div>
  );
}

function ChoiceButton({
  option,
  index,
  attempt,
  expectedEntityId,
  onSelect
}: {
  option: QuestionChoice;
  index: number;
  attempt?: QuestionAttempt;
  expectedEntityId?: string;
  onSelect: (entityId: string) => void;
}) {
  const selectedId =
    attempt?.answerPayload?.kind === "single_choice"
      ? attempt.answerPayload.entityId
      : undefined;
  const selected = selectedId === option.entityId;
  const correct = attempt && option.entityId === expectedEntityId;
  const stateClass = correct
    ? " is-correct"
    : selected
      ? " is-incorrect"
      : "";

  return (
    <button
      className={`choice-option${option.visualAsset ? " has-visual" : ""}${stateClass}`}
      type="button"
      disabled={Boolean(attempt)}
      aria-pressed={selected}
      data-entity-id={option.entityId}
      aria-label={
        option.visualAsset && !attempt
          ? `Flaggenoption ${index + 1}`
          : option.label
      }
      onClick={() => onSelect(option.entityId)}
    >
      {option.visualAsset ? (
        <VisualAssetGraphic
          asset={option.visualAsset}
          accessibleLabel={
            attempt ? option.label : `Flaggenoption ${index + 1}`
          }
          compact
        />
      ) : (
        <span>{option.label}</span>
      )}
      {option.visualAsset && attempt ? <small>{option.label}</small> : null}
    </button>
  );
}

export function VisualQuestionView({
  question,
  attempt,
  onAnswer,
  onContinue,
  onReveal,
  solutionRevealAllowed,
  continueLabel = "Weiter"
}: VisualQuestionViewProps) {
  const isTextInput = question.answerSpec.kind === "text_input";
  const options = question.answerSpec.options ?? [];
  const { value, handleChange, handleCompositionEnd, handleSubmit } =
    useTextAnswerInput({ question, attempt, onAnswer });

  return (
    <main className="visual-question-layout">
      <section className="visual-prompt-panel">
        <div>
          <p className="eyebrow">Visuelle Frage</p>
          <h1>{question.promptText}</h1>
          <p>{question.instruction}</p>
        </div>
        {question.promptPayload.kind === "visual_asset" ? (
          <div className="visual-prompt-asset">
            <VisualAssetGraphic
              asset={question.promptPayload.asset}
              accessibleLabel={
                question.promptPayload.asset.kind === "flag"
                  ? "Flagge als Quizfrage"
                  : "Länderumriss als Quizfrage"
              }
            />
          </div>
        ) : null}
      </section>

      <section className="visual-answer-panel">
        {isTextInput ? (
          <form onSubmit={handleSubmit}>
            <label htmlFor="visual-answer-input">Deine Antwort</label>
            <input
              id="visual-answer-input"
              value={value}
              onChange={handleChange}
              onCompositionEnd={handleCompositionEnd}
              placeholder="Land eingeben"
              autoComplete="off"
              autoFocus={!attempt}
              disabled={Boolean(attempt)}
              aria-describedby={!attempt ? "visual-text-answer-hint" : undefined}
            />
            {!attempt ? (
              <p className="text-answer-hint" id="visual-text-answer-hint">
                Richtige Antworten werden automatisch erkannt. Enter prüft deine
                Eingabe sofort.
              </p>
            ) : null}
            {attempt ? (
              <Feedback
                attempt={attempt}
                onContinue={onContinue}
                continueLabel={continueLabel}
              />
            ) : null}
            {!attempt ? (
              <button
                className="button button--text"
                type="button"
                onClick={onReveal}
              >
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
        ) : (
          <div className="choice-answer">
            <div className="choice-grid" aria-label="Antwortmöglichkeiten">
              {options.map((option, index) => (
                <ChoiceButton
                  key={option.id}
                  option={option}
                  index={index}
                  attempt={attempt}
                  expectedEntityId={question.answerSpec.expectedEntityIds[0]}
                  onSelect={(entityId) =>
                    onAnswer({ kind: "single_choice", entityId })
                  }
                />
              ))}
            </div>
            {attempt ? (
              <Feedback
                attempt={attempt}
                onContinue={onContinue}
                continueLabel={continueLabel}
              />
            ) : (
              <button
                className="button button--text"
                type="button"
                onClick={onReveal}
              >
                {solutionRevealAllowed ? (
                  <Eye aria-hidden="true" />
                ) : (
                  <SkipForward aria-hidden="true" />
                )}
                {solutionRevealAllowed
                  ? "Lösung anzeigen"
                  : "Ohne Antwort weiter"}
              </button>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
