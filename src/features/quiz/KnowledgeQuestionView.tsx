import {
  BookOpenCheck,
  CheckCircle2,
  ChevronRight,
  Eye,
  ExternalLink,
  SkipForward,
  XCircle
} from "lucide-react";
import type { DatasetSource } from "../../content/schema";
import type { AnswerPayload } from "../../engine/graders/registry";
import type {
  QuestionChoice,
  QuestionInstance
} from "../../engine/quiz/question";
import type { QuestionAttempt } from "../../engine/session/session";
import { useTextAnswerInput } from "./useTextAnswerInput";

interface KnowledgeQuestionViewProps {
  question: QuestionInstance;
  attempt?: QuestionAttempt;
  onAnswer: (payload: AnswerPayload) => void;
  onContinue: () => void;
  onReveal: () => void;
  solutionRevealAllowed: boolean;
  continueLabel?: string;
}

const SOURCE_LABELS: Record<string, string> = {
  "world-bank-land-area-2023": "World Bank · Landfläche",
  "world-bank-population-2023": "World Bank · Bevölkerung",
  "cplp-portuguese-language-states": "CPLP · Mitgliedstaaten",
  "phase2-scope-policy": "GeoApp · Gebiets-Scope",
  "wikidata-capital-snapshot": "Wikidata · Hauptstädte"
};

function SourceReference({ source }: { source: DatasetSource }) {
  const label = SOURCE_LABELS[source.id] ?? source.id;
  const external = source.url.startsWith("https://");

  return external ? (
    <a href={source.url} target="_blank" rel="noreferrer">
      {label}
      <ExternalLink aria-hidden="true" />
    </a>
  ) : (
    <span>{label}</span>
  );
}

function KnowledgeExplanation({
  question
}: {
  question: QuestionInstance;
}) {
  const explanation = question.feedback.explanation;
  if (!explanation) return null;

  return (
    <section
      className="knowledge-explanation"
      aria-labelledby="knowledge-explanation-title"
    >
      <div className="knowledge-explanation__heading">
        <BookOpenCheck aria-hidden="true" />
        <div>
          <p className="eyebrow">Herleitung</p>
          <h2 id="knowledge-explanation-title">So ergibt sich die Antwort</h2>
        </div>
      </div>
      <p>{explanation.text}</p>
      <dl>
        {explanation.evidence.map((evidence, index) => (
          <div key={`${evidence.labelDe}:${index}`}>
            <dt>{evidence.labelDe}</dt>
            <dd>{evidence.valueDe}</dd>
          </div>
        ))}
      </dl>
      <div className="knowledge-sources">
        <strong>Quellen</strong>
        <div>
          {explanation.sources.map((source) => (
            <SourceReference key={source.id} source={source} />
          ))}
        </div>
      </div>
    </section>
  );
}

function KnowledgeChoice({
  option,
  attempt,
  expectedEntityId,
  onSelect
}: {
  option: QuestionChoice;
  attempt?: QuestionAttempt;
  expectedEntityId?: string;
  onSelect: (entityId: string) => void;
}) {
  const selectedId =
    attempt?.answerPayload?.kind === "single_choice"
      ? attempt.answerPayload.entityId
      : undefined;
  const selected = selectedId === option.entityId;
  const correct = Boolean(attempt && option.entityId === expectedEntityId);
  const stateClass = correct
    ? " is-correct"
    : selected
      ? " is-incorrect"
      : "";

  return (
    <button
      className={`choice-option knowledge-choice${stateClass}`}
      type="button"
      disabled={Boolean(attempt)}
      aria-pressed={selected}
      data-entity-id={option.entityId}
      onClick={() => onSelect(option.entityId)}
    >
      <span>{option.label}</span>
    </button>
  );
}

export function KnowledgeQuestionView({
  question,
  attempt,
  onAnswer,
  onContinue,
  onReveal,
  solutionRevealAllowed,
  continueLabel = "Weiter"
}: KnowledgeQuestionViewProps) {
  const isTextInput = question.answerSpec.kind === "text_input";
  const isCorrect = attempt?.result.status === "correct";
  const isRevealed = attempt?.result.status === "skipped";
  const { value, handleChange, handleCompositionEnd, handleSubmit } =
    useTextAnswerInput({ question, attempt, onAnswer });

  return (
    <main className="knowledge-question-layout">
      <section className="knowledge-question-card">
        <div className="knowledge-question-copy">
          <p className="eyebrow">Wissenspuzzle</p>
          <h1>{question.promptText}</h1>
          <p>{question.instruction}</p>
        </div>

        {isTextInput ? (
          <form onSubmit={handleSubmit}>
            <label htmlFor="knowledge-answer-input">Deine Antwort</label>
            <input
              id="knowledge-answer-input"
              value={value}
              onChange={handleChange}
              onCompositionEnd={handleCompositionEnd}
              placeholder="Land oder Hauptstadt eingeben"
              autoComplete="off"
              autoFocus={!attempt}
              disabled={Boolean(attempt)}
              aria-describedby={
                !attempt ? "knowledge-text-answer-hint" : undefined
              }
            />
            {!attempt ? (
              <p
                className="text-answer-hint"
                id="knowledge-text-answer-hint"
              >
                Richtige Antworten werden automatisch erkannt. Enter prüft deine
                Eingabe sofort.
              </p>
            ) : null}
          </form>
        ) : (
          <div className="choice-grid knowledge-choice-grid">
            {(question.answerSpec.options ?? []).map((option) => (
              <KnowledgeChoice
                key={option.id}
                option={option}
                attempt={attempt}
                expectedEntityId={question.answerSpec.expectedEntityIds[0]}
                onSelect={(entityId) =>
                  onAnswer({ kind: "single_choice", entityId })
                }
              />
            ))}
          </div>
        )}

        {attempt ? (
          <>
            <div
              className={`feedback-panel knowledge-feedback ${
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
            <KnowledgeExplanation question={question} />
            <button
              className="button button--primary knowledge-continue"
              type="button"
              onClick={onContinue}
            >
              {continueLabel}
              <ChevronRight aria-hidden="true" />
            </button>
          </>
        ) : (
          <button
            className="button button--text knowledge-skip"
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
      </section>
    </main>
  );
}
