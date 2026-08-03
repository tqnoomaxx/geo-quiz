import type {
  QuestionInstance,
  VisualAssetReference
} from "../../engine/quiz/question";

export function visualAssetUrl(asset: VisualAssetReference) {
  if (asset.kind === "constellation_chart") {
    const slug = asset.entityId.startsWith("constellation:")
      ? asset.entityId.slice("constellation:".length)
      : "";
    if (!/^[a-z-]+$/.test(slug)) {
      throw new Error(`${asset.key}: Sternbildasset besitzt keine stabile ID.`);
    }
    return `${import.meta.env.BASE_URL}assets/visual/v1/constellations/${slug}.svg`;
  }
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
    if (question.answerSpec.kind === "country_profile_input") {
      const asset: VisualAssetReference = {
        kind: "flag",
        key: `visual:flag:${question.subjectId}`,
        entityId: question.subjectId
      };
      byKey.set(asset.key, asset);
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
