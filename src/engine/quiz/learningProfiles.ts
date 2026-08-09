import type { QuizRules } from "./definition";

export type LearningProfileId = "learn" | "practice" | "exam";

export interface LearningProfileDefinition {
  id: LearningProfileId;
  label: string;
  optionLabel: string;
  description: string;
  feedback: QuizRules["feedback"];
  retryMistakes: boolean;
  hints: QuizRules["hints"];
  timerPolicy: "disabled" | "optional";
}

export const LEARNING_PROFILES: readonly LearningProfileDefinition[] = [
  {
    id: "learn",
    label: "Lernen",
    optionLabel: "Lernen · mit Lösung",
    description:
      "Ohne Zeitdruck: Du bekommst sofort Feedback und kannst dir die Lösung anzeigen lassen.",
    feedback: "immediate",
    retryMistakes: false,
    hints: "unlimited",
    timerPolicy: "disabled"
  },
  {
    id: "practice",
    label: "Üben",
    optionLabel: "Üben · ohne Wiederholung",
    description:
      "Ohne Zeitdruck und mit sofortigem Feedback: Jede Frage erscheint in der Runde nur einmal.",
    feedback: "immediate",
    retryMistakes: false,
    hints: "one",
    timerPolicy: "disabled"
  },
  {
    id: "exam",
    label: "Prüfung",
    optionLabel: "Prüfung · am Ende",
    description:
      "Keine Lösungen während der Runde: Du erhältst die vollständige Auswertung erst am Ende. Das Zeitlimit ist optional.",
    feedback: "end",
    retryMistakes: false,
    hints: "off",
    timerPolicy: "optional"
  }
] as const;

const PROFILE_BY_ID = new Map(
  LEARNING_PROFILES.map((profile) => [profile.id, profile])
);

export function getLearningProfile(
  profileId: LearningProfileId
): LearningProfileDefinition {
  const profile = PROFILE_BY_ID.get(profileId);
  if (!profile) {
    throw new Error(`Unbekannter Lernmodus: ${profileId}`);
  }
  return profile;
}

export function learningProfileFromRules(
  rules: Pick<QuizRules, "feedback" | "retryMistakes" | "hints">
): LearningProfileId {
  if (rules.feedback === "end") return "exam";
  if (rules.hints === "one" || rules.retryMistakes) return "practice";
  return "learn";
}

export function canRevealSolution(
  rules: Pick<QuizRules, "feedback" | "retryMistakes" | "hints">
) {
  return learningProfileFromRules(rules) !== "exam";
}
