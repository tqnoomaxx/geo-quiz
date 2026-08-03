import { normalizeTextAnswer } from "./text";

export interface LineGradeResult {
  correct: boolean;
  selectedLineId?: string;
}

export function gradeMapLine(
  selectedLineId: string | undefined,
  acceptedLineIds: readonly string[]
): LineGradeResult {
  if (!selectedLineId) return { correct: false };

  const normalized = normalizeTextAnswer(selectedLineId, "en");
  return {
    correct: acceptedLineIds.some(
      (lineId) => normalizeTextAnswer(lineId, "en") === normalized
    ),
    selectedLineId
  };
}
