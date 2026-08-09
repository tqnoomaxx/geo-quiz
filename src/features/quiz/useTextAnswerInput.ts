import {
  useRef,
  useState,
  type ChangeEvent,
  type CompositionEvent,
  type FormEvent
} from "react";
import { isCorrectTextQuestionAnswer } from "../../engine/graders/registry";
import type { AnswerPayload } from "../../engine/graders/registry";
import type { QuestionInstance } from "../../engine/quiz/question";
import type { QuestionAttempt } from "../../engine/session/session";

interface UseTextAnswerInputOptions {
  question: QuestionInstance;
  attempt?: QuestionAttempt;
  onAnswer: (payload: AnswerPayload) => void;
}

export function useTextAnswerInput({
  question,
  attempt,
  onAnswer
}: UseTextAnswerInputOptions) {
  const [value, setValue] = useState(
    attempt?.answerPayload?.kind === "text_input"
      ? attempt.answerPayload.value
      : ""
  );
  const submittedRef = useRef(Boolean(attempt));

  const submit = (nextValue: string) => {
    if (!nextValue.trim() || attempt || submittedRef.current) return;
    submittedRef.current = true;
    onAnswer({ kind: "text_input", value: nextValue });
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    setValue(nextValue);

    if (
      !(event.nativeEvent as InputEvent).isComposing &&
      isCorrectTextQuestionAnswer(question, nextValue)
    ) {
      submit(nextValue);
    }
  };

  const handleCompositionEnd = (event: CompositionEvent<HTMLInputElement>) => {
    const nextValue = event.currentTarget.value;
    if (isCorrectTextQuestionAnswer(question, nextValue)) {
      submit(nextValue);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit(value);
  };

  return {
    value,
    handleChange,
    handleCompositionEnd,
    handleSubmit
  };
}
