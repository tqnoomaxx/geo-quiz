export type SingleChoiceGrade = {
  correct: boolean;
  selectedEntityId: string;
};

export function gradeSingleChoice(
  selectedEntityId: string,
  expectedEntityIds: readonly string[]
): SingleChoiceGrade {
  return {
    correct: expectedEntityIds.includes(selectedEntityId),
    selectedEntityId
  };
}
