import type { QuestionInstance } from "../../engine/quiz/question";
import {
  loadPhysicalGeoJson,
  type PhysicalEntityType
} from "../../geo/physical";
import { preloadQuestionVisualAssets } from "./visualAssets";

const PHYSICAL_ENTITY_TYPES = new Set<PhysicalEntityType>([
  "river",
  "lake",
  "sea",
  "mountain_range",
  "peak"
]);

function isPhysicalEntityType(
  value: string | undefined
): value is PhysicalEntityType {
  return (
    value !== undefined &&
    PHYSICAL_ENTITY_TYPES.has(value as PhysicalEntityType)
  );
}

export async function preloadQuestionAssets(
  questions: readonly QuestionInstance[]
) {
  const physicalTypes = new Set<PhysicalEntityType>();
  for (const question of questions) {
    if (isPhysicalEntityType(question.metadata.entityType)) {
      physicalTypes.add(question.metadata.entityType);
    }
  }

  await Promise.all([
    preloadQuestionVisualAssets(questions),
    ...[...physicalTypes].map((type) => loadPhysicalGeoJson(type))
  ]);
}
