import { normalizeTextAnswer } from "./text";

export interface AreaGradeResult {
  correct: boolean;
  selectedAreaId?: string;
}

export function gradeMapArea(
  selectedAreaId: string | undefined,
  acceptedAreaIds: readonly string[]
): AreaGradeResult {
  if (!selectedAreaId) {
    return { correct: false };
  }

  const normalizedSelectedArea = normalizeTextAnswer(selectedAreaId, "en");
  const correct = acceptedAreaIds.some(
    (area) => normalizeTextAnswer(area, "en") === normalizedSelectedArea
  );

  return {
    correct,
    selectedAreaId
  };
}
