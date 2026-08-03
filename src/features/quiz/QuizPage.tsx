import { useEffect, useRef, useState } from "react";
import { Clock3, Globe2, MapPinned } from "lucide-react";
import { AppHeader } from "../../app/AppHeader";
import { navigate } from "../../app/navigation";
import { describeQuizDefinition } from "../../engine/quiz/presets";
import { canRevealSolution } from "../../engine/quiz/learningProfiles";
import { getRemainingTimeMs } from "../../engine/session/session";
import { MapQuestionView } from "./MapQuestionView";
import { KnowledgeQuestionView } from "./KnowledgeQuestionView";
import { TextQuestionView } from "./TextQuestionView";
import { VisualQuestionView } from "./VisualQuestionView";
import { useQuizSession } from "./useQuizSession";

function useQuestionTimer(
  session: ReturnType<typeof useQuizSession>["session"],
  timeout: () => void
) {
  const [remainingMs, setRemainingMs] = useState<number>();
  const expiredQuestionRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!session || session.status !== "asking") {
      setRemainingMs(undefined);
      return;
    }

    const question = session.questions[session.currentQuestionIndex];
    const update = () => {
      const remaining = getRemainingTimeMs(session, performance.now());
      setRemainingMs(remaining);

      if (
        remaining === 0 &&
        question &&
        expiredQuestionRef.current !== question.id
      ) {
        expiredQuestionRef.current = question.id;
        timeout();
      }
    };

    update();
    const interval = window.setInterval(update, 250);
    return () => window.clearInterval(interval);
  }, [session, timeout]);

  return remainingMs;
}

export function QuizPage() {
  const quiz = useQuizSession();
  const {
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
  } = quiz;
  const remainingMs = useQuestionTimer(session, timeout);

  useEffect(() => {
    if (completionReady) navigate("/results");
  }, [completionReady]);

  if (!session || session.status === "preparing") {
    return (
      <div className="app-page app-page--quiz">
        <AppHeader compact onExitQuiz={() => navigate("/")} />
        <div className="quiz-progress" aria-hidden="true"><span style={{ width: "0%" }} /></div>
        <main className="quiz-loading" aria-live="polite">
          <span className="loading-dot" aria-hidden="true" />
          <h1>Runde wird vorbereitet</h1>
          <p>Content und Quizdefinition werden geprüft.</p>
        </main>
      </div>
    );
  }

  if (session.status === "completed") {
    return (
      <div className="app-page app-page--quiz">
        <AppHeader
          compact
          progressLabel={`${session.questions.length} / ${session.questions.length}`}
        />
        <div className="quiz-progress" aria-hidden="true"><span style={{ width: "100%" }} /></div>
        <main className="quiz-loading" aria-live="polite">
          <span className="loading-dot" aria-hidden="true" />
          <h1>Ergebnis wird gespeichert</h1>
          <p>Runde und Lernstand bleiben lokal erhalten.</p>
        </main>
      </div>
    );
  }

  const question = session.questions[session.currentQuestionIndex];
  const attempt = session.attempts.find(
    (candidate) => candidate.ordinal === question.ordinal
  );
  const attemptSaved = Boolean(
    attempt && lastSavedAttemptId && attempt.id === lastSavedAttemptId
  );
  const progress = `${session.currentQuestionIndex + 1} / ${session.questions.length}`;
  const progressValue = session.currentQuestionIndex + (attempt ? 1 : 0);
  const progressPercent = (progressValue / session.questions.length) * 100;
  const continueLabel =
    session.currentQuestionIndex === session.questions.length - 1
      ? "Ergebnis ansehen"
      : "Weiter";
  const description = describeQuizDefinition(session.definitionSnapshot);
  const solutionRevealAllowed = canRevealSolution(
    session.definitionSnapshot.rules
  );
  const handleUnanswered = solutionRevealAllowed ? reveal : pass;
  const timerLabel =
    remainingMs === undefined
      ? description.timer
      : `${Math.max(0, Math.ceil(remainingMs / 1000))} s`;

  const exitQuiz = async () => {
    await pause();
    navigate("/");
  };

  return (
    <div className="app-page app-page--quiz">
      <AppHeader
        compact
        progressLabel={progress}
        timerLabel={remainingMs === undefined ? undefined : timerLabel}
        onExitQuiz={exitQuiz}
      />
      <div
        className="quiz-progress"
        role="progressbar"
        aria-label="Quizfortschritt"
        aria-valuemin={0}
        aria-valuemax={session.questions.length}
        aria-valuenow={progressValue}
      >
        <span style={{ width: `${progressPercent}%` }} />
      </div>

      {restored || storageWarning || attemptSaved ? (
        <div className="quiz-notices">
          {restored ? (
            <div className="session-notice" role="status">
              Gespeicherte Runde fortgesetzt
            </div>
          ) : null}
          {storageWarning ? (
            <div className="session-warning" role="status">
              {storageWarning}
            </div>
          ) : null}
          {attemptSaved ? (
            <div className="session-notice" role="status">
              Antwort lokal gespeichert
            </div>
          ) : null}
        </div>
      ) : null}

      {question.promptPayload.kind === "description" ? (
        <KnowledgeQuestionView
          key={question.id}
          question={question}
          attempt={attempt}
          onAnswer={answer}
          onContinue={continueQuiz}
          onReveal={handleUnanswered}
          solutionRevealAllowed={solutionRevealAllowed}
          continueLabel={continueLabel}
        />
      ) : question.answerSpec.kind === "map_point" ||
      question.answerSpec.kind === "map_area" ||
      question.answerSpec.kind === "map_line" ? (
        <MapQuestionView
          key={question.id}
          question={question}
          attempt={attempt}
          onAnswer={answer}
          onContinue={continueQuiz}
          onReveal={handleUnanswered}
          solutionRevealAllowed={solutionRevealAllowed}
          continueLabel={continueLabel}
        />
      ) : question.promptPayload.kind === "visual_asset" ||
        question.answerSpec.kind === "single_choice" ? (
        <VisualQuestionView
          key={question.id}
          question={question}
          attempt={attempt}
          onAnswer={answer}
          onContinue={continueQuiz}
          onReveal={handleUnanswered}
          solutionRevealAllowed={solutionRevealAllowed}
          continueLabel={continueLabel}
        />
      ) : question.answerSpec.kind === "text_input" ? (
        <TextQuestionView
          key={question.id}
          question={question}
          attempt={attempt}
          onAnswer={answer}
          onContinue={continueQuiz}
          onReveal={handleUnanswered}
          solutionRevealAllowed={solutionRevealAllowed}
          continueLabel={continueLabel}
        />
      ) : (
        <main className="quiz-loading">
          <h1>Antwortmodus noch nicht verfügbar</h1>
          <p>{question.answerSpec.kind}</p>
        </main>
      )}

      <footer className="quiz-meta">
        <span><MapPinned aria-hidden="true" />{description.mode}</span>
        <i aria-hidden="true">·</i>
        <span><Globe2 aria-hidden="true" />{description.region}</span>
        <i aria-hidden="true">·</i>
        <span><Clock3 aria-hidden="true" />{timerLabel}</span>
      </footer>
    </div>
  );
}
