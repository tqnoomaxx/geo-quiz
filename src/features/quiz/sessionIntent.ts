import type { QuizRoundDefinition } from "../../engine/quiz/definition";

const QUIZ_SESSION_INTENT_KEY = "geoapp:quiz-session-intent-v1";
let inMemoryDefinition: QuizRoundDefinition | undefined;

export function requestQuizSession(definition: QuizRoundDefinition) {
  inMemoryDefinition = structuredClone(definition);

  try {
    window.sessionStorage.setItem(
      QUIZ_SESSION_INTENT_KEY,
      JSON.stringify(definition)
    );
  } catch {
    // Der In-Memory-Wert reicht innerhalb der laufenden App-Navigation.
  }
}

export function consumeQuizSessionRequest() {
  let requested = inMemoryDefinition;

  try {
    const stored = window.sessionStorage.getItem(QUIZ_SESSION_INTENT_KEY);
    if (!requested && stored) {
      requested = JSON.parse(stored) as QuizRoundDefinition;
    }
  } catch {
    // In restriktiven Browsern bleibt der In-Memory-Wert maßgeblich.
  }

  return requested;
}

export function clearQuizSessionRequest() {
  inMemoryDefinition = undefined;

  try {
    window.sessionStorage.removeItem(QUIZ_SESSION_INTENT_KEY);
  } catch {
    // Der In-Memory-Wert ist bereits entfernt.
  }
}
