import type {
  QuestionInstance,
  VisualAssetReference
} from "../../engine/quiz/question";

export function visualAssetUrl(asset: VisualAssetReference) {
  const iso2 = asset.entityId.startsWith("country:")
    ? asset.entityId.slice("country:".length)
    : "";
  if (!/^[a-z]{2}$/.test(iso2)) {
    throw new Error(`${asset.key}: visuelles Länderasset besitzt keine ISO-2-ID.`);
  }
  const directory = asset.kind === "flag" ? "flags" : "outlines";
  return `${import.meta.env.BASE_URL}assets/visual/v1/${directory}/${iso2}.svg`;
}

export async function preloadQuestionVisualAssets(
  questions: readonly QuestionInstance[]
) {
  const byKey = new Map<string, VisualAssetReference>();
  for (const question of questions) {
    if (question.promptPayload.kind === "visual_asset") {
      byKey.set(question.promptPayload.asset.key, question.promptPayload.asset);
    }
    for (const option of question.answerSpec.options ?? []) {
      if (option.visualAsset) {
        byKey.set(option.visualAsset.key, option.visualAsset);
      }
    }
  }

  await Promise.all(
    [...byKey.values()].map(async (asset) => {
      const response = await fetch(visualAssetUrl(asset), {
        cache: "force-cache"
      });
      if (!response.ok) {
        throw new Error(`${asset.key}: lokales SVG konnte nicht geladen werden.`);
      }
    })
  );
}
