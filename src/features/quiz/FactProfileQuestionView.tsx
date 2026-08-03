import { useState, type FormEvent } from "react";
import {
  Check,
  CheckCircle2,
  ChevronRight,
  Eye,
  SkipForward,
  X,
  XCircle
} from "lucide-react";
import type {
  FactProfileFieldConfig,
  FactProfileValues
} from "../../engine/graders/factProfile";
import type { AnswerPayload } from "../../engine/graders/registry";
import type { QuestionInstance } from "../../engine/quiz/question";
import type { QuestionAttempt } from "../../engine/session/session";
import { VisualAssetGraphic } from "./VisualAssetGraphic";

interface FactProfileQuestionViewProps {
  question: QuestionInstance;
  attempt?: QuestionAttempt;
  onAnswer: (payload: AnswerPayload) => void;
  onContinue: () => void;
  onReveal: () => void;
  solutionRevealAllowed: boolean;
  continueLabel?: string;
}

function profileFields(question: QuestionInstance) {
  const value = question.answerSpec.graderConfig.profileFields;
  if (!Array.isArray(value)) return [];
  return value.filter(
    (field): field is FactProfileFieldConfig =>
      typeof field === "object" &&
      field !== null &&
      "id" in field &&
      typeof field.id === "string" &&
      "label" in field &&
      typeof field.label === "string" &&
      "placeholder" in field &&
      typeof field.placeholder === "string" &&
      "expectedLabel" in field &&
      typeof field.expectedLabel === "string"
  );
}

export function FactProfileQuestionView({
  question,
  attempt,
  onAnswer,
  onContinue,
  onReveal,
  solutionRevealAllowed,
  continueLabel = "Weiter"
}: FactProfileQuestionViewProps) {
  const fields = profileFields(question);
  const previousValues =
    attempt?.answerPayload?.kind === "fact_profile_input"
      ? attempt.answerPayload.values
      : undefined;
  const [values, setValues] = useState<FactProfileValues>(() =>
    Object.fromEntries(
      fields.map((field) => [field.id, previousValues?.[field.id] ?? ""])
    )
  );
  const isCorrect = attempt?.result.status === "correct";
  const isRevealed = attempt?.result.status === "skipped";
  const complete =
    fields.length > 0 &&
    fields.every((field) => (values[field.id] ?? "").trim().length > 0);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (complete && !attempt) {
      onAnswer({ kind: "fact_profile_input", values });
    }
  };

  return (
    <main className="fact-profile-question">
      <section className="fact-profile-prompt">
        <div>
          <p className="eyebrow">Sternzeichen</p>
          <h1>{question.promptText}</h1>
          <p>{question.instruction}</p>
        </div>
        {question.promptPayload.kind === "visual_asset" ? (
          <div className="fact-profile-chart">
            <VisualAssetGraphic
              asset={question.promptPayload.asset}
              accessibleLabel="Vereinfachte Sternbildkarte als Quizfrage"
            />
          </div>
        ) : null}
      </section>

      <section className="fact-profile-answer">
        <form onSubmit={submit}>
          <div className="fact-profile-fields">
            {fields.map((field, index) => {
              const result = attempt?.result.factProfileFields?.find(
                (candidate) => candidate.id === field.id
              );
              return (
                <label
                  className={`fact-profile-field${
                    attempt
                      ? result?.correct
                        ? " is-correct"
                        : " is-incorrect"
                      : ""
                  }`}
                  key={field.id}
                >
                  <span>
                    {field.label}
                    {attempt ? (
                      result?.correct ? (
                        <Check aria-label="Richtig" />
                      ) : (
                        <X aria-label="Nicht richtig" />
                      )
                    ) : null}
                  </span>
                  <input
                    value={values[field.id] ?? ""}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        [field.id]: event.target.value
                      }))
                    }
                    placeholder={field.placeholder}
                    autoComplete="off"
                    autoFocus={index === 0 && !attempt}
                    disabled={Boolean(attempt)}
                  />
                  {attempt && (!result?.correct || isRevealed) ? (
                    <small>Lösung: {field.expectedLabel}</small>
                  ) : null}
                </label>
              );
            })}
          </div>

          {attempt ? (
            <div
              className={`feedback-panel feedback-panel--profile ${
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
                  {isCorrect
                    ? "Alles richtig"
                    : isRevealed
                      ? "Lösung"
                      : "Schau dir die Felder noch einmal an"}
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
            <>
              <button
                className="button button--primary"
                type="submit"
                disabled={!complete}
              >
                Antwort prüfen
                <ChevronRight aria-hidden="true" />
              </button>
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
            </>
          )}
        </form>
      </section>
    </main>
  );
}
