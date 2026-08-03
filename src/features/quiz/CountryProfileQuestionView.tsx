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
import {
  COUNTRY_PROFILE_FIELD_IDS,
  type CountryProfileFieldConfig,
  type CountryProfileFieldId,
  type CountryProfileValues
} from "../../engine/graders/countryProfile";
import type { AnswerPayload } from "../../engine/graders/registry";
import type { QuestionInstance } from "../../engine/quiz/question";
import type { QuestionAttempt } from "../../engine/session/session";
import { VisualAssetGraphic } from "./VisualAssetGraphic";

interface CountryProfileQuestionViewProps {
  question: QuestionInstance;
  attempt?: QuestionAttempt;
  onAnswer: (payload: AnswerPayload) => void;
  onContinue: () => void;
  onReveal: () => void;
  solutionRevealAllowed: boolean;
  continueLabel?: string;
}

const EMPTY_VALUES: CountryProfileValues = {
  capital: "",
  language: "",
  currency: ""
};

const PLACEHOLDERS: Record<CountryProfileFieldId, string> = {
  capital: "z. B. Berlin",
  language: "z. B. Deutsch",
  currency: "z. B. Euro"
};

function profileFields(question: QuestionInstance) {
  const value = question.answerSpec.graderConfig.profileFields;
  if (!Array.isArray(value)) return [];
  return value.filter(
    (field): field is CountryProfileFieldConfig =>
      typeof field === "object" &&
      field !== null &&
      "id" in field &&
      COUNTRY_PROFILE_FIELD_IDS.includes(
        field.id as CountryProfileFieldId
      ) &&
      "label" in field &&
      typeof field.label === "string" &&
      "expectedLabel" in field &&
      typeof field.expectedLabel === "string"
  );
}

export function CountryProfileQuestionView({
  question,
  attempt,
  onAnswer,
  onContinue,
  onReveal,
  solutionRevealAllowed,
  continueLabel = "Weiter"
}: CountryProfileQuestionViewProps) {
  const previousValues =
    attempt?.answerPayload?.kind === "country_profile_input"
      ? attempt.answerPayload.values
      : EMPTY_VALUES;
  const [values, setValues] = useState<CountryProfileValues>(previousValues);
  const fields = profileFields(question);
  const isCorrect = attempt?.result.status === "correct";
  const isRevealed = attempt?.result.status === "skipped";
  const complete = COUNTRY_PROFILE_FIELD_IDS.every(
    (fieldId) => values[fieldId].trim().length > 0
  );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (complete && !attempt) {
      onAnswer({ kind: "country_profile_input", values });
    }
  };

  return (
    <main className="country-profile-question">
      <section className="country-profile-prompt">
        <div>
          <p className="eyebrow">Länderprofil</p>
          <h1>{question.promptText}</h1>
          <p>{question.instruction}</p>
        </div>
        <div className="country-profile-flag">
          <VisualAssetGraphic
            asset={{
              kind: "flag",
              key: `visual:flag:${question.subjectId}`,
              entityId: question.subjectId
            }}
            accessibleLabel={`Flagge von ${question.promptPayload.label}`}
          />
          <strong>{question.promptPayload.label}</strong>
        </div>
      </section>

      <section className="country-profile-answer">
        <form onSubmit={submit}>
          <div className="country-profile-fields">
            {fields.map((field, index) => {
              const result = attempt?.result.profileFields?.find(
                (candidate) => candidate.id === field.id
              );
              return (
                <label
                  className={`country-profile-field${
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
                    value={values[field.id]}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        [field.id]: event.target.value
                      }))
                    }
                    placeholder={PLACEHOLDERS[field.id]}
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
                    ? "Profil vollständig"
                    : isRevealed
                      ? "Lösung"
                      : "Fast – schau dir die Felder an"}
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
                Profil prüfen
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
